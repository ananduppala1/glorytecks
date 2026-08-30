import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated } from '../utils/ApiResponse';
import { uploadBuffer } from '../services/upload.service';
import { ApiError } from '../utils/ApiError';

export const uploadController = {
  image: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw ApiError.badRequest('No file provided (field name must be "file")');
    const folder = (req.body?.folder as string) || 'images';
    const result = await uploadBuffer(req.file.buffer, {
      folder,
      resourceType: 'image',
      filename: req.file.originalname,
    });
    return sendCreated(res, result, 'Image uploaded');
  }),

  document: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw ApiError.badRequest('No file provided (field name must be "file")');
    const folder = (req.body?.folder as string) || 'documents';
    const result = await uploadBuffer(req.file.buffer, {
      folder,
      resourceType: 'auto',
      filename: req.file.originalname,
    });
    return sendCreated(res, result, 'Document uploaded');
  }),
};
