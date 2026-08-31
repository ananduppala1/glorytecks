import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  loginProtection,
  refreshLimiter,
  passwordChangeLimiter,
} from '../middlewares/rateLimit';
import {
  loginValidator,
  changePasswordValidator,
  updateProfileValidator,
} from '../validators/auth.validator';

const router = Router();

// Order matters. The limiters run BEFORE validation so a flood of malformed
// bodies is rejected at the cheapest possible point, and the per-account
// limiter reads `req.body.email` — which exists because the JSON parser has
// already run, but before any of it has been validated or looked up.
router.post('/login', ...loginProtection, validate(loginValidator), authController.login);

// Refresh was previously unlimited: the cookie is the credential, so an
// attacker holding a stolen refresh token could exchange it without any
// ceiling, and an anonymous caller could probe it indefinitely.
router.post('/refresh', refreshLimiter, authController.refresh);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);
router.patch('/profile', requireAuth, validate(updateProfileValidator), authController.updateProfile);
router.post(
  '/change-password',
  requireAuth,
  passwordChangeLimiter,
  validate(changePasswordValidator),
  authController.changePassword,
);

export default router;
