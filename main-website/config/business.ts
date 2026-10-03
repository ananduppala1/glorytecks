// ─────────────────────────────────────────────────────────────────────────────
// GloryTecks business entity — the single source of truth for NAP data.
//
// NAP (Name, Address, Phone) consistency is the backbone of local SEO. Before
// this file the same facts were written out in nine places across the frontend
// and backend, and they had already drifted: three different sets of
// coordinates and a street number that disagrees with the live site.
//
// Everything here is repository configuration, not CMS content. The backend's
// Settings singleton also carries phone/email/address so an admin can edit the
// visible contact block; that stays. This module is what STRUCTURED DATA and
// metadata are built from, because a machine-readable claim about a physical
// business must be stable and reviewed, not editable by accident.
//
// ┌───────────────────────────────────────────────────────────────────────────┐
// │  ⚠  VERIFICATION REQUIRED — see `VERIFICATION` below.                     │
// │  Four facts in this file are NOT confirmed and are flagged in code:       │
// │  street number, coordinates, email and the Google Business Profile.       │
// │  Resolve them once, set the flag to true, and every page, schema and      │
// │  metadata string follows automatically.                                   │
// └───────────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────

import type { NapConflict } from '@/lib/seo/nap';

/**
 * Facts that could not be confirmed from the repository and must be verified
 * against the real world before they are treated as authoritative.
 *
 * Each entry stays `false` until a human confirms it. Nothing breaks while a
 * fact is unverified — the value below is still used — but the discrepancy is
 * recorded here rather than buried in nine files, and
 * `docs/SEO_PHASE_2_AUDIT.md` lists what to check.
 */
export const VERIFICATION = {
  /**
   * ⚠ UNVERIFIED — STREET NUMBER CONFLICT.
   *
   *   This repository (9 locations, incl. the database seed default):
   *     603, Annapurna Block, Aditya Enclave
   *   The live site at glorytecks.com currently states:
   *     611, Annapurna Block, Aditya Enclave
   *
   * The repository value is kept below so that publishing this change does not
   * silently alter the address shown to customers. It is deliberately NOT a
   * decision — one of the two is wrong and only the business can say which.
   *
   * TO RESOLVE
   *   1. Confirm the real suite number on the door / rental agreement / GST
   *      registration.
   *   2. Confirm it matches the Google Business Profile exactly, character for
   *      character. A mismatch between GBP and on-site NAP suppresses local
   *      pack rankings and is the single highest-value fix available here.
   *   3. Update `streetAddress` below and set this flag to `true`.
   *   4. Update the backend seed default in
   *      `backend/src/seed/sitedata/homedata.ts` and the Settings row in the
   *      database, plus `backend/src/seed/sitedata/legal.ts` and
   *      `locations.ts`, so the CMS-rendered contact block agrees.
   */
  streetAddress: false,

  /**
   * ⚠ UNVERIFIED — COORDINATE CONFLICT.
   *
   * Three different coordinate pairs existed in the repository:
   *   17.4375,             78.4463              (lib/schema.ts — rounded)
   *   17.436739241114978,  78.44500078388435    (training-in-hyderabad page)
   *   17.436332501389888,  78.44224537686785    (Google Maps embed, home+contact)
   *
   * The value below is the third: it is the only one tied to an actual Google
   * Maps place reference for GloryTecks (place id `0x651a567e218dfc37:
   * 0xcbca18824dcfbc45`, embedded on the homepage and contact page), which
   * makes it the best-evidenced of the three rather than a guess at the
   * Ameerpet area.
   *
   * TO RESOLVE: open the Google Business Profile, copy the pin's coordinates,
   * paste them below and set this flag to `true`.
   *
   * NEW EVIDENCE (2026-09-24, docs/LOCAL_SEO_MASTER_AUDIT.md): the value below
   * is the embed's `!2d/!3d` — the map VIEWPORT centre, not the place's pin.
   * The site's own share link (maps.app.goo.gl/oCUrDQA4QUp22E8B6) resolves to
   * the same place id with its pin at 17.4367335, 78.4450028 — about 300 m
   * east, and within a metre of the older training-page value above.
   */
  geo: false,

  /**
   * ⚠ UNVERIFIED — EMAIL CONFLICT (found 2026-09-24).
   *
   *   This file, the migration default and the backend seed:
   *     gloryteckss@gmail.com
   *   The live CMS Settings row (what the footer and contact page show) and
   *   the legacy site at glorytecks.com:
   *     info@glorytecks.com
   *
   * Until resolved, the JSON-LD email and the visible email on the new site
   * disagree. TO RESOLVE: confirm the address the business answers, update
   * `email` below (and the seed/migration default), set this flag to `true`.
   */
  email: false,

  /**
   * ⚠ UNVERIFIED — GOOGLE BUSINESS PROFILE URL.
   *
   * `googleBusinessProfile` is null, but the homepage and contact page link
   * to https://maps.app.goo.gl/oCUrDQA4QUp22E8B6, which resolves to the
   * Google Maps listing "Glorytecks" (place 0x651a567e218dfc37:
   * 0xcbca18824dcfbc45, /g/11zbpqw3c1) — the same place the embeds use.
   * TO RESOLVE: confirm that listing is the business's own, claimed profile,
   * then set `googleBusinessProfile` to that URL (sameAs picks it up) and set
   * this flag to `true`.
   */
  googleBusinessProfile: false,
} as const;

export interface PostalAddressParts {
  streetAddress: string;
  locality: string;
  region: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
}

export interface BusinessEntity {
  /** Public brand name. Must match the Google Business Profile exactly. */
  name: string;
  /**
   * Registered legal entity name.
   *
   * Not asserted: no incorporation document, GST certificate or "About"
   * statement in this repository names one, and inventing a legal name in
   * structured data is a misrepresentation. Fill in once confirmed; the
   * Organization schema omits `legalName` entirely while this is null.
   */
  legalName: string | null;
  alternateNames: string[];
  address: PostalAddressParts;
  geo: { latitude: number; longitude: number };
  telephone: string;
  /** Digits only, for wa.me links. */
  whatsapp: string;
  email: string;
  /** Mon–Sat and Sunday bands, as displayed in the footer and on the site. */
  openingHours: { days: string[]; opens: string; closes: string }[];
  socialProfiles: string[];
  /**
   * Google Business Profile URL.
   *
   * Not asserted yet. The homepage and contact page link a Maps share URL
   * that resolves to the "Glorytecks" listing, but whether that listing is the
   * business's own claimed profile is unconfirmed — see
   * VERIFICATION.googleBusinessProfile. The `mapUrl` below is a plain Maps link
   * built from the same place reference. Add the confirmed GBP URL here;
   * `sameAs` includes it automatically once set.
   */
  googleBusinessProfile: string | null;
  /** Google Maps link built from the place reference used by the site's embed. */
  mapUrl: string;
}

export const BUSINESS: BusinessEntity = {
  name: 'GloryTecks',
  legalName: null,
  alternateNames: ['Glory Tecks', 'Glorytecks Hyderabad'],

  address: {
    // ⚠ See VERIFICATION.streetAddress above before trusting this value.
    streetAddress: '603, Annapurna Block, Aditya Enclave',
    locality: 'Ameerpet, Hyderabad',
    region: 'Telangana',
    postalCode: '500038',
    country: 'IN',
  },

  // ⚠ See VERIFICATION.geo above before trusting this value.
  geo: { latitude: 17.436332501389888, longitude: 78.44224537686785 },

  telephone: '+919908099980',
  whatsapp: '919908099980',
  email: 'gloryteckss@gmail.com',

  openingHours: [
    {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '08:00',
      closes: '21:00',
    },
    { days: ['Sunday'], opens: '09:00', closes: '17:00' },
  ],

  socialProfiles: [
    'https://www.facebook.com/profile.php?id=61589860342695',
    'https://www.instagram.com/glorytecks/',
    'https://www.linkedin.com/company/glorytecks/',
    'https://www.youtube.com/@glorytecks',
  ],

  googleBusinessProfile: null,
  mapUrl: 'https://www.google.com/maps/place/?q=place_id:0x651a567e218dfc37:0xcbca18824dcfbc45',
};

/* ── Derived helpers ──────────────────────────────────────────────────────── */

/** One-line address, as rendered in the footer and contact block. */
export const formattedAddress = (b: BusinessEntity = BUSINESS): string =>
  `${b.address.streetAddress}, ${b.address.locality} – ${b.address.postalCode}, ${b.address.region}, India`;

/** schema.org PostalAddress node, built once so every schema agrees. */
export const postalAddressSchema = (b: BusinessEntity = BUSINESS) => ({
  '@type': 'PostalAddress' as const,
  streetAddress: b.address.streetAddress,
  addressLocality: b.address.locality,
  addressRegion: b.address.region,
  postalCode: b.address.postalCode,
  addressCountry: b.address.country,
});

/** schema.org openingHoursSpecification list. */
export const openingHoursSchema = (b: BusinessEntity = BUSINESS) =>
  b.openingHours.map((h) => ({
    '@type': 'OpeningHoursSpecification' as const,
    dayOfWeek: h.days,
    opens: h.opens,
    closes: h.closes,
  }));

/**
 * `sameAs` for the Organization node: the social profiles the business
 * controls, plus the Google Business Profile once one is configured.
 */
export const sameAsProfiles = (b: BusinessEntity = BUSINESS): string[] =>
  b.googleBusinessProfile ? [...b.socialProfiles, b.googleBusinessProfile] : [...b.socialProfiles];

/**
 * True when every flagged fact has been confirmed. Surfaced by the SEO test
 * suite as a visible reminder rather than a failure — an unverified address is
 * a task for the business, not a reason to fail a build.
 */
export const allFactsVerified = (): boolean => Object.values(VERIFICATION).every(Boolean);

/* ── Open NAP conflicts (machine-readable ledger) ─────────────────────────── */

/**
 * Every place that currently states a business fact DIFFERENT from the values
 * above, recorded with the exact value it states.
 *
 * `lib/seo/nap.test.ts` (repository sources) and `lib/seo/nap.live.test.ts`
 * (CMS, Google Maps, deployed site) fail on any difference NOT listed here,
 * and on any entry here that no longer matches reality. So a new drift cannot
 * slip in, and resolving a conflict forces this ledger to be cleaned up with it.
 *
 * Entries are tolerated only while the matching VERIFICATION flag is false.
 * Values are normalised as in lib/seo/nap.ts. See docs/LOCAL_SEO_MASTER_AUDIT.md.
 */
export const NAP_OPEN_CONFLICTS: readonly NapConflict[] = [
  /* ── Street number: 603 (this file, seeds, migration) vs 611 ───────────── */
  {
    field: 'streetAddress',
    source: 'cms:settings',
    value: '611, annapurna block, aditya enclave',
    note: 'Live CMS Settings row, changed to 611 at 2026-09-23T21:51:46Z. It drives the footer, contact page and training page, so the visible address and the JSON-LD disagree until VERIFICATION.streetAddress is resolved.',
  },
  {
    field: 'streetAddress',
    source: 'legacy-site',
    value: '611, annapurna block, aditya enclave',
    note: 'The legacy Vite site still serving glorytecks.com states 611 everywhere. It disappears at cutover.',
  },

  /* ── Email: gloryteckss@gmail.com (this file) vs info@glorytecks.com ──── */
  {
    field: 'email',
    source: 'cms:settings',
    value: 'info@glorytecks.com',
    note: 'Live CMS Settings row — the visible email on the new site. JSON-LD states gloryteckss@gmail.com until VERIFICATION.email is resolved.',
  },
  {
    field: 'email',
    source: 'legacy-site',
    value: 'info@glorytecks.com',
    note: 'Legacy site. Disappears at cutover.',
  },

  /* ── Coordinates ─────────────────────────────────────────────────────── */
  {
    field: 'geo',
    source: 'google:maps-listing',
    value: '17.4367335,78.4450028',
    note: "The pin of the Google Maps listing the site's share link resolves to (same place id as the embeds). This file holds the embed's viewport centre, ~300 m west.",
  },
  {
    field: 'geo',
    source: 'legacy-site',
    value: '17.4375000,78.4463000',
    note: 'Legacy site, rounded coordinates. Disappears at cutover.',
  },
  {
    field: 'geo',
    source: 'main-website/components/views/LocationView.tsx',
    value: '17.4375000,78.4463000',
    note: 'The /training-in-hyderabad map embed is centred on the rounded legacy coordinates and shows a generic "Ameerpet" place, not the business listing. Changing it is a visible change awaiting approval.',
  },
  {
    field: 'mapsPlace',
    source: 'main-website/components/views/LocationView.tsx',
    value: '0x3bcb90d2e7a2f4a1:0x1',
    note: 'Same embed: a generic "Ameerpet, Hyderabad" place, not the GloryTecks listing (0x651a567e218dfc37:0xcbca18824dcfbc45) used on the homepage and contact page.',
  },

  /* ── Google Business Profile URL ─────────────────────────────────────── */
  {
    field: 'gbpUrl',
    source: 'main-website/components/views/HomeView.tsx',
    value: 'https://maps.app.goo.gl/ocurdqa4qup22e8b6',
    note: 'Share link to the "Glorytecks" Maps listing. googleBusinessProfile is null here until the business confirms the listing is its own claimed profile.',
  },
  {
    field: 'gbpUrl',
    source: 'main-website/components/views/ContactView.tsx',
    value: 'https://maps.app.goo.gl/ocurdqa4qup22e8b6',
    note: 'Same share link as the homepage.',
  },
];
