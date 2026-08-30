import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { authLimiter } from '../middlewares/rateLimit';
import {
  loginValidator,
  changePasswordValidator,
  updateProfileValidator,
} from '../validators/auth.validator';

const router = Router();

router.post('/login', authLimiter, validate(loginValidator), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);
router.patch('/profile', requireAuth, validate(updateProfileValidator), authController.updateProfile);
router.post(
  '/change-password',
  requireAuth,
  validate(changePasswordValidator),
  authController.changePassword,
);

export default router;
