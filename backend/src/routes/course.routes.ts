import { Router } from 'express';
import { courseController } from '../controllers/course.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { ROLES } from '../constants';
import { createCourseValidator, updateCourseValidator } from '../validators/course.validator';

const router = Router();

router.use(requireAuth, authorize(ROLES.ADMIN, ROLES.CONTENT_WRITER));

router.get('/', courseController.list);
router.get('/slug/:slug', courseController.getBySlug);
router.get('/:id', courseController.getById);
router.post('/', validate(createCourseValidator), courseController.create);
router.put('/:id', validate(updateCourseValidator), courseController.update);
router.delete('/:id', courseController.remove);

export default router;
