import { STATIC_ROUTES } from '@/lib/seo/routes';
import { buildUrlset } from '@/lib/seo/sitemap';
import { entry, finalise, xmlResponse } from '@/lib/sitemap-data';

export const revalidate = 3600;

/**
 * /sitemaps/pages.xml — the site's fixed pages.
 *
 * Membership is read from the route registry (`lib/seo/routes.ts`), so a page
 * that is marked noindex there can never appear here, and the URL listed is
 * byte-identical to the canonical the page itself emits. The previous version
 * kept its own hand-written list, including a second copy of the resource
 * slugs that was free to drift from config/resources.ts.
 *
 * <lastmod> comes from the registry's source-controlled `lastModified` value,
 * which is bumped by hand when the page copy changes. `/blog` is excluded here
 * — it is the head of the blog archive and lives in categories.xml with a
 * lastmod derived from the newest post.
 */
export async function GET() {
  const entries = finalise(
    STATIC_ROUTES.filter((r) => r.sitemap === 'pages').map((r) => entry(r.path, r.lastModified)),
  );

  return xmlResponse(buildUrlset(entries));
}
