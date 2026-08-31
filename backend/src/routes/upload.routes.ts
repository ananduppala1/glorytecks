import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { uploadImage, uploadDocument } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimit';
import { ROLES } from '../constants';

// Uploads are used by content creators (blog images, author/trainer photos, etc.)
const uploadRoles = authorize(ROLES.ADMIN, ROLES.CONTENT_WRITER);

const router = Router();

// Order matters. Authentication and the role check run BEFORE the rate limiter
// and before multer, so an anonymous or unauthorised caller is rejected on the
// request line — no body is read, nothing is buffered, and their traffic never
// consumes a legitimate user's rate-limit budget.
router.post(
  '/image',
  requireAuth,
  uploadRoles,
  uploadLimiter,
  ...uploadImage,
  uploadController.image,
);
router.post(
  '/document',
  requireAuth,
  uploadRoles,
  uploadLimiter,
  ...uploadDocument,
  uploadController.document,
);

// Lets the admin UI mirror the server's real allowlist rather than guess at it.
router.get('/config', requireAuth, uploadController.config);

export default router;
