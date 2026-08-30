import { Request, Response } from 'express';
import { courseService } from '../services/course.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/ApiResponse';
import { parseListParams } from '../utils/queryFeatures';
import { ApiError } from '../utils/ApiError';
import { invalidateResource } from '../lib/cacheInvalidation';

const LIST_FILTERS = ['status', 'category', 'featured'];

export const courseController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const params = parseListParams(req.query as Record<string, unknown>, LIST_FILTERS);
    const { items, meta } = await courseService.list(params);
    return sendSuccess(res, items, 'Courses fetched', 200, meta);
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    const doc = await courseService.getById(req.params.id);
    return sendSuccess(res, doc, 'Course fetched');
  }),
  getBySlug: asyncHandler(async (req: Request, res: Response) => {
    const doc = await courseService.getOne({ slug: req.params.slug.toLowerCase() });
    if (!doc) throw ApiError.notFound('Course not found');
    return sendSuccess(res, doc, 'Course fetched');
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const doc = await courseService.createCourse(req.body);
    void invalidateResource('courses');
    return sendCreated(res, doc, 'Course created');
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const doc = await courseService.updateCourse(req.params.id, req.body);
    void invalidateResource('courses');
    return sendSuccess(res, doc, 'Course updated');
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await courseService.remove(req.params.id);
    void invalidateResource('courses');
    return sendNoContent(res);
  }),
};
