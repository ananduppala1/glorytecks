import { body } from 'express-validator';
import {
  LIMITS,
  str,
  urlField,
  noUnknownFields,
  dropFields,
  SERVER_OWNED_FIELDS,
  objArray,
} from './common';

/**
 * Singleton document schemas.
 *
 * Site settings and the about page had no validators at all: `PUT /settings`
 * accepted any object. Both are admin-only, but both are read by every visitor
 * on every page, so an unbounded value here is served site-wide.
 *
 * `mapUrl` and `homepageVideoUrl` are deliberately NOT media fields — they
 * point at Google Maps and YouTube, so they are excluded from the
 * Cloudinary-host allowlist that `guardMediaUrls` applies. They are still
 * bounded and still scheme-checked below.
 */
const EXTERNAL_EMBED = /^https:\/\/[^\s]+$/i;

const externalUrl = (field: string, label: string) =>
  body(field)
    .optional({ values: 'null' })
    .isString()
    .withMessage(`${label} must be text`)
    .bail()
    .trim()
    .isLength({ max: LIMITS.URL })
    .withMessage(`${label} must be at most ${LIMITS.URL} characters`)
    .custom((value: string) => {
      if (value === '') return true;
      if (!EXTERNAL_EMBED.test(value)) throw new Error(`${label} must be an https URL`);
      return true;
    });

const SETTINGS_FIELDS = [
  'siteName', 'tagline', 'phone', 'whatsapp', 'email', 'address', 'mapUrl',
  'homepageVideoUrl', 'announcementText', 'logo', 'defaultOgImage',
] as const;

/**
 * Groups the Settings page submits that the `settings` table has no column
 * for — `social`, `stats`, `seo`, `heroSection`. They are dropped by the
 * column mapper today, exactly as `timing` is on a batch, so the page appears
 * to save them and does not.
 *
 * Tolerated rather than rejected: refusing them would break the Settings page
 * outright, and the underlying problem is a missing column, not a hostile
 * request. Their contents are still bounded below so a tolerated field cannot
 * become an unbounded one.
 */
const SETTINGS_UNMAPPED_GROUPS = ['social', 'stats', 'seo', 'heroSection'] as const;

export const updateSettingsValidator = [
  dropFields(SERVER_OWNED_FIELDS),
  str('siteName', { max: LIMITS.NAME }),
  str('tagline', { max: LIMITS.SUMMARY }),
  str('phone', { max: 40 }),
  str('whatsapp', { max: 40 }),
  body('email')
    .optional({ values: 'null' })
    .isString()
    .bail()
    .trim()
    .isLength({ max: 254 })
    .custom((value: string) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    .withMessage('Email must be a valid address'),
  str('address', { max: LIMITS.TEXT }),
  externalUrl('mapUrl', 'Map URL'),
  externalUrl('homepageVideoUrl', 'Homepage video URL'),
  str('announcementText', { max: LIMITS.SUMMARY }),
  urlField('logo'),
  urlField('defaultOgImage'),

  // Bounded even though unmapped: they are still parsed, walked and echoed.
  body('social').optional({ values: 'null' }).isObject().withMessage('Social links must be an object'),
  body('social.*').optional({ values: 'null' }).isString().trim().isLength({ max: LIMITS.URL }),
  body('stats').optional({ values: 'null' }).isObject().withMessage('Stats must be an object'),
  body('stats.*').optional({ values: 'null' }).isString().trim().isLength({ max: 60 }),
  body('seo').optional({ values: 'null' }).isObject().withMessage('SEO must be an object'),
  str('seo.metaTitle', { max: LIMITS.TITLE }),
  str('seo.metaDescription', { max: LIMITS.SUMMARY }),
  urlField('seo.ogImage'),
  urlField('seo.canonicalUrl'),
  body('heroSection').optional({ values: 'null' }).isObject(),

  noUnknownFields(SETTINGS_FIELDS, [...SERVER_OWNED_FIELDS, ...SETTINGS_UNMAPPED_GROUPS]),
];

const ABOUT_FIELDS = ['sections', 'stats'] as const;

/** As above: `hero`, `cta` and `seo` are submitted but have no column. */
const ABOUT_UNMAPPED_GROUPS = ['hero', 'cta', 'seo', 'heroImage', 'heroImageAlt'] as const;

export const updateAboutValidator = [
  dropFields(SERVER_OWNED_FIELDS),
  objArray('sections', { maxItems: LIMITS.LIST_ITEMS, label: 'Sections' }),
  body('sections.*.heading').optional().isString().trim().isLength({ max: LIMITS.TITLE }),
  body('sections.*.title').optional().isString().trim().isLength({ max: LIMITS.TITLE }),
  body('sections.*.body').optional().isString().trim().isLength({ max: LIMITS.BLOCK_TEXT }),
  body('sections.*.text').optional().isString().trim().isLength({ max: LIMITS.BLOCK_TEXT }),
  body('sections.*.image').optional().isString().trim().isLength({ max: LIMITS.URL }),
  body('sections.*.imageAlt').optional().isString().trim().isLength({ max: LIMITS.LABEL }),
  body('sections.*.imageSide').optional().isIn(['left', 'right']),
  body('sections.*.eyebrow').optional().isString().trim().isLength({ max: LIMITS.LABEL }),
  body('sections.*.bullets')
    .optional()
    .isArray({ max: LIMITS.LIST_ITEMS })
    .withMessage(`A section may list at most ${LIMITS.LIST_ITEMS} bullets`),
  body('sections.*.bullets.*').optional().isString().trim().isLength({ max: LIMITS.SUMMARY }),
  objArray('stats', { maxItems: LIMITS.LIST_ITEMS, label: 'Stats' }),
  body('stats.*.label').optional().isString().trim().isLength({ max: LIMITS.LABEL }),
  body('stats.*.value').optional().isString().trim().isLength({ max: 60 }),
  body('hero').optional({ values: 'null' }).isObject(),
  body('hero.badge').optional().isString().trim().isLength({ max: LIMITS.LABEL }),
  body('hero.heading').optional().isString().trim().isLength({ max: LIMITS.TITLE }),
  body('hero.description').optional().isString().trim().isLength({ max: LIMITS.TEXT }),
  body('hero.image').optional().isString().trim().isLength({ max: LIMITS.URL }),
  body('hero.imageAlt').optional().isString().trim().isLength({ max: LIMITS.LABEL }),
  body('hero.primaryCtaText').optional().isString().trim().isLength({ max: LIMITS.LABEL }),
  body('hero.primaryCtaLink').optional().isString().trim().isLength({ max: LIMITS.URL }),
  body('hero.secondaryCtaText').optional().isString().trim().isLength({ max: LIMITS.LABEL }),
  body('hero.secondaryCtaLink').optional().isString().trim().isLength({ max: LIMITS.URL }),
  body('cta').optional({ values: 'null' }).isObject(),
  body('cta.*').optional({ values: 'null' }).isString().trim().isLength({ max: LIMITS.URL }),
  body('seo').optional({ values: 'null' }).isObject(),

  noUnknownFields(ABOUT_FIELDS, [...SERVER_OWNED_FIELDS, ...ABOUT_UNMAPPED_GROUPS]),
];
