import 'server-only';

// ─────────────────────────────────────────────────────────────────────────────
// Sitemap data loaders.
//
// The React app shipped five hand-maintained XML files in /public totalling
// ~14,000 lines, all stamped 2026-06-24. They are now built from the live
// backend on a revalidation schedule.
//
// This module fetches; `lib/seo/sitemap.ts` decides shape and validity. The
// split exists so the XML rules are unit-testable without a backend.
//
// Every <lastmod> emitted from here is a REAL content date taken from the CMS
// row (`updatedAt`) or from the post's own published/updated fields. Nothing
// substitutes the current date — see `isoDate()` in lib/seo/sitemap.ts, which
// returns null rather than "today" when a date is missing or malformed.
// ─────────────────────────────────────────────────────────────────────────────

import * as api from '@/lib/api/services';
import { safe } from '@/lib/site-data';
import { canonicalUrl } from '@/lib/seo/canonical';
import {
  contentLastModified,
  isoDate,
  sanitizeEntries,
  type SitemapEntry,
} from '@/lib/seo/sitemap';
import type { BlogSitemapItem } from '@/lib/api/services';
import type { BlogPost } from '@/types/content';

/** Sitemaps are rebuilt hourly — often enough for a content site, cheap enough. */
export const SITEMAP_REVALIDATE = 3600;

/**
 * The backend caps a public blog list request at 24 items. Rather than asking
 * for an illegal page size, the archive is walked page by page at that cap and
 * stopped by the response's own `totalPages`.
 *
 * MAX_PAGES is a hard safety valve: at 24 items a page it covers 1,200 posts,
 * comfortably above the current archive, and guarantees a malformed `meta` can
 * never turn sitemap generation into an unbounded request loop against the API.
 */
const BLOG_PAGE_LIMIT = 24;
const MAX_PAGES = 50;

/**
 * Every published post's sitemap record, in ONE upstream request.
 *
 * `fetchAllBlogPosts()` below walks the paginated list endpoint at its 24-item
 * cap — 25 requests for the current archive, run by two different sitemaps, so
 * ~50 per hour to produce a list of slugs and dates. This asks the backend's
 * dedicated feed instead, which answers from a single indexed query.
 *
 * Falls back to the page walk if the endpoint is unavailable (an older backend
 * deploy), so the sitemap degrades to the old cost rather than going empty.
 */
export async function fetchBlogSitemapRecords(): Promise<BlogSitemapItem[]> {
  const feed = await safe(() => api.fetchBlogSitemapFeed(), [], 'sitemap:blogs:feed');
  if (feed.length > 0) return feed;

  const walked = await fetchAllBlogPosts();
  return walked.map((p) => ({
    slug: p.slug,
    date: p.date,
    updated: p.updated,
    categorySlug: p.categorySlug,
  }));
}

export async function fetchAllBlogPosts(): Promise<BlogPost[]> {
  const all: BlogPost[] = [];

  const first = await safe(
    () => api.fetchBlogs({ page: 1, limit: BLOG_PAGE_LIMIT, sort: '-date' }),
    { items: [] as BlogPost[], meta: undefined },
    'sitemap:blogs:1',
  );
  all.push(...first.items);

  const totalPages = Math.min(first.meta?.totalPages ?? 1, MAX_PAGES);

  for (let page = 2; page <= totalPages; page++) {
    const next = await safe(
      () => api.fetchBlogs({ page, limit: BLOG_PAGE_LIMIT, sort: '-date' }),
      { items: [] as BlogPost[], meta: undefined },
      `sitemap:blogs:${page}`,
    );
    if (!next.items.length) break;
    all.push(...next.items);
  }

  return all;
}

/** The real content date for one post: updated when genuinely updated, else published. */
export const blogLastModified = (post: {
  updated?: string | null;
  date?: string | null;
}): string | null => contentLastModified(post.updated, post.date);

/** Build an entry, letting `lastModified` be null so <lastmod> is simply omitted. */
export const entry = (path: string, lastModified: string | null): SitemapEntry => ({
  url: canonicalUrl(path),
  lastModified,
});

/**
 * Final gate before XML is written: anything non-canonical, query-bearing or
 * duplicated is dropped rather than published. A sitemap that lists a bad URL
 * is worse than one that lists fewer.
 */
export const finalise = (entries: SitemapEntry[]): SitemapEntry[] => sanitizeEntries(entries);

export { isoDate };

export const xmlResponse = (body: string) =>
  new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=0, s-maxage=${SITEMAP_REVALIDATE}, stale-while-revalidate=86400`,
    },
  });
