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

/**
 * Values that must never be accepted as a real secret.
 *
 * A "missing variable" check is only half the guard, and it is the half that
 * catches the mistake nobody makes twice. The one that actually happens is a
 * developer's `.env` — carrying the documented dev fallback — being copied to
 * a server, or a placeholder from `.env.example` being pasted into a hosting
 * dashboard. The variable is then present, non-empty, and completely public.
 *
 * These are compared case-insensitively and are deliberately the same strings
 * this file and the examples publish.
 */
const KNOWN_WEAK_SECRETS = new Set(
  [
    'dev_cookie_secret',
    'changeme',
    'change_me',
    'changeme@12345',
    'secret',
    'mysecret',
    'password',
    'test',
    'test-cookie-secret',
    'placeholder',
    'your-secret-here',
    'replace-me',
  ].map((v) => v.toLowerCase()),
);

/** Shortest secret we are prepared to call a secret in production. */
const MIN_SECRET_LENGTH = 32;

/**
 * A high-entropy secret: required in production, and required to be *credible*.
 *
 * The distinction from `required()` matters. `required()` asks "is it set?";
 * this asks "is it a secret?" — because a present-but-guessable value fails
 * open in the worst way: everything boots, every test passes, and the signing
 * key is a word from a README.
 *
 * Generate one with: `openssl rand -base64 48`
 */
const secret = (key: string, devFallback: string): string => {
  const isProd = process.env.NODE_ENV === 'production';
  const raw = process.env[key];

  if (!isProd) return raw && raw !== '' ? raw : devFallback;

  if (!raw || raw === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  if (KNOWN_WEAK_SECRETS.has(raw.toLowerCase())) {
    throw new Error(
      `${key} is set to a known default/example value. Generate a real one ` +
        '(openssl rand -base64 48) and set it in the hosting platform.',
    );
  }
  if (raw.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${key} must be at least ${MIN_SECRET_LENGTH} characters in production ` +
        `(currently ${raw.length}). Generate one with: openssl rand -base64 48`,
    );
  }
  return raw;
};

/**
 * Is this value safe to use as a bootstrap password?
 *
 * Exported so the seed scripts can refuse to run rather than quietly creating
 * an administrator whose password is published in this repository.
 */
export const isWeakSecret = (value: string | undefined): boolean =>
  !value || value.length < 12 || KNOWN_WEAK_SECRETS.has(value.toLowerCase());

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

  /**
   * Refresh-token cookie.
   *
   * `httpOnly` is set at the call site and is not configurable — the whole
   * point of the cookie is that frontend JavaScript cannot read it.
   *
   * `secure` is FORCED ON in production rather than merely defaulted. It is a
   * boolean read from a string, so `COOKIE_SECURE` being absent, misspelt or
   * left at a development `false` silently ships a refresh token over
   * plaintext HTTP — a failure with no symptom until someone is on the wrong
   * network. There is no legitimate production configuration where it is off.
   */
  cookie: {
    secret: secret('COOKIE_SECRET', 'dev_cookie_secret'),
    secure: process.env.NODE_ENV === 'production' ? true : process.env.COOKIE_SECURE === 'true',
    sameSite: ((): 'lax' | 'strict' | 'none' => {
      const value = (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none';
      // `SameSite=None` is meaningless — and rejected by browsers — without
      // Secure. Refuse rather than emit a cookie every browser will drop.
      if (value === 'none' && process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE === 'false') {
        throw new Error('COOKIE_SAMESITE=none requires a secure cookie; browsers reject it otherwise.');
      }
      return value;
    })(),
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

  /**
   * Rate-limit policy.
   *
   * Every threshold and window is here rather than in route code: a limit is a
   * deployment decision that changes with traffic, and one that has to be
   * tunable without a release. Route files declare WHICH class of limit
   * applies; this declares what that class means.
   *
   * The defaults are sized for a training-institute CMS with a public
   * marketing site: generous enough that a real visitor filling in a form or an
   * editor working through a backlog never sees a 429, tight enough that
   * automated abuse does.
   */
  rateLimit: {
    /**
     * Number of proxies between the public internet and this app. Wrong in
     * either direction breaks IP limiting — see utils/clientIp.
     */
    trustProxyHops: toNumber(process.env.TRUST_PROXY_HOPS, 1),

    /**
     * What to do when Redis is unreachable.
     *  'degrade' (default) — fall back to per-process counters and log loudly.
     *  'local'             — always use per-process counters (single-instance
     *                        deployments, and tests).
     */
    failMode: (process.env.RATE_LIMIT_FAIL_MODE ?? 'degrade') as 'degrade' | 'local',

    /** Global ceiling for authenticated/admin API traffic. */
    windowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toNumber(process.env.RATE_LIMIT_MAX, 300),

    /* ── Authentication ────────────────────────────────────────────────── */
    authWindowMs: toNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    /** Failed sign-in attempts from one address. */
    authMax: toNumber(process.env.AUTH_RATE_LIMIT_MAX, 20),
    /**
     * Failed sign-in attempts against one email address, from anywhere.
     * This is what a distributed credential-stuffing run has to get past.
     */
    authAccountMax: toNumber(process.env.AUTH_ACCOUNT_RATE_LIMIT_MAX, 10),
    /** Ceiling on total sign-in attempts from one address, successes included. */
    authTotalMax: toNumber(process.env.AUTH_TOTAL_RATE_LIMIT_MAX, 60),

    /** Refresh-token exchanges per address. */
    refreshWindowMs: toNumber(process.env.REFRESH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    refreshMax: toNumber(process.env.REFRESH_RATE_LIMIT_MAX, 60),

    /** Password changes per account. */
    passwordWindowMs: toNumber(process.env.PASSWORD_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
    passwordMax: toNumber(process.env.PASSWORD_RATE_LIMIT_MAX, 10),

    /* ── Progressive backoff ───────────────────────────────────────────── */
    /**
     * Consecutive failures before a delay is applied, the delay's growth
     * factor, and its ceiling. A delay costs an attacker their throughput
     * while remaining invisible to someone who mistyped a password once.
     *
     * Deliberately a DELAY and not a lock: the streak expires on its own, so a
     * legitimate account can never be held out permanently by someone else's
     * failed attempts.
     */
    backoffAfter: toNumber(process.env.AUTH_BACKOFF_AFTER, 3),
    backoffBaseMs: toNumber(process.env.AUTH_BACKOFF_BASE_MS, 400),
    backoffMaxMs: toNumber(process.env.AUTH_BACKOFF_MAX_MS, 8_000),
    backoffTtlMs: toNumber(process.env.AUTH_BACKOFF_TTL_MS, 30 * 60 * 1000),

    /* ── Uploads ───────────────────────────────────────────────────────── */
    uploadWindowMs: toNumber(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    uploadMax: toNumber(process.env.UPLOAD_RATE_LIMIT_MAX, 60),

    /* ── Public writes (the only unauthenticated writes) ───────────────── */
    publicWriteWindowMs: toNumber(process.env.PUBLIC_WRITE_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
    publicWriteMax: toNumber(process.env.PUBLIC_WRITE_RATE_LIMIT_MAX, 10),

    /* ── Public reads ──────────────────────────────────────────────────── */
    /**
     * Deliberately high. These are cached, idempotent reads that every page of
     * the marketing site depends on, and a limit tight enough to matter to an
     * attacker would break a legitimate visitor with a warm browser cache.
     * This is a flood ceiling, not a quota.
     */
    publicReadWindowMs: toNumber(process.env.PUBLIC_READ_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    publicReadMax: toNumber(process.env.PUBLIC_READ_RATE_LIMIT_MAX, 300),
    /** Search is the expensive shape of a public read; it gets its own budget. */
    publicSearchWindowMs: toNumber(process.env.PUBLIC_SEARCH_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    publicSearchMax: toNumber(process.env.PUBLIC_SEARCH_RATE_LIMIT_MAX, 30),

    publicDownloadWindowMs: toNumber(process.env.PUBLIC_DOWNLOAD_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    publicDownloadMax: toNumber(process.env.PUBLIC_DOWNLOAD_RATE_LIMIT_MAX, 60),

    /* ── Authenticated writes ──────────────────────────────────────────── */
    adminWriteWindowMs: toNumber(process.env.ADMIN_WRITE_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    adminWriteMax: toNumber(process.env.ADMIN_WRITE_RATE_LIMIT_MAX, 200),
    /** Operations that copy or fan out server-side work. */
    expensiveWindowMs: toNumber(process.env.EXPENSIVE_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    expensiveMax: toNumber(process.env.EXPENSIVE_RATE_LIMIT_MAX, 20),
  },

  /**
   * Request payload limits.
   *
   * These bound the SHAPE of a request, which `express.json`'s byte limit does
   * not: 2 MB of deeply nested arrays parses within that limit and then costs
   * far more than 2 MB to walk, validate, store and re-serve. Environment
   * configurable because the right ceiling depends on the instance's memory
   * and on how large a legitimate blog post is allowed to get.
   */
  payload: {
    /** Nesting depth of a request body. */
    maxDepth: toNumber(process.env.PAYLOAD_MAX_DEPTH, 12),
    /** Total values (objects, arrays and scalars) in one body. */
    maxNodes: toNumber(process.env.PAYLOAD_MAX_NODES, 20_000),
    /** Properties on any single object. */
    maxKeys: toNumber(process.env.PAYLOAD_MAX_KEYS, 200),
    /** Entries in any single array. */
    maxArrayLength: toNumber(process.env.PAYLOAD_MAX_ARRAY_LENGTH, 1_000),

    /**
     * Pagination ceilings. `maxPage` matters as much as `maxLimit`: an
     * unbounded page number becomes an unbounded OFFSET, and Postgres reaches
     * a large offset by walking every row before it.
     */
    maxLimit: toNumber(process.env.LIST_MAX_LIMIT, 100),
    maxPage: toNumber(process.env.LIST_MAX_PAGE, 10_000),
    /** Characters accepted in a search term. */
    maxSearchLength: toNumber(process.env.LIST_MAX_SEARCH_LENGTH, 120),
    /** Sort keys accepted in one request. */
    maxSortKeys: toNumber(process.env.LIST_MAX_SORT_KEYS, 4),
  },

  /**
   * File-upload policy. Every threshold is environment-configurable so it can
   * be tightened per deployment without a code change; the defaults below are
   * the SECURE defaults, not the permissive ones.
   *
   * Nothing here is a substitute for the content inspection in
   * utils/fileSignature.ts — these are the cheap limits applied before any
   * expensive work happens.
   */
  upload: {
    /** Per-file ceilings enforced by multer (and re-checked after buffering). */
    imageMaxBytes: toNumber(process.env.UPLOAD_IMAGE_MAX_BYTES, 8 * 1024 * 1024),
    docMaxBytes: toNumber(process.env.UPLOAD_DOC_MAX_BYTES, 20 * 1024 * 1024),
    /** Smallest plausible real file; blocks 0-byte and truncated uploads. */
    minBytes: toNumber(process.env.UPLOAD_MIN_BYTES, 64),

    /** Multipart shape limits — applied before the body is buffered. */
    maxFiles: toNumber(process.env.UPLOAD_MAX_FILES, 1),
    maxFields: toNumber(process.env.UPLOAD_MAX_FIELDS, 8),
    maxFieldSizeBytes: toNumber(process.env.UPLOAD_MAX_FIELD_SIZE_BYTES, 4 * 1024),
    maxFieldNameSizeBytes: toNumber(process.env.UPLOAD_MAX_FIELD_NAME_BYTES, 100),
    maxParts: toNumber(process.env.UPLOAD_MAX_PARTS, 12),
    maxHeaderPairs: toNumber(process.env.UPLOAD_MAX_HEADER_PAIRS, 50),

    /**
     * Ceiling on simultaneous in-flight uploads per process. multer buffers
     * into memory, so this — not the per-file limit — is what bounds peak RSS.
     */
    maxConcurrent: toNumber(process.env.UPLOAD_MAX_CONCURRENT, 6),

    /** Longest filename accepted before sanitisation. */
    maxFilenameLength: toNumber(process.env.UPLOAD_MAX_FILENAME_LENGTH, 200),

    /**
     * SVG is executable content: it can carry <script>, event handlers and
     * external references, and Cloudinary serves it back with
     * `Content-Type: image/svg+xml`. It is DISABLED by default. When enabled,
     * uploads are not rewritten — they are rejected unless every element,
     * attribute and URL is provably inert (see utils/svgGuard.ts).
     */
    allowSvg: process.env.UPLOAD_ALLOW_SVG === 'true',
    /** Animated GIF support; disable to shrink the decoder attack surface. */
    allowGif: process.env.UPLOAD_ALLOW_GIF !== 'false',
    /** Legacy binary .doc (OLE2). Disabled by default — DOCX covers the need. */
    allowLegacyDoc: process.env.UPLOAD_ALLOW_LEGACY_DOC === 'true',
    /** Reject PDFs carrying JavaScript / launch actions / embedded files. */
    rejectActivePdf: process.env.UPLOAD_REJECT_ACTIVE_PDF !== 'false',

    /** ZIP (DOCX) decompression-bomb guards. */
    zipMaxEntries: toNumber(process.env.UPLOAD_ZIP_MAX_ENTRIES, 512),
    zipMaxTotalUncompressedBytes: toNumber(
      process.env.UPLOAD_ZIP_MAX_UNCOMPRESSED_BYTES,
      128 * 1024 * 1024,
    ),
    zipMaxCompressionRatio: toNumber(process.env.UPLOAD_ZIP_MAX_RATIO, 200),

    /**
     * Allowlist of upload destinations. The client may pick one of these and
     * nothing else — the value is never concatenated into a path unchecked.
     * Override with UPLOAD_FOLDERS as a comma-separated list.
     */
    folders: list(process.env.UPLOAD_FOLDERS).length
      ? list(process.env.UPLOAD_FOLDERS)
      : [
          // The two endpoint defaults…
          'images',
          'documents',
          // …and every destination the admin UI actually sends. Kept to
          // exactly that set: an allowlist with speculative entries in it is
          // a larger namespace than the product needs. `tests/upload.test.ts`
          // asserts this stays in step with the admin's upload call sites.
          'about',
          'authors',
          'avatars',
          'blog',
          'brand',
          'brochures',
          'companies',
          'courses',
          'gallery',
          'hero',
          'placements',
          'testimonials',
          'trainers',
        ],

    /**
     * Hosts a stored media URL may point at. Guards the fields that hold an
     * uploaded asset's URL (featured_image, brochure_url, avatar, …) so a
     * writer cannot swap in `javascript:`, `data:text/html`, or a host we then
     * fetch server-side in the brochure proxy.
     */
    /**
     * Relax the host allowlist for display-only media fields (images, logos,
     * avatars). Off by default. `brochureUrl` / `fileUrl` — the fields the
     * brochure proxy fetches server-side — ignore this and are always checked.
     */
    // A getter, matching `cloudinary.enabled` / `supabase.configured` above:
    // read at call time rather than frozen at import, so the flag reflects the
    // current environment and can be exercised in tests.
    get allowAnyHttpsMediaHost(): boolean {
      return process.env.MEDIA_ALLOW_ANY_HTTPS_HOST === 'true';
    },

    mediaHosts: list(process.env.MEDIA_URL_HOSTS).length
      ? list(process.env.MEDIA_URL_HOSTS)
      : ['res.cloudinary.com'],
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'gt:',
    enabled: process.env.CACHE_ENABLED !== 'false',
  },

  /**
   * Bootstrap account details for the seed scripts.
   *
   * `password` has NO fallback, on purpose. It previously defaulted to a value
   * printed in this file, in `.env.example` and in the README — so running
   * `npm run seed:admin` against a production project created an administrator
   * whose password was public. The seed scripts now refuse to run without an
   * explicit one (see isWeakSecret).
   */
  seedAdmin: {
    name: process.env.SEED_ADMIN_NAME ?? 'GloryTecks Admin',
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@glorytecks.com',
    password: process.env.SEED_ADMIN_PASSWORD ?? '',
  },

  logLevel: process.env.LOG_LEVEL ?? 'info',
};

export type Env = typeof env;
