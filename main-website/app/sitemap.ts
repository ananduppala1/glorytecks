import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { locationLandings } from "@/config/locationLandings";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

// Next requires route-segment config to be a statically analysable literal, so
// this cannot import SITEMAP_REVALIDATE. Keep the two in step (1 hour).
export const revalidate = 3600;

/**
 * Primary sitemap: static pages, courses, comparisons and the location
 * landings. Blog posts and categories have their own sitemaps (preserving the
 * URLs already submitted to Search Console), so they are not repeated here.
 *
 * Priorities and change frequencies are carried over from the hand-written
 * /public/sitemap.xml the React app shipped.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [courses, comparisons, localities] = await Promise.all([
    safe(() => api.fetchCourses(), [], "sitemap:courses"),
    safe(() => api.fetchComparisons(), [], "sitemap:comparisons"),
    safe(() => api.fetchLocalities(), [], "sitemap:localities"),
  ]);

  const staticPages: MetadataRoute.Sitemap = (
    [
      { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1.0 },
      { url: `${SITE_URL}/courses`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${SITE_URL}/training-in-hyderabad`, changeFrequency: "monthly", priority: 0.9 },
      { url: `${SITE_URL}/placements`, changeFrequency: "monthly", priority: 0.8 },
      { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.7 },
      { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.7 },
      { url: `${SITE_URL}/compare`, changeFrequency: "weekly", priority: 0.7 },
      { url: `${SITE_URL}/resources`, changeFrequency: "monthly", priority: 0.6 },
      { url: `${SITE_URL}/entities`, changeFrequency: "yearly", priority: 0.4 },
    ] as const
  ).map((e) => ({ ...e, lastModified: now }));

  const resourcePages: MetadataRoute.Sitemap = [
    "lms",
    "glory-ai",
    "interview-questions",
    "course-material",
    "video-lectures",
  ].map((slug) => ({
    url: `${SITE_URL}/resources/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const coursePages: MetadataRoute.Sitemap = courses.map((c) => ({
    url: `${SITE_URL}/courses/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const comparisonPages: MetadataRoute.Sitemap = comparisons.map((c) => ({
    url: `${SITE_URL}/compare/${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Only list landings whose course AND locality both still exist in the CMS —
  // the same guard the footer applies, so the sitemap can never advertise a URL
  // that would 404.
  const courseSlugs = new Set(courses.map((c) => c.slug));
  const localitySlugs = new Set(localities.map((l) => l.slug));
  const landingPages: MetadataRoute.Sitemap = locationLandings
    .filter((l) => courseSlugs.has(l.courseSlug) && localitySlugs.has(l.localitySlug))
    .map((l) => ({
      url: `${SITE_URL}/${l.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

  return [
    ...staticPages,
    ...resourcePages,
    ...coursePages,
    ...comparisonPages,
    ...landingPages,
  ];
}
