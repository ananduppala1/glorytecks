import { Router } from 'express';
import { resources } from '../services/registry';
import { createCrudController } from '../controllers/crud.factory';
import { requireAuth, authorize } from '../middlewares/auth';
import { ROLES } from '../constants';

/**
 * Mount every registry resource as a protected REST router at /<path>.
 * Bespoke modules (blogs, courses, leads) are mounted separately in index.ts.
 */
export function buildGenericRoutes(): Router {
  const router = Router();

  for (const def of resources) {
    const handlers = createCrudController(def.service, { ...def.controller, resourceName: def.path });
    const r = Router();
    // Each resource declares which roles may manage it (defaults to admin-only).
    const roles = def.roles ?? [ROLES.ADMIN];
    r.use(requireAuth, authorize(...roles));
    r.get('/', handlers.list);
    r.get('/:id', handlers.getById);
    r.post('/', handlers.create);
    r.put('/:id', handlers.update);
    r.patch('/:id', handlers.update);
    r.delete('/:id', handlers.remove);
    router.use(`/${def.path}`, r);
  }

  return router;
}
