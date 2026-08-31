import { Router } from 'express';
import { blogController } from '../controllers/blog.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { CONTENT_ROLES } from '../constants';
import {
  createBlogValidator,
  updateBlogValidator,
  blogStatusValidator,
} from '../validators/blog.validator';
import { uuidParam, slugParam, listQueryValidator } from '../validators/common';
import { adminWriteLimiter, expensiveLimiter } from '../middlewares/rateLimit';

const router = Router();

router.use(requireAuth, authorize(...CONTENT_ROLES));

router.get('/', validate(listQueryValidator), blogController.list);
router.get('/tags', blogController.tags);
router.get('/slug/:slug', validate(slugParam()), blogController.getBySlug);
router.get('/:id', validate(uuidParam()), blogController.getById);
router.post('/', adminWriteLimiter, validate(createBlogValidator), blogController.create);
// Duplication reads a whole post and writes a copy of it, including the
// rendered HTML — one request, several times the cost of an ordinary write, and
// repeatable in a loop. It gets the expensive-operation budget.
router.post('/:id/duplicate', expensiveLimiter, validate(uuidParam()), blogController.duplicate);
router.patch(
  '/:id/status',
  adminWriteLimiter,
  validate([...uuidParam(), ...blogStatusValidator]),
  blogController.setStatus,
);
router.put(
  '/:id',
  adminWriteLimiter,
  validate([...uuidParam(), ...updateBlogValidator]),
  blogController.update,
);
router.delete('/:id', adminWriteLimiter, validate(uuidParam()), blogController.remove);

export default router;
