import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import {
  blogRepo,
  courseRepo,
  trainerRepo,
  testimonialRepo,
  placementRepo,
  companyRepo,
  blogCategoryRepo,
  contactEnquiryRepo,
  demoRequestRepo,
  galleryRepo,
  brochureRepo,
} from '../repositories';
import { CONTENT_STATUS, LEAD_STATUS, LEAD_ROLES, CONTENT_ROLES } from '../constants';
import { cacheWrap, CACHE_TTL } from '../lib/cache';

export const dashboardController = {
  /**
   * Aggregate headline stats + recent activity for the dashboard home.
   *
   * The recent-activity lists are scoped to the caller's role. This endpoint
   * carries `requireAuth` but no `authorize`, because every role has a
   * dashboard — but it aggregates modules that are NOT open to every role:
   * `recent.enquiries` and `recent.demoRequests` carry lead names, emails and
   * phone numbers, which /enquiries and /demo-requests restrict to LEAD_ROLES,
   * and `recent.blogs` carries unpublished titles and slugs, which /blogs
   * restricts to CONTENT_ROLES. Aggregating them onto one screen does not make
   * them less private, so the same rule is applied here.
   *
   * The lists are emptied rather than omitted: the shape of the response is
   * part of the API contract and the admin UI already renders an empty state
   * for each one.
   */
  stats: asyncHandler(async (req: Request, res: Response) => {
    const data = await cacheWrap('admin:dashboard:stats', CACHE_TTL.DASHBOARD, async () => {
      // Each count is a HEAD request with count=exact — the PostgREST
      // equivalent of countDocuments(), still issued in parallel.
      const [
        totalBlogs,
        publishedBlogs,
        draftBlogs,
        totalCourses,
        totalTrainers,
        totalTestimonials,
        totalPlacements,
        totalCompanies,
        totalCategories,
        totalEnquiries,
        newEnquiries,
        totalDemoRequests,
        newDemoRequests,
        galleryCount,
        brochureCount,
      ] = await Promise.all([
        blogRepo.count(),
        blogRepo.count({ status: CONTENT_STATUS.PUBLISHED }),
        blogRepo.count({ status: CONTENT_STATUS.DRAFT }),
        courseRepo.count(),
        trainerRepo.count(),
        testimonialRepo.count(),
        placementRepo.count(),
        companyRepo.count(),
        blogCategoryRepo.count(),
        contactEnquiryRepo.count(),
        contactEnquiryRepo.count({ status: LEAD_STATUS.NEW }),
        demoRequestRepo.count(),
        demoRequestRepo.count({ status: LEAD_STATUS.NEW }),
        galleryRepo.count(),
        brochureRepo.count(),
      ]);

      const [recentBlogs, recentEnquiries, recentDemoRequests] = await Promise.all([
        blogRepo.findMany({
          sort: [{ field: 'updatedAt', direction: -1 }],
          limit: 5,
          fields: ['title', 'slug', 'status', 'category', 'updatedAt', 'date'],
        }),
        contactEnquiryRepo.findMany({
          sort: [{ field: 'createdAt', direction: -1 }],
          limit: 5,
          fields: ['name', 'email', 'course', 'status', 'createdAt'],
        }),
        demoRequestRepo.findMany({
          sort: [{ field: 'createdAt', direction: -1 }],
          limit: 5,
          fields: ['name', 'phone', 'course', 'status', 'createdAt'],
        }),
      ]);

      // Storage estimate: image/document counts (binary lives in Cloudinary,
      // not in the database — that has not changed).
      const mediaAssets = galleryCount + brochureCount;

      return {
        counts: {
          blogs: totalBlogs,
          publishedBlogs,
          draftBlogs,
          courses: totalCourses,
          trainers: totalTrainers,
          testimonials: totalTestimonials,
          placements: totalPlacements,
          companies: totalCompanies,
          categories: totalCategories,
          enquiries: totalEnquiries,
          newEnquiries,
          demoRequests: totalDemoRequests,
          newDemoRequests,
          gallery: galleryCount,
          brochures: brochureCount,
          mediaAssets,
        },
        recent: {
          blogs: recentBlogs,
          enquiries: recentEnquiries,
          demoRequests: recentDemoRequests,
        },
      };
    });

    // Filtered on the way OUT, not by fetching less: the cache entry is shared
    // by every caller under one key, so a role-dependent *cached* payload would
    // serve whichever role warmed it to everyone after. `data` belongs to the
    // cache and is never mutated here — only copied.
    const role = req.user?.role;
    const mayReadLeads = !!role && LEAD_ROLES.includes(role);
    const mayReadContent = !!role && CONTENT_ROLES.includes(role);

    const scoped = {
      ...data,
      recent: {
        blogs: mayReadContent ? data.recent.blogs : [],
        enquiries: mayReadLeads ? data.recent.enquiries : [],
        demoRequests: mayReadLeads ? data.recent.demoRequests : [],
      },
    };

    return sendSuccess(res, scoped, 'Dashboard stats fetched');
  }),
};
