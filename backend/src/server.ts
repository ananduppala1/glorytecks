import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { checkSupabaseConnection } from './config/supabase';
import { connectRedis, disconnectRedis } from './config/redis';
import './config/cloudinary'; // initialise cloudinary config at boot
import { Server } from 'http';
import { redactText } from './utils/redact';

/* ─────────────────────────────────────────────────────────────────────────
 * Vercel Serverless:
 *
 * On Vercel the process never calls `app.listen()`. The platform imports this
 * module and invokes the exported `app` directly as a request handler.
 *
 * Unlike the MongoDB setup, there is no per-request connection guard: Supabase
 * is reached over stateless HTTP, so every invocation — warm or cold — can
 * query immediately.
 *
 * Long-running server (local dev / Railway / VM):
 *
 * `bootstrap()` is called once to verify Supabase, connect Redis and listen.
 * ──────────────────────────────────────────────────────────────────────── */

let server: Server;

async function bootstrap(): Promise<void> {
  try {
    // Fail fast with a clear message rather than on the first request.
    const db = await checkSupabaseConnection();
    if (!db.ok) {
      logger.error(
        `Could not reach Supabase at "${env.supabase.url}": ${db.error ?? 'unknown error'}. ` +
          'Check SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in admin-backend/.env, and make sure ' +
          'the migrations have been applied (`supabase db push`, or `supabase start` for a ' +
          'local stack). See admin-backend/.env.example.',
      );
      process.exit(1);
    }
    logger.info('Supabase reachable');

    await connectRedis(); // Non-blocking: app works without Redis

    server = app.listen(env.port, () => {
      logger.info(
        `🚀 GloryTecks Admin API listening on http://localhost:${env.port}${env.apiPrefix}`,
      );
    });
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down gracefully`);
  if (server) {
    server.close(async () => {
      await disconnectRedis();
      logger.info('HTTP server closed, Redis disconnected');
      process.exit(0);
    });
    // Force-exit if not closed within 10s.
    setTimeout(() => process.exit(1), 10_000).unref();
  } else {
    await disconnectRedis();
    process.exit(0);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
// These are the last-resort handlers, and the only log paths in the process
// that did not run their message through `redactText`. The message on an error
// that got this far is arbitrary library text — an ioredis failure quoting a
// REDIS_URL with an inline password, a client error carrying a bearer token —
// so it gets the same treatment as every other log line. The stack is kept
// as-is: file paths are what make this handler worth having, and they are a
// server-log concern, not a response one.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason: redactText(String(reason)) });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: redactText(err.message), stack: err.stack });
  process.exit(1);
});

// On Vercel the VERCEL env var is always set. Skip bootstrap (listen)
// and just export the Express app for the serverless runtime.
// if (!process.env.VERCEL) {
//   void bootstrap();
// }
if(process.env.VERCEL) {
  logger.info('VERCEL detected - initializing Redis');
  void connectRedis();
} else {
  logger.info('Non-Vercel environment - using bootstrap');
  void bootstrap();
}

// Default export for Vercel's @vercel/node builder (expects a request handler
// on `module.exports`). TypeScript's `export default` with CommonJS output
// places the value on `exports.default`, which @vercel/node does NOT detect.
// The explicit `module.exports` ensures Vercel receives the Express app.
// On non-Vercel platforms this export is harmless.
export default app;
module.exports = app;
