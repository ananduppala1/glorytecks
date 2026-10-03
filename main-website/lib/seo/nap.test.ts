import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { BUSINESS, NAP_OPEN_CONFLICTS, VERIFICATION, postalAddressSchema, sameAsProfiles } from '@/config/business';
import { SCHEMA_ID, homeFaqSchema, localBusinessSchema, organizationSchema, websiteSchema } from '@/lib/schema';
import {
  canonicalNap,
  describeFinding,
  extractFromSchema,
  extractFromSource,
  reconcileNap,
  stripComments,
  type NapField,
  type NapObservation,
} from '@/lib/seo/nap';

/**
 * NAP consistency across the whole repository — see docs/LOCAL_SEO_MASTER_AUDIT.md.
 *
 * Canonical: config/business.ts. Observed: every business fact stated anywhere
 * in main-website, the backend (seeds, migrations, source) and the admin app,
 * plus the structured data lib/schema.ts renders. The CMS, Google Maps and a
 * deployed site are compared in nap.live.test.ts.
 *
 * Set NAP_REPORT=<path> to write the full reconciliation as JSON.
 */

const WEB = process.cwd();
const REPO = path.resolve(WEB, '..');

/**
 * Files that state an email but not a PUBLIC contact: seeded staff login
 * accounts and the admin login form's placeholder. Auth, not NAP.
 */
const NOT_NAP = new Set([
  'backend/src/config/env.ts',
  'backend/src/seed/createAdmin.ts',
  'admin-frontend/src/pages/Login.tsx',
]);

const SCAN_ROOTS = [
  'main-website/app',
  'main-website/components',
  'main-website/lib',
  'main-website/config',
  'backend/src',
  'backend/supabase/migrations',
  'admin-frontend/src',
];

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (abs: string) => {
    if (!existsSync(abs)) return;
    for (const name of readdirSync(abs)) {
      const file = path.join(abs, name);
      if (statSync(file).isDirectory()) {
        if (name !== 'node_modules' && name !== 'dist') walk(file);
        continue;
      }
      if (!/\.(tsx?|mjs|sql)$/.test(name) || /\.test\.tsx?$/.test(name)) continue;
      const rel = path.relative(REPO, file).split(path.sep).join('/');
      // The canonical file and the NAP module itself are not observations.
      if (rel === 'main-website/config/business.ts' || rel === 'main-website/lib/seo/nap.ts') continue;
      out.push(rel);
    }
  };
  for (const root of SCAN_ROOTS) walk(path.join(REPO, root));
  return out;
}

function scanRepository(): NapObservation[] {
  const observations: NapObservation[] = [];
  for (const rel of sourceFiles()) {
    const found = extractFromSource(rel, readFileSync(path.join(REPO, rel), 'utf8'));
    observations.push(...found.filter((o) => !(o.field === 'email' && NOT_NAP.has(rel))));
  }
  // What the site actually publishes as structured data and visible FAQ copy.
  observations.push(
    ...extractFromSchema('main-website/lib/schema.ts', [organizationSchema(), localBusinessSchema(), websiteSchema()]),
    ...extractFromSource('main-website/lib/schema.ts#homeFaq', JSON.stringify(homeFaqSchema())),
  );
  return observations;
}

const canonical = canonicalNap(BUSINESS);
const observations = scanRepository();
const report = reconcileNap(observations, canonical, NAP_OPEN_CONFLICTS);

if (process.env.NAP_REPORT) {
  writeFileSync(process.env.NAP_REPORT, JSON.stringify({ canonical, ledger: NAP_OPEN_CONFLICTS, report, observations }, null, 2));
}

/** Which VERIFICATION flag must still be false for a difference in this field to be tolerated. */
const FLAG_FOR: Partial<Record<NapField, keyof typeof VERIFICATION>> = {
  streetAddress: 'streetAddress',
  postalCode: 'streetAddress',
  geo: 'geo',
  email: 'email',
  mapsPlace: 'googleBusinessProfile',
  gbpUrl: 'googleBusinessProfile',
};

describe('NAP consistency — repository', () => {
  it('no source states a business fact that differs from config/business.ts', () => {
    const lines = report.unexpected.map(describeFinding);
    expect(lines, `\n  ${lines.join('\n  ')}`).toEqual([]);
  });

  it('the open-conflict ledger has no stale entries', () => {
    const lines = report.stale.map((e) => `${e.source} ${e.field} = "${e.value}" is no longer stated there`);
    expect(lines, `\n  ${lines.join('\n  ')}`).toEqual([]);
  });

  it('only tolerates conflicts in facts that are still flagged unverified', () => {
    for (const entry of NAP_OPEN_CONFLICTS) {
      const flag = FLAG_FOR[entry.field];
      expect(flag, `${entry.field} can never be an open conflict — phone, name, hours and socials must match`).toBeDefined();
      expect(VERIFICATION[flag!], `${entry.field} is marked verified but ${entry.source} still differs`).toBe(false);
      expect(entry.note.length, `${entry.source}: say why this is tolerated`).toBeGreaterThan(20);
    }
  });

  it('reads every source it claims to (a broken extractor must not pass silently)', () => {
    for (const source of [
      'backend/supabase/migrations/20260101000100_singletons.sql',
      'backend/src/seed/sitedata/homedata.ts',
      'backend/src/seed/sitedata/legal.ts',
      'backend/src/seed/sitedata/locations.ts',
      'main-website/components/views/HomeView.tsx',
      'main-website/components/views/ContactView.tsx',
      'main-website/components/views/LocationView.tsx',
    ]) {
      expect(report.sources, source).toContain(source);
    }
    const count = (f: NapField) => observations.filter((o) => o.field === f).length;
    expect(count('streetAddress')).toBeGreaterThanOrEqual(6);
    expect(count('telephone')).toBeGreaterThanOrEqual(8);
    expect(count('email')).toBeGreaterThanOrEqual(4);
    expect(count('geo')).toBeGreaterThanOrEqual(4);
    expect(count('openingHours')).toBeGreaterThanOrEqual(4);
    expect(count('socialProfile')).toBeGreaterThanOrEqual(8);
    // The brand: the schema, the migration default and the seed.
    expect(count('name')).toBeGreaterThanOrEqual(3);
  });

  it('prints the conflicts still waiting for a business decision', () => {
    for (const f of report.acknowledged) console.warn(`[nap] open: ${describeFinding(f)}\n        ${f.note}`);
    // Every tolerated difference is in a field that has a verification flag.
    expect(report.acknowledged.filter((f) => !FLAG_FOR[f.field])).toEqual([]);
  });
});

/* ── Extractor behaviour ──────────────────────────────────────────────────── */

describe('NAP extractors', () => {
  const find = (src: string, field: NapField) =>
    extractFromSource('x.ts', src).filter((o) => o.field === field).map((o) => o.value);

  it('normalises every phone format to one number', () => {
    expect(find(`"+91 9908099980" '+91 99080 99980' "919908099980" tel:+919908099980`, 'telephone')).toEqual([
      '919908099980',
      '919908099980',
      '919908099980',
      '919908099980',
    ]);
  });

  it('does not read map-embed decimals or long IDs as phone numbers', () => {
    expect(find('!2d78.44224537686785!3d17.436332501389888 id=61589860342695', 'telephone')).toEqual([]);
  });

  it('reads the street number, whatever the spacing', () => {
    expect(find('611 ,Annapurna Block,  Aditya Enclave', 'streetAddress')).toEqual(['611, annapurna block, aditya enclave']);
  });

  it('reads coordinates and the place from a map embed', () => {
    const src = 'maps/embed?pb=!1m18!2d78.4463!3d17.4375!3m3!1m2!1s0x3bcb90d2e7a2f4a1%3A0x1!2sAmeerpet"';
    expect(find(src, 'geo')).toEqual(['17.4375000,78.4463000']);
    expect(find(src, 'mapsPlace')).toEqual(['0x3bcb90d2e7a2f4a1:0x1']);
  });

  it('reads both opening-hours bands in 12-hour copy', () => {
    expect(find('Mon–Sat: 8AM – 9PM | Sunday: 9AM – 5PM', 'openingHours')).toEqual(['mon-sat 08:00-21:00', 'sun 09:00-17:00']);
  });

  it('ignores documentation comments that quote old values', () => {
    expect(find('/* was 611, Annapurna Block, Aditya Enclave */\n// 603, Annapurna Block, Aditya Enclave', 'streetAddress')).toEqual([]);
    expect(stripComments('a\n/* b\nc */\nd').split('\n')).toHaveLength(4);
  });

  it('flags a new drift but tolerates exactly what the ledger records', () => {
    const obs: NapObservation[] = [
      { source: 'a.ts', field: 'streetAddress', value: '611, annapurna block, aditya enclave' },
      { source: 'b.ts', field: 'telephone', value: '919999999999' },
    ];
    const ledger = [{ field: 'streetAddress' as const, source: 'a.ts', value: '611, annapurna block, aditya enclave', note: 'pending the business' }];
    const r = reconcileNap(obs, canonical, ledger);
    expect(r.acknowledged).toHaveLength(1);
    expect(r.unexpected.map((u) => u.source)).toEqual(['b.ts']);
    expect(reconcileNap([], canonical, ledger).stale).toEqual([]);
    expect(reconcileNap([{ source: 'a.ts', field: 'name', value: 'glorytecks' }], canonical, ledger).stale).toEqual(ledger);
  });
});

/* ── Structured-data identity ─────────────────────────────────────────────── */

const schemaSources = () =>
  sourceFiles()
    .filter((f) => f.startsWith('main-website/') && !f.startsWith('main-website/lib/seo/'))
    .map((f) => ({ file: f, code: stripComments(readFileSync(path.join(REPO, f), 'utf8')) }));

describe('one business entity in the structured data', () => {
  it('declares Organization, LocalBusiness and WebSite nodes only in lib/schema.ts', () => {
    for (const { file, code } of schemaSources()) {
      if (file === 'main-website/lib/schema.ts') continue;
      expect(code, file).not.toMatch(/['"]@type['"]\s*:\s*\[?\s*['"](LocalBusiness|EducationalOrganization|Organization|WebSite)['"]/);
    }
  });

  it('writes the #organization / #localbusiness / #website ids only in lib/schema.ts', () => {
    for (const { file, code } of schemaSources()) {
      if (file === 'main-website/lib/schema.ts') continue;
      expect(code, file).not.toMatch(/\/#(organization|localbusiness|website)\b/);
    }
  });

  it('links the graph by @id: LocalBusiness → parentOrganization, WebSite → publisher', () => {
    expect(organizationSchema()['@type']).toBe('EducationalOrganization');
    expect(organizationSchema()['@id']).toBe(SCHEMA_ID.organization);
    expect(localBusinessSchema()['@type']).toBe('LocalBusiness');
    expect(localBusinessSchema()['@id']).toBe(SCHEMA_ID.localBusiness);
    expect(localBusinessSchema().parentOrganization).toEqual({ '@id': SCHEMA_ID.organization });
    expect(websiteSchema()['@type']).toBe('WebSite');
    expect(websiteSchema().publisher).toEqual({ '@id': SCHEMA_ID.organization });
  });

  it('takes every NAP property from config/business.ts', () => {
    const org = organizationSchema();
    const place = localBusinessSchema();
    for (const node of [org, place]) {
      expect(node.address).toEqual(postalAddressSchema());
      expect(node.telephone).toBe(BUSINESS.telephone);
      expect(node.email).toBe(BUSINESS.email);
    }
    expect(org.name).toBe(BUSINESS.name);
    expect(place.name.startsWith(BUSINESS.name)).toBe(true);
    expect(place.geo).toMatchObject({ latitude: BUSINESS.geo.latitude, longitude: BUSINESS.geo.longitude });
    expect(place.hasMap).toBe(BUSINESS.mapUrl);
    expect(org.sameAs).toEqual(sameAsProfiles());
  });
});

describe('no unsupported business claims in structured data', () => {
  const FORBIDDEN = /\b(aggregateRating|AggregateRating|ratingValue|reviewCount|foundingDate|numberOfEmployees|priceRange|legalName)\b\s*:/;

  it('asserts no rating, founding date, employee count or price range anywhere', () => {
    for (const { file, code } of schemaSources()) {
      // legalName is allowed only as the guarded spread in lib/schema.ts.
      const scrubbed = file === 'main-website/lib/schema.ts' ? code.replace(/\{\s*legalName:\s*BUSINESS\.legalName\s*\}/, '') : code;
      expect(scrubbed, file).not.toMatch(FORBIDDEN);
    }
    const all = JSON.stringify([organizationSchema(), localBusinessSchema(), websiteSchema(), homeFaqSchema()]);
    expect(all).not.toMatch(/aggregateRating|foundingDate|numberOfEmployees|priceRange|"offers"|"review"/);
  });

  it('omits legalName and the GBP while they are unconfirmed', () => {
    expect(BUSINESS.legalName).toBeNull();
    expect('legalName' in organizationSchema()).toBe(false);
    expect(BUSINESS.googleBusinessProfile).toBeNull();
    expect(sameAsProfiles()).toEqual(BUSINESS.socialProfiles);
  });

  it('describes one physical centre — no implied second campus', () => {
    const place = localBusinessSchema() as Record<string, unknown>;
    for (const key of ['department', 'subOrganization', 'location', 'containsPlace', 'branchOf', 'hasPOS']) {
      expect(place, key).not.toHaveProperty(key);
    }
    // areaServed names the districts served; none may carry its own address or pin.
    for (const area of place.areaServed as Record<string, unknown>[]) {
      expect(Object.keys(area).sort()).toEqual(['@type', 'name']);
    }
    expect(JSON.stringify(organizationSchema())).not.toMatch(/"(streetAddress|geo)"[\s\S]*"(streetAddress|geo)"[\s\S]*"(streetAddress)"/);
  });
});

describe('Course nodes', () => {
  const COURSE_PAGES = ['main-website/app/(site)/courses/[slug]/page.tsx', 'main-website/app/(site)/[landingSlug]/page.tsx'];

  for (const file of COURSE_PAGES) {
    it(`${file.split('/app/')[1]}: provider and venue by @id, no invented offer or schedule`, () => {
      const code = stripComments(readFileSync(path.join(REPO, file), 'utf8'));
      const course = code.slice(code.indexOf('courseSchema = {'), code.indexOf('};', code.indexOf('courseSchema = {')));
      expect(course).toMatch(/['"]@type['"]:\s*['"]Course['"]/);
      expect(course).toMatch(/provider:\s*ref\(SCHEMA_ID\.organization\)/);
      expect(course).toMatch(/courseMode:\s*['"]onsite['"],\s*location:\s*ref\(SCHEMA_ID\.localBusiness\)/);
      expect(course).toMatch(/courseMode:\s*['"]online['"]/);
      expect(course).not.toMatch(/\b(offers|price|priceCurrency|availability|startDate|endDate|courseSchedule|aggregateRating)\b/);
    });
  }
});
