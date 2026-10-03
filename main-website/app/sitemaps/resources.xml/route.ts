import { RESOURCE_SLUGS } from '@/config/resources';
import { STATIC_PAGE_REVIEWED } from '@/lib/seo/routes';
import { buildUrlset } from '@/lib/seo/sitemap';
import { entry, finalise, xmlResponse } from '@/lib/sitemap-data';

export const revalidate = 3600;

/**
 * /sitemaps/resources.xml — the five resource detail pages.
 *
 * The slug list is read from `config/resources.ts`, the same module the route
 * and its `generateStaticParams` use, so the sitemap cannot list a resource
 * that does not exist (the previous sitemap kept a second, hand-written copy).
 *
 * These pages are in-repo content, so <lastmod> uses the same source-controlled
 * review date as the other static pages.
 */
export async function GET() {
  const entries = finalise(
    RESOURCE_SLUGS.map((slug) => entry(`/resources/${slug}`, STATIC_PAGE_REVIEWED)),
  );

  return xmlResponse(buildUrlset(entries));
}
