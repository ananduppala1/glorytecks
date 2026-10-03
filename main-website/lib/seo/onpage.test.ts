import { describe, expect, it } from 'vitest';

import { STATIC_ROUTES, staticRoute } from '@/lib/seo/routes';
import { buildMetadata, staticPageMetadata } from '@/lib/seo';
import {
  BUSINESS,
  VERIFICATION,
  allFactsVerified,
  formattedAddress,
  openingHoursSchema,
  postalAddressSchema,
  sameAsProfiles,
} from '@/config/business';
import {
  HOME_FAQS,
  SCHEMA_ID,
  courseListSchema,
  homeFaqSchema,
  localBusinessSchema,
  organizationSchema,
  webPageSchema,
  websiteSchema,
} from '@/lib/schema';

/* ── A. Keyword intent map / cannibalisation ──────────────────────────────── */

describe('page-to-intent map', () => {
  it('gives every static route exactly one primary intent', () => {
    for (const route of STATIC_ROUTES) {
      expect(route.primaryIntent.trim(), `${route.path}: no primary intent`).not.toBe('');
    }
  });

  it('never lets two pages target the same intent', () => {
    // This is the cannibalisation guard. Two pages chasing one query means one
    // of them is the wrong page — the conflict must surface here.
    const byIntent = new Map<string, string[]>();
    for (const r of STATIC_ROUTES.filter((x) => x.index)) {
      const key = r.primaryIntent.toLowerCase();
      byIntent.set(key, [...(byIntent.get(key) ?? []), r.path]);
    }
    const clashes = [...byIntent.entries()].filter(([, paths]) => paths.length > 1);
    expect(clashes, `intent collisions: ${JSON.stringify(clashes)}`).toEqual([]);
  });

  it('keeps the blog on informational intent, away from the course queries', () => {
    const blog = staticRoute('/blog');
    expect(blog.primaryIntent).toMatch(/informational/i);
    // /courses owns the commercial category query; the blog must not restate it.
    expect(blog.primaryIntent.toLowerCase()).not.toBe(
      staticRoute('/courses').primaryIntent.toLowerCase(),
    );
  });

  it('separates the city-level intent from the locality-level one', () => {
    // The homepage owns "Hyderabad"; the centre page owns "Ameerpet". If these
    // ever converge, the two pages start competing for the same result.
    expect(staticRoute('/').primaryIntent).not.toBe(
      staticRoute('/training-in-hyderabad').primaryIntent,
    );
  });
});

/* ── B. Title quality ─────────────────────────────────────────────────────── */

const BANNED_SUPERLATIVES = /\b(best|#\s*1|no\.?\s*1|top|leading|greatest|finest|world-class)\b/i;

describe('title tags', () => {
  it.each(STATIC_ROUTES.map((r) => [r.path, r.title] as const))(
    '%s has no unsubstantiated superlative',
    (path, title) => {
      expect(BANNED_SUPERLATIVES.test(title), `${path}: "${title}"`).toBe(false);
    },
  );

  it('does not stuff city variants into one title', () => {
    // "Ameerpet, Hyderabad" is one address — a locality and its city — so up to
    // two distinct place names is legitimate. What is not legitimate is naming
    // three localities, or repeating the same city to hit it twice.
    const PLACES = ['hyderabad', 'ameerpet', 'kukatpally', 'secunderabad', 'madhapur', 'gachibowli'];
    for (const { path, title } of STATIC_ROUTES) {
      const lower = title.toLowerCase();

      for (const place of PLACES) {
        const occurrences = lower.split(place).length - 1;
        expect(occurrences, `${path}: "${title}" repeats "${place}"`).toBeLessThanOrEqual(1);
      }

      const distinct = PLACES.filter((p) => lower.includes(p));
      expect(
        distinct.length,
        `${path}: "${title}" names ${distinct.join(' + ')}`,
      ).toBeLessThanOrEqual(2);
    }
  });

  it('keeps titles within a length a SERP will actually show', () => {
    for (const { path, title } of STATIC_ROUTES) {
      expect(title.length, `${path}: ${title.length} chars — "${title}"`).toBeLessThanOrEqual(65);
    }
  });

  it('does not repeat the same phrase either side of the separator', () => {
    // Catches "X Course Hyderabad | Best X Training Hyderabad | GloryTecks".
    for (const { path, title } of STATIC_ROUTES) {
      const parts = title.split('|').map((s) => s.trim().toLowerCase());
      expect(new Set(parts).size, `${path}: repeated segment in "${title}"`).toBe(parts.length);
    }
  });
});

/* ── C. Meta description quality ──────────────────────────────────────────── */

/**
 * Outcome promises. A training provider that states a guaranteed job, salary
 * or placement in a meta description is making a representation it has to be
 * able to honour. "Placement support" and "placement assistance" are fine —
 * they describe a service. "100% placement" and "guaranteed job" are not.
 */
const GUARANTEE_LANGUAGE =
  /\b(guarantee[ds]?|assured|100\s*%\s*(placement|job)|job\s+guarantee|guaranteed\s+(job|salary|placement|package))\b/i;

/** Explicit negation of a guarantee — a disclaimer, not a promise. */
const DISCLAIMER = /\b(?:not|never|no|without)\s+(?:a\s+|any\s+)?guarantee[ds]?\b/gi;

describe('meta descriptions', () => {
  it.each(STATIC_ROUTES.map((r) => [r.path, r.description] as const))(
    '%s promises no guaranteed outcome',
    (path, description) => {
      expect(GUARANTEE_LANGUAGE.test(description), `${path}: "${description}"`).toBe(false);
    },
  );

  it('avoids superlatives in descriptions too', () => {
    for (const { path, description } of STATIC_ROUTES) {
      expect(BANNED_SUPERLATIVES.test(description), `${path}: "${description}"`).toBe(false);
    }
  });

  it('is long enough to describe real page value and short enough to survive', () => {
    for (const { path, description } of STATIC_ROUTES) {
      expect(description.length, `${path}: ${description.length} chars`).toBeGreaterThan(70);
      expect(description.length, `${path}: ${description.length} chars`).toBeLessThanOrEqual(260);
    }
  });
});

/* ── D. No meta keywords ──────────────────────────────────────────────────── */

describe('meta keywords are gone', () => {
  it('buildMetadata emits no keywords field', () => {
    const meta = buildMetadata({ title: 'T', description: 'A description long enough to pass.' });
    expect('keywords' in meta).toBe(false);
  });

  it('no static route metadata carries keywords', () => {
    for (const route of STATIC_ROUTES) {
      expect('keywords' in staticPageMetadata(route.path), route.path).toBe(false);
    }
  });

  it('the route registry has no keywords field to reintroduce', () => {
    for (const route of STATIC_ROUTES) {
      expect('keywords' in route, route.path).toBe(false);
    }
  });
});

/* ── F. Business entity / NAP ─────────────────────────────────────────────── */

describe('business entity is a single source of truth', () => {
  it('exposes a complete NAP', () => {
    expect(BUSINESS.name).toBe('GloryTecks');
    expect(BUSINESS.address.streetAddress).toBeTruthy();
    expect(BUSINESS.address.postalCode).toMatch(/^\d{6}$/);
    expect(BUSINESS.address.country).toBe('IN');
    expect(BUSINESS.telephone).toMatch(/^\+91\d{10}$/);
    expect(BUSINESS.email).toContain('@');
  });

  it('builds one PostalAddress that every schema reuses', () => {
    const addr = postalAddressSchema();
    expect(addr['@type']).toBe('PostalAddress');
    expect(addr.streetAddress).toBe(BUSINESS.address.streetAddress);
    // The organization and the local business must not disagree.
    expect(organizationSchema().address).toEqual(addr);
    expect(localBusinessSchema().address).toEqual(addr);
  });

  it('uses one set of coordinates', () => {
    const geo = localBusinessSchema().geo;
    expect(geo.latitude).toBe(BUSINESS.geo.latitude);
    expect(geo.longitude).toBe(BUSINESS.geo.longitude);
  });

  it('states opening hours once, for both bands', () => {
    const hours = openingHoursSchema();
    expect(hours).toHaveLength(2);
    expect(hours[0].dayOfWeek).toContain('Monday');
    expect(hours[1].dayOfWeek).toEqual(['Sunday']);
  });

  it('renders the same address string the schema declares', () => {
    expect(formattedAddress()).toContain(BUSINESS.address.streetAddress);
    expect(formattedAddress()).toContain(BUSINESS.address.postalCode);
  });

  it('omits unconfirmed identity fields rather than inventing them', () => {
    // legalName and the Google Business Profile are unknown; asserting either
    // would be a misrepresentation of a real-world entity.
    expect(BUSINESS.legalName).toBeNull();
    expect(BUSINESS.googleBusinessProfile).toBeNull();
    expect('legalName' in organizationSchema()).toBe(false);
    expect(sameAsProfiles()).toEqual(BUSINESS.socialProfiles);
  });

  it('records the facts that still need human verification', () => {
    // Not a failure: an unverified street number is a task for the business.
    // This asserts the flags EXIST and are honest, so the reminder cannot be
    // quietly lost. Flip them in config/business.ts once confirmed.
    expect(VERIFICATION.streetAddress).toBe(false);
    expect(VERIFICATION.geo).toBe(false);
    expect(allFactsVerified()).toBe(false);
  });
});

/* ── G. Structured-data graph ─────────────────────────────────────────────── */

describe('JSON-LD graph', () => {
  it('has exactly one organization node, referenced by @id elsewhere', () => {
    const org = organizationSchema();
    expect(org['@id']).toBe(SCHEMA_ID.organization);
    expect(org['@type']).toBe('EducationalOrganization');

    // The place and the website point at it rather than restating it.
    expect(localBusinessSchema().parentOrganization).toEqual({ '@id': SCHEMA_ID.organization });
    expect(websiteSchema().publisher).toEqual({ '@id': SCHEMA_ID.organization });
  });

  it('wires page nodes into the website and organization', () => {
    const page = webPageSchema({ path: '/about', name: 'About', description: 'About us.' });
    expect(page['@id']).toBe('https://glorytecks.com/about#webpage');
    expect(page.isPartOf).toEqual({ '@id': SCHEMA_ID.website });
    expect(page.about).toEqual({ '@id': SCHEMA_ID.organization });
  });

  it('renders the homepage node at the bare origin, matching its canonical', () => {
    expect(webPageSchema({ path: '/', name: 'Home', description: 'Home.' }).url).toBe(
      'https://glorytecks.com',
    );
  });

  it('ties a course page to its Course node, and adds mainEntity only when given', () => {
    const page = webPageSchema({
      path: '/courses/data-science',
      name: 'Data Science Course in Hyderabad',
      description: 'A description.',
      mainEntity: 'https://glorytecks.com/courses/data-science#course',
    });
    expect(page['@id']).toBe('https://glorytecks.com/courses/data-science#webpage');
    expect(page.mainEntity).toEqual({ '@id': 'https://glorytecks.com/courses/data-science#course' });
    expect('mainEntity' in webPageSchema({ path: '/about', name: 'About', description: 'About us.' })).toBe(false);
  });

  it('lists the /courses summary page as an ItemList of canonical course URLs, and asserts nothing else', () => {
    const list = courseListSchema([{ slug: 'data-science' }, { slug: 'power-bi' }, { slug: 'sql-server' }]);
    expect(list['@type']).toBe('ItemList');
    expect(list.numberOfItems).toBe(3);
    expect(list.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, url: 'https://glorytecks.com/courses/data-science' },
      { '@type': 'ListItem', position: 2, url: 'https://glorytecks.com/courses/power-bi' },
      { '@type': 'ListItem', position: 3, url: 'https://glorytecks.com/courses/sql-server' },
    ]);
    // No price, rating, availability or outcome claims ride along with the list.
    expect(JSON.stringify(list)).not.toMatch(/offers|price|rating|review|availability|placement/i);
  });

  /* ── J. Reviews and ratings ─────────────────────────────────────────────── */
  it('publishes no self-serving rating or review anywhere in the graph', () => {
    const serialised = JSON.stringify([
      organizationSchema(),
      localBusinessSchema(),
      websiteSchema(),
      homeFaqSchema(),
    ]);
    expect(serialised).not.toContain('aggregateRating');
    expect(serialised).not.toContain('AggregateRating');
    expect(serialised).not.toContain('reviewCount');
    expect(serialised).not.toContain('ratingValue');
    expect(serialised).not.toContain('"review"');
  });

  it('asserts no unsupported organization facts', () => {
    const org = JSON.stringify(organizationSchema());
    // Previously present with no supporting source anywhere in the repository.
    expect(org).not.toContain('foundingDate');
    expect(org).not.toContain('numberOfEmployees');
  });

  it('omits a price range it cannot support', () => {
    // No price is published anywhere on the site, so priceRange would be a guess.
    expect(JSON.stringify(localBusinessSchema())).not.toContain('priceRange');
  });
});

/* ── I. FAQ integrity ─────────────────────────────────────────────────────── */

describe('homepage FAQ', () => {
  it('drives the visible block and the schema from one array', () => {
    const schemaQuestions = homeFaqSchema().mainEntity.map((q) => q.name);
    expect(schemaQuestions).toEqual(HOME_FAQS.map(([q]) => q));
  });

  it('makes no unsupported claim', () => {
    for (const [q, a] of HOME_FAQS) {
      // Strip explicit disclaimers first. "not a guarantee of employment" is
      // the honest thing to say; flagging it would push the copy the wrong way.
      const claimed = a.replace(DISCLAIMER, '');
      expect(GUARANTEE_LANGUAGE.test(claimed), `answer to "${q}"`).toBe(false);
      expect(BANNED_SUPERLATIVES.test(a), `answer to "${q}"`).toBe(false);
      // No self-assigned star rating in prose either.
      expect(a).not.toMatch(/\d(\.\d)?\s*\/\s*5|\brated\b/i);
    }
  });

  it('asks each question once', () => {
    const qs = HOME_FAQS.map(([q]) => q.toLowerCase());
    expect(new Set(qs).size).toBe(qs.length);
  });

  it('answers substantively rather than with a slogan', () => {
    for (const [q, a] of HOME_FAQS) {
      expect(a.length, `answer to "${q}" is too short`).toBeGreaterThan(60);
    }
  });
});
