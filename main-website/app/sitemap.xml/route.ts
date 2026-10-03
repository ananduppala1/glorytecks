import { canonicalUrl } from '@/lib/seo/canonical';
import { buildSitemapIndex } from '@/lib/seo/sitemap';
import { xmlResponse } from '@/lib/sitemap-data';

// Next requires route-segment config to be a statically analysable literal, so
// this cannot import SITEMAP_REVALIDATE. Keep the two in step (1 hour).
export const revalidate = 3600;

/**
 * /sitemap.xml — the one authoritative sitemap, and the only URL advertised in
 * robots.txt.
 *
 * It is a <sitemapindex>, not a <urlset>. The previous architecture had five
 * sibling sitemaps all submitted at the top level, with /sitemap.xml appearing
 * both directly and as a child of /sitemap-index.xml.
 *
 * No <lastmod> here. A sitemap index's lastmod is meant to say when the child
 * sitemap's contents last changed; we would have to open every child to know
 * that, and the alternative — stamping "now" — is the exact fabrication this
 * refactor removed. Google re-reads children on its own schedule regardless.
 */
const CHILDREN = [
  '/sitemaps/pages.xml',
  '/sitemaps/courses.xml',
  '/sitemaps/blog.xml',
  '/sitemaps/categories.xml',
  '/sitemaps/locations.xml',
  '/sitemaps/resources.xml',
  '/sitemaps/compare.xml',
] as const;

export async function GET() {
  return xmlResponse(buildSitemapIndex(CHILDREN.map((path) => ({ url: canonicalUrl(path) }))));
}
