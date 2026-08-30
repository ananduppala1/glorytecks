import { body } from 'express-validator';
import { BLOG_KINDS, ALL_CONTENT_STATUS } from '../constants';

const BLOCK_TYPES = [
  'heading',
  'subheading',
  'paragraph',
  'list',
  'table',
  'code',
  'callout',
  'quote',
  'image',
  'faq',
];

export const createBlogValidator = [
  body('title').isString().trim().isLength({ min: 3 }).withMessage('Title is required'),
  body('categorySlug').isString().trim().notEmpty().withMessage('Category is required'),
  body('category').optional().isString().trim(),
  body('kind').optional().isIn(BLOG_KINDS).withMessage('Invalid blog kind'),
  body('status').optional().isIn(ALL_CONTENT_STATUS).withMessage('Invalid status'),
  body('excerpt').optional().isString(),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('content').optional().isArray().withMessage('Content must be an array of blocks'),
  body('content.*.type')
    .optional()
    .isIn(BLOCK_TYPES)
    .withMessage('Each block must have a valid type'),
  body('seo').optional().isObject(),
];

export const updateBlogValidator = [
  body('title').optional().isString().trim().isLength({ min: 3 }),
  body('categorySlug').optional().isString().trim().notEmpty(),
  body('kind').optional().isIn(BLOG_KINDS),
  body('status').optional().isIn(ALL_CONTENT_STATUS),
  body('tags').optional().isArray(),
  body('content').optional().isArray(),
  body('content.*.type').optional().isIn(BLOCK_TYPES),
  body('seo').optional().isObject(),
];

export const blogStatusValidator = [
  body('status').isIn(ALL_CONTENT_STATUS).withMessage('Invalid status'),
];
