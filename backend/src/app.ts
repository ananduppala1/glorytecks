import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { morganStream, logger } from './config/logger';
import { apiLimiter, publicReadLimiter, publicReadGuard } from './middlewares/rateLimit';
import {
  notFoundHandler,
  errorHandler,
  requestId,
  CORS_REJECTION,
} from './middlewares/error';
import { guardMediaUrls } from './middlewares/validate';
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
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // API only; CSP handled by the frontend host
  }),
);

/* ── CORS ──────────────────────────────────────────────────────────────── */
// Admin endpoints: restrict to configured admin origins (credentials allowed for cookies).
// Public endpoints: a permissive policy so the marketing site can read content.
const adminOrigins = env.cors.adminOrigins;
const publicAllowsAll = env.cors.publicOrigins === '*';
const publicOrigins = publicAllowsAll ? [] : env.cors.publicOrigins.split(',').map((s) => s.trim());

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Allow same-origin / server-to-server (no Origin header) and curl/health checks.
    if (!origin) return callback(null, true);
    if (adminOrigins.includes(origin)) return callback(null, true);
    if (publicAllowsAll || publicOrigins.includes(origin)) return callback(null, true);
    // A fixed sentinel, not a descriptive message. The error handler turns
    // this into a plain 403; the previous message was echoed to the caller as
    // a 500 body that repeated their origin and named the policy that blocked
    // it.
    return callback(new Error(CORS_REJECTION));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

/* ── Correlation id ────────────────────────────────────────────────────── */
// Assigned before anything can fail, so every log line and every error
// response for this request can be tied together.
app.use(requestId);

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
app.use(env.apiPrefix, (req, res, next) => {
  if (req.path.startsWith('/public') && req.method === 'GET') {
    return publicReadLimiter(req, res, (err?: unknown) =>
      err ? next(err) : publicReadGuard(req, res, next),
    );
  }
  return apiLimiter(req, res, next);
});

/* ── Body & cookie parsing ─────────────────────────────────────────────── */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser(env.cookie.secret));

/* ── Request logging ───────────────────────────────────────────────────── */
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
