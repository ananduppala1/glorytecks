import { beforeAll, describe, expect, it } from 'vitest';

import { PRODUCTION_ORIGIN, canonicalUrlFor, resolveSiteOrigin } from '@/lib/seo/canonical';
import {
  POLICY_PROBES,
  SMOKE_PAGES,
  checkPage,
  checkProbe,
  checkRobotsTxt,
  checkSitemapHygiene,
  checkSitemapIndex,
  checkSitemapUrl,
  checkUrlset,
  fillProbe,
  isVercelAppHost,
  sitemapLocs,
} from '@/lib/seo/smoke';

/**
 * Live production smoke test.
 *
 * Fetches a deployed origin and holds it to what this repository generates.
 * Skipped unless SEO_SMOKE_BASE_URL is set, so `npm test` stays offline:
 *
 *   # the live domain
 *   SEO_SMOKE_BASE_URL=https://glorytecks.com npm run test:smoke
 *
 *   # a Vercel deployment, BEFORE the domain is pointed at it — canonicals
 *   # are still expected on https://glorytecks.com
 *   SEO_SMOKE_BASE_URL=https://glorytecks-psi.vercel.app npm run test:smoke
 *
 * SEO_SMOKE_EXPECTED_ORIGIN overrides the origin canonicals must be built on
 * (default https://glorytecks.com). SEO_SMOKE_CRAWL=1 additionally fetches
 * every URL in every sitemap. See docs/SEO_PRODUCTION_PARITY_REPORT.md and
 * docs/SEO_PHASE_1_FINAL_VERIFICATION.md.
 *
 * A *.vercel.app host is expected to send `X-Robots-Tag: noindex` on every
 * page (next.config.mjs); any other host must not.
 */

const BASE = process.env.SEO_SMOKE_BASE_URL?.trim().replace(/\/+$/, '');
const ORIGIN = resolveSiteOrigin(process.env.SEO_SMOKE_EXPECTED_ORIGIN || PRODUCTION_ORIGIN).origin;
const CRAWL = process.env.SEO_SMOKE_CRAWL === '1';
const HOST_NOINDEX = BASE ? isVercelAppHost(BASE) : false;

// The crawler whose view of the page matters most. Googlebot is not on Next's
// HTML-limited list, so this also surfaces streamed metadata as a warning.
const USER_AGENT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const TIMEOUT = 30_000;

/** Fetch without following redirects. */
async function raw(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual', headers: { 'user-agent': USER_AGENT } });
  const loc = res.headers.get('location');
  const target = loc ? new URL(loc, `${BASE}/`) : null;
  return {
    status: res.status,
    contentType: res.headers.get('content-type') ?? '',
    xRobotsTag: res.headers.get('x-robots-tag'),
    location: target ? `${target.pathname}${target.search}` : null,
    locationUrl: target?.href ?? null,
    body: res.status >= 300 && res.status < 400 ? (await res.body?.cancel(), '') : await res.text(),
  };
}

/** Fetch following redirects, reporting where it ended up. */
async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'user-agent': USER_AGENT } });
  return {
    status: res.status,
    contentType: res.headers.get('content-type') ?? '',
    xRobotsTag: res.headers.get('x-robots-tag'),
    finalPath: new URL(res.url).pathname.replace(/(.)\/$/, '$1'),
    body: await res.text(),
  };
}

async function inParallel<T>(items: readonly T[], width: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: width }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

describe.skipIf(!BASE)(`production SEO smoke: ${BASE} (canonicals on ${ORIGIN})`, () => {
  /** Child sitemaps, fetched once and shared by the sitemap and policy suites. */
  const children: { path: string; xml: string }[] = [];

  beforeAll(async () => {
    const index = await get('/sitemap.xml');
    for (const loc of sitemapLocs(index.body)) {
      // Fetched from BASE by path, so a *.vercel.app deployment can be vetted
      // against production canonicals before the domain moves.
      const path = new URL(loc).pathname;
      children.push({ path, xml: (await get(path)).body });
    }
  }, TIMEOUT * 2);

  const firstSlug = (child: string, prefix: string) => {
    const loc = sitemapLocs(children.find((c) => c.path === child)?.xml ?? '')[0] ?? '';
    return loc ? new URL(loc).pathname.slice(prefix.length) : '';
  };

  describe('money pages and hubs', () => {
    for (const page of SMOKE_PAGES) {
      it(
        page.path,
        async () => {
          const res = await get(page.path);
          const { failures, warnings } = checkPage(page, { ...res, html: res.body }, ORIGIN, {
            hostNoindex: HOST_NOINDEX,
          });
          for (const warning of warnings) console.warn(`[seo-smoke] ${page.path}: ${warning}`);
          expect(failures, `${page.path}\n  ${failures.join('\n  ')}`).toEqual([]);
        },
        TIMEOUT,
      );
    }
  });

  describe('URL policy', () => {
    for (const probe of POLICY_PROBES) {
      it(
        `${probe.path} → ${probe.status}`,
        async () => {
          const vars = {
            blog: firstSlug('/sitemaps/blog.xml', '/blog/'),
            compare: firstSlug('/sitemaps/compare.xml', '/compare/'),
            landing: firstSlug('/sitemaps/locations.xml', '/'),
          };
          const filled = {
            ...probe,
            path: fillProbe(probe.path, vars),
            location: probe.location && fillProbe(probe.location, vars),
            canonical: probe.canonical && fillProbe(probe.canonical, vars),
          };
          const res = await raw(filled.path);
          const failures = checkProbe(filled, { ...res, html: res.body }, ORIGIN, { hostNoindex: HOST_NOINDEX });
          expect(failures, `${filled.path} (${probe.rule})\n  ${failures.join('\n  ')}`).toEqual([]);
        },
        TIMEOUT,
      );
    }
  });

  describe('robots.txt and sitemaps', () => {
    it(
      'robots.txt invites crawling and lists this origin’s sitemap',
      async () => {
        const res = await get('/robots.txt');
        expect(res.status).toBe(200);
        expect(checkRobotsTxt(res.body, ORIGIN)).toEqual([]);
      },
      TIMEOUT,
    );

    it('the sitemap index lists only child sitemaps on the origin', async () => {
      const index = await get('/sitemap.xml');
      expect(index.status).toBe(200);
      expect(checkSitemapIndex(index.body, ORIGIN)).toEqual([]);
      expect(children.length).toBeGreaterThan(0);
    });

    it('every child is XML whose every <loc> is a valid canonical on the origin', () => {
      const failures = children.flatMap((c) => checkUrlset(c.xml, ORIGIN).map((f) => `${c.path}: ${f}`));
      expect(failures).toEqual([]);
    });

    it('no priority/changefreq, no future or malformed lastmod, no URL listed twice', () => {
      const today = new Date().toISOString().slice(0, 10);
      expect(checkSitemapHygiene(children, today)).toEqual([]);
    });

    it('every smoke page is listed in a child sitemap', () => {
      const listed = new Set(children.flatMap((c) => sitemapLocs(c.xml)));
      const missing = SMOKE_PAGES.map((p) => canonicalUrlFor(ORIGIN, p.path)).filter((u) => !listed.has(u));
      expect(missing).toEqual([]);
    });

    it.skipIf(!CRAWL)(
      'SEO_SMOKE_CRAWL: every sitemap URL is a 200, self-canonical, indexable page',
      async () => {
        const locs = children.flatMap((c) => sitemapLocs(c.xml));
        const failures: string[] = [];
        await inParallel(locs, 8, async (loc) => {
          const url = new URL(loc);
          const res = await raw(`${url.pathname}${url.search}`);
          const f = checkSitemapUrl(loc, { ...res, html: res.body }, { hostNoindex: HOST_NOINDEX });
          if (f.length) failures.push(`${loc}: ${f.join('; ')}`);
        });
        expect(failures).toEqual([]);
      },
      TIMEOUT * 40,
    );
  });

  it(
    'is not the legacy SPA: Next-only routes resolve',
    async () => {
      // The legacy vercel.json rewrote every path to index.html, so this came
      // back 200 text/html on the old build.
      expect((await get('/sitemaps/pages.xml')).contentType).toMatch(/xml/);
    },
    TIMEOUT,
  );

  // Scheme and host consolidation are decided by the domain configuration,
  // so they can only be checked on the production domain itself.
  describe.skipIf(BASE !== ORIGIN)('scheme and host', () => {
    const host = BASE ? new URL(BASE).host : '';

    it(
      'http:// redirects permanently to https://',
      async () => {
        const res = await fetch(`http://${host}/courses`, { redirect: 'manual' });
        expect([301, 308]).toContain(res.status);
        expect(res.headers.get('location')).toBe(`${ORIGIN}/courses`);
      },
      TIMEOUT,
    );

    it(
      'www redirects permanently to the apex',
      async () => {
        const res = await fetch(`https://www.${host}/courses`, { redirect: 'manual' });
        expect([301, 308]).toContain(res.status);
        expect(res.headers.get('location')).toBe(`${ORIGIN}/courses`);
      },
      TIMEOUT,
    );
  });
});
