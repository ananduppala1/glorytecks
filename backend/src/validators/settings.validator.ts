import { body } from 'express-validator';
import {
  LIMITS,
  str,
  urlField,
  noUnknownFields,
  dropFields,
  SERVER_OWNED_FIELDS,
  objArray,
  strArray,
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

/**
 * A navigation target the marketing site renders into an `href`.
 *
 * Distinct from `externalUrl` (which demands an absolute https URL, because a
 * map embed has no other sensible form) and from the media fields (which are
 * additionally held to the Cloudinary host allowlist by `guardMediaUrls`).
 * A CTA button legitimately points at an in-app path — `/courses` is the
 * default — or out to an https page, so both are allowed and nothing else is.
 *
 * These fields were previously bounded but not scheme-checked, which left
 * `javascript:` and `data:text/html` storable. They are not media fields, so
 * `guardMediaUrls` never saw them; and the site renders them directly into a
 * <Link href>. That made an admin-authored value a stored XSS on a public
 * page — the same hole `utils/mediaUrl` closes for image and brochure columns,
 * on the one class of URL field it does not cover.
 *
 * Protocol-relative (`//evil.test`) is rejected explicitly: it is a remote URL
 * that a naive "starts with /" check reads as same-origin.
 */
const navLink = (field: string, label: string) =>
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
      // Whitespace and control characters are how a scheme gets past a prefix
      // test while browsers still honour it.
      const probe = value.replace(/[\s\u0000-\u0020\u007f-\u009f\u200b-\u200f\u202a-\u202e\ufeff]/g, '');
      if (probe.startsWith('//')) {
        throw new Error(`${label} must not be protocol-relative`);
      }
      if (probe.startsWith('/')) return true;
      if (/^https:\/\/[^\s]+$/i.test(probe)) return true;
      throw new Error(`${label} must be a site path (/courses) or an https URL`);
    });

const SETTINGS_FIELDS = [
  'siteName', 'tagline', 'phone', 'whatsapp', 'email', 'address', 'mapUrl',
  'homepageVideoUrl', 'announcementText', 'logo', 'defaultOgImage',
] as const;

/**
 * Groups the Settings page submits as nested objects rather than flat columns.
 *
 * They are NOT unmapped: `settingsTable` declares a codec for each of them
 * (`socialCodec`, `siteStatsCodec`, `seoCodec`, `heroSectionCodec`), and
 * `apiToRow` runs every codec — so `{ social: { facebook } }` is written to
 * `social_facebook`, and `{ heroSection: { secondaryCta: { link } } }` to
 * `hero_secondary_cta_link`. An earlier comment here described them as
 * discarded by the mapper; that was wrong, and the mistake mattered — it is
 * why the leaves below were left with a catch-all length rule and no scheme
 * check, while the marketing site renders several of them as `href`s.
 *
 * They are listed here only so `noUnknownFields` tolerates the group NAME:
 * the group is not itself a column, so it cannot appear in SETTINGS_FIELDS.
 * Every leaf inside is validated explicitly below.
 */
const SETTINGS_NESTED_GROUPS = ['social', 'stats', 'seo', 'heroSection'] as const;

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

  // Every social value becomes an `href` on the public footer, so each is
  // scheme-checked rather than merely length-bounded.
  body('social').optional({ values: 'null' }).isObject().withMessage('Social links must be an object'),
  navLink('social.*', 'Social link'),
  body('stats').optional({ values: 'null' }).isObject().withMessage('Stats must be an object'),
  body('stats.*').optional({ values: 'null' }).isString().trim().isLength({ max: 60 }),
  body('seo').optional({ values: 'null' }).isObject().withMessage('SEO must be an object'),
  str('seo.metaTitle', { max: LIMITS.TITLE }),
  str('seo.metaDescription', { max: LIMITS.SUMMARY }),
  urlField('seo.ogImage'),
  urlField('seo.canonicalUrl'),

  // heroSection is the homepage banner every visitor loads. It previously had
  // no rule beyond "is an object", so its leaves were both unbounded and
  // unchecked — including the two CTA links the page renders as `href`s.
  body('heroSection').optional({ values: 'null' }).isObject(),
  str('heroSection.badge', { max: LIMITS.LABEL }),
  str('heroSection.headingLine1', { max: LIMITS.TITLE }),
  str('heroSection.headingHighlight', { max: LIMITS.TITLE }),
  str('heroSection.headingLine2', { max: LIMITS.TITLE }),
  str('heroSection.description', { max: LIMITS.TEXT }),
  str('heroSection.whatsappText', { max: LIMITS.SUMMARY }),
  str('heroSection.heroImageAlt', { max: LIMITS.LABEL }),
  ...strArray('heroSection.badges', { maxItems: LIMITS.LIST_ITEMS, label: 'Hero badges' }),
  ...strArray('heroSection.trustPoints', { maxItems: LIMITS.LIST_ITEMS, label: 'Hero trust points' }),
  body('heroSection.primaryCta').optional({ values: 'null' }).isObject(),
  str('heroSection.primaryCta.text', { max: LIMITS.LABEL }),
  navLink('heroSection.primaryCta.link', 'Hero primary CTA link'),
  body('heroSection.secondaryCta').optional({ values: 'null' }).isObject(),
  str('heroSection.secondaryCta.text', { max: LIMITS.LABEL }),
  navLink('heroSection.secondaryCta.link', 'Hero secondary CTA link'),
  body('heroSection.overlayCard').optional({ values: 'null' }).isObject(),
  str('heroSection.overlayCard.label', { max: LIMITS.LABEL }),
  str('heroSection.overlayCard.value', { max: 60 }),
  str('heroSection.overlayCard.suffix', { max: 60 }),
  // `heroImage` is a media field, so `guardMediaUrls` additionally holds it to
  // the host allowlist; this gives it a field-level message too.
  urlField('heroSection.heroImage'),

  noUnknownFields(SETTINGS_FIELDS, [...SERVER_OWNED_FIELDS, ...SETTINGS_NESTED_GROUPS]),
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
  navLink('hero.primaryCtaLink', 'Primary CTA link'),
  body('hero.secondaryCtaText').optional().isString().trim().isLength({ max: LIMITS.LABEL }),
  navLink('hero.secondaryCtaLink', 'Secondary CTA link'),
  body('cta').optional({ values: 'null' }).isObject(),
  // The catch-all keeps every `cta` member bounded (heading, description,
  // buttonText); `buttonLink` is the one that becomes an href, so it also gets
  // the scheme check.
  body('cta.*').optional({ values: 'null' }).isString().trim().isLength({ max: LIMITS.URL }),
  navLink('cta.buttonLink', 'CTA button link'),
  body('seo').optional({ values: 'null' }).isObject(),

  noUnknownFields(ABOUT_FIELDS, [...SERVER_OWNED_FIELDS, ...ABOUT_UNMAPPED_GROUPS]),
];
