// ─────────────────────────────────────────────────────────────────────────────
// SEO helpers — the public surface of the SEO layer.
//
// This module is the Next.js replacement for the React app's `useSEO()` hook.
// The hook mutated <head> from a useEffect *after* hydration, which meant
// crawlers and social scrapers that don't execute JavaScript saw only the
// generic tags baked into index.html. Every tag it produced is reproduced here
// and emitted server-side through the Metadata API.
//
// Tag-for-tag parity with the old hook:
//   title · description · robots · canonical · rel=prev/next ·
//   og:title · og:description · og:url · og:type · og:image · og:image:alt ·
//   og:site_name · og:locale · twitter:card · twitter:title ·
//   twitter:description · twitter:image · twitter:site
// JSON-LD (page schema + BreadcrumbList) is rendered by <JsonLd /> — see
// components/seo/JsonLd.tsx.
//
// Everything URL-shaped is delegated to ./canonical, which is the only place
// that knows what this site's origin is or how a path is normalised.
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';

import { SITE_ORIGIN, canonicalPath, canonicalUrl } from './canonical';
import { staticRoute } from './routes';

export {
  PRODUCTION_ORIGIN,
  SITE_ORIGIN,
  IS_PRODUCTION_ORIGIN,
  resolveSiteOrigin,
  normalizePath,
  normalizeQuery,
  canonicalPath,
  canonicalUrl,
  isValidCanonical,
} from './canonical';

export {
  STATIC_ROUTES,
  DYNAMIC_ROUTES,
  STATIC_PAGE_REVIEWED,
  CANONICAL_QUERY_ORDER,
  FILTER_PARAMS,
  staticRoute,
} from './routes';
export type { StaticRoute, DynamicRoutePattern, SitemapName } from './routes';

/**
 * Canonical public origin.
 *
 * Retained under its historical name because `lib/schema.ts`, the root layout
 * and every JSON-LD document build `@id` values from it. Identical to
 * `SITE_ORIGIN` — no trailing slash.
 */
export const SITE_URL = SITE_ORIGIN;

export const SITE_NAME = 'GloryTecks — IT Training Institute Hyderabad';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.jpg`;
export const TWITTER_HANDLE = '@glorytecks';

/**
 * Absolute URL for a site-relative path.
 *
 * Now normalised: `/courses/` and `//courses` both produce
 * `https://glorytecks.com/courses`, so an og:url can no longer disagree with
 * the canonical for the same page.
 */
export const absoluteUrl = (path = '/') => canonicalUrl(path);

export interface SeoInput {
  title: string;
  description: string;
  /**
   * Site-relative canonical path. Normalised before use.
   *
   * Omit it when the page must not advertise a canonical — a 404 body or a
   * filtered archive. Never point it at a different page to hide a duplicate.
   */
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  /**
   * NOTE: there is deliberately no `keywords` field.
   *
   * Google has ignored the meta keywords tag since 2009, Bing treats it as a
   * spam signal, and the tag published this site's whole target keyword list
   * to competitors for free. It was removed rather than trimmed, and it is not
   * replaced by any other keyword-injection mechanism — relevance now comes
   * from the title, the H1, the body copy, internal links and structured data.
   * `lib/seo/routes.ts` records one `primaryIntent` per page for humans; it is
   * never rendered.
   */
  /** Shorthand for `{ index: false, follow: false }`. */
  noindex?: boolean;
  /** Fine-grained control; overrides `noindex` when supplied. */
  index?: boolean;
  follow?: boolean;
  /** Site-relative URL of the previous page in a paginated series. */
  prevUrl?: string;
  /** Site-relative URL of the next page in a paginated series. */
  nextUrl?: string;
}

/**
 * Build a Next.js Metadata object equivalent to one `useSEO({...})` call.
 */
export function buildMetadata({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  noindex = false,
  index,
  follow,
  prevUrl,
  nextUrl,
}: SeoInput): Metadata {
  const resolvedOgTitle = ogTitle || title;
  const resolvedOgDescription = ogDescription || description;
  const resolvedOgImage = ogImage || DEFAULT_OG_IMAGE;

  const mayIndex = index ?? !noindex;
  // `noindex` on its own still implies nofollow, preserving the old hook's two
  // robots strings. `follow` can now be set independently, which is what
  // filtered archives and utility pages need: keep them out of the index
  // without throwing away the links they carry.
  const mayFollow = follow ?? !noindex;

  const canonicalHref = canonical ? canonicalUrl(canonical) : undefined;

  // The old hook always emitted og:url, defaulting to "/" when no canonical
  // was supplied — so a 404 body and a search-results page both told every
  // social scraper they were the homepage. og:url is now simply omitted when
  // there is nothing true to put in it. Only pages that are already `noindex`
  // lack a canonical, so no indexable page loses a tag.
  const ogUrl = canonicalHref;

  const metadata: Metadata = {
    title,
    description,
    robots: mayIndex
      ? {
          index: true,
          follow: mayFollow,
          'max-image-preview': 'large',
          'max-snippet': -1,
          'max-video-preview': -1,
        }
      : { index: false, follow: mayFollow },
    // Always present, even when empty: an empty `alternates` overrides the
    // parent segment's value, which is what stops a page without a canonical
    // from silently inheriting one from the root layout.
    alternates: {
      ...(canonicalHref ? { canonical: canonicalHref } : {}),
    },
    openGraph: {
      title: resolvedOgTitle,
      description: resolvedOgDescription,
      ...(ogUrl ? { url: ogUrl } : {}),
      type: ogType,
      siteName: SITE_NAME,
      locale: 'en_IN',
      images: [{ url: resolvedOgImage, alt: resolvedOgTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedOgTitle,
      description: resolvedOgDescription,
      images: [resolvedOgImage],
      site: TWITTER_HANDLE,
    },
  };

  // NOTE: rel="prev" / rel="next" are NOT expressible through the Metadata
  // API — `other` only emits <meta> tags. The blog archives render them as
  // real <link> elements via <PaginationLinks />, which React hoists into
  // <head>. `prevUrl`/`nextUrl` stay on this interface so callers keep the
  // same shape the old hook had.
  void prevUrl;
  void nextUrl;

  return metadata;
}

/**
 * Metadata for a page declared in the route registry.
 *
 * The registry owns the title, description and indexability, so the
 * sitemap, the indexability matrix and the page itself cannot drift apart.
 */
export function staticPageMetadata(path: string, overrides: Partial<SeoInput> = {}): Metadata {
  const route = staticRoute(path);
  return buildMetadata({
    title: route.title,
    description: route.description,
    canonical: route.path,
    index: route.index,
    follow: route.follow,
    ...overrides,
  });
}

/**
 * Metadata for a page that does not exist.
 *
 * Deliberately carries **no canonical**: a 404 must not consolidate itself onto
 * a live page. `follow` is kept so the navigation on the 404 body is still
 * crawled.
 */
export function notFoundMetadata(title: string, description: string): Metadata {
  return buildMetadata({ title, description, index: false, follow: true });
}

/**
 * BreadcrumbList JSON-LD, identical to the one the old hook generated:
 * "Home" is always position 1, callers pass the rest in order.
 */
export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalUrl('/') },
      ...items.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: b.name,
        item: canonicalUrl(b.url),
      })),
    ],
  };
}

/** Title suffix for page 2+ of a paginated archive. */
export const pageSuffix = (page: number) => (page > 1 ? ` — Page ${page}` : '');

/**
 * Insert the page suffix into an archive title, before the first ` | ` so the
 * brand tail stays at the end:
 *
 *   paginatedTitle('Blog | GloryTecks — …', 3) → 'Blog — Page 3 | GloryTecks — …'
 *
 * Page 1 is returned unchanged, so the clean archive and its canonical keep
 * exactly the title the route registry declares.
 */
export function paginatedTitle(title: string, page: number): string {
  if (page <= 1) return title;
  const at = title.indexOf(' | ');
  return at === -1
    ? `${title}${pageSuffix(page)}`
    : `${title.slice(0, at)}${pageSuffix(page)}${title.slice(at)}`;
}

/** Canonical path for a page of an archive — the sitemap uses the same helper. */
export const archivePagePath = (basePath: string, page: number) =>
  canonicalPath(basePath, { page: page > 1 ? page : undefined }, ['page']);
