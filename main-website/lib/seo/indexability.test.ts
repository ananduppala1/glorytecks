import { describe, expect, it } from 'vitest';

import {
  CANONICAL_QUERY_ORDER,
  DYNAMIC_ROUTES,
  FILTER_PARAMS,
  STATIC_ROUTES,
  staticRoute,
} from '@/lib/seo/routes';
import { canonicalUrl, isValidCanonical, PRODUCTION_ORIGIN } from '@/lib/seo/canonical';
import { buildMetadata, notFoundMetadata, staticPageMetadata } from '@/lib/seo';
import { RESOURCE_SLUGS } from '@/config/resources';
import { locationLandings } from '@/config/locationLandings';

/** Pull the canonical href out of a Metadata object, whatever shape it took. */
const canonicalOf = (meta: ReturnType<typeof buildMetadata>): string | undefined => {
  const value = meta.alternates?.canonical;
  return typeof value === 'string' ? value : undefined;
};

const robotsOf = (meta: ReturnType<typeof buildMetadata>) =>
  meta.robots as { index?: boolean; follow?: boolean };

/* ── Metadata completeness ────────────────────────────────────────────────── */

describe('every static route has complete metadata', () => {
  it.each(STATIC_ROUTES.map((r) => [r.path, r] as const))('%s', (path, route) => {
    expect(route.title.trim(), `${path}: missing title`).not.toBe('');
    expect(route.description.trim(), `${path}: missing description`).not.toBe('');
    // Long enough to be a real description rather than a placeholder.
    expect(route.description.length, `${path}: description too short`).toBeGreaterThan(40);
  });

  it('produces a title and description for every route through buildMetadata', () => {
    for (const route of STATIC_ROUTES) {
      const meta = staticPageMetadata(route.path);
      expect(meta.title, route.path).toBeTruthy();
      expect(meta.description, route.path).toBeTruthy();
      expect(meta.openGraph?.title, route.path).toBeTruthy();
      expect(meta.twitter, route.path).toBeTruthy();
    }
  });
});

describe('no duplicate titles or descriptions', () => {
  it('every static route has a unique title', () => {
    const byTitle = new Map<string, string[]>();
    for (const r of STATIC_ROUTES) {
      byTitle.set(r.title, [...(byTitle.get(r.title) ?? []), r.path]);
    }
    const dupes = [...byTitle.entries()].filter(([, paths]) => paths.length > 1);
    expect(dupes, `duplicate titles: ${JSON.stringify(dupes)}`).toEqual([]);
  });

  it('every static route has a unique description', () => {
    const byDesc = new Map<string, string[]>();
    for (const r of STATIC_ROUTES) {
      byDesc.set(r.description, [...(byDesc.get(r.description) ?? []), r.path]);
    }
    const dupes = [...byDesc.entries()].filter(([, paths]) => paths.length > 1);
    expect(dupes, `duplicate descriptions: ${JSON.stringify(dupes)}`).toEqual([]);
  });
});

/* ── Canonicals ───────────────────────────────────────────────────────────── */

describe('canonicals', () => {
  it('every indexable static route emits a valid absolute canonical', () => {
    for (const route of STATIC_ROUTES.filter((r) => r.index)) {
      const canonical = canonicalOf(staticPageMetadata(route.path));
      expect(canonical, `${route.path}: missing canonical`).toBeDefined();
      expect(isValidCanonical(canonical!), `${route.path}: malformed canonical`).toBe(true);
    }
  });

  it('no two routes claim the same canonical', () => {
    const seen = new Map<string, string>();
    for (const route of STATIC_ROUTES) {
      const canonical = canonicalOf(staticPageMetadata(route.path));
      if (!canonical) continue;
      expect(seen.get(canonical), `${route.path} duplicates ${seen.get(canonical)}`).toBeUndefined();
      seen.set(canonical, route.path);
    }
  });

  it('a canonical is always self-referential — never a different page', () => {
    for (const route of STATIC_ROUTES) {
      const canonical = canonicalOf(staticPageMetadata(route.path));
      if (!canonical) continue;
      expect(canonical, route.path).toBe(canonicalUrl(route.path));
    }
  });

  it('a not-found page emits no canonical at all', () => {
    const meta = notFoundMetadata('Gone', 'Not here.');
    expect(canonicalOf(meta)).toBeUndefined();
    expect(robotsOf(meta).index).toBe(false);
    // …but still passes link equity on.
    expect(robotsOf(meta).follow).toBe(true);
  });

  it('never emits a staging or preview hostname', () => {
    for (const route of STATIC_ROUTES) {
      const canonical = canonicalOf(staticPageMetadata(route.path));
      if (!canonical) continue;
      // Either the bare origin (the homepage) or a path beneath it.
      expect(
        canonical === PRODUCTION_ORIGIN || canonical.startsWith(`${PRODUCTION_ORIGIN}/`),
        route.path,
      ).toBe(true);
      expect(canonical).not.toMatch(/vercel\.app|localhost|127\.0\.0\.1|staging|preview/i);
    }
  });

  it('og:url agrees with the canonical', () => {
    for (const route of STATIC_ROUTES) {
      const meta = staticPageMetadata(route.path);
      const canonical = canonicalOf(meta);
      if (!canonical) continue;
      expect(String(meta.openGraph?.url), route.path).toBe(canonical);
    }
  });

  it('og:url is omitted rather than claiming the homepage when there is no canonical', () => {
    for (const meta of [
      notFoundMetadata('Gone', 'Not here.'),
      buildMetadata({ title: 'Search', description: 'Filtered archive.', index: false, follow: true }),
    ]) {
      expect(meta.openGraph?.url).toBeUndefined();
    }
  });
});

/* ── Sitemap membership ───────────────────────────────────────────────────── */

describe('sitemap membership', () => {
  it('no noindex route is listed in any sitemap', () => {
    for (const route of STATIC_ROUTES) {
      if (route.index) continue;
      expect(route.sitemap, `${route.path} is noindex but claims sitemap "${route.sitemap}"`).toBeNull();
    }
    for (const route of DYNAMIC_ROUTES) {
      if (route.index) continue;
      expect(route.sitemap, `${route.pattern} is noindex but claims a sitemap`).toBeNull();
    }
  });

  it('every indexable static route is in a sitemap', () => {
    for (const route of STATIC_ROUTES.filter((r) => r.index)) {
      expect(route.sitemap, `${route.path} is indexable but in no sitemap`).not.toBeNull();
    }
  });

  it('every indexable dynamic route pattern is in a sitemap', () => {
    for (const route of DYNAMIC_ROUTES.filter((r) => r.index)) {
      expect(route.sitemap, `${route.pattern} is indexable but in no sitemap`).not.toBeNull();
    }
  });

  it('the thank-you page is excluded', () => {
    const thanks = staticRoute('/thank-you');
    expect(thanks.index).toBe(false);
    expect(thanks.sitemap).toBeNull();
  });

  it('the brochure hand-off is excluded', () => {
    const brochure = DYNAMIC_ROUTES.find((r) => r.pattern === '/brochures/{slug}/download')!;
    expect(brochure.index).toBe(false);
    expect(brochure.sitemap).toBeNull();
  });

  it('every sitemap URL derived from the registry is a valid canonical', () => {
    for (const route of STATIC_ROUTES.filter((r) => r.sitemap === 'pages')) {
      expect(isValidCanonical(canonicalUrl(route.path)), route.path).toBe(true);
    }
  });
});

/* ── Redirect sources must never be sitemap or canonical targets ──────────── */

/**
 * Mirrors `redirects()` in next.config.mjs. Kept as a literal so a new redirect
 * whose source is also a live URL fails this suite rather than silently
 * shipping a sitemap full of redirects.
 */
const REDIRECT_SOURCES = [
  '/data-science-course',
  '/sitemap-index.xml',
  '/blog-sitemap.xml',
  '/category-sitemap.xml',
  '/image-sitemap.xml',
];

describe('redirects', () => {
  it('no redirect source is also a live static route', () => {
    const live = new Set(STATIC_ROUTES.map((r) => r.path));
    for (const source of REDIRECT_SOURCES) {
      expect(live.has(source), `${source} both redirects and exists`).toBe(false);
    }
  });

  it('no redirect source collides with a resource or landing slug', () => {
    const live = new Set([
      ...RESOURCE_SLUGS.map((s) => `/resources/${s}`),
      ...locationLandings.map((l) => `/${l.slug}`),
    ]);
    for (const source of REDIRECT_SOURCES) {
      expect(live.has(source), `${source} both redirects and exists`).toBe(false);
    }
  });
});

/* ── Query-parameter policy ───────────────────────────────────────────────── */

describe('query-parameter policy', () => {
  it('only ?page= may ever appear on a canonical', () => {
    expect([...CANONICAL_QUERY_ORDER]).toEqual(['page']);
  });

  it('no filter parameter is on the canonical allow-list', () => {
    for (const param of FILTER_PARAMS) {
      expect(CANONICAL_QUERY_ORDER as readonly string[]).not.toContain(param);
    }
  });
});

/* ── Dynamic route protection ─────────────────────────────────────────────── */

describe('dynamic route protection', () => {
  it('config-controlled route sets are closed to unknown slugs', () => {
    const closed = DYNAMIC_ROUTES.filter((r) => !r.dynamicParams).map((r) => r.pattern);
    expect(closed).toContain('/resources/{slug}');
    expect(closed).toContain('/{landingSlug}');
  });

  it('CMS-controlled route sets stay open so new content is not 404d', () => {
    const open = DYNAMIC_ROUTES.filter((r) => r.dynamicParams).map((r) => r.pattern);
    expect(open).toContain('/courses/{slug}');
    expect(open).toContain('/blog/{slug}');
    expect(open).toContain('/blog/category/{categorySlug}');
    expect(open).toContain('/compare/{slug}');
  });

  it('a closed route set matches the config it is generated from', () => {
    // If these drift, generateStaticParams would prerender a URL the sitemap
    // does not list, or vice versa.
    expect(RESOURCE_SLUGS.length).toBe(5);
    expect(new Set(RESOURCE_SLUGS).size).toBe(RESOURCE_SLUGS.length);
    expect(new Set(locationLandings.map((l) => l.slug)).size).toBe(locationLandings.length);
    for (const landing of locationLandings) {
      // Landing slugs live at the root, so they must never shadow a real page.
      expect(
        STATIC_ROUTES.some((r) => r.path === `/${landing.slug}`),
        `${landing.slug} shadows a static route`,
      ).toBe(false);
    }
  });
});

/* ── Filtered archive URLs ────────────────────────────────────────────────── */

describe('filtered archive URLs cannot become indexable by accident', () => {
  it('buildMetadata never marks a page indexable without an explicit decision', () => {
    const filtered = buildMetadata({
      title: 'Search results',
      description: 'Search results for a term on the GloryTecks blog archive.',
      index: false,
      follow: true,
    });
    expect(robotsOf(filtered).index).toBe(false);
    expect(robotsOf(filtered).follow).toBe(true);
    expect(canonicalOf(filtered)).toBeUndefined();
  });

  it('noindex on its own still implies nofollow, as before', () => {
    const meta = buildMetadata({ title: 'x', description: 'y', noindex: true });
    expect(robotsOf(meta).index).toBe(false);
    expect(robotsOf(meta).follow).toBe(false);
  });

  it('an empty alternates object is always present, so no page inherits a canonical', () => {
    const meta = buildMetadata({ title: 'x', description: 'y', index: false, follow: true });
    expect(meta.alternates).toBeDefined();
    expect(canonicalOf(meta)).toBeUndefined();
  });
});
