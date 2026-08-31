import { body, param, query, ValidationChain, CustomValidator } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

/**
 * Shared validation primitives.
 *
 * Two principles run through this file.
 *
 * FIRST: reject, do not repair. A request whose shape we did not expect is
 * refused rather than coerced into something acceptable. Coercion is how a
 * value nobody designed for reaches business logic — `Number({})`, `String([])`
 * and friends all succeed, and the result is a row nobody can explain later.
 *
 * SECOND: bound everything. Every string has a maximum length, every array a
 * maximum count, every object a maximum depth. Unbounded input is not a
 * correctness problem until it is a memory problem, and a 2 MB body of nested
 * arrays costs far more to store, render and re-serve than it does to send.
 */

/* ────────────────────────────────────────────────────────────────────────── *
 * Field limits
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Maximum accepted sizes, by the ROLE a field plays rather than by its name,
 * so a new field inherits a sensible bound by picking the closest kind.
 *
 * These are schema decisions, not security thresholds — they describe what the
 * product means by "a title" — so they live here rather than in the
 * environment. The DoS-relevant ceilings (payload depth, total keys) are in
 * config/env because those genuinely need per-deployment tuning.
 */
export const LIMITS = {
  /** Slugs, keys, enum-ish identifiers. */
  SLUG: 120,
  /** Person and entity names. */
  NAME: 160,
  /** Titles and headings. */
  TITLE: 300,
  /** One-line descriptors: role, company, category, subject. */
  LABEL: 200,
  /** Excerpts, short descriptions, quotes. */
  SUMMARY: 1_000,
  /** Free text: messages, notes, bios, answers. */
  TEXT: 5_000,
  /** A single content block's body, or a code sample. */
  BLOCK_TEXT: 20_000,
  /** Stored URLs. */
  URL: 2_048,
  /** Search terms. */
  SEARCH: 120,

  /** Array counts. */
  TAGS: 50,
  BLOCKS: 300,
  LIST_ITEMS: 200,
  TABLE_ROWS: 200,
  TABLE_COLS: 20,
  FAQS: 100,
  MODULES: 200,
  SYLLABUS: 100,
  RELATED: 50,
  GALLERY: 100,
  /** Default ceiling for any array without a more specific rule. */
  ARRAY: 200,

  /** Numeric ordering fields. */
  ORDER_MIN: -10_000,
  ORDER_MAX: 10_000,
} as const;

/* ────────────────────────────────────────────────────────────────────────── *
 * Payload shape guard
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Structural limits applied to every request body before any validator runs.
 *
 * express.json's byte limit bounds how much is *read*; it says nothing about
 * shape. 2 MB of `[[[[[…]]]]]` parses fine and then costs far more than 2 MB
 * to walk, validate, store and render. This bounds depth, total node count and
 * per-key width so that later stages only ever see a structure of known size.
 *
 * It also refuses the prototype-polluting keys outright. The repository layer
 * is already safe from them — `apiToRow` copies only fields declared in the
 * table definition, so `__proto__` is never read — but a request carrying one
 * is not a request we want to serve, and refusing at the edge keeps that
 * guarantee from depending on a mapper's implementation detail.
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function guardPayloadShape(req: Request, _res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const bodyValue: unknown = req.body;
  if (!bodyValue || typeof bodyValue !== 'object') return next();

  const { maxDepth, maxNodes, maxKeys, maxArrayLength } = env.payload;
  let nodes = 0;

  const walk = (value: unknown, depth: number): string | null => {
    if (depth > maxDepth) return 'Request body is nested too deeply';
    nodes += 1;
    if (nodes > maxNodes) return 'Request body has too many values';

    if (Array.isArray(value)) {
      if (value.length > maxArrayLength) return 'Request body contains an oversized list';
      for (const item of value) {
        const problem = walk(item, depth + 1);
        if (problem) return problem;
      }
      return null;
    }

    if (value !== null && typeof value === 'object') {
      const keys = Object.keys(value as Record<string, unknown>);
      if (keys.length > maxKeys) return 'Request body has too many properties';
      for (const key of keys) {
        if (FORBIDDEN_KEYS.has(key)) return 'Request body contains a disallowed property name';
        const problem = walk((value as Record<string, unknown>)[key], depth + 1);
        if (problem) return problem;
      }
      return null;
    }
    return null;
  };

  const problem = walk(bodyValue, 0);
  if (problem) return next(ApiError.badRequest(problem));
  return next();
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Identifier and parameter validation
 * ────────────────────────────────────────────────────────────────────────── */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isUuid = (value: unknown): boolean =>
  typeof value === 'string' && UUID_RE.test(value);

/**
 * Validate a `:id` path parameter as a UUID.
 *
 * Checked here rather than left to the database. Postgres does reject a
 * malformed uuid, but only after a network round trip, and only for tables
 * whose key is a uuid — this makes the contract explicit and keeps a
 * hand-crafted identifier from ever reaching a query builder.
 */
export const uuidParam = (name = 'id'): ValidationChain[] => [
  param(name).custom((value) => {
    if (!isUuid(value)) throw new Error('Invalid identifier format');
    return true;
  }),
];

/**
 * Validate a `:slug` path parameter.
 *
 * Slugs are concatenated into Redis cache keys on anonymous, high-volume
 * public endpoints, so an unconstrained one lets a caller mint unbounded cache
 * entries and smuggle separators into the key namespace.
 */
export const slugParam = (name = 'slug'): ValidationChain[] => [
  param(name)
    .isString()
    .trim()
    .toLowerCase()
    .isLength({ min: 1, max: LIMITS.SLUG })
    .matches(SLUG_RE)
    .withMessage('Invalid slug'),
];

/* ────────────────────────────────────────────────────────────────────────── *
 * Body field builders
 * ────────────────────────────────────────────────────────────────────────── */

interface StringOptions {
  required?: boolean;
  min?: number;
  max?: number;
  label?: string;
}

/** A bounded, trimmed string. */
export function str(field: string, opts: StringOptions = {}): ValidationChain {
  const { required = false, min = 0, max = LIMITS.LABEL, label = field } = opts;
  const chain = required
    ? body(field).exists({ values: 'falsy' }).withMessage(`${label} is required`)
    : body(field).optional({ values: 'undefined' });
  return chain
    .isString()
    .withMessage(`${label} must be text`)
    .bail()
    .trim()
    .isLength({ min: required ? Math.max(1, min) : min, max })
    .withMessage(
      min > 0
        ? `${label} must be between ${Math.max(1, min)} and ${max} characters`
        : `${label} must be at most ${max} characters`,
    );
}

/** A value restricted to an explicit allowlist. */
export function enumField(
  field: string,
  allowed: readonly string[],
  opts: { required?: boolean; label?: string } = {},
): ValidationChain {
  const { required = false, label = field } = opts;
  const chain = required
    ? body(field).exists().withMessage(`${label} is required`)
    : body(field).optional({ values: 'undefined' });
  return chain.isIn(allowed as string[]).withMessage(`${label} must be one of: ${allowed.join(', ')}`);
}

/** A strict boolean — `"yes"`, `1` and `"false"` are all rejected. */
export function bool(field: string, opts: { label?: string } = {}): ValidationChain {
  const { label = field } = opts;
  return body(field)
    .optional({ values: 'undefined' })
    .isBoolean({ strict: true })
    .withMessage(`${label} must be true or false`);
}

/** A bounded integer. */
export function int(
  field: string,
  opts: { min?: number; max?: number; label?: string } = {},
): ValidationChain {
  const { min = LIMITS.ORDER_MIN, max = LIMITS.ORDER_MAX, label = field } = opts;
  return body(field)
    .optional({ values: 'undefined' })
    .isInt({ min, max })
    .withMessage(`${label} must be a whole number between ${min} and ${max}`)
    .toInt();
}

/** An ISO date string. */
export function date(field: string, opts: { label?: string } = {}): ValidationChain {
  const { label = field } = opts;
  return body(field)
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage(`${label} must be a valid date`);
}

/** A bounded array whose entries are bounded strings. */
export function strArray(
  field: string,
  opts: { maxItems?: number; maxLength?: number; label?: string } = {},
): ValidationChain[] {
  const { maxItems = LIMITS.ARRAY, maxLength = LIMITS.LABEL, label = field } = opts;
  return [
    body(field)
      .optional({ values: 'undefined' })
      .isArray({ max: maxItems })
      .withMessage(`${label} must be a list of at most ${maxItems} items`),
    body(`${field}.*`)
      .isString()
      .withMessage(`Each ${label} entry must be text`)
      .bail()
      .trim()
      .isLength({ max: maxLength })
      .withMessage(`Each ${label} entry must be at most ${maxLength} characters`),
  ];
}

/** A bounded array of objects; entry fields are validated by the caller. */
export function objArray(
  field: string,
  opts: { maxItems?: number; label?: string } = {},
): ValidationChain {
  const { maxItems = LIMITS.ARRAY, label = field } = opts;
  return body(field)
    .optional({ values: 'undefined' })
    .isArray({ max: maxItems })
    .withMessage(`${label} must be a list of at most ${maxItems} items`);
}

/** A slug-shaped identifier in the body. */
export function slug(
  field: string,
  opts: { required?: boolean; label?: string } = {},
): ValidationChain {
  const { required = false, label = field } = opts;
  const chain = required
    ? body(field).exists({ values: 'falsy' }).withMessage(`${label} is required`)
    : body(field).optional({ values: 'undefined' });
  return chain
    .isString()
    .bail()
    .trim()
    .toLowerCase()
    .isLength({ min: 1, max: LIMITS.SLUG })
    .matches(SLUG_RE)
    .withMessage(`${label} may contain only lowercase letters, numbers and hyphens`);
}

/**
 * A stored URL field.
 *
 * The strict rules — https only, plus the media-host allowlist — live in
 * utils/mediaUrl and are applied to every mutating request by `guardMediaUrls`.
 * That guard is keyed by FIELD NAME, though, and it only knows the names in
 * `MEDIA_URL_FIELDS`. Three fields declared here are not on that list —
 * `linkedin`, `website` and `seo.canonicalUrl` — so for them this builder's
 * "the scheme is checked elsewhere" claim was simply untrue: they accepted
 * `javascript:` and were bounded only in length.
 *
 * Nothing renders those three as an `href` today, so this was a latent trap
 * rather than a live hole — but it is the kind that opens the first time
 * someone adds a "visit profile" link. So the executable-scheme check is made
 * unconditional here, at the one place every URL field already passes through.
 *
 * Deliberately weaker than `checkMediaUrl`: this allows `http://` and
 * site-relative paths, because a company's website legitimately may not be
 * https and rejecting it would break real data. It refuses only what can
 * execute or smuggle a document — which is what the field name promises.
 */
const EXECUTABLE_URL_SCHEME = /^(?!https?:\/\/)[a-z0-9+.-]*:/i;

export function urlField(field: string, opts: { label?: string } = {}): ValidationChain {
  const { label = field } = opts;
  return body(field)
    .optional({ values: 'null' })
    .isString()
    .withMessage(`${label} must be text`)
    .bail()
    .trim()
    .isLength({ max: LIMITS.URL })
    .withMessage(`${label} must be at most ${LIMITS.URL} characters`)
    .bail()
    .custom((value: string) => {
      if (value === '') return true;
      // Strip what a browser ignores but a prefix test does not: a scheme
      // split by a tab or a zero-width space is still honoured.
      const probe = value.replace(/[\s\u0000-\u0020\u007f-\u009f\u200b-\u200f\u202a-\u202e\ufeff]/g, '');
      if (probe.startsWith('//')) {
        throw new Error(`${label} must not be protocol-relative`);
      }
      if (EXECUTABLE_URL_SCHEME.test(probe)) {
        throw new Error(`${label} must be an http(s) URL or a site path`);
      }
      return true;
    });
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Unknown-field rejection
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Refuse a body carrying properties the resource does not define.
 *
 * The mapper already ignores unknown columns, so this is not what stops mass
 * assignment — but "silently ignored" and "rejected" are different contracts.
 * An editor whose client sends `isFeatured` instead of `featured` currently
 * gets a 200 and no change; telling them is better. And when a column is later
 * added to a table, a field that was previously ignored starts being written —
 * this makes that a deliberate act rather than a surprise.
 */
export function noUnknownFields(
  allowed: readonly string[],
  tolerated: readonly string[] = [],
): ValidationChain {
  const permitted = new Set<string>([...allowed, ...tolerated]);
  return body().custom(((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
    const unknown = Object.keys(value as Record<string, unknown>).filter(
      (key) => !permitted.has(key),
    );
    if (unknown.length) {
      throw new Error(`Unexpected field${unknown.length > 1 ? 's' : ''}: ${unknown.slice(0, 5).join(', ')}`);
    }
    return true;
  }) as CustomValidator);
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Query-string validation
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Validate the list-query surface shared by every collection endpoint.
 *
 * `parseListParams` clamps these too — it has to, because it is what the
 * repository consumes — but clamping silently turns `?page=99999999` into a
 * different request than the one asked for. Validating first means the caller
 * is told, and means the clamp is a safety net rather than the only control.
 */
export const listQueryValidator: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1, max: env.payload.maxPage })
    .withMessage(`page must be between 1 and ${env.payload.maxPage}`),
  query('limit')
    .optional()
    .isInt({ min: 1, max: env.payload.maxLimit })
    .withMessage(`limit must be between 1 and ${env.payload.maxLimit}`),
  query('sort')
    .optional()
    .isString()
    .bail()
    .isLength({ max: 200 })
    .withMessage('sort is too long')
    .matches(/^-?[A-Za-z][A-Za-z0-9_.]*(?:,-?[A-Za-z][A-Za-z0-9_.]*)*$/)
    .withMessage('sort must be a comma-separated list of field names'),
  query('q')
    .optional()
    .isString()
    .bail()
    .trim()
    .isLength({ max: LIMITS.SEARCH })
    .withMessage(`Search term must be at most ${LIMITS.SEARCH} characters`),
  query('search')
    .optional()
    .isString()
    .bail()
    .trim()
    .isLength({ max: LIMITS.SEARCH })
    .withMessage(`Search term must be at most ${LIMITS.SEARCH} characters`),
];

/**
 * Fields every REST client tends to echo back because it PUTs the record it
 * just GET'd. They are server-owned, so they are accepted and then REMOVED
 * from the body — never rejected, and never allowed to reach a repository.
 *
 * `dropFields` is what makes that safe rather than merely tolerant: relying on
 * a service to ignore them works only for as long as nobody reorders a spread.
 */
export const SERVER_OWNED_FIELDS = [
  'id',
  '_id',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'lastLoginAt',
] as const;

/**
 * Strip fields from the body before validation and before any handler sees
 * them. Used for values the server derives and must never accept.
 */
export function dropFields(names: readonly string[]): ValidationChain {
  const drop = new Set<string>(names);
  return body().customSanitizer(((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (!drop.has(key)) out[key] = val;
    }
    return out;
  }) as never);
}
