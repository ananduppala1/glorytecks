import { Request, Response } from 'express';
import { blogService } from '../services/blog.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/ApiResponse';
import { parseListParams } from '../utils/queryFeatures';
import { ApiError } from '../utils/ApiError';
import { ALL_CONTENT_STATUS, ContentStatus } from '../constants';
import { invalidateResource } from '../lib/cacheInvalidation';

const LIST_FILTERS = ['status', 'categorySlug', 'kind', 'featured', 'trending', 'popular', 'author'];

export const blogController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const params = parseListParams(req.query as Record<string, unknown>, LIST_FILTERS);
    const { items, meta } = await blogService.list(params);
    return sendSuccess(res, items, 'Blogs fetched', 200, meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const doc = await blogService.getById(req.params.id);
    return sendSuccess(res, doc, 'Blog fetched');
  }),

  getBySlug: asyncHandler(async (req: Request, res: Response) => {
    const doc = await blogService.getOne({ slug: req.params.slug.toLowerCase() });
    if (!doc) throw ApiError.notFound('Blog not found');
    return sendSuccess(res, doc, 'Blog fetched');
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const doc = await blogService.createBlog(req.body);
    void invalidateResource('blogs');
    return sendCreated(res, doc, 'Blog created');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const doc = await blogService.updateBlog(req.params.id, req.body);
    void invalidateResource('blogs');
    return sendSuccess(res, doc, 'Blog updated');
  }),

  setStatus: asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body as { status: ContentStatus };
    if (!ALL_CONTENT_STATUS.includes(status)) throw ApiError.badRequest('Invalid status');
    const doc = await blogService.setStatus(req.params.id, status);
    void invalidateResource('blogs');
    return sendSuccess(res, doc, `Blog ${status}`);
  }),

  duplicate: asyncHandler(async (req: Request, res: Response) => {
    const doc = await blogService.duplicate(req.params.id);
    void invalidateResource('blogs');
    return sendCreated(res, doc, 'Blog duplicated');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await blogService.remove(req.params.id);
    void invalidateResource('blogs');
    return sendNoContent(res);
  }),

  /** Distinct tag list for filter UIs. */
  tags: asyncHandler(async (_req: Request, res: Response) => {
    const tags = await blogService.distinctTags();
    return sendSuccess(res, tags.sort(), 'Tags fetched');
  }),
};
