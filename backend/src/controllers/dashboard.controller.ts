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
import { CONTENT_STATUS, LEAD_STATUS } from '../constants';
import { cacheWrap, CACHE_TTL } from '../lib/cache';

export const dashboardController = {
  /** Aggregate headline stats + recent activity for the dashboard home. */
  stats: asyncHandler(async (_req: Request, res: Response) => {
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

    return sendSuccess(res, data, 'Dashboard stats fetched');
  }),
};
