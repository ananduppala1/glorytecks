import { body } from 'express-validator';
import { ALL_CONTENT_STATUS } from '../constants';

export const createCourseValidator = [
  body('title').isString().trim().isLength({ min: 2 }).withMessage('Title is required'),
  body('category').optional().isString().trim(),
  body('duration').optional().isString().trim(),
  body('modules').optional().isArray(),
  body('tools').optional().isArray(),
  body('projects').optional().isArray(),
  body('skills').optional().isArray(),
  body('syllabus').optional().isArray(),
  body('syllabus.*.title').optional().isString(),
  body('syllabus.*.items').optional().isArray(),
  body('faqs').optional().isArray(),
  body('status').optional().isIn(ALL_CONTENT_STATUS),
];

export const updateCourseValidator = [
  body('title').optional().isString().trim().isLength({ min: 2 }),
  body('modules').optional().isArray(),
  body('tools').optional().isArray(),
  body('projects').optional().isArray(),
  body('skills').optional().isArray(),
  body('syllabus').optional().isArray(),
  body('faqs').optional().isArray(),
  body('status').optional().isIn(ALL_CONTENT_STATUS),
];
