import { body } from 'express-validator';
import { BLOG_KINDS, ALL_CONTENT_STATUS } from '../constants';
import {
  LIMITS,
  str,
  slug,
  bool,
  date,
  strArray,
  enumField,
  urlField,
  noUnknownFields,
  dropFields,
  SERVER_OWNED_FIELDS,
} from './common';
import { blocksCustomValidator } from './blocks.validator';

/**
 * Blog request schemas.
 *
 * `content` is validated structurally by blocks.validator — see the note there
 * about why administrator-authored content still needs bounding.
 *
 * Derived fields (`html`, `toc`, `faqs`, `readTime`) are deliberately NOT
 * accepted from a client: the service recomputes them from `content` on every
 * write, so allowing them in would let a caller store rendered HTML that never
 * passed through the escaping renderer. They are absent from the field list
 * below, which means `noUnknownFields` now rejects them outright.
 */
const BLOG_FIELDS = [
  'slug', 'title', 'category', 'categorySlug', 'kind', 'excerpt', 'status',
  'featured', 'trending', 'popular', 'tags', 'author', 'authorKey',
  'featuredImage', 'date', 'updated', 'content', 'seo',
] as const;

/**
 * Rendered output and its derivatives. The service recomputes all of these
 * from `content`, and `updateBlog`'s assignable list already ignores them —
 * but that is an ordering guarantee inside a spread, and an edit that reordered
 * it would silently start accepting client-supplied `html`, bypassing the
 * escaping renderer entirely. Removing them from the body makes it structural.
 */
const DERIVED_FIELDS = ['html', 'toc', 'faqs'] as const;

const rules = (required: boolean) => [
  dropFields([...SERVER_OWNED_FIELDS, ...DERIVED_FIELDS]),
  str('title', { required, min: 3, max: LIMITS.TITLE, label: 'Title' }),
  slug('slug'),
  str('category', { max: LIMITS.LABEL }),
  required
    ? slug('categorySlug', { required: true, label: 'Category' })
    : slug('categorySlug', { label: 'Category' }),
  enumField('kind', BLOG_KINDS, { label: 'Blog kind' }),
  enumField('status', ALL_CONTENT_STATUS, { label: 'Status' }),
  str('excerpt', { max: LIMITS.SUMMARY }),
  bool('featured'),
  bool('trending'),
  bool('popular'),
  ...strArray('tags', { maxItems: LIMITS.TAGS, maxLength: LIMITS.LABEL, label: 'Tags' }),
  // `author` is a relation: the mapper accepts an id string or a populated
  // object echoed back by the client, and nothing else.
  body('author')
    .optional({ values: 'null' })
    .custom((value) => {
      if (typeof value === 'string') return value.length <= LIMITS.SLUG;
      if (value && typeof value === 'object' && !Array.isArray(value)) return true;
      throw new Error('Author must be an id or an author object');
    }),
  slug('authorKey'),
  urlField('featuredImage'),
  date('date'),
  date('updated'),
  body('content')
    .optional({ values: 'undefined' })
    .custom(blocksCustomValidator),
  body('seo')
    .optional({ values: 'null' })
    .isObject()
    .withMessage('SEO must be an object'),
  str('seo.metaTitle', { max: LIMITS.TITLE }),
  str('seo.metaDescription', { max: LIMITS.SUMMARY }),
  urlField('seo.canonicalUrl'),
  urlField('seo.ogImage'),
  ...strArray('seo.keywords', { maxItems: LIMITS.TAGS, maxLength: LIMITS.LABEL }),
  str('readTime', { max: 40 }),
];

// `readTime` is accepted (the service honours a supplied value) and bounded.
// The admin editor PUTs the record it fetched, so the server-owned and derived
// names above are stripped rather than rejected.
const TOLERATED = [...SERVER_OWNED_FIELDS, ...DERIVED_FIELDS];

export const createBlogValidator = [
  ...rules(true),
  noUnknownFields([...BLOG_FIELDS, 'readTime'], TOLERATED),
];
export const updateBlogValidator = [
  ...rules(false),
  noUnknownFields([...BLOG_FIELDS, 'readTime'], TOLERATED),
];

export const blogStatusValidator = [
  enumField('status', ALL_CONTENT_STATUS, { required: true, label: 'Status' }),
  noUnknownFields(['status']),
];
