import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import { uploadVerifiedBuffer, resolveFolder } from '../services/upload.service';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { acceptAttributeFor, allowedImageFormats, allowedDocumentFormats } from '../middlewares/upload';
import { FORMATS } from '../utils/fileSignature';

/**
 * Upload endpoints.
 *
 * By the time a handler runs, `req.upload` holds a buffer whose format has
 * been established from its bytes (see middlewares/upload). The controller's
 * only remaining decisions are where the asset goes and what comes back.
 */
export const uploadController = {
  image: asyncHandler(async (req: Request, res: Response) => {
    if (!req.upload) throw ApiError.badRequest('No file provided (field name must be "file")');

    const folder = resolveFolder(req.body?.folder, 'images');
    const result = await uploadVerifiedBuffer(req.upload.buffer, {
      folder,
      format: req.upload.format,
      safeName: req.upload.safeName,
    });
    return sendCreated(res, result, 'Image uploaded');
  }),

  document: asyncHandler(async (req: Request, res: Response) => {
    if (!req.upload) throw ApiError.badRequest('No file provided (field name must be "file")');

    const folder = resolveFolder(req.body?.folder, 'documents');
    const result = await uploadVerifiedBuffer(req.upload.buffer, {
      folder,
      format: req.upload.format,
      safeName: req.upload.safeName,
    });
    return sendCreated(res, result, 'Document uploaded');
  }),

  /**
   * The upload policy currently in force, so the admin UI can advertise
   * exactly what the server will accept instead of hard-coding a list that
   * drifts out of sync with it.
   */
  config: asyncHandler(async (_req: Request, res: Response) => {
    return sendSuccess(
      res,
      {
        image: {
          accept: acceptAttributeFor('image'),
          maxBytes: env.upload.imageMaxBytes,
          formats: allowedImageFormats().map((id) => FORMATS[id].ext),
        },
        document: {
          accept: acceptAttributeFor('document'),
          maxBytes: env.upload.docMaxBytes,
          formats: allowedDocumentFormats().map((id) => FORMATS[id].ext),
        },
        folders: env.upload.folders,
      },
      'Upload configuration',
    );
  }),
};
