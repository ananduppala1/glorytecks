import { Router } from 'express';
import { courseController } from '../controllers/course.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { CONTENT_ROLES } from '../constants';
import { createCourseValidator, updateCourseValidator } from '../validators/course.validator';
import { uuidParam, slugParam, listQueryValidator } from '../validators/common';
import { adminWriteLimiter } from '../middlewares/rateLimit';

const router = Router();

router.use(requireAuth, authorize(...CONTENT_ROLES));

router.get('/', validate(listQueryValidator), courseController.list);
router.get('/slug/:slug', validate(slugParam()), courseController.getBySlug);
router.get('/:id', validate(uuidParam()), courseController.getById);
router.post('/', adminWriteLimiter, validate(createCourseValidator), courseController.create);
router.put(
  '/:id',
  adminWriteLimiter,
  validate([...uuidParam(), ...updateCourseValidator]),
  courseController.update,
);
router.delete('/:id', adminWriteLimiter, validate(uuidParam()), courseController.remove);

export default router;
