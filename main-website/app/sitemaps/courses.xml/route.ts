import * as api from '@/lib/api/services';
import { safe } from '@/lib/site-data';
import { buildUrlset, isoDate } from '@/lib/seo/sitemap';
import { entry, finalise, xmlResponse } from '@/lib/sitemap-data';

export const revalidate = 3600;

/**
 * /sitemaps/courses.xml — every published course detail page.
 *
 * <lastmod> is the course row's real `updated_at` from the CMS database, which
 * the backend's row→API mapper exposes as `updatedAt` on `/public/courses`.
 * A course with no usable timestamp is listed without a <lastmod> rather than
 * with a fabricated one.
 */
export async function GET() {
  const courses = await safe(() => api.fetchCourses(), [], 'sitemap:courses');

  const entries = finalise(
    courses
      .filter((c) => c.slug)
      .map((c) => entry(`/courses/${c.slug}`, isoDate(c.updatedAt))),
  );

  return xmlResponse(buildUrlset(entries));
}
