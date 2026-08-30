import { body } from 'express-validator';

export const loginValidator = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

export const changePasswordValidator = [
  body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isString()
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
];

export const updateProfileValidator = [
  body('name').optional().isString().trim().isLength({ min: 2 }).withMessage('Name too short'),
  body('avatar').optional().isString(),
];
