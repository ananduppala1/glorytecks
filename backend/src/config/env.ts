import dotenv from 'dotenv';
import path from 'path';

// On Vercel (and most production hosts) env vars are injected directly into
// process.env.  Only load from a `.env` file during local development.
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

/**
 * Centralised, validated environment configuration.
 * Importing this module guarantees required variables exist before the app boots.
 */

type NodeEnv = 'development' | 'production' | 'test';

const required = (key: string, fallback?: string): string => {
  // SECURITY: dev fallbacks must never be used in production — a guessable
  // cookie secret, or a missing Supabase key, lets requests be forged.
  // In production the variable itself must be set or the app refuses to boot.
  const isProd = process.env.NODE_ENV === 'production';
  const value = process.env[key] ?? (isProd ? undefined : fallback);
  if (value === undefined || value === '') {
    if (isProd) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return '';
  }
  return value;
};

const toNumber = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const list = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const env = {
  nodeEnv: (process.env.NODE_ENV ?? 'development') as NodeEnv,
  isProd: process.env.NODE_ENV === 'production',
  port: toNumber(process.env.PORT, 5000),
  apiPrefix: process.env.API_PREFIX ?? '/api/v1',

  /**
   * Supabase — the application database (PostgreSQL) and the identity provider.
   *
   * `serviceRoleKey` is SERVER-ONLY. It bypasses Row Level Security and must
   * never be sent to a browser, logged, or returned from an endpoint.
   * `anonKey` is used only to exchange credentials for a session at login; it
   * carries no privileges of its own.
   * `jwtSecret` is optional: when present, access tokens are verified locally
   * (HS256) instead of with a network call to the Auth server on each request.
   */
  supabase: {
    url: required('SUPABASE_URL', 'http://127.0.0.1:54321'),
    anonKey: required('SUPABASE_ANON_KEY', ''),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY', ''),
    jwtSecret: process.env.SUPABASE_JWT_SECRET ?? '',
    get configured(): boolean {
      return Boolean(
        process.env.SUPABASE_URL &&
          process.env.SUPABASE_ANON_KEY &&
          process.env.SUPABASE_SERVICE_ROLE_KEY,
      );
    },
  },

  cookie: {
    secret: required('COOKIE_SECRET', 'dev_cookie_secret'),
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none',
  },

  cors: {
    adminOrigins: list(process.env.CORS_ORIGINS) || ['http://localhost:5000'],
    publicOrigins: process.env.PUBLIC_CORS_ORIGINS ?? '*',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    folder: process.env.CLOUDINARY_UPLOAD_FOLDER ?? 'glorytecks',
    get enabled(): boolean {
      return Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET,
      );
    },
  },

  rateLimit: {
    windowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toNumber(process.env.RATE_LIMIT_MAX, 300),
    authMax: toNumber(process.env.AUTH_RATE_LIMIT_MAX, 20),
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'gt:',
    enabled: process.env.CACHE_ENABLED !== 'false',
  },

  seedAdmin: {
    name: process.env.SEED_ADMIN_NAME ?? 'GloryTecks Admin',
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@glorytecks.com',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe@12345',
  },

  logLevel: process.env.LOG_LEVEL ?? 'info',
};

export type Env = typeof env;
