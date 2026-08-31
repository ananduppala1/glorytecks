import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth, requireJsonRequest } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  loginProtection,
  refreshLimiter,
  passwordChangeLimiter,
  adminWriteLimiter,
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
// `requireJsonRequest` is the CSRF control here: this endpoint authenticates
// with the refresh cookie, and a cross-site HTML form post is a "simple"
// request that never triggers a CORS preflight. Demanding a JSON content type
// makes the request non-simple, so the browser must preflight it and the CORS
// policy gets to refuse.
router.post('/refresh', refreshLimiter, requireJsonRequest, authController.refresh);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);
// The per-account write budget, as on every other authenticated write. It was
// the one that had none: the only ceiling was the global per-IP limiter, and an
// IP ceiling is precisely what a single credential can step around by moving
// address — which is why every other mutation here is keyed to the account.
router.patch(
  '/profile',
  requireAuth,
  adminWriteLimiter,
  validate(updateProfileValidator),
  authController.updateProfile,
);
router.post(
  '/change-password',
  requireAuth,
  passwordChangeLimiter,
  validate(changePasswordValidator),
  authController.changePassword,
);

export default router;
