import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.get('/stats', requireAuth, dashboardController.stats);
export default router;
