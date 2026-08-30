import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { settingsRepo } from '../repositories';
import { invalidateResource } from '../lib/cacheInvalidation';

export const settingsController = {
  get: asyncHandler(async (_req: Request, res: Response) => {
    const settings = await settingsRepo.get();
    return sendSuccess(res, settings, 'Settings fetched');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    // Partial, leaf-level merge — same semantics as the old `doc.set(body)`.
    const settings = await settingsRepo.update(req.body as Record<string, unknown>);
    void invalidateResource('settings');
    return sendSuccess(res, settings, 'Settings updated');
  }),
};
