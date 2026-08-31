import { Router } from 'express';
import { demoRequestController, contactEnquiryController } from '../controllers/lead.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { leadStatusValidator } from '../validators/lead.validator';
import { uuidParam, listQueryValidator } from '../validators/common';
import { adminWriteLimiter } from '../middlewares/rateLimit';
import { LEAD_ROLES } from '../constants';

const demoRouter = Router();
demoRouter.use(requireAuth, authorize(...LEAD_ROLES));
demoRouter.get('/', validate(listQueryValidator), demoRequestController.list);
demoRouter.get('/:id', validate(uuidParam()), demoRequestController.getById);
demoRouter.patch(
  '/:id/status',
  adminWriteLimiter,
  validate([...uuidParam(), ...leadStatusValidator]),
  demoRequestController.updateStatus,
);
demoRouter.delete('/:id', adminWriteLimiter, validate(uuidParam()), demoRequestController.remove);

const contactRouter = Router();
contactRouter.use(requireAuth, authorize(...LEAD_ROLES));
contactRouter.get('/', validate(listQueryValidator), contactEnquiryController.list);
contactRouter.get('/:id', validate(uuidParam()), contactEnquiryController.getById);
contactRouter.patch(
  '/:id/status',
  adminWriteLimiter,
  validate([...uuidParam(), ...leadStatusValidator]),
  contactEnquiryController.updateStatus,
);
contactRouter.delete(
  '/:id',
  adminWriteLimiter,
  validate(uuidParam()),
  contactEnquiryController.remove,
);

export { demoRouter, contactRouter };
