// ─────────────────────────────────────────────────────────────────────────────
// SEO helpers.
//
// This module is the Next.js replacement for the React app's `useSEO()` hook.
// The hook mutated <head> from a useEffect *after* hydration, which meant
// crawlers and social scrapers that don't execute JavaScript saw only the
// generic tags baked into index.html. Every tag it produced is reproduced here
// and emitted server-side through the Metadata API, so the markup is identical
// but present in the initial HTML response.
//
// Tag-for-tag parity with the old hook:
//   title · description · keywords · robots · canonical · rel=prev/next ·
//   og:title · og:description · og:url · og:type · og:image · og:image:alt ·
//   og:site_name · og:locale · twitter:card · twitter:title ·
//   twitter:description · twitter:image · twitter:site
// JSON-LD (page schema + BreadcrumbList) is rendered by <JsonLd /> — see
// components/seo/JsonLd.tsx.
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';

/** Canonical public origin. Overridable per deployment; no trailing slash. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://glorytecks.com').replace(
  /\/+$/,
  '',
);

export const SITE_NAME = 'GloryTecks — IT Training Institute Hyderabad';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;
export const TWITTER_HANDLE = '@glorytecks';

/** Absolute URL for a site-relative path. */
export const absoluteUrl = (path = '/') =>
  `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

export interface SeoInput {
  title: string;
  description: string;
  /** Site-relative canonical path, e.g. "/blog?page=2". */
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  keywords?: string;
  noindex?: boolean;
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
  keywords,
  noindex = false,
  prevUrl,
  nextUrl,
}: SeoInput): Metadata {
  const resolvedOgTitle = ogTitle || title;
  const resolvedOgDescription = ogDescription || description;
  const resolvedOgImage = ogImage || DEFAULT_OG_IMAGE;

  // The old hook always emitted og:url, defaulting to "/" when no canonical
  // was supplied. Preserved exactly.
  const ogUrl = absoluteUrl(canonical || '/');

  const metadata: Metadata = {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    // Matches the hook's two robots strings verbatim.
    robots: noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          'max-image-preview': 'large',
          'max-snippet': -1,
          'max-video-preview': -1,
        },
    alternates: {
      ...(canonical ? { canonical: absoluteUrl(canonical) } : {}),
    },
    openGraph: {
      title: resolvedOgTitle,
      description: resolvedOgDescription,
      url: ogUrl,
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
 * BreadcrumbList JSON-LD, identical to the one the old hook generated:
 * "Home" is always position 1, callers pass the rest in order.
 */
export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      ...items.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: b.name,
        item: absoluteUrl(b.url),
      })),
    ],
  };
}

/**
 * Pagination-aware canonical + rel prev/next, extracted because both the blog
 * index and the category archive need exactly the same logic.
 */
export function paginationSeo(basePath: string, currentPage: number, totalPages: number) {
  const pageUrl = (p: number) => (p <= 1 ? basePath : `${basePath}?page=${p}`);
  return {
    canonical: pageUrl(currentPage),
    prevUrl: currentPage > 1 ? pageUrl(currentPage - 1) : undefined,
    nextUrl: currentPage < totalPages ? pageUrl(currentPage + 1) : undefined,
    pageSuffix: currentPage > 1 ? ` — Page ${currentPage}` : '',
  };
}
