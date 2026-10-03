import * as api from '@/lib/api/services';
import { safe } from '@/lib/site-data';
import { buildUrlset, isoDate, newestDate } from '@/lib/seo/sitemap';
import {
  blogLastModified,
  entry,
  fetchBlogSitemapRecords,
  finalise,
  xmlResponse,
} from '@/lib/sitemap-data';

export const revalidate = 3600;

/**
 * /sitemaps/categories.xml — the blog archive head plus every category archive
 * that has at least one post (an empty category renders noindex).
 *
 * Only page 1 of each archive is listed. Deeper pages (`?page=2…`) are real
 * indexable content and are reachable through `rel=next` and the numbered
 * pagination control, but a sitemap is a list of a site's canonical documents,
 * not of every paginated slice of them.
 *
 * <lastmod> is derived from real post dates rather than "today":
 *   • /blog                     → the newest post date in the whole archive
 *   • /blog/category/{slug}     → the newest post date within that category,
 *                                 falling back to the category row's own
 *                                 `updated_at` only when the post feed could
 *                                 not be read.
 */
export async function GET() {
  const [categories, posts] = await Promise.all([
    safe(() => api.fetchCategories(), [], 'sitemap:categories'),
    // Shares the single sitemap feed request with /sitemaps/blog.xml; Next's
    // fetch cache dedupes it across both route handlers within a revalidation
    // window, so the two sitemaps together cost one upstream call.
    fetchBlogSitemapRecords(),
  ]);

  const newestByCategory = new Map<string, string | null>();
  for (const post of posts) {
    if (!post.categorySlug) continue;
    const current = newestByCategory.get(post.categorySlug) ?? null;
    newestByCategory.set(post.categorySlug, newestDate([current, blogLastModified(post)]));
  }

  const archiveLastModified = newestDate(posts.map(blogLastModified));

  // A category with no posts renders `noindex` (lib/seo/archive.ts), so it
  // must not be listed either. Only applied when the feed actually returned
  // posts: an empty feed means the read failed, and an outage must not strip
  // every category out of the sitemap.
  const hasPosts = (slug: string) => posts.length === 0 || newestByCategory.has(slug);

  const entries = finalise([
    entry('/blog', archiveLastModified),
    ...categories
      .filter((c) => c.slug && hasPosts(c.slug))
      .map((c) =>
        entry(
          `/blog/category/${c.slug}`,
          newestByCategory.get(c.slug) ?? isoDate(c.updatedAt),
        ),
      ),
  ]);

  return xmlResponse(buildUrlset(entries));
}
