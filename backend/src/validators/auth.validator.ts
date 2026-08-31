import { body } from 'express-validator';
import { ALL_ROLES } from '../constants';
import {
  LIMITS,
  str,
  bool,
  enumField,
  urlField,
  noUnknownFields,
  dropFields,
  SERVER_OWNED_FIELDS,
} from './common';

export const loginValidator = [
  dropFields(SERVER_OWNED_FIELDS),
  body('email')
    .isString()
    .withMessage('A valid email is required')
    .bail()
    .trim()
    .isLength({ max: 254 })
    .withMessage('A valid email is required')
    .isEmail()
    .withMessage('A valid email is required')
    .normalizeEmail(),
  body('password')
    .isString()
    .withMessage('Password is required')
    .bail()
    .isLength({ min: 1, max: 200 })
    .withMessage('Password is required'),
  noUnknownFields(['email', 'password']),
];

export const changePasswordValidator = [
  dropFields(SERVER_OWNED_FIELDS),
  body('currentPassword')
    .isString()
    .withMessage('Current password is required')
    .bail()
    .isLength({ min: 1, max: 200 })
    .withMessage('Current password is required'),
  body('newPassword')
    .isString()
    .withMessage('New password must be at least 8 characters')
    .bail()
    .isLength({ min: 8, max: 200 })
    .withMessage('New password must be between 8 and 200 characters'),
  noUnknownFields(['currentPassword', 'newPassword']),
];

/**
 * Self-service profile update.
 *
 * Only name and avatar. `role`, `email` and `isActive` are absent by design:
 * this route is reachable by EVERY authenticated role, so anything assignable
 * here is assignable by a viewer. The service already picks just these two
 * fields; rejecting the rest at the edge means that is no longer the only
 * thing standing between a viewer and their own role.
 */
export const updateProfileValidator = [
  dropFields(SERVER_OWNED_FIELDS),
  str('name', { min: 2, max: LIMITS.NAME, label: 'Name' }),
  urlField('avatar'),
  noUnknownFields(['name', 'avatar']),
];

/**
 * Administrator provisioning and management (admin-only routes).
 *
 * `role` is validated against the real role list. Previously it was cast
 * straight from the body — `role as IAdminUser['role']` — so an admin could
 * store any string at all, including one that matches no authorization rule.
 * That fails closed at `authorize()`, but it produces an account nobody can
 * reason about, and it is not what any caller should be able to write.
 */
const ADMIN_CREATE_FIELDS = ['name', 'email', 'password', 'role'] as const;

export const createAdminValidator = [
  dropFields(SERVER_OWNED_FIELDS),
  str('name', { required: true, min: 2, max: LIMITS.NAME, label: 'Name' }),
  body('email')
    .isString()
    .withMessage('A valid email is required')
    .bail()
    .trim()
    .isLength({ max: 254 })
    .isEmail()
    .withMessage('A valid email is required')
    .normalizeEmail(),
  body('password')
    .isString()
    .withMessage('Password must be at least 8 characters')
    .bail()
    .isLength({ min: 8, max: 200 })
    .withMessage('Password must be between 8 and 200 characters'),
  enumField('role', ALL_ROLES, { label: 'Role' }),
  noUnknownFields(ADMIN_CREATE_FIELDS),
];

const ADMIN_UPDATE_FIELDS = ['name', 'role', 'isActive', 'avatar'] as const;

export const updateAdminValidator = [
  dropFields(SERVER_OWNED_FIELDS),
  str('name', { min: 2, max: LIMITS.NAME, label: 'Name' }),
  enumField('role', ALL_ROLES, { label: 'Role' }),
  bool('isActive'),
  urlField('avatar'),
  // `email` is immutable, and is rejected rather than ignored so a client that
  // tries to change it learns that it did not work.
  noUnknownFields(ADMIN_UPDATE_FIELDS, SERVER_OWNED_FIELDS),
];
