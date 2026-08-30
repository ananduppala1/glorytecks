import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { aboutPageRepo } from '../repositories';
import { invalidateResource } from '../lib/cacheInvalidation';

export const aboutController = {
  get: asyncHandler(async (_req: Request, res: Response) => {
    const about = await aboutPageRepo.get();
    return sendSuccess(res, about, 'About page fetched');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    // Partial, leaf-level merge — same semantics as the old `doc.set(body)`.
    const about = await aboutPageRepo.update(req.body as Record<string, unknown>);
    void invalidateResource('about');
    return sendSuccess(res, about, 'About page updated');
  }),
};
