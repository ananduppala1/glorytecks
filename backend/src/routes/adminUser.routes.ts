import { Router } from 'express';
import { adminUserController } from '../controllers/adminUser.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createAdminValidator, updateAdminValidator } from '../validators/auth.validator';
import { uuidParam, listQueryValidator } from '../validators/common';
import { adminWriteLimiter, expensiveLimiter } from '../middlewares/rateLimit';
import { ROLES } from '../constants';

const router = Router();
router.use(requireAuth, authorize(ROLES.ADMIN));
router.get('/', validate(listQueryValidator), adminUserController.list);
router.get('/:id', validate(uuidParam()), adminUserController.getById);
// Creating an administrator provisions an identity at the auth provider as
// well as a row here, so it costs more than an ordinary write and is worth
// bounding tightly — it is also the operation an attacker with a stolen admin
// session would most want to repeat.
router.post('/', expensiveLimiter, validate(createAdminValidator), adminUserController.create);
router.put(
  '/:id',
  adminWriteLimiter,
  validate([...uuidParam(), ...updateAdminValidator]),
  adminUserController.update,
);
router.delete('/:id', expensiveLimiter, validate(uuidParam()), adminUserController.remove);
export default router;
