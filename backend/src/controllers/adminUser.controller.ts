import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/ApiResponse';
import { parseListParams, buildPaginationMeta, toSortSpecs } from '../utils/queryFeatures';
import { ApiError } from '../utils/ApiError';
import { adminUserRepo } from '../repositories';
import { authService } from '../services/auth.service';
import { IAdminUser } from '../interfaces/common';

/**
 * Administrator management. Admin-only (see routes/adminUser.routes.ts).
 *
 * Creating an admin provisions a Supabase Auth identity AND its profile row —
 * this is the only way an account comes into existence. There is no public
 * signup route in this API, and an identity without a profile row cannot use
 * any endpoint (see middlewares/auth.ts).
 */
export const adminUserController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const params = parseListParams(req.query as Record<string, unknown>, ['role', 'isActive']);
    const { items, total } = await adminUserRepo.list({
      filter: params.filters,
      search: params.search,
      searchableFields: ['name', 'email'],
      sort: toSortSpecs(params.sort),
      page: params.page,
      limit: params.limit,
    });
    return sendSuccess(
      res,
      items,
      'Admins fetched',
      200,
      buildPaginationMeta(total, params.page, params.limit),
    );
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const doc = await adminUserRepo.findById(req.params.id);
    if (!doc) throw ApiError.notFound('Admin not found');
    return sendSuccess(res, doc, 'Admin fetched');
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body as Record<string, string>;
    const doc = await authService.createAdminUser({
      name,
      email,
      password,
      role: role as IAdminUser['role'],
    });
    return sendCreated(res, doc, 'Admin created');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { name, role, isActive, avatar } = req.body as Record<string, unknown>;
    const existing = await adminUserRepo.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Admin not found');

    // Only these four fields are assignable, exactly as before — email and id
    // are immutable and `role` can never be set by the account holder itself
    // (this route is admin-only).
    const payload: Record<string, unknown> = {};
    if (name !== undefined) payload.name = name as string;
    if (role !== undefined) payload.role = role as IAdminUser['role'];
    if (typeof isActive === 'boolean') payload.isActive = isActive;
    if (avatar !== undefined) payload.avatar = avatar as string;

    const doc = await adminUserRepo.updateById(req.params.id, payload);
    if (!doc) throw ApiError.notFound('Admin not found');
    return sendSuccess(res, doc, 'Admin updated');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    if (req.user?.id === req.params.id) {
      throw ApiError.badRequest('You cannot delete your own account');
    }
    const deleted = await authService.deleteAdminUser(req.params.id);
    if (!deleted) throw ApiError.notFound('Admin not found');
    return sendNoContent(res);
  }),
};
