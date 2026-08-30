import 'server-only';

// ─────────────────────────────────────────────────────────────────────────────
// Sitemap data.
//
// The React app shipped five hand-maintained XML files in /public totalling
// ~14,000 lines, all stamped 2026-06-24. Every new post, course or comparison
// silently fell out of the index until someone remembered to regenerate them.
// They are now built from the live backend on a revalidation schedule.
//
// All four public sitemap URLs are preserved byte-for-byte in path
// (/sitemap.xml, /blog-sitemap.xml, /category-sitemap.xml, /image-sitemap.xml,
// /sitemap-index.xml) so nothing already submitted to Search Console breaks.
// ─────────────────────────────────────────────────────────────────────────────

import * as api from '@/lib/api/services';
import { safe } from '@/lib/site-data';
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

/** ISO date (yyyy-mm-dd) for <lastmod>, tolerant of malformed input. */
export function isoDate(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? new Date().toISOString().slice(0, 10)
    : d.toISOString().slice(0, 10);
}

/** Escape the five XML entities — CMS titles routinely contain & and '. */
export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const xmlResponse = (body: string) =>
  new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=0, s-maxage=${SITEMAP_REVALIDATE}, stale-while-revalidate=86400`,
    },
  });
