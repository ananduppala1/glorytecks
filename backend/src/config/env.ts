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
    uploadWindowMs: toNumber(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    uploadMax: toNumber(process.env.UPLOAD_RATE_LIMIT_MAX, 60),
    publicDownloadWindowMs: toNumber(process.env.PUBLIC_DOWNLOAD_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    publicDownloadMax: toNumber(process.env.PUBLIC_DOWNLOAD_RATE_LIMIT_MAX, 60),
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

  seedAdmin: {
    name: process.env.SEED_ADMIN_NAME ?? 'GloryTecks Admin',
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@glorytecks.com',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe@12345',
  },

  logLevel: process.env.LOG_LEVEL ?? 'info',
};

export type Env = typeof env;
