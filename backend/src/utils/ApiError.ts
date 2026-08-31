/**
 * Operational error with an HTTP status code. Thrown anywhere in the request
 * lifecycle and translated to a JSON response by the global error handler.
 *
 * The distinction that matters here is between an error whose message was
 * WRITTEN FOR A USER and one that merely happens to have a `.message`.
 *
 *  • Everything constructed through the static helpers below is a *classified*
 *    error: someone chose that wording knowing it would be shown. Its message
 *    is safe to return.
 *
 *  • Everything else — a TypeError from a bug, an ioredis socket error naming
 *    an internal host and port, a body-parser message quoting the malformed
 *    input, a driver error quoting SQL — is unclassified. Its message is for
 *    the log, never for the response.
 *
 * The error handler enforces that split by construction: only an `ApiError`
 * can carry its message to the client, and `ApiError.internal()` is the one
 * helper that deliberately does not.
 */

/** Stable, machine-readable error kinds. Clients may branch on these. */
export const ERROR_CODE = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  BAD_REQUEST: 'BAD_REQUEST',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

export class ApiError extends Error {
  public readonly statusCode: number;
  /**
   * True when this error was raised deliberately by application code, and its
   * message was therefore written to be read by a user.
   *
   * `ApiError.internal()` sets this false: the status is ours but the wording
   * may have come from somewhere we do not control.
   */
  public readonly isOperational: boolean;
  public readonly details?: unknown;
  public readonly code: ErrorCode;
  /**
   * Detail for the server log only. Set when an error is downgraded to a safe
   * public message and the original context would otherwise be lost.
   */
  public readonly logDetail?: unknown;

  constructor(
    statusCode: number,
    message: string,
    details?: unknown,
    isOperational = true,
    code: ErrorCode = ERROR_CODE.INTERNAL,
    logDetail?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    this.code = code;
    this.logDetail = logDetail;
    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  /** Attach server-only context to an existing error, without changing what the client sees. */
  withLogDetail(detail: unknown): ApiError {
    return new ApiError(
      this.statusCode,
      this.message,
      this.details,
      this.isOperational,
      this.code,
      detail,
    );
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new ApiError(400, message, details, true, ERROR_CODE.BAD_REQUEST);
  }
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message, undefined, true, ERROR_CODE.AUTHENTICATION);
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message, undefined, true, ERROR_CODE.AUTHORIZATION);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, undefined, true, ERROR_CODE.NOT_FOUND);
  }
  static conflict(message = 'Conflict', details?: unknown) {
    return new ApiError(409, message, details, true, ERROR_CODE.CONFLICT);
  }
  static payloadTooLarge(message = 'Payload too large') {
    return new ApiError(413, message, undefined, true, ERROR_CODE.PAYLOAD_TOO_LARGE);
  }
  static unsupportedMediaType(message = 'Unsupported media type') {
    return new ApiError(415, message, undefined, true, ERROR_CODE.UNSUPPORTED_MEDIA_TYPE);
  }
  static unprocessable(message = 'Unprocessable entity', details?: unknown) {
    return new ApiError(422, message, details, true, ERROR_CODE.VALIDATION);
  }
  static tooMany(message = 'Too many requests') {
    return new ApiError(429, message, undefined, true, ERROR_CODE.RATE_LIMITED);
  }
  /**
   * A server-side fault.
   *
   * `isOperational` is false, which is the signal the error handler uses to
   * replace the message with a fixed one in production. Passing detail here is
   * still worthwhile — it reaches the log.
   */
  static internal(message = 'Internal server error') {
    return new ApiError(500, message, undefined, false, ERROR_CODE.INTERNAL);
  }
  static serviceUnavailable(message = 'Service unavailable') {
    return new ApiError(503, message, undefined, true, ERROR_CODE.SERVICE_UNAVAILABLE);
  }
}
