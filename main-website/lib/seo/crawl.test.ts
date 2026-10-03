import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchHas } from 'next/dist/shared/lib/router/utils/prepare-destination';

import nextConfig, { VERCEL_APP_HOST } from '@/next.config.mjs';
import { normalizePath } from '@/lib/seo/canonical';
import { STATIC_PAGE_REVIEWED, STATIC_ROUTES } from '@/lib/seo/routes';
import { archiveDecision, parsePageParam } from '@/lib/seo/archive';
import { knownSlugStatus } from '@/lib/seo/slugs';
import {
  MERGED_ARTICLES,
  blogPath,
  isNoindexArticle,
  isSitemapEligible,
} from '@/lib/blog/merged';
import { RESOURCE_SLUGS } from '@/config/resources';
import { locationLandings } from '@/config/locationLandings';

/**
 * Phase 1 crawl and indexation gate — see docs/SEO_PHASE_1_FINAL_VERIFICATION.md.
 *
 * Covers what the other suites could not reach: the real `next.config.mjs`
 * (headers and redirects, read from the module rather than mirrored), both
 * branches of robots.txt, and the fixes for the gaps the live crawl found.
 */

type HostRule = { type: string; key?: string; value?: string };
type HeaderRule = {
  source: string;
  has?: HostRule[];
  missing?: HostRule[];
  headers: { key: string; value: string }[];
};
type Redirect = { source: string; destination: string; permanent: boolean };

const headerRules = async () => (await nextConfig.headers()) as HeaderRule[];
const redirects = async () => (await nextConfig.redirects()) as Redirect[];

/** Next's own matcher, so this pins the behaviour of the installed version. */
const appliesToHost = (rule: HeaderRule, host: string) =>
  matchHas({ headers: { host } } as never, {}, rule.has as never, rule.missing as never) !== false;

/* ── Preview / staging hosts ──────────────────────────────────────────────── */

describe('*.vercel.app hosts are never indexable', () => {
  const noindexRules = async () =>
    (await headerRules()).filter((r) =>
      r.headers.some((h) => h.key.toLowerCase() === 'x-robots-tag' && /noindex/.test(h.value)),
    );

  it('sends X-Robots-Tag: noindex on every path of a vercel.app host', async () => {
    const rules = await noindexRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe('/:path*');
    for (const host of [
      'glorytecks-psi.vercel.app',
      'glorytecks-9nwzhcx6o-gloryteksystems-3457.vercel.app',
      'glorytecks-git-main-gloryteksystems-3457.vercel.app',
      'GLORYTECKS-PSI.VERCEL.APP:443',
    ]) {
      expect(appliesToHost(rules[0], host), host).toBe(true);
    }
  });

  it('can never apply to the production domain', async () => {
    const [rule] = await noindexRules();
    for (const host of ['glorytecks.com', 'www.glorytecks.com', 'GloryTecks.com', 'glorytecks.com:443']) {
      expect(appliesToHost(rule, host), host).toBe(false);
    }
  });

  it('is host-conditional — no rule sends noindex unconditionally', async () => {
    for (const rule of await noindexRules()) {
      expect(rule.has?.some((h) => h.type === 'host')).toBe(true);
    }
    expect(VERCEL_APP_HOST).toBe('.*\\.vercel\\.app');
  });
});

describe('robots.txt', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const robotsFor = async (siteUrl: string) => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', siteUrl);
    const { default: robots } = await import('@/app/robots');
    return robots();
  };

  it('on production allows everything except /api/ and lists one sitemap', async () => {
    expect(await robotsFor('https://glorytecks.com')).toEqual({
      rules: [{ userAgent: '*', allow: '/', disallow: '/api/' }],
      sitemap: 'https://glorytecks.com/sitemap.xml',
    });
  });

  it('on any other origin disallows the whole deployment', async () => {
    for (const origin of ['https://glorytecks-psi.vercel.app', 'https://staging.glorytecks.com', 'http://localhost:3000']) {
      expect(await robotsFor(origin), origin).toEqual({ rules: [{ userAgent: '*', disallow: '/' }] });
    }
  });

  it('never blocks a URL whose noindex must be seen: filters, thank-you, brochures', async () => {
    const { rules } = await robotsFor('https://glorytecks.com');
    const disallowed = [rules].flat().flatMap((r) => [r.disallow ?? []].flat());
    for (const blocked of disallowed) {
      for (const url of ['/blog?q=python', '/blog?tag=sql', '/blog?sort=popular', '/thank-you', '/brochures/x/download']) {
        expect(url.startsWith(blocked), `${blocked} blocks ${url}`).toBe(false);
      }
    }
  });
});

/* ── Redirects, read from next.config.mjs itself ──────────────────────────── */

describe('redirect table', () => {
  it('is entirely permanent (308)', async () => {
    for (const r of await redirects()) expect(r.permanent, r.source).toBe(true);
  });

  it('has no chains — no destination is itself a redirect source', async () => {
    const all = await redirects();
    const sources = new Set(all.map((r) => r.source));
    for (const r of all) expect(sources.has(r.destination), `${r.source} → ${r.destination}`).toBe(false);
  });

  it('points only at normalised canonical paths', async () => {
    for (const r of await redirects()) expect(normalizePath(r.destination), r.source).toBe(r.destination);
  });

  it('never redirects away a live URL', async () => {
    const live = new Set([
      ...STATIC_ROUTES.map((r) => r.path),
      ...RESOURCE_SLUGS.map((s) => `/resources/${s}`),
      ...locationLandings.map((l) => `/${l.slug}`),
      '/sitemap.xml',
      '/robots.txt',
    ]);
    for (const r of await redirects()) expect(live.has(r.source), r.source).toBe(false);
  });

  it('merged articles redirect to a kept, indexable article', async () => {
    const table = new Map((await redirects()).map((r) => [r.source, r.destination]));
    for (const m of MERGED_ARTICLES) {
      expect(table.get(`/blog/${m.from}`)).toBe(`/blog/${m.to}`);
      expect(isSitemapEligible(m.to), m.to).toBe(true);
      expect(isNoindexArticle(m.to), m.to).toBe(false);
    }
  });
});

/* ── Internal links never pass through a redirect ─────────────────────────── */

describe('blogPath', () => {
  it('links a merged article straight to the article it was merged into', () => {
    for (const m of MERGED_ARTICLES) expect(blogPath(m.from)).toBe(`/blog/${m.to}`);
  });

  it('leaves every other slug alone', () => {
    expect(blogPath('data-science-roadmap-2026-a-complete-step-by-step-guide')).toBe(
      '/blog/data-science-roadmap-2026-a-complete-step-by-step-guide',
    );
  });

  it('is what every component uses to link a post', () => {
    // A hand-built `/blog/${slug}` href is how links to merged (308) URLs
    // came back: the backend's related and prev/next lists still return both
    // rows of a merged pair.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const file = path.join(dir, name);
        if (statSync(file).isDirectory()) walk(file);
        else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
          const src = readFileSync(file, 'utf8');
          if (/href(=\{|:\s*)`\/blog\/\$\{/.test(src)) offenders.push(path.relative(process.cwd(), file));
        }
      }
    };
    for (const dir of ['app', 'components', 'lib']) walk(path.join(process.cwd(), dir));
    expect(offenders).toEqual([]);
  });
});

/* ── Slug policy ──────────────────────────────────────────────────────────── */

describe('ISR content pages never redirect from inside the page', () => {
  it('has no redirect() in the course, blog post or comparison page', () => {
    // A redirect rendered by an ISR page is cached as a 308. Where the cache
    // key folds case, a variant like /blog/SQL-JOINS poisons /blog/sql-joins
    // into a 308 to itself — reproduced locally in Phase 1. Case variants are
    // handled by the canonical instead; see lib/seo/slugs.ts.
    for (const rel of [
      'app/(site)/courses/[slug]/page.tsx',
      'app/(site)/blog/[slug]/page.tsx',
      'app/(site)/compare/[slug]/page.tsx',
    ]) {
      const code = readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(code, rel).not.toMatch(/\b(permanentRedirect|redirect)\s*\(/);
    }
  });
});

describe('knownSlugStatus — brochure hand-off', () => {
  const courses = ['data-science', 'power-bi'];

  it('renders a real course', () => {
    expect(knownSlugStatus('data-science', courses)).toBe(200);
  });

  it('404s a slug that is not a course', () => {
    expect(knownSlugStatus('does-not-exist', courses)).toBe(404);
    expect(knownSlugStatus('Data-Science', courses)).toBe(404);
  });

  it('does not 404 anything when the course list could not be read', () => {
    expect(knownSlugStatus('does-not-exist', [])).toBe(200);
  });
});

/* ── Soft-404: an empty archive ───────────────────────────────────────────── */

describe('an empty archive is never an indexable 200', () => {
  const clean = { q: '', tag: '', sort: 'latest' as const };
  const base = { basePath: '/blog/category/x', page: parsePageParam(undefined), filters: clean, totalPages: 1 };

  it('stays a 200 but noindex, follow, with no canonical', () => {
    expect(archiveDecision({ ...base, totalItems: 0 })).toEqual({
      status: 200,
      index: false,
      follow: true,
      canonical: null,
      page: 1,
    });
  });

  it('is only triggered by an explicit zero', () => {
    for (const totalItems of [undefined, null, 1, 42]) {
      expect(archiveDecision({ ...base, totalItems }).index, String(totalItems)).toBe(true);
    }
  });

  it('does not change the outage rule — an unknown count keeps page 1 indexable', () => {
    expect(archiveDecision({ ...base, totalPages: null, totalItems: null }).index).toBe(true);
  });
});

/* ── lastmod ──────────────────────────────────────────────────────────────── */

describe('source-controlled lastmod values', () => {
  it('are never in the future', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(STATIC_PAGE_REVIEWED <= today, STATIC_PAGE_REVIEWED).toBe(true);
    for (const r of STATIC_ROUTES) {
      if (r.lastModified) expect(r.lastModified <= today, `${r.path} ${r.lastModified}`).toBe(true);
    }
  });
});
