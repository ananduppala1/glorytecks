import { buildUrlset } from '@/lib/seo/sitemap';
import { isSitemapEligible } from '@/lib/blog/merged';
import {
  blogLastModified,
  entry,
  fetchBlogSitemapRecords,
  finalise,
  xmlResponse,
} from '@/lib/sitemap-data';

export const revalidate = 3600;

/**
 * /sitemaps/blog.xml — every published post.
 *
 * <lastmod> is the post's own `updated` date when it is genuinely later than
 * `date`, otherwise the published date — the rule the brief asks for, applied
 * in `contentLastModified()`.
 *
 * No <image:image> entries. The previous blog and image sitemaps both attached
 * `/blog-assets/{categorySlug}-cover.svg` to every post, but
 * `components/blog/BlogCover.tsx` renders a deterministic **inline** <svg> and
 * never loads that file — so the images were not on the pages being listed.
 * A separate image sitemap also meant every /blog/{slug} URL appeared twice
 * across the sitemap set.
 */
export async function GET() {
  // One upstream request for the whole archive — see fetchBlogSitemapRecords.
  const posts = await fetchBlogSitemapRecords();

  // A merged article now 308s to its twin, and a noindexed one asks not to be
  // indexed — neither belongs in a sitemap. See lib/blog/merged.ts.
  const entries = finalise(
    posts
      .filter((p) => p.slug && isSitemapEligible(p.slug))
      .map((p) => entry(`/blog/${p.slug}`, blogLastModified(p))),
  );

  return xmlResponse(buildUrlset(entries));
}
