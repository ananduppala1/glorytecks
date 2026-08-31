import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { redact, redactText, safeHeaders, safePath } from '../utils/redact';
import {
  isConnectivityFailure,
  isPostgrestError,
  SERVICE_UNAVAILABLE_MESSAGE,
  type SystemError,
} from '../utils/errorKind';

/**
 * Error translation and the single point where anything reaches the client.
 *
 * The rule this file exists to enforce: a message is returned to a caller ONLY
 * if application code deliberately wrote it for that purpose. Everything else
 * — parser internals, driver text, socket errors naming internal hosts, a
 * TypeError from a bug — is recorded server-side under a correlation id and
 * answered with a fixed sentence.
 *
 * The previous implementation inverted that. Its final branch was
 * `ApiError.internal(err.message)`, so any error nobody had thought about
 * became a 500 whose body was the raw library message. In production that
 * returned, verbatim: "Unexpected end of JSON input", "request entity too
 * large", and "Origin https://evil.test not allowed by CORS".
 */

/* ────────────────────────────────────────────────────────────────────────── *
 * Correlation id
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Give every request an id, echoed on error responses and attached to every
 * log line for that request.
 *
 * This is what makes a generic error message workable in practice. "Something
 * went wrong (ref: 3f2a…)" costs an attacker nothing — the id is random and
 * refers to nothing — while letting an operator find the one log entry that
 * explains it. Without it, hiding detail from users also hides it from support.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

/** 404 handler for unmatched routes. */
export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  // The requested method and URL are deliberately NOT echoed. They are
  // attacker-controlled text, they can carry a secret pasted into a query
  // string, and reflecting them turns the 404 body into a probe oracle.
  // The real path is on the log line for this request id.
  next(ApiError.notFound('The requested resource was not found'));
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Recognisers for error shapes we can classify
 * ────────────────────────────────────────────────────────────────────────── */

/** body-parser attaches `type` and `status` to the errors it raises. */
interface BodyParserError extends Error {
  type?: string;
  status?: number;
  statusCode?: number;
  body?: unknown;
  expose?: boolean;
}

const isBodyParserError = (err: unknown): err is BodyParserError =>
  err instanceof Error && typeof (err as BodyParserError).type === 'string';



/** The CORS middleware rejects an origin by calling back with a plain Error. */
export const CORS_REJECTION = 'CORS_ORIGIN_REJECTED';

/* ────────────────────────────────────────────────────────────────────────── *
 * Classification
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Map a PostgreSQL SQLSTATE to a safe, client-facing error.
 *
 * The database `message`/`details`/`hint` are never forwarded — they quote
 * table names, column names, constraint definitions and, in a unique
 * violation, the conflicting VALUE.
 */
function fromPostgresCode(code: string | undefined): ApiError | null {
  switch (code) {
    case '23505': // unique_violation
      return ApiError.conflict('A record with these details already exists');
    case '23503': // foreign_key_violation
      return ApiError.badRequest('Referenced record does not exist');
    case '23502': // not_null_violation
    case '23514': // check_violation
      return ApiError.unprocessable('Validation failed');
    case '22P02': // invalid_text_representation (e.g. malformed uuid)
      return ApiError.badRequest('Invalid identifier format');
    case '42501': // insufficient_privilege
      return ApiError.forbidden('Not permitted');
    case 'PGRST116': // no rows where exactly one was expected
      return ApiError.notFound('Resource not found');
    case 'PGRST301': // JWT expired / invalid at PostgREST
      return ApiError.unauthorized('Invalid or expired token');
    default:
      return null;
  }
}

/** Multer's failure codes, translated without quoting its own message. */
function fromMulterCode(code: string | undefined): ApiError {
  switch (code) {
    case 'LIMIT_FILE_SIZE':
      return ApiError.payloadTooLarge('File is larger than the allowed limit');
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_UNEXPECTED_FILE':
      return ApiError.badRequest('Send exactly one file in the "file" field');
    case 'LIMIT_PART_COUNT':
    case 'LIMIT_FIELD_COUNT':
    case 'LIMIT_FIELD_KEY':
    case 'LIMIT_FIELD_VALUE':
      return ApiError.badRequest('Upload form contains too much data');
    default:
      // e.g. "Unexpected field" / "Boundary not found" — implementation detail.
      return ApiError.badRequest('Upload could not be read');
  }
}

/**
 * Turn anything thrown anywhere into a classified ApiError.
 *
 * Every branch either recognises a shape and chooses its own wording, or falls
 * through to the generic internal error. There is deliberately no branch that
 * copies an unrecognised `err.message` into the result.
 */
function normalizeError(err: unknown): ApiError {
  // 1. Already classified by application code.
  if (err instanceof ApiError) return err;

  // 2. Request body problems. Client-caused, so a 4xx — the previous code let
  //    these fall through to the generic branch and answered 500 with the
  //    parser's own message.
  if (isBodyParserError(err)) {
    switch (err.type) {
      case 'entity.parse.failed':
        return ApiError.badRequest('Request body is not valid JSON').withLogDetail({
          type: err.type,
        });
      case 'entity.too.large':
        return ApiError.payloadTooLarge('Request body is too large');
      case 'encoding.unsupported':
      case 'charset.unsupported':
        return ApiError.unsupportedMediaType('Unsupported request encoding');
      case 'request.aborted':
      case 'request.size.invalid':
      case 'parameters.too.many':
        return ApiError.badRequest('Request could not be read');
      default:
        return ApiError.badRequest('Request could not be read').withLogDetail({ type: err.type });
    }
  }

  // 3. A rejected CORS origin. Previously a 500 that echoed the origin back
  //    and named the policy; an origin we refuse deserves a plain refusal.
  if (err instanceof Error && err.message === CORS_REJECTION) {
    return ApiError.forbidden('Origin not allowed');
  }

  // 4. Database / PostgREST.
  if (isPostgrestError(err)) {
    const mapped = fromPostgresCode(err.code);
    if (mapped) return mapped;
    const detail = {
      kind: 'postgrest',
      code: err.code,
      message: err.message,
      details: err.details,
      hint: err.hint,
    };
    // An unreachable database is an outage, not a bug in this request.
    if (isConnectivityFailure(err)) {
      return ApiError.serviceUnavailable(SERVICE_UNAVAILABLE_MESSAGE).withLogDetail(detail);
    }
    return ApiError.internal('Internal server error').withLogDetail(detail);
  }

  // 5. Token verification.
  if (err instanceof Error && err.name === 'JsonWebTokenError') {
    return ApiError.unauthorized('Invalid or expired token');
  }
  if (err instanceof Error && err.name === 'TokenExpiredError') {
    // Same wording as an invalid token: whether a token is merely expired or
    // was never valid is not something an unauthenticated caller needs told.
    return ApiError.unauthorized('Invalid or expired token');
  }
  if (err instanceof Error && err.name === 'NotBeforeError') {
    return ApiError.unauthorized('Invalid or expired token');
  }

  // 6. Uploads.
  if (err instanceof Error && err.name === 'MulterError') {
    const multerError = err as Error & { code?: string };
    return fromMulterCode(multerError.code).withLogDetail({ code: multerError.code });
  }

  // 7. A dependency we could not reach. The error text names the host, the
  //    port and often an internal IP, so only the fact of the outage is public.
  if (isConnectivityFailure(err)) {
    const sysErr = err as SystemError;
    return ApiError.serviceUnavailable(SERVICE_UNAVAILABLE_MESSAGE).withLogDetail({
      kind: 'system',
      code: sysErr.code,
      syscall: sysErr.syscall,
      // Kept for the log only — this is exactly the internal topology that
      // must not appear in a response.
      address: sysErr.address,
      port: sysErr.port,
      hostname: sysErr.hostname,
      cause: sysErr.cause instanceof Error ? redactText(sysErr.cause.message) : undefined,
    });
  }

  // 8. Anything else is a fault we did not anticipate. Its message belongs in
  //    the log and nowhere else.
  return ApiError.internal('Internal server error').withLogDetail({
    kind: 'unhandled',
    name: err instanceof Error ? err.name : typeof err,
    message: err instanceof Error ? redactText(err.message) : String(err).slice(0, 500),
  });
}

/* ────────────────────────────────────────────────────────────────────────── *
 * The handler
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * What a caller is allowed to read.
 *
 * An operational error's message was written for them. A non-operational one's
 * was not — in production it is replaced outright, so a message that reached
 * `ApiError.internal()` from a library can never be returned even by accident.
 */
function publicMessage(error: ApiError): string {
  if (error.isOperational) return error.message;
  return env.isProd ? 'Internal server error' : error.message;
}

/** Global error handler — must be registered last. */
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  const apiError = normalizeError(err);
  const id = req.requestId;

  const context = {
    requestId: id,
    method: req.method,
    // Query VALUES are stripped: a token or an email pasted into a URL would
    // otherwise be written to the log in full.
    path: safePath(req.originalUrl ?? req.url ?? ''),
    status: apiError.statusCode,
    code: apiError.code,
    userId: req.user?.id,
    role: req.user?.role,
    ip: req.ip,
    headers: safeHeaders(req.headers as Record<string, unknown>),
    ...(apiError.logDetail ? { detail: redact(apiError.logDetail) } : {}),
  };

  if (!apiError.isOperational || apiError.statusCode >= 500) {
    // A fault: full detail, including the stack, to the server log only.
    logger.error(`Request failed: ${apiError.code}`, {
      ...context,
      stack: err instanceof Error ? err.stack : undefined,
      // The body can explain a 500 that nothing else does — redacted, so a
      // password or token in the payload is not what gets recorded.
      body: req.method === 'GET' ? undefined : redact(req.body),
    });
  } else if (apiError.statusCode === 401 || apiError.statusCode === 403) {
    // Authentication and authorization failures are worth recording, and are
    // exactly the requests most likely to carry a credential — hence the
    // redacted context rather than the raw request.
    logger.warn(`Access denied: ${apiError.code}`, context);
  } else {
    logger.debug(`Request rejected: ${apiError.code}`, context);
  }

  // If the response has already started — a streamed file, say — there is no
  // envelope left to write. Overwriting it would append JSON to a partial body
  // and produce a corrupt download; let the connection be torn down instead.
  if (res.headersSent) {
    return next(err);
  }

  res.status(apiError.statusCode).json({
    success: false,
    message: publicMessage(apiError),
    code: apiError.code,
    // Field-level validation feedback is the one place detail is intended:
    // it is written by our validators and is what makes a form usable.
    ...(apiError.details ? { errors: apiError.details } : {}),
    // An opaque handle so a user can quote something actionable in a support
    // request without the response carrying anything about the failure.
    ...(id && apiError.statusCode >= 500 ? { requestId: id } : {}),
    // Development only, and only for genuine faults.
    ...(!env.isProd && !apiError.isOperational && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
}
