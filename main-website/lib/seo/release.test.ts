import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  PRODUCTION_ORIGIN,
  SITE_ORIGIN,
  canonicalUrl,
  isValidCanonical,
  resolveSiteOrigin,
} from '@/lib/seo/canonical';
import { DYNAMIC_ROUTES, STATIC_ROUTES } from '@/lib/seo/routes';
import { staticPageMetadata } from '@/lib/seo';
import { archiveDecision, parsePageParam } from '@/lib/seo/archive';
import { buildUrlset, isoDate, validateEntries } from '@/lib/seo/sitemap';
import {
  organizationSchema,
  localBusinessSchema,
  websiteSchema,
  webPageSchema,
} from '@/lib/schema';
import { isSitemapEligible } from '@/lib/blog/merged';

/**
 * Release gate.
 *
 * One suite per failure mode that must never reach production. These overlap
 * deliberately with the phase-specific suites — the point of this file is that
 * a reviewer can read the release criteria in one place and see each one
 * asserted, rather than inferring coverage from five other files.
 */

/* ── 1. Production URL accidentally becomes localhost ─────────────────────── */

describe('no localhost or dev origin can reach production metadata', () => {
  it('rejects every dev-shaped origin, falling back to production', () => {
    for (const origin of [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'localhost:3000',
      'http://0.0.0.0:3000',
    ]) {
      const resolved = resolveSiteOrigin(origin);
      // Either rejected outright, or accepted but flagged non-production so
      // robots.txt disallows the whole deployment.
      expect(
        resolved.origin === PRODUCTION_ORIGIN || resolved.isProduction === false,
        `${origin} resolved to ${resolved.origin} and claimed to be production`,
      ).toBe(true);
    }
  });

  it('never emits a localhost canonical for any static route', () => {
    for (const route of STATIC_ROUTES) {
      const canonical = staticPageMetadata(route.path).alternates?.canonical;
      if (typeof canonical !== 'string') continue;
      expect(canonical).not.toMatch(/localhost|127\.0\.0\.1|0\.0\.0\.0|:\d{4}/);
    }
  });

  it('rejects a localhost URL as a sitemap entry', () => {
    expect(validateEntries([{ url: 'http://localhost:3000/courses' }])).toHaveLength(1);
  });
});

/* ── 2. Staging URL appears in metadata ───────────────────────────────────── */

describe('no staging or preview hostname in emitted URLs', () => {
  it('rejects preview hosts as canonicals', () => {
    for (const url of [
      'https://glorytecks-git-main.vercel.app/courses',
      'https://staging.glorytecks.com/courses',
      'https://preview.glorytecks.com/',
      'https://glorytecks.com.evil.test/courses',
    ]) {
      expect(isValidCanonical(url, PRODUCTION_ORIGIN), url).toBe(false);
    }
  });

  it('builds every canonical on the production origin', () => {
    expect(SITE_ORIGIN).toBe(PRODUCTION_ORIGIN);
    for (const route of STATIC_ROUTES) {
      expect(canonicalUrl(route.path).startsWith(PRODUCTION_ORIGIN)).toBe(true);
    }
  });
});

/* ── 3. Canonical missing from an important page ──────────────────────────── */

describe('every indexable page carries a self-referencing canonical', () => {
  const IMPORTANT = ['/', '/courses', '/blog', '/about', '/contact', '/training-in-hyderabad'];

  it.each(IMPORTANT)('%s has a valid canonical', (p) => {
    const canonical = staticPageMetadata(p).alternates?.canonical;
    expect(typeof canonical).toBe('string');
    expect(isValidCanonical(canonical as string)).toBe(true);
    expect(canonical).toBe(canonicalUrl(p));
  });
});

/* ── 4. A noindex page appears in a sitemap ───────────────────────────────── */

describe('noindex content never reaches a sitemap', () => {
  it('excludes every noindex static route', () => {
    for (const r of STATIC_ROUTES.filter((x) => !x.index)) {
      expect(r.sitemap, `${r.path} is noindex but claims a sitemap`).toBeNull();
    }
  });

  it('excludes every noindex dynamic route pattern', () => {
    for (const r of DYNAMIC_ROUTES.filter((x) => !x.index)) {
      expect(r.sitemap, `${r.pattern} is noindex but claims a sitemap`).toBeNull();
    }
  });

  it('excludes merged articles, which now redirect', () => {
    expect(isSitemapEligible('mlops-interview-questions-and-answers-2')).toBe(false);
  });
});

/* ── 5. Sitemap has invalid URLs ──────────────────────────────────────────── */

describe('sitemap entry validation', () => {
  it.each([
    ['/relative', 'relative URL'],
    ['https://glorytecks.com/courses/', 'trailing slash'],
    ['https://glorytecks.com//courses', 'double slash'],
    ['https://glorytecks.com/blog?q=python', 'query string'],
    ['https://glorytecks.com/courses#top', 'fragment'],
    ['http://glorytecks.com/courses', 'insecure scheme'],
  ])('rejects %s (%s)', (url) => {
    expect(validateEntries([{ url }])).toHaveLength(1);
  });

  it('emits neither priority nor changefreq', () => {
    const xml = buildUrlset([{ url: canonicalUrl('/courses'), lastModified: '2026-01-01' }]);
    expect(xml).not.toContain('<priority>');
    expect(xml).not.toContain('<changefreq>');
  });
});

/* ── 6 & 7. Title / description missing ───────────────────────────────────── */

describe('no page ships without a title and description', () => {
  it.each(STATIC_ROUTES.map((r) => [r.path] as const))('%s', (p) => {
    const meta = staticPageMetadata(p);
    expect(typeof meta.title === 'string' && meta.title.length > 10).toBe(true);
    expect(typeof meta.description === 'string' && meta.description.length > 40).toBe(true);
  });
});

/* ── 8. Duplicate business entity ─────────────────────────────────────────── */

describe('exactly one business entity in the graph', () => {
  const countDefinitions = (nodes: unknown[], type: string) => {
    const seen: string[] = [];
    const walk = (o: unknown): void => {
      if (Array.isArray(o)) return o.forEach(walk);
      if (o && typeof o === 'object') {
        const n = o as Record<string, unknown>;
        if (n['@type'] === type && typeof n['@id'] === 'string') seen.push(n['@id'] as string);
        Object.values(n).forEach(walk);
      }
    };
    nodes.forEach(walk);
    return seen;
  };

  it('defines the organization once, not once per node', () => {
    const graph = [organizationSchema(), websiteSchema(), localBusinessSchema()];
    expect(countDefinitions(graph, 'EducationalOrganization')).toHaveLength(1);
    expect(countDefinitions(graph, 'LocalBusiness')).toHaveLength(1);
    expect(countDefinitions(graph, 'WebSite')).toHaveLength(1);
  });

  it('references the organization by @id instead of restating it', () => {
    expect(websiteSchema().publisher).toEqual({ '@id': `${PRODUCTION_ORIGIN}/#organization` });
    expect(localBusinessSchema().parentOrganization).toEqual({
      '@id': `${PRODUCTION_ORIGIN}/#organization`,
    });
    const wp = webPageSchema({ path: '/about', name: 'x', description: 'y' });
    expect(wp.about).toEqual({ '@id': `${PRODUCTION_ORIGIN}/#organization` });
  });

  it('publishes no self-serving rating and no unverified business facts', () => {
    const blob = JSON.stringify([organizationSchema(), localBusinessSchema(), websiteSchema()]);
    for (const banned of [
      'aggregateRating',
      'ratingValue',
      'reviewCount',
      'foundingDate',
      'numberOfEmployees',
      'priceRange',
    ]) {
      expect(blob, `schema contains ${banned}`).not.toContain(banned);
    }
  });
});

/* ── 9. Unknown route becomes 200 ─────────────────────────────────────────── */

describe('unknown URLs cannot return 200', () => {
  it('keeps finite route sets closed so unknown slugs are static 404s', () => {
    const closed = DYNAMIC_ROUTES.filter((r) => !r.dynamicParams).map((r) => r.pattern);
    // `/{landingSlug}` is the single-segment catch-all: closing it is what makes
    // /wp-login.php, /.env and every other bot probe a zero-cost 404.
    expect(closed).toContain('/{landingSlug}');
    expect(closed).toContain('/resources/{slug}');
  });

  it('404s out-of-range and malformed pagination instead of an empty 200', () => {
    const decide = (raw: string | undefined, total: number | null) =>
      archiveDecision({
        basePath: '/blog',
        page: parsePageParam(raw),
        filters: { q: '', tag: '', sort: 'latest' },
        totalPages: total,
      });

    for (const raw of ['999999', '0', '-1', 'abc', '1.5', '01']) {
      expect(decide(raw, 8).status, raw).toBe(404);
    }
    expect(decide('2', 8).status).toBe(200);
  });
});

/* ── 10. Random query URLs become indexable ───────────────────────────────── */

describe('query-parameter URLs cannot become indexable', () => {
  it.each([
    ['q', { q: 'python', tag: '', sort: 'latest' as const }],
    ['tag', { q: '', tag: 'aws', sort: 'latest' as const }],
    ['sort', { q: '', tag: '', sort: 'popular' as const }],
  ])('?%s= is noindex, follow, with no canonical', (_label, filters) => {
    const d = archiveDecision({
      basePath: '/blog',
      page: parsePageParam(undefined),
      filters,
      totalPages: 8,
    });
    expect(d.status).toBe(200);
    expect(d.index).toBe(false);
    expect(d.follow).toBe(true);
    expect(d.canonical).toBeNull();
  });

  it('strips unknown tracking parameters from the canonical', () => {
    expect(canonicalUrl('/blog?utm_source=x&fbclid=y&gclid=z')).toBe(
      `${PRODUCTION_ORIGIN}/blog`,
    );
  });
});

/* ── 11. Sitemap uses the current time as a fake lastmod ──────────────────── */

describe('lastmod is a real content date, never the clock', () => {
  it('returns null rather than today for a missing or malformed date', () => {
    for (const v of [undefined, null, '', 'not a date', '2026-13-45']) {
      expect(isoDate(v as string | null | undefined)).toBeNull();
    }
  });

  it('omits <lastmod> entirely when there is no date', () => {
    const xml = buildUrlset([{ url: canonicalUrl('/courses'), lastModified: null }]);
    expect(xml).not.toContain('<lastmod>');
  });

  it('has no new Date() in the sitemap or canonical source path', () => {
    // A clock read anywhere in this path is how "everything changed an hour
    // ago, every hour" gets reintroduced.
    for (const rel of ['lib/seo/sitemap.ts', 'lib/seo/canonical.ts', 'lib/seo/routes.ts']) {
      const src = readFileSync(path.join(process.cwd(), rel), 'utf8');
      const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''); // ignore comments
      expect(code, `${rel} reads the clock`).not.toMatch(/new Date\(\s*\)|Date\.now\(\)/);
    }
  });
});
