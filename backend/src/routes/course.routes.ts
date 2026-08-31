import { Router } from 'express';
import { courseController } from '../controllers/course.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { ROLES } from '../constants';
import { createCourseValidator, updateCourseValidator } from '../validators/course.validator';
import { uuidParam, slugParam, listQueryValidator } from '../validators/common';

const router = Router();

router.use(requireAuth, authorize(ROLES.ADMIN, ROLES.CONTENT_WRITER));

router.get('/', validate(listQueryValidator), courseController.list);
router.get('/slug/:slug', validate(slugParam()), courseController.getBySlug);
router.get('/:id', validate(uuidParam()), courseController.getById);
router.post('/', validate(createCourseValidator), courseController.create);
router.put('/:id', validate([...uuidParam(), ...updateCourseValidator]), courseController.update);
router.delete('/:id', validate(uuidParam()), courseController.remove);

export default router;
