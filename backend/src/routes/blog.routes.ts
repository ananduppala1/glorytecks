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

const router = Router();

router.use(requireAuth, authorize(ROLES.ADMIN, ROLES.CONTENT_WRITER));

router.get('/', blogController.list);
router.get('/tags', blogController.tags);
router.get('/slug/:slug', blogController.getBySlug);
router.get('/:id', blogController.getById);
router.post('/', validate(createBlogValidator), blogController.create);
router.post('/:id/duplicate', blogController.duplicate);
router.patch('/:id/status', validate(blogStatusValidator), blogController.setStatus);
router.put('/:id', validate(updateBlogValidator), blogController.update);
router.delete('/:id', blogController.remove);

export default router;
