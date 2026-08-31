import { Router } from 'express';
import { adminUserController } from '../controllers/adminUser.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createAdminValidator, updateAdminValidator } from '../validators/auth.validator';
import { uuidParam, listQueryValidator } from '../validators/common';
import { ROLES } from '../constants';

const router = Router();
router.use(requireAuth, authorize(ROLES.ADMIN));
router.get('/', validate(listQueryValidator), adminUserController.list);
router.get('/:id', validate(uuidParam()), adminUserController.getById);
router.post('/', validate(createAdminValidator), adminUserController.create);
router.put('/:id', validate([...uuidParam(), ...updateAdminValidator]), adminUserController.update);
router.delete('/:id', validate(uuidParam()), adminUserController.remove);
export default router;
