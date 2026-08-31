import rateLimit, { Options, RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ERROR_CODE } from '../utils/ApiError';
import { clientIp } from '../utils/clientIp';
import {
  SharedStore,
  recordFailure,
  readFailures,
  clearFailures,
  hashKeyPart,
} from './rateLimitStore';

/**
 * Rate-limit policy, by endpoint class.
 *
 * The whole policy is here; route files say only which class applies. That
 * separation is what makes the limits tunable per deployment — a threshold
 * spelled out next to a handler is a threshold that needs a release to change.
 *
 * Classes, from strictest to most permissive:
 *
 *   auth          sign-in, by IP and by account, with progressive backoff
 *   passwordChange  by account, hourly
 *   publicWrite   the contact and demo forms — the only anonymous writes
 *   expensive     operations that duplicate records or fan out work
 *   upload        by account; each request buffers a file and costs storage
 *   refresh       token exchange, by IP
 *   adminWrite    authenticated mutations, by account
 *   api           the global authenticated ceiling, by IP
 *   publicRead    a flood ceiling for cached marketing-site reads
 *   publicSearch  the expensive shape of a public read
 */

/* ────────────────────────────────────────────────────────────────────────── *
 * Response shape
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * express-rate-limit writes its own 429 body, bypassing the global error
 * handler, so the envelope is spelled out here to match every other error the
 * API produces. A client branching on `code` would otherwise find it missing
 * on exactly the responses it most needs to recognise.
 *
 * The message is identical for every class. Telling a caller *which* limit
 * they hit tells them which limits exist and how to stay under the others; and
 * on the auth routes it would distinguish "this address is throttled" from
 * "this account is throttled", which is an account-existence oracle.
 */
const LIMIT_MESSAGE = 'Too many requests. Please wait a moment and try again.';

function limitHandler(req: Request, res: Response, _next: NextFunction, options: Options): void {
  const resetTime = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
  const retryAfterSeconds = resetTime
    ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
    : Math.ceil(options.windowMs / 1000);

  // Retry-After is the one piece of timing information worth giving: it lets a
  // well-behaved client back off correctly, and it tells an abusive one only
  // what the window length already implies.
  res.setHeader('Retry-After', String(retryAfterSeconds));

  logger.warn('Rate limit exceeded', {
    requestId: req.requestId,
    method: req.method,
    // The route pattern, never the full URL: the path can carry a slug and the
    // query can carry anything at all.
    route: req.baseUrl || req.path,
    userId: req.user?.id,
  });

  res.status(429).json({
    success: false,
    message: LIMIT_MESSAGE,
    code: ERROR_CODE.RATE_LIMITED,
    retryAfter: retryAfterSeconds,
  });
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Factory
 * ────────────────────────────────────────────────────────────────────────── */

type Scope = 'ip' | 'account' | 'accountOrIp';

interface LimiterConfig {
  /** Redis namespace. Keeps each limiter's counters separate. */
  name: string;
  windowMs: number;
  max: number;
  scope: Scope;
  /** Don't spend the budget on requests that succeeded. */
  skipSuccessful?: boolean;
  /** Override the subject entirely (used for the per-account login limiter). */
  keyFrom?: (req: Request) => string | undefined;
}

/**
 * Choose what a limit counts against.
 *
 * `account` is preferred wherever an authenticated identity exists: an IP key
 * punishes a whole office behind one NAT for one person's activity, and lets a
 * single compromised token roam across addresses. IP remains the only option
 * before authentication.
 */
function subjectFor(scope: Scope, req: Request): string {
  switch (scope) {
    case 'ip':
      return `ip:${clientIp(req)}`;
    case 'account':
      return req.user?.id ? `user:${req.user.id}` : `ip:${clientIp(req)}`;
    case 'accountOrIp':
      return req.user?.id ? `user:${req.user.id}` : `ip:${clientIp(req)}`;
    default:
      return `ip:${clientIp(req)}`;
  }
}

export function createLimiter(config: LimiterConfig): RateLimitRequestHandler {
  return rateLimit({
    windowMs: config.windowMs,
    limit: config.max,
    // Draft-8 `RateLimit` headers: standards-compliant, and enough for a
    // client to pace itself without being told the policy's internals.
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: config.skipSuccessful ?? false,
    store: new SharedStore(config.name),
    keyGenerator: (req: Request) =>
      config.keyFrom?.(req) ?? subjectFor(config.scope, req),
    handler: limitHandler,
    validate: {
      // Handled deliberately in utils/clientIp: `trust proxy` is set from the
      // environment and `req.ip` is the only source of the address. The
      // library's checks assume it should make that decision itself.
      trustProxy: false,
      xForwardedForHeader: false,
      // Several limiters intentionally apply to one request — a public read
      // spends both the read and the search budget, for instance — and they
      // legitimately share a key (`ip:…`) while writing to different
      // namespaces. The library groups shared stores by CLASS NAME, so it
      // cannot tell that apart from one store being counted twice, and reports
      // a false ERR_ERL_DOUBLE_COUNT for every layered request.
      singleCount: false,
    },
  });
}

/* ────────────────────────────────────────────────────────────────────────── *
 * The limiters
 * ────────────────────────────────────────────────────────────────────────── */

/** Global ceiling for authenticated/admin API traffic, by address. */
export const apiLimiter = createLimiter({
  name: 'api',
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  scope: 'ip',
});

/**
 * Failed sign-ins from one address.
 *
 * `skipSuccessful` so a busy shared office is not thrown out by its own
 * successful logins — the budget exists to detect guessing, and a correct
 * password is not a guess. `authTotalLimiter` below supplies the ceiling that
 * successes still need.
 */
export const authIpLimiter = createLimiter({
  name: 'auth-ip',
  windowMs: env.rateLimit.authWindowMs,
  max: env.rateLimit.authMax,
  scope: 'ip',
  skipSuccessful: true,
});

/**
 * Total sign-in attempts from one address, successes included.
 *
 * Without this, `skipSuccessfulRequests` leaves an attacker who holds one valid
 * credential free to hammer the endpoint indefinitely. Set well above what a
 * human does and well below what a script does.
 */
export const authTotalLimiter = createLimiter({
  name: 'auth-total',
  windowMs: env.rateLimit.authWindowMs,
  max: env.rateLimit.authTotalMax,
  scope: 'ip',
});

/**
 * Failed sign-ins against one email address, from anywhere.
 *
 * This is the control that a distributed credential-stuffing run has to get
 * past: rotating addresses defeats a per-IP limit completely, and this one does
 * not care where the attempt came from.
 *
 * ENUMERATION: the counter is keyed by the hash of whatever email was
 * SUBMITTED, without checking whether that account exists. A request for
 * `nobody@example.com` is throttled exactly as one for a real address, so the
 * limiter's behaviour reveals nothing about which addresses are registered.
 * That is why the key is built from the request body rather than from a lookup.
 */
export const authAccountLimiter = createLimiter({
  name: 'auth-account',
  windowMs: env.rateLimit.authWindowMs,
  max: env.rateLimit.authAccountMax,
  scope: 'ip',
  skipSuccessful: true,
  keyFrom: (req) => {
    const email = normaliseEmail((req.body as { email?: unknown } | undefined)?.email);
    // No email supplied: fall back to the address, so a malformed body cannot
    // be used to skip the limiter entirely.
    return email ? `email:${hashKeyPart(email)}` : `ip:${clientIp(req)}`;
  },
});

/** Refresh-token exchange. Anonymous by nature — the cookie is the credential. */
export const refreshLimiter = createLimiter({
  name: 'auth-refresh',
  windowMs: env.rateLimit.refreshWindowMs,
  max: env.rateLimit.refreshMax,
  scope: 'ip',
});

/** Password changes, per account. Authenticated, so the account is known. */
export const passwordChangeLimiter = createLimiter({
  name: 'auth-password',
  windowMs: env.rateLimit.passwordWindowMs,
  max: env.rateLimit.passwordMax,
  scope: 'account',
});

/**
 * Uploads, per account.
 *
 * Each request buffers a file into memory and then costs bandwidth and storage
 * at the provider, so this is much tighter than the general API budget.
 */
export const uploadLimiter = createLimiter({
  name: 'upload',
  windowMs: env.rateLimit.uploadWindowMs,
  max: env.rateLimit.uploadMax,
  scope: 'account',
});

/**
 * The contact and demo forms — the only writes an anonymous caller can reach.
 *
 * Per address, and hourly rather than per-quarter-hour: a real visitor submits
 * one form, occasionally two. Ten an hour is far past any honest use and far
 * below what makes spamming worthwhile.
 *
 * IP alone is imperfect here — a NAT shares one budget, and a botnet has many —
 * which is why the honeypot field on the contact form stays. Neither is
 * sufficient alone; together they cover each other's blind spot.
 */
export const publicWriteLimiter = createLimiter({
  name: 'public-write',
  windowMs: env.rateLimit.publicWriteWindowMs,
  max: env.rateLimit.publicWriteMax,
  scope: 'ip',
});

/** Authenticated mutations, per account. */
export const adminWriteLimiter = createLimiter({
  name: 'admin-write',
  windowMs: env.rateLimit.adminWriteWindowMs,
  max: env.rateLimit.adminWriteMax,
  scope: 'account',
});

/** Operations that copy records or fan out server-side work. */
export const expensiveLimiter = createLimiter({
  name: 'expensive',
  windowMs: env.rateLimit.expensiveWindowMs,
  max: env.rateLimit.expensiveMax,
  scope: 'account',
});

/**
 * Flood ceiling for the public read API.
 *
 * These reads are cached and idempotent and every page of the marketing site
 * depends on several of them, so this is set high enough to be invisible to a
 * real visitor. It replaces a blanket exemption: "cheap" is not "free", and an
 * unmetered endpoint is still a bandwidth amplifier.
 */
export const publicReadLimiter = createLimiter({
  name: 'public-read',
  windowMs: env.rateLimit.publicReadWindowMs,
  max: env.rateLimit.publicReadMax,
  scope: 'ip',
});

/**
 * Search, and any read carrying a query that defeats the cache.
 *
 * A plain collection read is one cache key shared by every visitor. A read with
 * `?q=` is a key per term, so it both misses the cache and costs an ILIKE
 * across several columns — a different cost profile that deserves a different
 * budget. Applied in addition to the read limiter, not instead of it.
 */
export const publicSearchLimiter = createLimiter({
  name: 'public-search',
  windowMs: env.rateLimit.publicSearchWindowMs,
  max: env.rateLimit.publicSearchMax,
  scope: 'ip',
});

/** Anonymous endpoints that stream a file. */
export const publicDownloadLimiter = createLimiter({
  name: 'public-download',
  windowMs: env.rateLimit.publicDownloadWindowMs,
  max: env.rateLimit.publicDownloadMax,
  scope: 'ip',
});

/**
 * Apply the search budget only to reads that actually carry a search or a
 * deep page — the shapes that miss the shared cache.
 */
export function publicReadGuard(req: Request, res: Response, next: NextFunction): void {
  const q = req.query.q ?? req.query.search;
  const page = Number(req.query.page ?? 1);
  const isExpensive = (typeof q === 'string' && q.trim() !== '') || page > 3;
  if (isExpensive) return publicSearchLimiter(req, res, next);
  return next();
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Progressive backoff
 * ────────────────────────────────────────────────────────────────────────── */

/** Lower-case and trim, so casing cannot mint a fresh budget. */
export function normaliseEmail(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const email = value.trim().toLowerCase();
  return email.length > 0 && email.length <= 254 ? email : undefined;
}

const BACKOFF_NAMESPACE = 'login';

/**
 * Delay a sign-in attempt in proportion to how many have recently failed for
 * the same email.
 *
 * A hard lock after N failures is the obvious design and the wrong one: it
 * hands anyone who knows an administrator's address a one-request denial of
 * service against that account. A delay costs an attacker their throughput —
 * the thing credential stuffing depends on — while a person who mistyped their
 * password once waits an imperceptible 400 ms and a person who mistyped it
 * five times waits a few seconds. The streak expires on its own, so nothing is
 * ever locked.
 *
 * The delay is applied BEFORE the attempt is processed, and identically
 * whether or not the address belongs to a real account, so its timing cannot
 * be used to distinguish the two.
 */
export const loginBackoff = (req: Request, _res: Response, next: NextFunction): void => {
  const email = normaliseEmail((req.body as { email?: unknown } | undefined)?.email);
  const subject = email ?? clientIp(req);

  void readFailures(BACKOFF_NAMESPACE, subject)
    .then((failures) => {
      if (failures < env.rateLimit.backoffAfter) return next();

      const steps = failures - env.rateLimit.backoffAfter + 1;
      const delay = Math.min(
        env.rateLimit.backoffMaxMs,
        env.rateLimit.backoffBaseMs * 2 ** (steps - 1),
      );
      setTimeout(next, delay);
    })
    .catch(() => next());
};

/** Record a failed sign-in for `email`. */
export async function noteLoginFailure(email: unknown, req: Request): Promise<void> {
  const normalised = normaliseEmail(email) ?? clientIp(req);
  await recordFailure(BACKOFF_NAMESPACE, normalised, env.rateLimit.backoffTtlMs).catch(() => {
    /* backoff is best-effort; the limiters remain */
  });
}

/** Clear the streak after a successful sign-in. */
export async function noteLoginSuccess(email: unknown, req: Request): Promise<void> {
  const normalised = normaliseEmail(email) ?? clientIp(req);
  await clearFailures(BACKOFF_NAMESPACE, normalised).catch(() => {
    /* nothing to do; the streak expires anyway */
  });
}

/** Chain applied to POST /auth/login. Order matters — see auth.routes. */
export const loginProtection = [
  authTotalLimiter,
  authIpLimiter,
  authAccountLimiter,
  loginBackoff,
];

/* ────────────────────────────────────────────────────────────────────────── *
 * Honeypot
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Field names the public forms render hidden. A human never sees them; a bot
 * that fills every input it finds does.
 */
const HONEYPOT_FIELDS = ['hp', 'website', 'company_website'] as const;

/**
 * Drop a submission whose honeypot field was filled.
 *
 * The contact form already had a honeypot, but only in the browser: it
 * discarded the submission client-side, so a bot posting straight at the API —
 * which is what a bot actually does — never encountered it. Checking here is
 * what makes it a control rather than a decoration.
 *
 * It answers with the same success envelope a real submission gets. Returning
 * an error would tell the author which field gave them away, and they would
 * simply stop filling it; a silent accept costs them a working submission and
 * no information.
 *
 * This is explicitly a SECOND line. The rate limiter runs before it, so a
 * honeypot hit still consumes the caller's budget, and a bot clever enough to
 * skip hidden fields is stopped by the limiter regardless.
 */
export function honeypotGuard(req: Request, res: Response, next: NextFunction): void {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const tripped = HONEYPOT_FIELDS.some(
    (field) => typeof body[field] === 'string' && (body[field] as string).trim() !== '',
  );

  if (!tripped) return next();

  logger.warn('Honeypot triggered on a public form', {
    requestId: req.requestId,
    route: req.baseUrl || req.path,
  });

  res.status(201).json({
    success: true,
    message: 'Submitted successfully',
    data: null,
  });
}
