import { Router } from 'express';
import { blogController } from '../controllers/blog.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { ROLES } from '../constants';
import {
  createBlogValidator,
  updateBlogValidator,
  blogStatusValidator,
} from '../validators/blog.validator';
import { uuidParam, slugParam, listQueryValidator } from '../validators/common';

const router = Router();

router.use(requireAuth, authorize(ROLES.ADMIN, ROLES.CONTENT_WRITER));

router.get('/', validate(listQueryValidator), blogController.list);
router.get('/tags', blogController.tags);
router.get('/slug/:slug', validate(slugParam()), blogController.getBySlug);
router.get('/:id', validate(uuidParam()), blogController.getById);
router.post('/', validate(createBlogValidator), blogController.create);
router.post('/:id/duplicate', validate(uuidParam()), blogController.duplicate);
router.patch('/:id/status', validate([...uuidParam(), ...blogStatusValidator]), blogController.setStatus);
router.put('/:id', validate([...uuidParam(), ...updateBlogValidator]), blogController.update);
router.delete('/:id', validate(uuidParam()), blogController.remove);

export default router;
