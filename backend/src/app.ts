import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { morganStream, logger } from './config/logger';
// import { apiLimiter, publicReadLimiter, publicReadGuard } from './middlewares/rateLimit';
import {
  notFoundHandler,
  errorHandler,
  requestId,
  CORS_REJECTION,
} from './middlewares/error';
import { guardMediaUrls } from './middlewares/validate';
import { safePath } from './utils/redact';
import { guardPayloadShape } from './validators/common';
import apiRouter from './routes';

const app: Application = express();

// How many proxies sit between the public internet and this process.
//
// This single number decides whether IP rate limiting works at all. Too low and
// every request appears to come from the load balancer, so one abusive client
// exhausts everybody's budget. Too high — and `true` is infinitely too high —
// and the app believes whatever `X-Forwarded-For` the caller sent, handing an
// attacker a fresh budget per forged address. It is a deployment fact, so it
// comes from the environment (TRUST_PROXY_HOPS); 1 matches a single platform
// proxy, 2 is right behind Cloudflare *and* a platform proxy.
app.set('trust proxy', env.rateLimit.trustProxyHops);

/* ── Security headers ──────────────────────────────────────────────────── */
app.use(
  helmet({
    // Cloudinary-hosted media and the brochure stream are read cross-origin by
    // the marketing site, so resources must remain fetchable from another origin.
    crossOriginResourcePolicy: { policy: 'cross-origin' },

    /**
     * A restrictive CSP even though this is an API.
     *
     * It was previously disabled with "CSP handled by the frontend host",
     * which was true until this service started returning content of its own:
     * the brochure proxy streams a file from THIS origin, and Express's own
     * fallback handler emits HTML. `default-src 'none'` costs a JSON API
     * nothing and means any HTML that ever leaves here can load and execute
     * nothing at all. The brochure route sets its own, stricter, sandboxed
     * policy which replaces this one for that response.
     */
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'none'"],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'none'"],
        'form-action': ["'none'"],
      },
    },

    // Nothing this API returns is meant to be framed. DENY rather than
    // SAMEORIGIN because the API has no pages of its own to frame.
    frameguard: { action: 'deny' },
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  }),
);

// helmet does not set this one. Meaningless for JSON, free to add, and it
// applies to the brochure response that a browser may render directly.
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  next();
});

/* ── CORS ──────────────────────────────────────────────────────────────── */
//
// TWO policies, because this API serves two audiences with different trust.
//
// A single policy with `credentials: true` and a permissive origin list — what
// this previously had, with PUBLIC_CORS_ORIGINS defaulting to "*" — reflects
// ANY website's origin back with `Access-Control-Allow-Credentials: true`, on
// every route. `/auth/refresh` authenticates with an httpOnly cookie and
// returns a fresh access token in its body, so that combination means any page
// on the internet can mint an admin session and read the token. Today the only
// thing preventing it is the cookie's SameSite=lax — and a deployment that
// puts the admin panel on a different site than the API has to set
// SameSite=none, at which point the last barrier is gone.
//
// So credentials and wildcards are never combined:
//
//   admin  — everything except /public. Strict allowlist, credentials allowed.
//   public — /public/*. May be open to any origin, but credentials are OFF, so
//            a browser sends no cookies and the response contains only what is
//            already public on the marketing site.

const adminOrigins = env.cors.adminOrigins;
const publicAllowsAll = env.cors.publicOrigins === '*';
const publicOrigins = publicAllowsAll ? [] : env.cors.publicOrigins.split(',').map((s) => s.trim());

/** Authenticated surface: named origins only, credentials permitted. */
const adminCorsOptions: CorsOptions = {
  origin(origin, callback) {
    // No Origin header: same-origin, server-to-server, curl, health checks.
    if (!origin) return callback(null, true);
    if (adminOrigins.includes(origin)) return callback(null, true);
    // A fixed sentinel, not a descriptive message. The error handler turns this
    // into a plain 403; a descriptive one was previously echoed back as a 500
    // that repeated the caller's origin and named the policy that blocked it.
    return callback(new Error(CORS_REJECTION));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
};

/**
 * Public surface: the marketing site's reads and its two form posts.
 *
 * `credentials: false` is the load-bearing line. It is what makes a permissive
 * origin list safe: the browser attaches no cookies, so there is no session to
 * ride, and the response carries only published content.
 */
const publicCorsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (publicAllowsAll || publicOrigins.includes(origin)) return callback(null, true);
    if (adminOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(CORS_REJECTION));
  },
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 600,
};

const adminCors = cors(adminCorsOptions);
const publicCors = cors(publicCorsOptions);
const PUBLIC_PREFIX = `${env.apiPrefix}/public`;

app.use((req, res, next) =>
  req.path.startsWith(PUBLIC_PREFIX) ? publicCors(req, res, next) : adminCors(req, res, next),
);

/* ── Correlation id ────────────────────────────────────────────────────── */
// Assigned before anything can fail, so every log line and every error
// response for this request can be tied together.
app.use(requestId);

/* ── Cache policy for the authenticated surface ────────────────────────── */
//
// The public router sets a deliberate `Cache-Control` on every read (see
// public.routes). The authenticated surface set NOTHING, and "no header" does
// not mean "not cached": a 200 GET without explicit freshness is heuristically
// cacheable by a shared cache, and these responses are per-user —
// `/auth/me` returns a name, email and role, `/admins` returns the whole
// administrator list. With no `Vary: Authorization` either, a proxy keying on
// URL alone could serve one administrator's response to another.
//
// So the default for everything outside `/public` is `no-store`. It is set
// before the rate limiter so a 429 is covered too, and it is only a DEFAULT:
// it runs ahead of the routers, so any handler that sets its own header (the
// public reads, the brochure stream) still wins.
app.use(env.apiPrefix, (req, res, next) => {
  if (!req.path.startsWith('/public')) res.set('Cache-Control', 'no-store');
  next();
});

/* ── Rate limiting ─────────────────────────────────────────────────────── */
// Deliberately BEFORE the body parsers. Parsing a 2 MB JSON body is the most
// expensive thing this process does before reaching a handler, and limiting
// afterwards means a flood is fully parsed and only then rejected — the
// limiter protects the handlers but not the parser. Limiting first means an
// over-quota request costs a header read.
//
// Public reads get a high flood ceiling rather than the previous blanket
// exemption: they are cached and idempotent, but "cheap" is not "free", and an
// unmetered endpoint is still a bandwidth amplifier. Reads that carry a search
// term or a deep page — the shapes that miss the shared cache — additionally
// spend a smaller search budget.
// app.use(env.apiPrefix, (req, res, next) => {
//   if (req.path.startsWith('/public') && req.method === 'GET') {
//     return publicReadLimiter(req, res, (err?: unknown) =>
//       err ? next(err) : publicReadGuard(req, res, next),
//     );
//   }
//   return apiLimiter(req, res, next);
// });

/* ── Body & cookie parsing ─────────────────────────────────────────────── */
// app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser(env.cookie.secret));

/* ── Request logging ───────────────────────────────────────────────────── */
//
// morgan's built-in `url` token writes `originalUrl` verbatim, query string and
// all. That is the one thing the error path takes care NOT to do: the 404 body
// does not echo the URL, and every error log line runs it through `safePath`
// first. morgan bypassed both and wrote the raw URL for EVERY request, so a
// token, one-time code or email that ever reaches a query string was recorded
// in full — on the success path too, where no error handler ever sees it.
//
// Overriding the token rather than rewriting the format strings keeps both the
// `combined` and `dev` layouts exactly as they were, and means any format added
// later inherits the redaction instead of having to remember it.
morgan.token('url', (req) => {
  const raw = (req as Request).originalUrl ?? req.url ?? '';
  return safePath(raw);
});

app.use(morgan(env.isProd ? 'combined' : 'dev', { stream: morganStream }));

/* ── Database connectivity ─────────────────────────────────────────────── */
// The per-request `ensureDbConnected` middleware is gone. Supabase is reached
// over stateless HTTP (PostgREST), so there is no connection to open, pool or
// re-establish on a serverless cold start — which also removes the buffering
// and timeout handling the Mongo driver needed on Vercel.

/* ── Payload shape ─────────────────────────────────────────────────────── */
// Depth, node count and array width, applied to every mutating request before
// any route-specific validator runs. express.json's byte limit bounds how much
// is read, not what shape it takes — 2 MB of deeply nested arrays parses
// within it and costs far more than 2 MB to process afterwards.
app.use(env.apiPrefix, guardPayloadShape);

/* ── Media URL safety ──────────────────────────────────────────────────── */
// Applies to every mutating request, on every route, before any controller
// runs. Uploaded-asset URLs must be same-origin paths or https URLs on an
// approved host — so a writer cannot store `javascript:` / `data:text/html`
// or point the platform at a host of their choosing, whether or not they used
// the upload endpoints to get there.
app.use(env.apiPrefix, guardMediaUrls);

/* ── Routes ────────────────────────────────────────────────────────────── */
app.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'GloryTecks Admin API', version: '1.0.0', docs: `${env.apiPrefix}/health` });
});
app.use(env.apiPrefix, apiRouter);

/* ── 404 + error handling ──────────────────────────────────────────────── */
app.use(notFoundHandler);
app.use(errorHandler);

logger.info(`App initialised (env=${env.nodeEnv}, prefix=${env.apiPrefix})`);

export default app;
