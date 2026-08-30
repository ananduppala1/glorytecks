import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { ROLES } from '../constants';

const router = Router();
router.get('/', requireAuth, settingsController.get);
router.put('/', requireAuth, authorize(ROLES.ADMIN), settingsController.update);
export default router;
