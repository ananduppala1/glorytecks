// ─────────────────────────────────────────────────────────────────────────────
// Public route registry.
//
// One declaration per public URL pattern, carrying everything the SEO layer
// needs to agree on: the canonical path, the title and description that page
// emits, whether it may be indexed and followed, and which sitemap (if any)
// lists it.
//
// This exists so that three things that must never disagree are derived from
// one source instead of being written out three times:
//
//   1. the <title>/<meta description>/<link rel=canonical> a page emits
//   2. the <loc> entries in the sitemaps
//   3. docs/SEO_INDEXABILITY_MATRIX.md and the automated SEO tests
//
// Titles and descriptions are written for one search intent each, declared in
// `primaryIntent`. There is no keywords field: see the note in lib/seo/index.ts.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Source-controlled last-modified dates for pages whose content lives in this
 * repository rather than in the CMS.
 *
 * `<lastmod>` must be a real date, so it cannot be generated at request time.
 * These are plain constants: bump the entry by hand in the same commit that
 * changes the page's content. The seed value is the date this registry was
 * introduced and the page copy was last reviewed — it is deliberately NOT a
 * claim that the copy changed on some earlier date we do not know.
 */
export const STATIC_PAGE_REVIEWED = '2026-09-22';

export type SitemapName =
  | 'pages'
  | 'courses'
  | 'blog'
  | 'categories'
  | 'locations'
  | 'resources'
  | 'compare';

export interface StaticRoute {
  /** Canonical site-relative path. Normalised: no trailing slash except "/". */
  path: string;
  title: string;
  description: string;
  /**
   * The ONE search intent this page is built to answer.
   *
   * Exactly one page may own a given intent — `indexability.test.ts` fails
   * the build on a duplicate. This is the mechanism that prevents keyword
   * cannibalisation: if two pages want the same query, one of them is the
   * wrong page, and the conflict surfaces here rather than in Search
   * Console six months later.
   *
   * Documentation and a uniqueness key, NOT a string that gets injected
   * anywhere. Nothing renders it.
   */
  primaryIntent: string;
  /** May search engines index this URL? */
  index: boolean;
  /** May search engines follow the links on it? */
  follow: boolean;
  /** Which sitemap lists it, or null when it must not appear in any. */
  sitemap: SitemapName | null;
  /** Source-controlled <lastmod>, or null to omit the element entirely. */
  lastModified: string | null;
  /** Why it is (or is not) indexable — surfaced in the indexability matrix. */
  reason: string;
}

export const STATIC_ROUTES: readonly StaticRoute[] = [
  {
    path: '/',
    title:
      'GloryTecks — IT Training Institute in Ameerpet, Hyderabad',
    description:
      'GloryTecks runs classroom and live online IT courses in Ameerpet, Hyderabad — Data Science, Generative AI, Python, Power BI, MLOps and Data Engineering — taught by working practitioners, with placement support and free demo classes.',
    primaryIntent: 'IT training institute Hyderabad',
    index: true,
    follow: true,
    sitemap: 'pages',
    lastModified: STATIC_PAGE_REVIEWED,
    reason:
      'Primary entry point and the brand entity page.',
  },
  {
    path: '/courses',
    title:
      'IT Courses in Hyderabad | GloryTecks',
    description:
      'Every course GloryTecks offers, in one place: Data Science, Generative AI, Agentic AI, MLOps, Python, Power BI, Data Analytics, Data Engineering and SQL Server. Compare duration, modules, tools and batch formats.',
    primaryIntent: 'IT courses Hyderabad',
    index: true,
    follow: true,
    sitemap: 'pages',
    lastModified: STATIC_PAGE_REVIEWED,
    reason:
      'Catalogue hub. Owns the category query and distributes authority to the course pages.',
  },
  {
    path: '/training-in-hyderabad',
    title:
      'IT Training in Ameerpet, Hyderabad — GloryTecks Centre',
    description:
      'Visit the GloryTecks training centre in Ameerpet, a short walk from Ameerpet Metro Station. Classroom and weekend batches, opening hours, directions and the courses taught on site.',
    primaryIntent: 'IT training Ameerpet',
    index: true,
    follow: true,
    sitemap: 'pages',
    lastModified: STATIC_PAGE_REVIEWED,
    reason:
      'The physical-location page. Owns the Ameerpet locality intent and carries the LocalBusiness node; the homepage owns the broader Hyderabad intent.',
  },
  {
    path: '/placements',
    title:
      'Placement Support at GloryTecks',
    description:
      'How GloryTecks supports the job search: career counselling, resume and ATS review, LinkedIn preparation, mock interviews and introductions to hiring partners — plus where past learners have been placed.',
    primaryIntent: 'GloryTecks placement support',
    index: true,
    follow: true,
    sitemap: 'pages',
    lastModified: STATIC_PAGE_REVIEWED,
    reason:
      'Evaluative intent for prospective students comparing institutes.',
  },
  {
    path: '/about',
    title:
      'About GloryTecks',
    description:
      'Who we are: an IT training institute in Ameerpet, Hyderabad, teaching Data Science, AI and analytics through project-based courses led by practitioners working in the field.',
    primaryIntent: 'About GloryTecks',
    index: true,
    follow: true,
    sitemap: 'pages',
    lastModified: STATIC_PAGE_REVIEWED,
    reason:
      'Entity and E-E-A-T page. Brand-name intent, not a course query.',
  },
  {
    path: '/contact',
    title:
      'Contact GloryTecks — Ameerpet, Hyderabad',
    description:
      'Phone, WhatsApp, email and directions for GloryTecks in Ameerpet, Hyderabad. Ask about course fees, upcoming batch dates, or book a free demo class.',
    primaryIntent: 'GloryTecks contact',
    index: true,
    follow: true,
    sitemap: 'pages',
    lastModified: STATIC_PAGE_REVIEWED,
    reason:
      'Navigational intent plus the NAP block that supports local search.',
  },
  {
    path: '/compare',
    title:
      'Course and Tool Comparisons | GloryTecks',
    description:
      'Side-by-side comparisons to help you pick a track — Power BI vs Tableau, Data Science vs Data Analytics, Python vs R and more — with what each choice means for the Hyderabad job market.',
    primaryIntent: 'data career and tool comparisons',
    index: true,
    follow: true,
    sitemap: 'pages',
    lastModified: STATIC_PAGE_REVIEWED,
    reason:
      'Hub for comparison intent, which is evaluative rather than transactional.',
  },
  {
    path: '/resources',
    title:
      'Free Learning Resources | GloryTecks',
    description:
      'Study material, an interview question bank, downloadable course notes, recorded video lectures and the Glory-AI assistant — the learning resources GloryTecks gives its students.',
    primaryIntent: 'GloryTecks learning resources',
    index: true,
    follow: true,
    sitemap: 'pages',
    lastModified: STATIC_PAGE_REVIEWED,
    reason:
      'Hub for the five resource pages.',
  },
  {
    path: '/blog',
    title:
      'Blog — Data Science, AI and Cloud Career Guides | GloryTecks',
    description:
      'Roadmaps, tutorials, salary guides and interview preparation across Data Science, Generative AI, Python, Power BI, MLOps, Data Engineering, AWS, GCP and Azure, written by GloryTecks trainers.',
    primaryIntent: 'IT career guides and tutorials (informational)',
    index: true,
    follow: true,
    sitemap: 'categories',
    lastModified: null,
    reason:
      'Informational intent only. The blog must not target the commercial course queries the course pages own.',
  },
  {
    path: '/entities',
    title:
      'The GloryTecks Group — Academy, Labs, Careers and Foundation',
    description:
      'The GloryTecks family of brands — Academy, Labs, Careers, Enterprise, Foundation and Global — and what each one does.',
    primaryIntent: 'GloryTecks group brands',
    index: true,
    follow: true,
    sitemap: 'pages',
    lastModified: STATIC_PAGE_REVIEWED,
    reason:
      'Brand disambiguation. Low volume but genuine entity content.',
  },
  {
    path: '/thank-you',
    title:
      'Thank You — Enquiry Received | GloryTecks',
    description:
      'Your enquiry has reached the GloryTecks team. We will be in touch with course details, fees and the next batch schedule.',
    primaryIntent: 'none — conversion confirmation, not a search target',
    index: false,
    follow: true,
    sitemap: null,
    lastModified: null,
    reason:
      'Conversion confirmation page — no search value and it would pollute goal tracking. follow is kept so the links on it still pass equity.',
  },
] as const;

const BY_PATH = new Map(STATIC_ROUTES.map((r) => [r.path, r]));

/** Look up a static route, throwing on an unknown path so typos fail the build. */
export function staticRoute(path: string): StaticRoute {
  const route = BY_PATH.get(path);
  if (!route) throw new Error(`[seo] unknown static route: ${path}`);
  return route;
}

/* ── Dynamic route patterns ───────────────────────────────────────────────── */

export interface DynamicRoutePattern {
  pattern: string;
  index: boolean;
  follow: boolean;
  sitemap: SitemapName | null;
  /** Where the URL set comes from. */
  source: string;
  /** Are unlisted params rendered on demand (`dynamicParams`)? */
  dynamicParams: boolean;
  reason: string;
}

export const DYNAMIC_ROUTES: readonly DynamicRoutePattern[] = [
  {
    pattern: '/courses/{slug}',
    index: true,
    follow: true,
    sitemap: 'courses',
    source: 'CMS — GET /public/courses',
    dynamicParams: true,
    reason: 'Money pages. Courses can be published from the CMS without a redeploy.',
  },
  {
    pattern: '/blog/{slug}',
    index: true,
    follow: true,
    sitemap: 'blog',
    source: 'CMS — GET /public/blogs',
    dynamicParams: true,
    reason: 'Hundreds of posts, published without a redeploy.',
  },
  {
    pattern: '/blog/category/{categorySlug}',
    index: true,
    follow: true,
    sitemap: 'categories',
    source: 'CMS — GET /public/categories',
    dynamicParams: true,
    reason: 'Real archive content. A new category must not 404 before the next deploy.',
  },
  {
    pattern: '/compare/{slug}',
    index: true,
    follow: true,
    sitemap: 'compare',
    source: 'CMS — GET /public/comparisons',
    dynamicParams: true,
    reason: 'Comparison articles are published from the CMS without a redeploy.',
  },
  {
    pattern: '/resources/{slug}',
    index: true,
    follow: true,
    sitemap: 'resources',
    source: 'config/resources.ts — 5 in-repo slugs',
    dynamicParams: false,
    reason: 'Finite, code-controlled set. Unknown slugs 404 without invoking a function.',
  },
  {
    pattern: '/{landingSlug}',
    index: true,
    follow: true,
    sitemap: 'locations',
    source: 'config/locationLandings.ts — 15 in-repo combos',
    dynamicParams: false,
    reason:
      'Finite, code-controlled route table. Closing it turns every bot probe of a single-segment URL into a static 404 with no function invocation.',
  },
  {
    pattern: '/brochures/{slug}/download',
    index: false,
    follow: true,
    sitemap: null,
    source: 'CMS — GET /public/courses (a slug that is not a published course 404s)',
    dynamicParams: true,
    reason:
      'Utility hand-off that streams a PDF. No indexable content. Kept crawlable so the noindex directive is actually seen, and follow is kept because it is linked from every course page. Unknown course slugs are real 404s, not a 200 spinner.',
  },
] as const;

/* ── Query-parameter policy ───────────────────────────────────────────────── */

/**
 * The only query parameter that may appear on a canonical URL anywhere on this
 * site. Defined in ./canonical (which applies it) and re-exported here so the
 * policy reads as part of the route registry.
 */
export { CANONICAL_QUERY_ALLOWLIST as CANONICAL_QUERY_ORDER } from './canonical';

/** Parameters that turn an archive into a filtered view. */
export const FILTER_PARAMS = ['q', 'tag', 'sort'] as const;
