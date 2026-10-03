import type { MetadataRoute } from 'next';
import { SITE_ORIGIN, IS_PRODUCTION_ORIGIN } from '@/lib/seo';

/**
 * robots.txt
 *
 * One rule block, one sitemap. The previous file carried 24 user-agent blocks
 * ported from the React app's static /public/robots.txt; 21 of them said
 * `Allow: /`, which is already the default, and the named `Googlebot` block
 * shadowed the `*` block so `Disallow: /api/` never applied to Google. Both
 * problems disappear by saying the thing once.
 *
 * `Crawl-delay` is gone: Googlebot ignores it, and throttling the crawlers that
 * do honour it bought nothing on a site this size.
 *
 * What is deliberately NOT here:
 *   • No `Disallow` on /blog, /thank-you or /brochures. Pages that must stay
 *     out of the index carry a `noindex` directive, and a crawler has to be
 *     able to fetch a page to see it. Blocking them in robots.txt would leave
 *     them indexable-by-reference forever.
 *   • No per-crawler allowances. Nothing on this origin is blocked for a
 *     generic crawler, so naming AI or social agents changes nothing.
 *   • No `Host:` directive — non-standard, and only Yandex ever read it.
 *
 * `/api/` matches nothing on this origin (the backend is a separate
 * deployment) but stays as defence in depth in case the site is ever proxied.
 */
export default function robots(): MetadataRoute.Robots {
  // A preview deployment must never compete with glorytecks.com for the same
  // content. If NEXT_PUBLIC_SITE_URL is not the production origin, this build
  // is not the canonical copy of the site and asks not to be crawled at all.
  if (!IS_PRODUCTION_ORIGIN) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [{ userAgent: '*', allow: '/', disallow: '/api/' }],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
