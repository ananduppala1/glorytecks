import { Router } from 'express';
import { aboutController } from '../controllers/about.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { updateAboutValidator } from '../validators/settings.validator';
import { ROLES } from '../constants';

const router = Router();
router.get('/', requireAuth, aboutController.get);
router.put('/', requireAuth, authorize(ROLES.ADMIN), validate(updateAboutValidator), aboutController.update);
export default router;
