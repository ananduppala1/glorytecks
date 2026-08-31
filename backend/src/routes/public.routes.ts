import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { parseListParams, buildPaginationMeta, toSortSpecs } from '../utils/queryFeatures';
import { ApiError } from '../utils/ApiError';
import { validate } from '../middlewares/validate';
import { demoRequestController, contactEnquiryController } from '../controllers/lead.controller';
import { demoRequestValidator, contactEnquiryValidator } from '../validators/lead.validator';
import { brochureProxyController } from '../controllers/brochure.controller';
import { publicDownloadLimiter } from '../middlewares/rateLimit';
import { slugParam, listQueryValidator } from '../validators/common';
import { CONTENT_STATUS } from '../constants';
import { cacheWrap, hashQuery, CACHE_TTL } from '../lib/cache';
import { IBlog } from '../interfaces/common';
import {
  blogRepo,
  courseRepo,
  blogCategoryRepo,
  authorRepo,
  trainerRepo,
  testimonialRepo,
  placementRepo,
  companyRepo,
  roadmapRepo,
  faqRepo,
  comparisonRepo,
  localityRepo,
  legalDocRepo,
  galleryRepo,
  brochureRepo,
  batchRepo,
  settingsRepo,
  aboutPageRepo,
} from '../repositories';

/**
 * Public, read-only API consumed by the GloryTecks marketing website.
 * Only exposes published / active content and never requires authentication.
 *
 * All GET handlers are wrapped with Redis cacheWrap() for high-concurrency
 * performance. Cache is invalidated by admin mutation controllers.
 *
 * Nothing about this file's contract changed in the migration — the same
 * paths, query parameters, cache keys, TTLs and response envelopes. Only the
 * data source underneath moved from MongoDB to Supabase PostgreSQL.
 */
const router = Router();

// ── Tiered HTTP caching for the public read API ─────────────────────────────
// The public API is anonymous and identical for every visitor, so we let the
// CDN edge absorb repeat traffic. But different content tolerates staleness
// differently, and admin edits must appear FAST — so we tier the policy:
//
//  • FAST_REVALIDATE  — content editors change and expect to see live
//    (site settings, batch timings, gallery, testimonials…). The edge revalidates
//    with the origin on every request, but at the origin Redis still serves it
//    in <1 ms and is cleared instantly on save. Net effect: edits appear within
//    one request, yet the origin is still shielded by Redis.
//  • CACHED           — high-volume content that rarely changes and tolerates a
//    short delay (blogs, courses). Edge-cached briefly; still purged in Redis on
//    save, so worst case is a short window, not 15 minutes.
//
// Redis invalidation (see lib/cacheInvalidation) runs on every admin mutation,
// so the moment an editor saves, the next origin read is fresh.
const FAST_REVALIDATE = 'public, max-age=0, s-maxage=0, must-revalidate';
const CACHED = 'public, max-age=30, s-maxage=120, stale-while-revalidate=300';

// Path prefixes whose edits editors expect to see immediately.
const FAST_PATHS = [
  '/settings',
  '/about',
  '/batches',
  '/gallery',
  '/galleries',
  '/testimonials',
  '/placements',
  '/faqs',
  '/localities',
  '/trainers',
  '/companies',
  '/legal',
  '/roadmaps',
  '/comparisons',
];

router.use((req, res, next) => {
  if (req.method === 'GET') {
    const fast = FAST_PATHS.some((p) => req.path === p || req.path.startsWith(`${p}/`));
    res.set('Cache-Control', fast ? FAST_REVALIDATE : CACHED);
  }
  next();
});

/* ── Blogs ─────────────────────────────────────────────────────────────── */

// List responses only ever need card-level fields. Excluding the heavy body
// (content blocks, rendered html, toc, faqs, seo) cuts the payload of a
// 6-post page from ~hundreds of KB to a few KB.
//
// This is the former space-separated Mongoose projection string, expressed as
// the field list the repository turns into a PostgREST `select`.
const BLOG_LIST_FIELDS = [
  'slug',
  'title',
  'category',
  'categorySlug',
  'kind',
  'excerpt',
  'tags',
  'readTime',
  'date',
  'updated',
  'author',
  'authorKey',
  'featuredImage',
  'featured',
  'trending',
  'popular',
];

/** Hard cap for anonymous list requests — nobody needs 100 posts per page. */
const PUBLIC_BLOG_MAX_LIMIT = 24;

/** Fields searched by the public blog list (was a case-insensitive $or regex). */
const PUBLIC_BLOG_SEARCH_FIELDS = ['title', 'excerpt', 'category', 'tags'];

router.get(
  '/blogs',
  validate(listQueryValidator),
  asyncHandler(async (req: Request, res: Response) => {
    const params = parseListParams(req.query as Record<string, unknown>, [
      'categorySlug',
      'kind',
      'featured',
      'trending',
      'popular',
    ]);
    params.limit = Math.min(params.limit, PUBLIC_BLOG_MAX_LIMIT);

    // `category` is accepted as a friendlier alias of `categorySlug`.
    const category = req.query.category ? String(req.query.category).toLowerCase() : undefined;
    if (category && !params.filters.categorySlug) params.filters.categorySlug = category;

    // `tag` matches any element of the tags array (case-insensitive exact).
    const tag = req.query.tag ? String(req.query.tag).trim() : undefined;

    const filter: Record<string, unknown> = {
      ...params.filters,
      status: CONTENT_STATUS.PUBLISHED,
    };
    if (tag) {
      filter.tags = { op: 'arrayIncludesInsensitive', value: tag };
    }

    const full = Boolean(req.query.full);

    const cacheKey = `public:blogs:list:${hashQuery({
      ...params,
      tag: tag ?? '',
      full: req.query.full ?? '',
    })}`;

    const result = await cacheWrap(cacheKey, CACHE_TTL.BLOGS, async () => {
      const { items, total } = await blogRepo.list({
        filter,
        search: params.search,
        searchableFields: PUBLIC_BLOG_SEARCH_FIELDS,
        sort: toSortSpecs(params.sort),
        page: params.page,
        limit: params.limit,
        fields: full ? undefined : BLOG_LIST_FIELDS,
      });
      return { items, meta: buildPaginationMeta(total, params.page, params.limit) };
    });

    return sendSuccess(res, result.items, 'Blogs', 200, result.meta);
  }),
);

/**
 * Post context: related posts + chronological prev/next within the category.
 * One cached endpoint replaces the website's old "download every blog and
 * compute client-side" approach — three indexed queries touching ≤14 rows.
 *
 * Related-post ranking stays in JavaScript rather than becoming SQL: it is the
 * same tag-overlap scoring as before, so results are identical.
 */
router.get(
  '/blogs/:slug/context',
  validate(slugParam()),
  asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug.toLowerCase();
    const cacheKey = `public:blogs:context:${slug}`;

    const data = await cacheWrap(cacheKey, CACHE_TTL.BLOGS, async () => {
      const post = await blogRepo.findOne(
        { slug, status: CONTENT_STATUS.PUBLISHED },
        { fields: ['slug', 'categorySlug', 'tags', 'date'] },
      );
      if (!post) return null;

      const [candidates, prev, next] = await Promise.all([
        // Same-category pool; ranked by tag overlap below.
        blogRepo.findMany({
          filter: {
            status: CONTENT_STATUS.PUBLISHED,
            categorySlug: post.categorySlug,
            slug: { op: 'neq', value: slug },
          },
          sort: [{ field: 'date', direction: -1 }],
          limit: 12,
          fields: BLOG_LIST_FIELDS,
        }),
        blogRepo.findOne(
          {
            status: CONTENT_STATUS.PUBLISHED,
            categorySlug: post.categorySlug,
            date: { op: 'lt', value: post.date },
          },
          { fields: ['slug', 'title'], sort: [{ field: 'date', direction: -1 }] },
        ),
        blogRepo.findOne(
          {
            status: CONTENT_STATUS.PUBLISHED,
            categorySlug: post.categorySlug,
            date: { op: 'gt', value: post.date },
          },
          { fields: ['slug', 'title'], sort: [{ field: 'date', direction: 1 }] },
        ),
      ]);

      const tags = new Set((post.tags ?? []).map((t: string) => t.toLowerCase()));
      const related = candidates
        .map((c) => ({
          c,
          score: (c.tags ?? []).filter((t: string) => tags.has(t.toLowerCase())).length,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((x) => x.c);

      // Thin category? Pad with recent trending posts from other categories.
      if (related.length < 3) {
        const fill = await blogRepo.findMany({
          filter: {
            status: CONTENT_STATUS.PUBLISHED,
            trending: true,
            categorySlug: { op: 'neq', value: post.categorySlug },
            slug: { op: 'neq', value: slug },
          },
          sort: [{ field: 'date', direction: -1 }],
          limit: 3 - related.length,
          fields: BLOG_LIST_FIELDS,
        });
        related.push(...(fill as IBlog[]));
      }

      return { related, prev, next };
    });

    if (!data) throw ApiError.notFound('Blog not found');
    return sendSuccess(res, data, 'Blog context');
  }),
);

router.get(
  '/blogs/:slug',
  validate(slugParam()),
  asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug.toLowerCase();
    const cacheKey = `public:blogs:slug:${slug}`;

    const doc = await cacheWrap(cacheKey, CACHE_TTL.BLOGS, async () => {
      // `detail: true` additionally selects the author's bio, matching the old
      // populate('author', 'name key role initials avatar bio').
      return blogRepo.findOne({ slug, status: CONTENT_STATUS.PUBLISHED }, { detail: true });
    });

    if (!doc) throw ApiError.notFound('Blog not found');
    return sendSuccess(res, doc, 'Blog');
  }),
);

/* ── Courses ───────────────────────────────────────────────────────────── */
router.get(
  '/courses',
  asyncHandler(async (_req: Request, res: Response) => {
    const cacheKey = 'public:courses:all';

    const items = await cacheWrap(cacheKey, CACHE_TTL.COURSES, async () => {
      return courseRepo.findMany({
        filter: { status: CONTENT_STATUS.PUBLISHED },
        sort: [
          { field: 'order', direction: 1 },
          { field: 'title', direction: 1 },
        ],
      });
    });

    return sendSuccess(res, items, 'Courses');
  }),
);

router.get(
  '/courses/:slug',
  validate(slugParam()),
  asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug.toLowerCase();
    const cacheKey = `public:courses:slug:${slug}`;

    const doc = await cacheWrap(cacheKey, CACHE_TTL.COURSES, async () => {
      return courseRepo.findOne({ slug, status: CONTENT_STATUS.PUBLISHED }, { detail: true });
    });

    if (!doc) throw ApiError.notFound('Course not found');
    return sendSuccess(res, doc, 'Course');
  }),
);

/* ── Simple collections (active/published, ordered) ────────────────────── */
const simpleCollection = (
  path: string,
  resource: string,
  loader: () => Promise<unknown[]>,
  label: string,
) =>
  router.get(
    path,
    asyncHandler(async (_req: Request, res: Response) => {
      const cacheKey = `public:${resource}:all`;
      const items = await cacheWrap(cacheKey, CACHE_TTL.SIMPLE, loader);
      return sendSuccess(res, items, label);
    }),
  );

const ORDER_THEN_NAME = [
  { field: 'order', direction: 1 as const },
  { field: 'name', direction: 1 as const },
];
const BY_ORDER = [{ field: 'order', direction: 1 as const }];

simpleCollection(
  '/categories',
  'categories',
  () => blogCategoryRepo.findMany({ sort: ORDER_THEN_NAME }),
  'Categories',
);
simpleCollection(
  '/authors',
  'authors',
  () => authorRepo.findMany({ sort: [{ field: 'name', direction: 1 }] }),
  'Authors',
);
simpleCollection(
  '/trainers',
  'trainers',
  () => trainerRepo.findMany({ filter: { isActive: true }, sort: BY_ORDER }),
  'Trainers',
);
simpleCollection(
  '/testimonials',
  'testimonials',
  () => testimonialRepo.findMany({ filter: { isActive: true }, sort: BY_ORDER }),
  'Testimonials',
);
simpleCollection(
  '/placements',
  'placements',
  () => placementRepo.findMany({ filter: { isActive: true }, sort: BY_ORDER }),
  'Placements',
);
simpleCollection(
  '/companies',
  'companies',
  () => companyRepo.findMany({ filter: { isActive: true }, sort: ORDER_THEN_NAME }),
  'Companies',
);
simpleCollection(
  '/roadmaps',
  'roadmaps',
  () => roadmapRepo.findMany({ filter: { isActive: true }, sort: BY_ORDER }),
  'Roadmaps',
);
simpleCollection(
  '/faqs',
  'faqs',
  () =>
    faqRepo.findMany({
      filter: { isActive: true },
      sort: [
        { field: 'scope', direction: 1 },
        { field: 'order', direction: 1 },
      ],
    }),
  'FAQs',
);
simpleCollection(
  '/comparisons',
  'comparisons',
  () => comparisonRepo.findMany({ filter: { status: CONTENT_STATUS.PUBLISHED }, sort: BY_ORDER }),
  'Comparisons',
);
simpleCollection(
  '/localities',
  'localities',
  () => localityRepo.findMany({ filter: { isActive: true }, sort: ORDER_THEN_NAME }),
  'Localities',
);
simpleCollection(
  '/legal',
  'legal',
  () =>
    legalDocRepo.findMany({
      filter: { status: CONTENT_STATUS.PUBLISHED },
      sort: [{ field: 'title', direction: 1 }],
    }),
  'Legal documents',
);
simpleCollection(
  '/gallery',
  'gallery',
  () => galleryRepo.findMany({ filter: { isActive: true }, sort: BY_ORDER }),
  'Gallery',
);
simpleCollection(
  '/brochures',
  'brochures',
  () =>
    brochureRepo.findMany({
      filter: { isActive: true },
      sort: [{ field: 'createdAt', direction: -1 }],
    }),
  'Brochures',
);

/* ── Brochure proxy (streams PDF from Cloudinary via our domain) ────────── */
// Rate-limited explicitly: app.ts exempts public GETs from the general
// limiter, and unlike the other public reads this one streams a file.
router.get(
  '/brochures/:courseSlug/download',
  publicDownloadLimiter,
  validate(slugParam('courseSlug')),
  brochureProxyController.stream,
);

simpleCollection(
  '/batches',
  'batches',
  () => batchRepo.findMany({ filter: { isActive: true }, sort: BY_ORDER }),
  'Batches',
);

/* ── Single-doc lookups by slug ────────────────────────────────────────── */
router.get(
  '/comparisons/:slug',
  validate(slugParam()),
  asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug.toLowerCase();
    const cacheKey = `public:comparisons:slug:${slug}`;

    const doc = await cacheWrap(cacheKey, CACHE_TTL.SIMPLE, async () => {
      return comparisonRepo.findOne({ slug, status: CONTENT_STATUS.PUBLISHED });
    });

    if (!doc) throw ApiError.notFound('Comparison not found');
    return sendSuccess(res, doc, 'Comparison');
  }),
);

router.get(
  '/legal/:slug',
  validate(slugParam()),
  asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug.toLowerCase();
    const cacheKey = `public:legal:slug:${slug}`;

    const doc = await cacheWrap(cacheKey, CACHE_TTL.SIMPLE, async () => {
      return legalDocRepo.findOne({ slug, status: CONTENT_STATUS.PUBLISHED });
    });

    if (!doc) throw ApiError.notFound('Document not found');
    return sendSuccess(res, doc, 'Document');
  }),
);

router.get(
  '/localities/:slug',
  validate(slugParam()),
  asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug.toLowerCase();
    const cacheKey = `public:localities:slug:${slug}`;

    const doc = await cacheWrap(cacheKey, CACHE_TTL.SIMPLE, async () => {
      return localityRepo.findOne({ slug, isActive: true });
    });

    if (!doc) throw ApiError.notFound('Locality not found');
    return sendSuccess(res, doc, 'Locality');
  }),
);

/* ── Settings ──────────────────────────────────────────────────────────── */
router.get(
  '/settings',
  asyncHandler(async (_req: Request, res: Response) => {
    const settings = await cacheWrap('public:settings', CACHE_TTL.SETTINGS, async () => {
      return settingsRepo.get();
    });
    return sendSuccess(res, settings, 'Settings');
  }),
);

/* ── About page ────────────────────────────────────────────────────────── */
router.get(
  '/about',
  asyncHandler(async (_req: Request, res: Response) => {
    const about = await cacheWrap('public:about', CACHE_TTL.SETTINGS, async () => {
      return aboutPageRepo.get();
    });
    return sendSuccess(res, about, 'About page');
  }),
);

/* ── Public form submissions (website → CMS) ───────────────────────────── */
router.post('/demo-requests', validate(demoRequestValidator), demoRequestController.create);
router.post('/contact', validate(contactEnquiryValidator), contactEnquiryController.create);

export default router;
