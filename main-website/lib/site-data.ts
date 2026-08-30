import 'server-only';

// ─────────────────────────────────────────────────────────────────────────────
// Server-side loaders.
//
// Two jobs:
//
//  1. `safe()` — preserve the React app's graceful degradation. There, a failed
//     React Query simply left `data` undefined and the component fell back to
//     its default copy. On the server an unhandled throw would instead turn a
//     transient backend blip into a 500 for the whole page, so every
//     non-essential read is wrapped and falls back to the same empty value.
//     Genuinely page-defining reads (a blog post, a course) are NOT wrapped —
//     those must still produce a real 404/error.
//
//  2. `getSiteData()` — one parallel batch for the header, footer, demo modal
//     and floating CTAs, fetched once per layout render instead of six
//     client-side round trips per page view. Next's fetch cache dedupes these
//     across the layout and any page that needs the same collection.
// ─────────────────────────────────────────────────────────────────────────────

import * as api from '@/lib/api/services';
import type { SiteData } from '@/components/site/SiteDataProvider';

/**
 * Run a loader, returning `fallback` if the backend is unavailable or errors.
 * Failures are logged server-side; internal error details never reach the page.
 */
export async function safe<T>(loader: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await loader();
  } catch (err) {
    console.error(`[site-data] ${label} failed:`, err instanceof Error ? err.message : err);
    return fallback;
  }
}

/**
 * Everything the persistent chrome needs, in one parallel batch.
 *
 * Mirrors exactly what the React components used to request:
 *   Header  → courses, localities, settings
 *   Footer  → courses, latest blogs (limit 3, -date), comparisons, localities
 *   Modals  → courses, settings
 *   Covers  → categories
 */
export async function getSiteData(): Promise<SiteData> {
  const [settings, courses, categories, localities, comparisons, latestBlogs] = await Promise.all([
    safe(() => api.fetchSettings(), null, 'settings'),
    safe(() => api.fetchCourses(), [], 'courses'),
    safe(() => api.fetchCategories(), [], 'categories'),
    safe(() => api.fetchLocalities(), [], 'localities'),
    safe(() => api.fetchComparisons(), [], 'comparisons'),
    safe(async () => (await api.fetchBlogs({ limit: 3, sort: '-date' })).items, [], 'latestBlogs'),
  ]);

  return { settings, courses, categories, localities, comparisons, latestBlogs };
}
