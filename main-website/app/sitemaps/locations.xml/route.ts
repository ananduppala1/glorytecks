import * as api from '@/lib/api/services';
import { safe } from '@/lib/site-data';
import { locationLandings } from '@/config/locationLandings';
import { buildUrlset, isoDate } from '@/lib/seo/sitemap';
import { entry, finalise, xmlResponse } from '@/lib/sitemap-data';

export const revalidate = 3600;

/**
 * /sitemaps/locations.xml — the programmatic local-SEO landing pages.
 *
 * Only combos whose course AND locality both still exist in the CMS are
 * listed, because the page itself calls notFound() when either is missing —
 * the sitemap must never advertise a URL that 404s. This is the same guard the
 * footer applies.
 *
 * <lastmod> is the locality row's real `updated_at` (the locality copy is what
 * makes each of these pages distinct from the parent course page). A locality
 * with no usable timestamp is listed without a <lastmod>.
 */
export async function GET() {
  const [courses, localities] = await Promise.all([
    safe(() => api.fetchCourses(), [], 'sitemap:landings:courses'),
    safe(() => api.fetchLocalities(), [], 'sitemap:landings:localities'),
  ]);

  const courseSlugs = new Set(courses.map((c) => c.slug));
  const localityBySlug = new Map(localities.map((l) => [l.slug, l]));

  const entries = finalise(
    locationLandings
      .filter((l) => courseSlugs.has(l.courseSlug) && localityBySlug.has(l.localitySlug))
      .map((l) => entry(`/${l.slug}`, isoDate(localityBySlug.get(l.localitySlug)?.updatedAt))),
  );

  return xmlResponse(buildUrlset(entries));
}
