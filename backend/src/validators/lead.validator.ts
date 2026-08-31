import { body } from 'express-validator';
import { ALL_LEAD_STATUS } from '../constants';
import { LIMITS, str, enumField, noUnknownFields, dropFields, SERVER_OWNED_FIELDS } from './common';

/**
 * Lead capture schemas.
 *
 * These are the platform's only UNAUTHENTICATED write endpoints, so they are
 * the ones a stranger can reach. Every field was previously bounded below but
 * not above: `name` required two characters and permitted two million, and
 * `message` the same. A single request could therefore store megabytes that
 * the admin UI then has to list and render.
 *
 * Phone is matched against a shape rather than merely required, and the
 * pattern is anchored and bounded — an unbounded alternation here would be a
 * ReDoS vector on a public endpoint.
 */
const PHONE_RE = /^[0-9+\s-]{8,15}$/;

const DEMO_FIELDS = ['name', 'phone', 'course', 'source'] as const;

export const demoRequestValidator = [
  dropFields(SERVER_OWNED_FIELDS),
  str('name', { required: true, min: 2, max: LIMITS.NAME, label: 'Name' }),
  body('phone')
    .isString()
    .withMessage('A valid phone number is required')
    .bail()
    .trim()
    .matches(PHONE_RE)
    .withMessage('A valid phone number is required'),
  str('course', { max: LIMITS.LABEL }),
  str('source', { max: LIMITS.LABEL }),
  // `status` and `notes` are staff fields: a public submitter must not be able
  // to file a lead pre-marked "converted", or attach an internal note.
  noUnknownFields(DEMO_FIELDS, SERVER_OWNED_FIELDS),
];

const CONTACT_FIELDS = ['name', 'email', 'phone', 'course', 'message', 'subject'] as const;

export const contactEnquiryValidator = [
  dropFields(SERVER_OWNED_FIELDS),
  str('name', { required: true, min: 2, max: LIMITS.NAME, label: 'Name' }),
  body('email')
    .isString()
    .withMessage('A valid email is required')
    .bail()
    .trim()
    .isLength({ max: 254 })
    .withMessage('Email is too long')
    .isEmail()
    .withMessage('A valid email is required')
    .normalizeEmail(),
  body('phone')
    .isString()
    .withMessage('A valid phone number is required')
    .bail()
    .trim()
    .matches(PHONE_RE)
    .withMessage('A valid phone number is required'),
  str('course', { max: LIMITS.LABEL }),
  str('subject', { max: LIMITS.LABEL }),
  str('message', { required: true, min: 5, max: LIMITS.TEXT, label: 'Message' }),
  noUnknownFields(CONTACT_FIELDS, SERVER_OWNED_FIELDS),
];

/**
 * Staff-side lead update. `status` was previously any string at all, so a lead
 * could be moved to a state the dashboard does not recognise.
 */
export const leadStatusValidator = [
  dropFields(SERVER_OWNED_FIELDS),
  enumField('status', ALL_LEAD_STATUS, { label: 'Status' }),
  str('notes', { max: LIMITS.TEXT }),
  noUnknownFields(['status', 'notes'], SERVER_OWNED_FIELDS),
];
