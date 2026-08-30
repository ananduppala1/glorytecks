import { Router } from 'express';
import { demoRequestController, contactEnquiryController } from '../controllers/lead.controller';
import { requireAuth, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { leadStatusValidator } from '../validators/lead.validator';
import { ROLES } from '../constants';

// Leads (enquiries + demo requests) are handled by admins and receptionists.
const leadRoles = [ROLES.ADMIN, ROLES.RECEPTIONIST];

const demoRouter = Router();
demoRouter.use(requireAuth, authorize(...leadRoles));
demoRouter.get('/', demoRequestController.list);
demoRouter.get('/:id', demoRequestController.getById);
demoRouter.patch('/:id/status', validate(leadStatusValidator), demoRequestController.updateStatus);
demoRouter.delete('/:id', demoRequestController.remove);

const contactRouter = Router();
contactRouter.use(requireAuth, authorize(...leadRoles));
contactRouter.get('/', contactEnquiryController.list);
contactRouter.get('/:id', contactEnquiryController.getById);
contactRouter.patch(
  '/:id/status',
  validate(leadStatusValidator),
  contactEnquiryController.updateStatus,
);
contactRouter.delete('/:id', contactEnquiryController.remove);

export { demoRouter, contactRouter };
