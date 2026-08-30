// ─────────────────────────────────────────────────────────────────────────────
// Location-landing ROUTE configuration.
//
// This is *not* CMS content — it is the route table for the programmatic local-SEO
// landing pages (e.g. `/data-science-course-ameerpet`). It declares which
// course × locality combinations get a landing page and how their URL token is
// formed. The actual content rendered on those pages (course details, locality
// intro/context, career roles & salary) is fetched live from the backend.
//
// The backend intentionally does not model "location landings" as a collection,
// so — like a React Router route map — this configuration lives in the frontend.
// Courses and localities referenced here are validated against the live API at
// render time, so a combo pointing at a missing course/locality simply 404s.
// ─────────────────────────────────────────────────────────────────────────────

/** Nicer URL token per course slug (e.g. python-programming → python). */
export const urlCourseToken: Record<string, string> = {
  "data-science": "data-science",
  "data-analytics": "data-analytics",
  "power-bi": "power-bi",
  "python-programming": "python",
  "gen-ai": "generative-ai",
  mlops: "mlops",
  "data-engineering": "data-engineering",
};

export interface LocationLanding {
  slug: string; // e.g. data-science-course-ameerpet
  courseSlug: string;
  localitySlug: string;
}

// Curated, quality-first set (flagship course across localities + key courses in
// the prime localities). Expand here to add genuinely-localised landing pages.
const combos: [string, string[]][] = [
  ["data-science", ["ameerpet", "kukatpally", "madhapur", "gachibowli", "hitech-city", "dilsukhnagar"]],
  ["python-programming", ["ameerpet", "kukatpally"]],
  ["power-bi", ["ameerpet", "kukatpally"]],
  ["gen-ai", ["ameerpet", "madhapur"]],
  ["data-analytics", ["ameerpet", "kukatpally"]],
  ["mlops", ["ameerpet"]],
];

export const locationLandings: LocationLanding[] = combos.flatMap(([courseSlug, locs]) =>
  locs.map((localitySlug) => ({
    slug: `${urlCourseToken[courseSlug]}-course-${localitySlug}`,
    courseSlug,
    localitySlug,
  })),
);

export const findLanding = (slug: string): LocationLanding | undefined =>
  locationLandings.find((l) => l.slug === slug);
