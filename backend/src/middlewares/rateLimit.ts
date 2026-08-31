import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { env } from '../config/env';
import { ERROR_CODE } from '../utils/ApiError';

/**
 * express-rate-limit writes its 429 body itself, bypassing the global error
 * handler — so the envelope has to be spelled out here to match. A client that
 * branches on `code` would otherwise find it missing on exactly the responses
 * it most needs to recognise.
 */
const limitBody = (message: string) => ({
  success: false,
  message,
  code: ERROR_CODE.RATE_LIMITED,
});

/** General API limiter. */
export const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitBody('Too many requests, please try again later'),
});

/** Stricter limiter for auth endpoints (brute-force protection). */
export const authLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: limitBody('Too many attempts, please try again later'),
});

/**
 * Upload limiter.
 *
 * Uploads are far more expensive than a normal API call — they buffer into
 * memory, then cost bandwidth and storage at the provider — so they get their
 * own, much smaller budget instead of sharing the generic 300/window bucket.
 *
 * Keyed by ACCOUNT, not by IP. Every upload request is authenticated by the
 * time it reaches here, so the account is the meaningful subject: an IP key
 * would let one compromised token cycle through addresses, and would punish a
 * whole office behind one NAT for a single user's activity. The IP remains the
 * key for the unauthenticated case, which should not occur on these routes.
 *
 * NOTE: express-rate-limit's default store is per-process. On a multi-instance
 * or serverless deployment the effective budget is this number times the
 * instance count. That is a deployment-topology limitation, not a per-request
 * one — see the deployment notes in the phase summary.
 */
export const uploadLimiter = rateLimit({
  windowMs: env.rateLimit.uploadWindowMs,
  max: env.rateLimit.uploadMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'unknown',
  message: limitBody('Too many uploads, please try again later'),
});

/**
 * Limiter for anonymous endpoints that stream a file.
 *
 * `app.ts` exempts public GETs from the general limiter because they are
 * cheap, cached reads. The brochure proxy is neither: each hit makes an
 * outbound request and relays megabytes. It gets its own per-IP budget so the
 * exemption does not become a free bandwidth amplifier.
 */
export const publicDownloadLimiter = rateLimit({
  windowMs: env.rateLimit.publicDownloadWindowMs,
  max: env.rateLimit.publicDownloadMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitBody('Too many requests, please try again later'),
});
