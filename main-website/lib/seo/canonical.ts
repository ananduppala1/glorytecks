// ─────────────────────────────────────────────────────────────────────────────
// Canonical URL system — the single source of truth for every absolute URL this
// site emits: <link rel="canonical">, og:url, JSON-LD @id/url values and every
// <loc> in every sitemap.
//
// Everything in this module is pure and synchronous so it can be unit-tested
// without a server, a network or a DOM. See canonical.test.ts.
//
// Rules implemented here (and only here):
//   • the production origin is https://glorytecks.com
//   • canonical URLs are always absolute
//   • no trailing slash, except the homepage which is exactly "/"
//   • query parameters are normalised against a per-route allow-list, in a
//     fixed order, so two URLs that render the same page produce one canonical
//   • a canonical always points at the preferred INDEXABLE form of the page it
//     is on — never at an unrelated page
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The production origin. Hardcoded on purpose: it is the answer every
 * environment must agree on, and a missing or malformed env var must not be
 * able to publish canonicals on some other host.
 */
export const PRODUCTION_ORIGIN = 'https://glorytecks.com';

export interface OriginResolution {
  origin: string;
  /** True when `origin` is the production origin. */
  isProduction: boolean;
  /** Set when the supplied value was rejected, for logging. */
  warning?: string;
}

/**
 * Validate and normalise a configured site origin.
 *
 * Accepts an absolute http(s) URL with no path, query or fragment. Anything
 * else — a bare hostname, a path, a `javascript:` URL, an empty string — is
 * rejected and the production origin is used instead. Trailing slashes are
 * stripped, the host is lower-cased, and a default port is dropped.
 *
 * Pure: takes the raw value rather than reading process.env, so tests can drive
 * every branch.
 */
export function resolveSiteOrigin(raw: string | undefined | null): OriginResolution {
  const value = (raw ?? '').trim();

  if (!value) {
    return { origin: PRODUCTION_ORIGIN, isProduction: true };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return {
      origin: PRODUCTION_ORIGIN,
      isProduction: true,
      warning: `NEXT_PUBLIC_SITE_URL is not a valid absolute URL (${value}); using ${PRODUCTION_ORIGIN}`,
    };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return {
      origin: PRODUCTION_ORIGIN,
      isProduction: true,
      warning: `NEXT_PUBLIC_SITE_URL must be http(s) (${value}); using ${PRODUCTION_ORIGIN}`,
    };
  }

  // A site origin with a path, query or fragment would silently corrupt every
  // canonical built from it.
  if ((url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    return {
      origin: PRODUCTION_ORIGIN,
      isProduction: true,
      warning: `NEXT_PUBLIC_SITE_URL must be an origin with no path (${value}); using ${PRODUCTION_ORIGIN}`,
    };
  }

  const origin = url.origin;
  return { origin, isProduction: origin === PRODUCTION_ORIGIN };
}

const resolved = resolveSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);

if (resolved.warning && process.env.NODE_ENV !== 'test') {
  // Visible in the build log rather than silently wrong in production HTML.
  console.warn(`[seo] ${resolved.warning}`);
}

/** The origin every absolute URL on this deployment is built from. */
export const SITE_ORIGIN = resolved.origin;

/**
 * True only on the real production origin. Used to decide whether a deployment
 * may invite crawling at all — a preview build must not compete with
 * glorytecks.com for the same content.
 */
export const IS_PRODUCTION_ORIGIN = resolved.isProduction;

/* ── Path normalisation ───────────────────────────────────────────────────── */

/**
 * Normalise a site-relative path into its canonical form.
 *
 *   ""            → "/"
 *   "courses"     → "/courses"
 *   "/courses/"   → "/courses"
 *   "//courses"   → "/courses"
 *   "/a//b/"      → "/a/b"
 *   "/"           → "/"   (the homepage keeps its slash)
 *
 * Any query string or fragment already present is discarded — query parameters
 * belong to `canonicalPath`'s explicit `params` argument, which is where the
 * allow-list is applied.
 */
export function normalizePath(path: string | undefined | null): string {
  let p = (path ?? '').trim();
  if (!p) return '/';

  // Drop anything after the path; callers pass query params explicitly.
  p = p.split('#')[0].split('?')[0];

  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');

  return p === '' ? '/' : p;
}

/* ── Query normalisation ──────────────────────────────────────────────────── */

export type CanonicalParams = Record<string, string | number | undefined | null>;

/**
 * The only query parameters that may ever survive onto a canonical URL.
 *
 * Everything else — `q`, `tag`, `sort`, `utm_*`, `fbclid`, … — is stripped,
 * which is what collapses the filtered-archive URL space back onto the clean
 * archive. Lives here rather than in ./routes so that `canonicalPath` can use
 * it as a default without a circular import.
 */
export const CANONICAL_QUERY_ALLOWLIST = ['page'] as const;

/** Split a site-relative URL into its path and its raw query string. */
function splitQuery(value: string): [path: string, query: string] {
  const withoutHash = value.split('#')[0];
  const at = withoutHash.indexOf('?');
  return at === -1 ? [withoutHash, ''] : [withoutHash.slice(0, at), withoutHash.slice(at + 1)];
}

/** Read a raw query string into the shape `normalizeQuery` consumes. */
function paramsFromQuery(query: string): CanonicalParams {
  if (!query) return {};
  const out: CanonicalParams = {};
  for (const [key, value] of new URLSearchParams(query)) {
    // First occurrence wins, so `?page=2&page=9` cannot produce two canonicals.
    if (!(key in out)) out[key] = value;
  }
  return out;
}

/**
 * Serialise the canonical query string.
 *
 * `order` fixes the parameter order so `?a=1&b=2` and `?b=2&a=1` cannot become
 * two canonicals. Empty, null and undefined values are dropped. Callers are
 * expected to have already decided which parameters belong on the canonical —
 * this function does not guess.
 */
export function normalizeQuery(params: CanonicalParams | undefined, order: readonly string[]): string {
  if (!params) return '';

  const usp = new URLSearchParams();
  for (const key of order) {
    const value = params[key];
    if (value === undefined || value === null) continue;
    const s = String(value).trim();
    if (!s) continue;
    usp.set(key, s);
  }

  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

/* ── Canonical builders ───────────────────────────────────────────────────── */

/**
 * Canonical site-relative path (+ normalised query), e.g. `/blog?page=2`.
 *
 * `path` may already carry a query string: it is re-parsed and filtered
 * through the same allow-list, so passing a canonical back in is a no-op and
 * passing `/blog?q=python&page=2` yields `/blog?page=2`. Explicit `params`
 * replace anything on the path entirely.
 */
export function canonicalPath(
  path: string,
  params?: CanonicalParams,
  order: readonly string[] = CANONICAL_QUERY_ALLOWLIST,
): string {
  const [rawPath, rawQuery] = splitQuery(path ?? '');
  const resolved = params ?? paramsFromQuery(rawQuery);
  return `${normalizePath(rawPath)}${normalizeQuery(resolved, order)}`;
}

/**
 * Absolute canonical URL. This is the only function that should ever produce a
 * `https://…` URL for this site.
 *
 * The homepage is the bare origin — `https://glorytecks.com`, with no trailing
 * slash. That is not a style preference: Next's Metadata API normalises a
 * `metadataBase`-resolved canonical to the no-trailing-slash form before it
 * renders `<link rel="canonical">`, so the rendered tag says
 * `https://glorytecks.com` whatever we pass. Emitting `…com/` from the sitemap
 * and JSON-LD would leave those disagreeing with the tag on the page for no
 * gain — the two are the same resource, so the site standardises on the form
 * the framework actually renders.
 */
export function canonicalUrl(
  path: string,
  params?: CanonicalParams,
  order: readonly string[] = CANONICAL_QUERY_ALLOWLIST,
): string {
  return joinOrigin(SITE_ORIGIN, canonicalPath(path, params, order));
}

/**
 * Same as {@link canonicalUrl} but against an explicit origin. Used by the
 * tests to assert behaviour independently of the ambient environment.
 */
export function canonicalUrlFor(
  origin: string,
  path: string,
  params?: CanonicalParams,
  order: readonly string[] = CANONICAL_QUERY_ALLOWLIST,
): string {
  return joinOrigin(resolveSiteOrigin(origin).origin, canonicalPath(path, params, order));
}

function joinOrigin(origin: string, path: string): string {
  return path === '/' ? origin : `${origin}${path}`;
}

/**
 * True when `url` is a well-formed absolute canonical for this site: the
 * expected origin, a normalised path, no fragment, and the homepage in its
 * bare-origin form.
 *
 * Used by the automated SEO tests to reject malformed canonicals and
 * accidental staging hostnames.
 */
export function isValidCanonical(url: string, origin: string = SITE_ORIGIN): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.origin !== origin) return false;
  if (parsed.hash) return false;

  const path = parsed.pathname;
  if (!path.startsWith('/')) return false;
  if (path.includes('//')) return false;

  // The homepage must be the bare origin, so a sitemap entry cannot disagree
  // with the canonical tag Next renders for the same page.
  if (path === '/') return url === origin && !parsed.search;
  if (path.endsWith('/')) return false;

  return true;
}
