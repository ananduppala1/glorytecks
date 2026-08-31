/**
 * Telling an outage apart from a bug.
 *
 * Lives in its own module because two layers need the same answer: the
 * repository, which classifies database failures at the point they happen, and
 * the global error handler, which classifies everything else. Duplicating the
 * detection would let the two drift, and the repository's copy is the one that
 * runs first — so a divergence there would silently win.
 */

/** Shape of an error surfaced by PostgREST / supabase-js. */
export interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

export const isPostgrestError = (err: unknown): err is PostgrestLikeError =>
  typeof err === 'object' &&
  err !== null &&
  'message' in err &&
  ('code' in err || 'details' in err || 'hint' in err);

/** Node socket/DNS failures. `code` is the errno name. */
export interface SystemError extends Error {
  code?: string;
  syscall?: string;
  address?: string;
  port?: number;
  hostname?: string;
  /** Node wraps the real errno here when the surface error is a TypeError. */
  cause?: unknown;
}

const SYSTEM_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
  'ECONNABORTED',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
]);

export const isSystemError = (err: unknown): err is SystemError =>
  err instanceof Error && SYSTEM_ERROR_CODES.has(String((err as SystemError).code));

/**
 * Is this failure "we could not reach a dependency" rather than "we have a bug"?
 *
 * Worth separating, because the two want different status codes: a 503 tells a
 * caller and a load balancer to retry, a 500 says the request itself is
 * hopeless. Neither reveals anything — the wording is fixed for both.
 *
 * Detection has to look past the surface error. `fetch` reports a connection
 * failure as a bare `TypeError: fetch failed` and hangs the real errno off
 * `cause`; supabase-js goes further and repackages it as a PostgrestError with
 * an empty `code` and the underlying text buried in `details`. Checking only
 * the top-level object misses both, which is why an unreachable database
 * previously surfaced as a 500.
 */
export function isConnectivityFailure(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (isSystemError(current)) return true;
    if (current instanceof Error && /^(TypeError: )?fetch failed$/.test(current.message)) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }

  if (isPostgrestError(err)) {
    const blob = `${err.message ?? ''} ${err.details ?? ''}`;
    if (!err.code && /fetch failed/i.test(blob)) return true;
    for (const code of SYSTEM_ERROR_CODES) {
      if (blob.includes(code)) return true;
    }
  }
  return false;
}

export const SERVICE_UNAVAILABLE_MESSAGE =
  'A required service is temporarily unavailable. Please try again.';
