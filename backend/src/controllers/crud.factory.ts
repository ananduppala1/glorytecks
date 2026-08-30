import { Request, Response } from 'express';
import { CrudService } from '../services/CrudService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/ApiResponse';
import { parseListParams } from '../utils/queryFeatures';
import { RequestHandler } from 'express';
import { invalidateResource } from '../lib/cacheInvalidation';

export interface CrudControllerConfig {
  /** Query params accepted as exact-match filters on list. */
  allowedFilters?: string[];
  /** Human label used in success messages, e.g. "Course". */
  label: string;
  /** Resource name used for cache invalidation (e.g. "trainers"). */
  resourceName?: string;
  /** Optionally transform the incoming body before create/update. */
  transformBody?: (body: Record<string, unknown>, req: Request) => Record<string, unknown>;
}

export interface CrudHandlers {
  list: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
}

/**
 * Build a standard set of REST handlers for a resource. Modules with bespoke
 * behaviour (Blog, Auth) implement their own controllers; everything else uses
 * this factory to avoid duplicating identical logic 15+ times.
 */
export function createCrudController<T>(
  service: CrudService<T>,
  config: CrudControllerConfig,
): CrudHandlers {
  const { label, allowedFilters = [], transformBody, resourceName } = config;

  const list = asyncHandler(async (req: Request, res: Response) => {
    const params = parseListParams(req.query as Record<string, unknown>, allowedFilters);
    const { items, meta } = await service.list(params);
    return sendSuccess(res, items, `${label} list fetched`, 200, meta);
  });

  const getById = asyncHandler(async (req: Request, res: Response) => {
    const doc = await service.getById(req.params.id);
    return sendSuccess(res, doc, `${label} fetched`);
  });

  const create = asyncHandler(async (req: Request, res: Response) => {
    const body = transformBody ? transformBody(req.body, req) : req.body;
    const doc = await service.create(body as Partial<T>);
    if (resourceName) void invalidateResource(resourceName);
    return sendCreated(res, doc, `${label} created`);
  });

  const update = asyncHandler(async (req: Request, res: Response) => {
    const body = transformBody ? transformBody(req.body, req) : req.body;
    const doc = await service.update(req.params.id, body as Partial<T>);
    if (resourceName) void invalidateResource(resourceName);
    return sendSuccess(res, doc, `${label} updated`);
  });

  const remove = asyncHandler(async (req: Request, res: Response) => {
    await service.remove(req.params.id);
    if (resourceName) void invalidateResource(resourceName);
    return sendNoContent(res);
  });

  return { list, getById, create, update, remove };
}
