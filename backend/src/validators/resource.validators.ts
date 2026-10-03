import { body, ValidationChain } from 'express-validator';
import {
  LIMITS,
  SERVER_OWNED_FIELDS,
  dropFields,
  str,
  slug,
  bool,
  int,
  date,
  strArray,
  objArray,
  enumField,
  urlField,
  noUnknownFields,
} from './common';
import { ALL_CONTENT_STATUS, BATCH_MODES } from '../constants';

/**
 * Request schemas for the registry-driven CRUD resources.
 *
 * Before this, `POST /trainers` and its fourteen siblings accepted any JSON
 * object. That was not a mass-assignment hole — `apiToRow` copies only the
 * columns a table declares, so `{"role":"admin"}` posted to /trainers was
 * dropped — but "the mapper ignores it" is a weaker guarantee than "the API
 * refuses it", and it left every field unbounded: a 2 MB string in `name`, a
 * hundred-thousand-entry `skills` array, an object where a number belongs.
 * Each of those is stored, then re-served to every visitor.
 *
 * Each resource below declares its full field list once. That list drives both
 * the per-field rules and `noUnknownFields`, so the two cannot drift apart.
 *
 * `create` requires the fields a record cannot exist without; `update` makes
 * everything optional so a PATCH-style partial update keeps working, which is
 * what the admin UI sends.
 */

export interface ResourceSchema {
  create: ValidationChain[];
  update: ValidationChain[];
}

/**
 * Build a create/update pair from one field list.
 *
 * `required` names the fields that `create` insists on. Everything is optional
 * on update, because the admin forms submit only what changed.
 */
function schema(
  fields: readonly string[],
  rules: (required: boolean) => ValidationChain[],
  /**
   * Field names the admin UI submits that this resource does not store.
   *
   * A pre-existing mismatch between the admin forms and the database schema —
   * a batch's "timing", a category's "salary" — which the column mapper
   * silently discards today. Tolerating them keeps those forms behaving
   * exactly as they do now; rejecting them would turn a quiet data-loss bug
   * into a hard failure without fixing it. Listed explicitly so the mismatch
   * is visible rather than implied.
   */
  legacyFormFields: readonly string[] = [],
): ResourceSchema {
  const tolerated = [...SERVER_OWNED_FIELDS, ...legacyFormFields];
  return {
    create: [dropFields(SERVER_OWNED_FIELDS), ...rules(true), noUnknownFields(fields, tolerated)],
    update: [dropFields(SERVER_OWNED_FIELDS), ...rules(false), noUnknownFields(fields, tolerated)],
  };
}

/* ── categories ─────────────────────────────────────────────────────────── */

const CATEGORY_FIELDS = [
  'slug', 'name', 'short', 'description', 'color', 'icon', 'courseSlug', 'courseTitle',
  'tools', 'roles', 'skills', 'certifications', 'prerequisites', 'blurb', 'order',
] as const;

const categories = schema(CATEGORY_FIELDS, (req) => [
  slug('slug', { required: req }),
  str('name', { required: req, min: 1, max: LIMITS.NAME }),
  str('short', { max: LIMITS.LABEL }),
  str('description', { max: LIMITS.TEXT }),
  str('color', { max: 40 }),
  str('icon', { max: 60 }),
  slug('courseSlug'),
  str('courseTitle', { max: LIMITS.TITLE }),
  ...strArray('tools', { maxItems: LIMITS.ARRAY }),
  ...strArray('roles', { maxItems: LIMITS.ARRAY }),
  ...strArray('skills', { maxItems: LIMITS.ARRAY }),
  ...strArray('certifications', { maxItems: LIMITS.ARRAY }),
  ...strArray('prerequisites', { maxItems: LIMITS.ARRAY }),
  str('blurb', { max: LIMITS.SUMMARY }),
  int('order'),
], ['salary']);

/* ── authors ────────────────────────────────────────────────────────────── */

const AUTHOR_FIELDS = ['key', 'name', 'role', 'bio', 'initials', 'avatar'] as const;

const authors = schema(AUTHOR_FIELDS, (req) => [
  slug('key', { required: req }),
  str('name', { required: req, min: 1, max: LIMITS.NAME }),
  str('role', { max: LIMITS.LABEL }),
  str('bio', { max: LIMITS.TEXT }),
  str('initials', { max: 8 }),
  urlField('avatar'),
]);

/* ── trainers ───────────────────────────────────────────────────────────── */

const TRAINER_FIELDS = [
  'name', 'title', 'experience', 'company', 'skills', 'bio', 'avatar',
  'linkedin', 'featured', 'order', 'isActive',
] as const;

const trainers = schema(TRAINER_FIELDS, (req) => [
  str('name', { required: req, min: 1, max: LIMITS.NAME }),
  str('title', { max: LIMITS.LABEL }),
  str('experience', { max: LIMITS.LABEL }),
  str('company', { max: LIMITS.NAME }),
  ...strArray('skills', { maxItems: LIMITS.ARRAY }),
  str('bio', { max: LIMITS.TEXT }),
  urlField('avatar'),
  urlField('linkedin'),
  bool('featured'),
  int('order'),
  bool('isActive'),
]);

/* ── testimonials ───────────────────────────────────────────────────────── */

const TESTIMONIAL_FIELDS = [
  'name', 'role', 'salary', 'stars', 'quote', 'course', 'avatar', 'featured', 'order', 'isActive',
] as const;

const testimonials = schema(TESTIMONIAL_FIELDS, (req) => [
  str('name', { required: req, min: 1, max: LIMITS.NAME }),
  str('role', { max: LIMITS.LABEL }),
  str('salary', { max: 60 }),
  int('stars', { min: 0, max: 5 }),
  str('quote', { max: LIMITS.SUMMARY }),
  str('course', { max: LIMITS.LABEL }),
  urlField('avatar'),
  bool('featured'),
  int('order'),
  bool('isActive'),
]);

/* ── placements ─────────────────────────────────────────────────────────── */

const PLACEMENT_FIELDS = [
  'name', 'role', 'company', 'packageLpa', 'previousPackage', 'course', 'stars',
  'avatar', 'batch', 'featured', 'order', 'isActive',
] as const;

const placements = schema(PLACEMENT_FIELDS, (req) => [
  str('name', { required: req, min: 1, max: LIMITS.NAME }),
  str('role', { max: LIMITS.LABEL }),
  str('company', { max: LIMITS.NAME }),
  str('packageLpa', { max: 60 }),
  str('previousPackage', { max: 60 }),
  str('course', { max: LIMITS.LABEL }),
  int('stars', { min: 0, max: 5 }),
  urlField('avatar'),
  str('batch', { max: 60 }),
  bool('featured'),
  int('order'),
  bool('isActive'),
]);

/* ── companies ──────────────────────────────────────────────────────────── */

const COMPANY_FIELDS = ['name', 'logo', 'website', 'order', 'isActive'] as const;

const companies = schema(COMPANY_FIELDS, (req) => [
  str('name', { required: req, min: 1, max: LIMITS.NAME }),
  urlField('logo'),
  urlField('website'),
  int('order'),
  bool('isActive'),
]);

/* ── roadmaps ───────────────────────────────────────────────────────────── */

const ROADMAP_FIELDS = ['course', 'steps', 'color', 'icon', 'order', 'isActive'] as const;

const roadmaps = schema(ROADMAP_FIELDS, (req) => [
  str('course', { required: req, min: 1, max: LIMITS.LABEL }),
  objArray('steps', { maxItems: LIMITS.LIST_ITEMS }),
  body('steps.*.title').optional().isString().trim().isLength({ max: LIMITS.TITLE }),
  body('steps.*.description').optional().isString().trim().isLength({ max: LIMITS.SUMMARY }),
  body('steps.*.duration').optional().isString().trim().isLength({ max: 60 }),
  str('color', { max: 40 }),
  str('icon', { max: 60 }),
  int('order'),
  bool('isActive'),
]);

/* ── faqs ───────────────────────────────────────────────────────────────── */

const FAQ_FIELDS = ['question', 'answer', 'scope', 'order', 'isActive'] as const;

const faqs = schema(FAQ_FIELDS, (req) => [
  str('question', { required: req, min: 1, max: LIMITS.TITLE }),
  str('answer', { required: req, min: 1, max: LIMITS.TEXT }),
  str('scope', { max: LIMITS.LABEL }),
  int('order'),
  bool('isActive'),
]);

/* ── comparisons ────────────────────────────────────────────────────────── */

const COMPARISON_FIELDS = [
  'slug', 'title', 'metaTitle', 'itemA', 'itemB', 'intro', 'rows', 'verdict',
  'relatedCourses', 'faqs', 'status', 'order',
] as const;

const comparisons = schema(COMPARISON_FIELDS, (req) => [
  slug('slug', { required: req }),
  str('title', { required: req, min: 1, max: LIMITS.TITLE }),
  str('metaTitle', { max: LIMITS.TITLE }),
  str('itemA', { max: LIMITS.LABEL }),
  str('itemB', { max: LIMITS.LABEL }),
  str('intro', { max: LIMITS.TEXT }),
  objArray('rows', { maxItems: LIMITS.TABLE_ROWS }),
  // The registry's transformBody accepts `label` as a legacy alias of `factor`.
  body('rows.*.factor').optional().isString().trim().isLength({ max: LIMITS.LABEL }),
  body('rows.*.label').optional().isString().trim().isLength({ max: LIMITS.LABEL }),
  body('rows.*.a').optional().isString().trim().isLength({ max: LIMITS.SUMMARY }),
  body('rows.*.b').optional().isString().trim().isLength({ max: LIMITS.SUMMARY }),
  str('verdict', { max: LIMITS.TEXT }),
  // transformBody normalises a bare slug string into { label, slug }, so both
  // shapes have to be accepted here or the legacy client breaks.
  objArray('relatedCourses', { maxItems: LIMITS.RELATED }),
  objArray('faqs', { maxItems: LIMITS.FAQS }),
  body('faqs.*.q').optional().isString().trim().isLength({ max: LIMITS.TITLE }),
  body('faqs.*.a').optional().isString().trim().isLength({ max: LIMITS.TEXT }),
  enumField('status', ALL_CONTENT_STATUS),
  int('order'),
]);

/* ── localities ─────────────────────────────────────────────────────────── */

const LOCALITY_FIELDS = ['slug', 'name', 'intro', 'context', 'nearby', 'order', 'isActive'] as const;

const localities = schema(LOCALITY_FIELDS, (req) => [
  slug('slug', { required: req }),
  str('name', { required: req, min: 1, max: LIMITS.NAME }),
  str('intro', { max: LIMITS.TEXT }),
  str('context', { max: LIMITS.TEXT }),
  ...strArray('nearby', { maxItems: LIMITS.ARRAY, maxLength: LIMITS.NAME }),
  int('order'),
  bool('isActive'),
], ['region', 'landmarks']);

/* ── legal documents ────────────────────────────────────────────────────── */

const LEGAL_FIELDS = [
  'slug', 'title', 'metaTitle', 'metaDescription', 'updated', 'intro', 'sections', 'status',
] as const;

const legal = schema(LEGAL_FIELDS, (req) => [
  slug('slug', { required: req }),
  str('title', { required: req, min: 1, max: LIMITS.TITLE }),
  str('metaTitle', { max: LIMITS.TITLE }),
  str('metaDescription', { max: LIMITS.SUMMARY }),
  str('updated', { max: 60 }),
  str('intro', { max: LIMITS.TEXT }),
  objArray('sections', { maxItems: LIMITS.LIST_ITEMS }),
  body('sections.*.heading')
  .optional()
  .isString()
  .trim()
  .isLength({ max: LIMITS.TITLE }),

  body('sections.*.paragraphs')
    .optional()
    .isArray({ max: LIMITS.LIST_ITEMS })
    .withMessage(
      `A section may contain at most ${LIMITS.LIST_ITEMS} paragraphs`,
    ),

  body('sections.*.paragraphs.*')
    .optional()
    .isString()
    .trim()
    .isLength({ max: LIMITS.BLOCK_TEXT }),

  body('sections.*.bullets')
    .optional()
    .isArray({ max: LIMITS.LIST_ITEMS })
    .withMessage(
      `A section may contain at most ${LIMITS.LIST_ITEMS} bullets`,
    ),

  body('sections.*.bullets.*')
    .optional()
    .isString()
    .trim()
    .isLength({ max: LIMITS.SUMMARY }),
  enumField('status', ALL_CONTENT_STATUS),
], ['updatedLabel', 'body']);

/* ── gallery ────────────────────────────────────────────────────────────── */

const GALLERY_FIELDS = ['title', 'imageUrl', 'category', 'caption', 'order', 'isActive'] as const;

const gallery = schema(GALLERY_FIELDS, (req) => [
  str('title', { required: req, min: 1, max: LIMITS.TITLE }),
  urlField('imageUrl'),
  str('category', { max: LIMITS.LABEL }),
  str('caption', { max: LIMITS.SUMMARY }),
  int('order'),
  bool('isActive'),
]);

/* ── brochures ──────────────────────────────────────────────────────────── */

const BROCHURE_FIELDS = ['title', 'courseSlug', 'fileUrl', 'fileSize', 'isActive'] as const;

const brochures = schema(BROCHURE_FIELDS, (req) => [
  str('title', { required: req, min: 1, max: LIMITS.TITLE }),
  slug('courseSlug'),
  urlField('fileUrl'),
  str('fileSize', { max: 40 }),
  bool('isActive'),
]);

/* ── batches ────────────────────────────────────────────────────────────── */

const BATCH_FIELDS = ['course', 'startDate', 'mode', 'seats', 'isActive', 'order'] as const;

const batches = schema(BATCH_FIELDS, (req) => [
  str('course', { required: req, min: 1, max: LIMITS.LABEL }),
  date('startDate'),
  enumField('mode', BATCH_MODES),
  int('seats', { min: 0, max: 100_000 }),
  bool('isActive'),
  int('order'),
], ['timing']);

/* ── registry ───────────────────────────────────────────────────────────── */

/**
 * Schema per registry path. A resource with no entry here would fall back to
 * accepting anything, so `buildGenericRoutes` refuses to mount one — see the
 * assertion there.
 */
export const RESOURCE_SCHEMAS: Record<string, ResourceSchema> = {
  categories,
  authors,
  trainers,
  testimonials,
  placements,
  companies,
  roadmaps,
  faqs,
  comparisons,
  localities,
  legal,
  gallery,
  brochures,
  batches,
};
