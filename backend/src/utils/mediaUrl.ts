import { env } from '../config/env';

/**
 * Validation for the fields that hold an uploaded asset's URL.
 *
 * The upload endpoints are hardened, but they are not the only way a URL gets
 * into `courses.brochure_url`, `blogs.featured_image` or `admin_users.avatar`:
 * every one of those columns is writable as a plain string through ordinary
 * CRUD. Without this, an author who never touches /uploads can store
 * `javascript:…`, `data:text/html;base64,…`, or a URL on a host they control,
 * and the platform will render or fetch it — which makes the upload pipeline's
 * guarantees decorative.
 *
 * The rule: a media URL is either a same-origin relative path, or an https URL
 * on an allowlisted host. Nothing else.
 */

/** Schemes that execute, or that smuggle a document into an image slot. */
const DANGEROUS_SCHEME = /^[a-z0-9+.-]*\s*:/i;

export type MediaUrlVerdict = { ok: true } | { ok: false; reason: string };

/**
 * Is `value` acceptable in a media URL column?
 *
 * Empty is acceptable — these fields are optional, and clearing one is a
 * normal edit.
 */
/**
 * Fields whose value the SERVER itself fetches or re-serves.
 *
 * These are held to the host allowlist unconditionally: `brochure_url` and
 * `file_url` are what the public brochure proxy performs an outbound GET on,
 * so an arbitrary host there is an SSRF primitive, not a styling choice.
 */
const SERVER_FETCHED_FIELDS = new Set(['brochureUrl', 'fileUrl']);

export function checkMediaUrl(value: unknown, opts: { enforceHost?: boolean } = {}): MediaUrlVerdict {
  if (value === undefined || value === null || value === '') return { ok: true };
  if (typeof value !== 'string') return { ok: false, reason: 'must be a URL string' };

  const raw = value.trim();
  if (raw === '') return { ok: true };
  if (raw.length > 2048) return { ok: false, reason: 'is too long' };

  // Control characters and whitespace inside a URL are how a `javascript:`
  // scheme gets past a naive prefix check while browsers still honour it.
  if (/[\s\u0000-\u0020\u007f-\u009f\u200b-\u200f\u202a-\u202e\ufeff]/.test(raw)) {
    return { ok: false, reason: 'contains invalid characters' };
  }

  // Protocol-relative (`//evil.test/x.svg`) inherits the page scheme and is a
  // remote URL wearing a relative URL's clothes.
  if (raw.startsWith('//')) return { ok: false, reason: 'must not be protocol-relative' };

  // Same-origin asset shipped with the frontend, e.g. `/images/logo.png`.
  if (raw.startsWith('/')) {
    if (raw.includes('..')) return { ok: false, reason: 'must not contain path traversal' };
    return { ok: true };
  }

  // Anything else must be an absolute https URL we are willing to talk to.
  if (DANGEROUS_SCHEME.test(raw) && !/^https:\/\//i.test(raw)) {
    return { ok: false, reason: 'must use https' };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: 'is not a valid URL' };
  }

  if (parsed.protocol !== 'https:') return { ok: false, reason: 'must use https' };
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'must not contain credentials' };
  }
  // Host allowlisting is on by default. It is relaxable for display-only
  // fields (MEDIA_ALLOW_ANY_HTTPS_HOST=true) so a deployment carrying legacy
  // rows on other hosts is not forced to edit data before it can save a
  // record — the scheme rules above, which are what stop code execution, stay
  // in force either way, and the brochure proxy re-checks the host at fetch
  // time regardless of this setting.
  const enforceHost = opts.enforceHost ?? !env.upload.allowAnyHttpsMediaHost;
  if (enforceHost && !isAllowedMediaHost(parsed.hostname)) {
    return { ok: false, reason: 'is not on an approved media host' };
  }
  return { ok: true };
}

/**
 * Host allowlist check.
 *
 * An entry may be an exact host (`res.cloudinary.com`) or a suffix wildcard
 * (`.example.com`), so a deployment can permit its own CDN without listing
 * every subdomain.
 */
export function isAllowedMediaHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return env.upload.mediaHosts.some((entry) => {
    const allowed = entry.toLowerCase().trim();
    if (!allowed) return false;
    if (allowed.startsWith('.')) return host === allowed.slice(1) || host.endsWith(allowed);
    return host === allowed;
  });
}

/** Convenience wrapper for express-validator's `.custom()`. */
export function assertMediaUrl(field: string) {
  return (value: unknown): boolean => {
    const verdict = checkMediaUrl(value);
    if (!verdict.ok) throw new Error(`${field} ${verdict.reason}`);
    return true;
  };
}

/**
 * Every field across the schema that holds an uploaded asset's URL.
 *
 * Kept as one list so a new media column cannot quietly skip validation:
 * `sanitizeMediaFields` walks it for every write, whichever route the write
 * arrived on.
 */
export const MEDIA_URL_FIELDS = [
  'avatar',
  'image',
  'imageUrl',
  'logo',
  'thumbnail',
  'featuredImage',
  'bannerImage',
  'brochureUrl',
  'fileUrl',
  'heroImage',
  'ogImage',
  'defaultOgImage',
] as const;

/** Media fields that are arrays of URLs. */
export const MEDIA_URL_ARRAY_FIELDS = ['images'] as const;

export interface MediaFieldError {
  field: string;
  message: string;
}

/**
 * Validate every media URL present in a request body, at any depth the schema
 * actually nests them (`seo.ogImage`, `sections[].image`, block payloads).
 *
 * Returns the offending fields rather than throwing, so the caller can report
 * them in the API's existing 422 shape.
 */
export function collectMediaUrlErrors(body: unknown, path = '', depth = 0): MediaFieldError[] {
  // The block/section trees are shallow; a depth cap keeps a hostile payload
  // from turning validation itself into the expensive operation.
  if (depth > 8 || body === null || typeof body !== 'object') return [];

  const errors: MediaFieldError[] = [];

  if (Array.isArray(body)) {
    body.forEach((item, i) => errors.push(...collectMediaUrlErrors(item, `${path}[${i}]`, depth + 1)));
    return errors;
  }

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    const here = path ? `${path}.${key}` : key;

    if ((MEDIA_URL_FIELDS as readonly string[]).includes(key)) {
      // A media key holding a structure (e.g. `{ url, alt }`) is a different
      // shape, not a bad URL — descend instead of rejecting it.
      if (value && typeof value === 'object') {
        errors.push(...collectMediaUrlErrors(value, here, depth + 1));
        continue;
      }
      const verdict = checkMediaUrl(value, {
        enforceHost: SERVER_FETCHED_FIELDS.has(key) ? true : undefined,
      });
      if (!verdict.ok) errors.push({ field: here, message: `${key} ${verdict.reason}` });
      continue;
    }

    if ((MEDIA_URL_ARRAY_FIELDS as readonly string[]).includes(key) && Array.isArray(value)) {
      value.forEach((entry, i) => {
        const verdict = checkMediaUrl(entry);
        if (!verdict.ok) errors.push({ field: `${here}[${i}]`, message: `${key} ${verdict.reason}` });
      });
      continue;
    }

    if (value && typeof value === 'object') {
      errors.push(...collectMediaUrlErrors(value, here, depth + 1));
    }
  }

  return errors;
}
