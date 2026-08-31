import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { adminWriteLimiter } from '../middlewares/rateLimit';
import { updateSettingsValidator } from '../validators/settings.validator';
import { ROLES } from '../constants';

const router = Router();
router.get('/', requireAuth, settingsController.get);
router.put('/', requireAuth, authorize(ROLES.ADMIN), adminWriteLimiter, validate(updateSettingsValidator), settingsController.update);
export default router;
