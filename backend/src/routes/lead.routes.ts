import { Router } from 'express';
import { demoRequestController, contactEnquiryController } from '../controllers/lead.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { leadStatusValidator } from '../validators/lead.validator';
import { uuidParam, listQueryValidator } from '../validators/common';
import { ROLES } from '../constants';

// Leads (enquiries + demo requests) are handled by admins and receptionists.
const leadRoles = [ROLES.ADMIN, ROLES.RECEPTIONIST];

const demoRouter = Router();
demoRouter.use(requireAuth, authorize(...leadRoles));
demoRouter.get('/', validate(listQueryValidator), demoRequestController.list);
demoRouter.get('/:id', validate(uuidParam()), demoRequestController.getById);
demoRouter.patch(
  '/:id/status',
  validate([...uuidParam(), ...leadStatusValidator]),
  demoRequestController.updateStatus,
);
demoRouter.delete('/:id', validate(uuidParam()), demoRequestController.remove);

const contactRouter = Router();
contactRouter.use(requireAuth, authorize(...leadRoles));
contactRouter.get('/', validate(listQueryValidator), contactEnquiryController.list);
contactRouter.get('/:id', validate(uuidParam()), contactEnquiryController.getById);
contactRouter.patch(
  '/:id/status',
  validate([...uuidParam(), ...leadStatusValidator]),
  contactEnquiryController.updateStatus,
);
contactRouter.delete('/:id', validate(uuidParam()), contactEnquiryController.remove);

export { demoRouter, contactRouter };
