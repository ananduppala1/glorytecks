import { body } from 'express-validator';

export const demoRequestValidator = [
  body('name').isString().trim().isLength({ min: 2 }).withMessage('Name is required'),
  body('phone')
    .isString()
    .trim()
    .matches(/^[0-9+\s-]{8,15}$/)
    .withMessage('A valid phone number is required'),
  body('course').optional().isString().trim(),
  body('source').optional().isString().trim(),
];

export const contactEnquiryValidator = [
  body('name').isString().trim().isLength({ min: 2 }).withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('phone')
    .isString()
    .trim()
    .matches(/^[0-9+\s-]{8,15}$/)
    .withMessage('A valid phone number is required'),
  body('course').optional().isString().trim(),
  body('message').isString().trim().isLength({ min: 5 }).withMessage('Message is required'),
  body('subject').optional().isString().trim(),
];

export const leadStatusValidator = [
  body('status').optional().isString(),
  body('notes').optional().isString(),
];
