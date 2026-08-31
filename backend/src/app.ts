import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { morganStream, logger } from './config/logger';
import { apiLimiter } from './middlewares/rateLimit';
import {
  notFoundHandler,
  errorHandler,
  requestId,
  CORS_REJECTION,
} from './middlewares/error';
import { guardMediaUrls } from './middlewares/validate';
import apiRouter from './routes';

const app: Application = express();

// Trust the first proxy (needed for correct client IPs behind Render/Railway/Nginx).
app.set('trust proxy', 1);

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

/* ── Rate limiting (skip the public read endpoints; they're cached/idempotent) ── */
app.use(env.apiPrefix, (req, res, next) => {
  if (req.path.startsWith('/public') && req.method === 'GET') return next();
  return apiLimiter(req, res, next);
});

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
