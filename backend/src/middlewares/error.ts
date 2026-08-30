import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { env } from '../config/env';

/** 404 handler for unmatched routes. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/** Shape of an error surfaced by PostgREST / supabase-js. */
interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

const isPostgrestError = (err: unknown): err is PostgrestLikeError =>
  typeof err === 'object' &&
  err !== null &&
  'message' in err &&
  ('code' in err || 'details' in err || 'hint' in err);

/**
 * Map a PostgreSQL SQLSTATE to the status code the API used to return.
 *
 * The repository layer already translates errors it raises itself; this is the
 * safety net for anything that reaches the handler untranslated. The database
 * `message`/`details`/`hint` are deliberately NOT forwarded — they can contain
 * table names, constraint definitions and column values.
 */
function fromPostgresCode(code: string | undefined): ApiError | null {
  switch (code) {
    case '23505': // unique_violation — previously Mongo duplicate key (11000)
      return ApiError.conflict('Duplicate value');
    case '23503': // foreign_key_violation
      return ApiError.badRequest('Referenced record does not exist');
    case '23502': // not_null_violation
    case '23514': // check_violation
      return ApiError.unprocessable('Validation failed');
    case '22P02': // invalid_text_representation (e.g. malformed uuid)
      return ApiError.badRequest('Invalid identifier format');
    case '42501': // insufficient_privilege
      return ApiError.forbidden('Not permitted');
    case 'PGRST116': // no rows returned where exactly one was expected
      return ApiError.notFound('Resource not found');
    default:
      return null;
  }
}

/** Convert known error shapes (PostgREST, JWT, Multer) into ApiError. */
function normalizeError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (isPostgrestError(err)) {
    const mapped = fromPostgresCode(err.code);
    if (mapped) return mapped;
    // Unknown database failure: log the detail, return a generic message.
    logger.error('Unmapped database error', { code: err.code, message: err.message });
    return ApiError.internal('Internal server error');
  }

  if (err instanceof Error && err.name === 'JsonWebTokenError') {
    return ApiError.unauthorized('Invalid token');
  }
  if (err instanceof Error && err.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Token expired');
  }
  if (err instanceof Error && err.name === 'MulterError') {
    return ApiError.badRequest(err.message);
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  return ApiError.internal(message);
}

/** Global error handler — must be registered last. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const apiError = normalizeError(err);

  if (!apiError.isOperational || apiError.statusCode >= 500) {
    logger.error(apiError.message, { stack: (err as Error)?.stack });
  }

  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    ...(apiError.details ? { errors: apiError.details } : {}),
    ...(env.isProd ? {} : { stack: (err as Error)?.stack }),
  });
}
