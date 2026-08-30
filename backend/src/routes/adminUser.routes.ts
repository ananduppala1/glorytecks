import { Router } from 'express';
import { adminUserController } from '../controllers/adminUser.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { ROLES } from '../constants';

const router = Router();
router.use(requireAuth, authorize(ROLES.ADMIN));
router.get('/', adminUserController.list);
router.get('/:id', adminUserController.getById);
router.post('/', adminUserController.create);
router.put('/:id', adminUserController.update);
router.delete('/:id', adminUserController.remove);
export default router;
