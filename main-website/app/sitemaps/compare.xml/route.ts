import * as api from '@/lib/api/services';
import { safe } from '@/lib/site-data';
import { buildUrlset, isoDate } from '@/lib/seo/sitemap';
import { entry, finalise, xmlResponse } from '@/lib/sitemap-data';

export const revalidate = 3600;

/**
 * /sitemaps/compare.xml — every published comparison article.
 *
 * An eighth file rather than folding these into pages.xml: comparisons are
 * CMS content that grows without a redeploy and carries a real database
 * `updated_at`, while pages.xml is the fixed, source-controlled set. Mixing
 * the two would mean either fabricating a lastmod for the comparisons or
 * discarding the real one.
 */
export async function GET() {
  const comparisons = await safe(() => api.fetchComparisons(), [], 'sitemap:comparisons');

  const entries = finalise(
    comparisons
      .filter((c) => c.slug)
      .map((c) => entry(`/compare/${c.slug}`, isoDate(c.updatedAt))),
  );

  return xmlResponse(buildUrlset(entries));
}
