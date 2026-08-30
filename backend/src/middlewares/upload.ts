import multer from 'multer';
import { Request } from 'express';
import { ApiError } from '../utils/ApiError';
import { UPLOAD_LIMITS } from '../constants';

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml'];
const DOC_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const storage = multer.memoryStorage();

function fileFilter(allowed: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
  };
}

/** Single image upload under field name "file". */
export const uploadImage = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.IMAGE_MAX_BYTES },
  fileFilter: fileFilter(IMAGE_MIME),
}).single('file');

/** Single document upload (pdf/doc) under field name "file". */
export const uploadDocument = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.DOC_MAX_BYTES },
  fileFilter: fileFilter([...DOC_MIME, ...IMAGE_MIME]),
}).single('file');
