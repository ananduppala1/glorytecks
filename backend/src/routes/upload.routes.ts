import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { uploadImage, uploadDocument } from '../middlewares/upload';
import { ROLES } from '../constants';

// Uploads are used by content creators (blog images, author/trainer photos, etc.)
const uploadRoles = authorize(ROLES.ADMIN, ROLES.CONTENT_WRITER);

const router = Router();
router.post('/image', requireAuth, uploadRoles, uploadImage, uploadController.image);
router.post('/document', requireAuth, uploadRoles, uploadDocument, uploadController.document);
export default router;
