import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { BUSINESS, NAP_OPEN_CONFLICTS } from '@/config/business';
import {
  canonicalNap,
  describeFinding,
  extractFromMapsPlaceUrl,
  extractFromSchema,
  extractFromSettings,
  extractFromSource,
  reconcileNap,
  type NapObservation,
} from '@/lib/seo/nap';
import { extractSeo } from '@/lib/seo/smoke';

/**
 * NAP consistency against LIVE sources — see docs/LOCAL_SEO_MASTER_AUDIT.md.
 * Each source is opt-in, so `npm test` stays offline:
 *
 *   NAP_LIVE_API=https://glorytecks-backend-one.vercel.app/api/v1   CMS Settings + localities
 *   NAP_LIVE_GOOGLE=1                                               the Maps listing behind the site's share link
 *   NAP_LIVE_SITE=https://glorytecks.com                            a deployed site's JSON-LD
 *
 *   NAP_LIVE_API=… NAP_LIVE_GOOGLE=1 NAP_LIVE_SITE=… npm run test:nap
 *
 * Every live value is compared with config/business.ts. Differences recorded in
 * NAP_OPEN_CONFLICTS are reported, anything else fails, and a recorded conflict
 * that has disappeared from an observed source fails as stale.
 */

const API = process.env.NAP_LIVE_API?.replace(/\/+$/, '');
const GOOGLE = process.env.NAP_LIVE_GOOGLE === '1';
const SITE = process.env.NAP_LIVE_SITE?.replace(/\/+$/, '');
const TIMEOUT = 60_000;

const canonical = canonicalNap(BUSINESS);

const json = async (url: string) => {
  const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const body = (await res.json()) as { data?: unknown };
  return body.data ?? body;
};

function check(observations: NapObservation[]) {
  const report = reconcileNap(observations, canonical, NAP_OPEN_CONFLICTS);
  for (const f of report.acknowledged) console.warn(`[nap:live] open: ${describeFinding(f)}`);
  const unexpected = report.unexpected.map(describeFinding);
  const stale = report.stale.map((e) => `${e.source} ${e.field} = "${e.value}" is no longer stated there`);
  expect([...unexpected, ...stale], `\n  ${[...unexpected, ...stale].join('\n  ')}`).toEqual([]);
  return report;
}

describe.skipIf(!API)(`NAP live — CMS at ${API}`, () => {
  it(
    'Settings (footer, contact page, training page) agrees with config/business.ts',
    async () => {
      const settings = (await json(`${API}/public/settings`)) as Record<string, unknown>;
      const report = check(extractFromSettings('cms:settings', settings));
      expect(report.observations).toBeGreaterThanOrEqual(5);
    },
    TIMEOUT,
  );

  it(
    'locality and About copy state no other address, phone or email',
    async () => {
      const observations = [
        ...extractFromSource('cms:localities', JSON.stringify(await json(`${API}/public/localities`))),
        ...extractFromSource('cms:about', JSON.stringify(await json(`${API}/public/about`))),
      ];
      check(observations);
    },
    TIMEOUT,
  );
});

describe.skipIf(!GOOGLE)('NAP live — Google Maps listing', () => {
  it(
    "the site's share link resolves to the canonical place, name and pin",
    async () => {
      // The share links are read from the components that render them.
      const repo = path.resolve(process.cwd(), '..');
      const links = new Set<string>();
      for (const rel of ['main-website/components/views/HomeView.tsx', 'main-website/components/views/ContactView.tsx']) {
        for (const m of readFileSync(path.join(repo, rel), 'utf8').matchAll(/https:\/\/maps\.app\.goo\.gl\/[A-Za-z0-9]+/g)) {
          links.add(m[0]);
        }
      }
      expect(links.size, 'no Maps share link found in the components').toBeGreaterThan(0);

      const observations: NapObservation[] = [];
      for (const link of links) {
        const res = await fetch(link, { redirect: 'manual' });
        const target = res.headers.get('location');
        expect(target, `${link} did not redirect to a Maps place`).toMatch(/google\.[a-z.]+\/maps\/place\//);
        observations.push(...extractFromMapsPlaceUrl('google:maps-listing', target!));
      }
      const report = check(observations);
      expect(report.sources).toContain('google:maps-listing');
    },
    TIMEOUT,
  );
});

describe.skipIf(!SITE)(`NAP live — structured data on ${SITE}`, () => {
  it(
    'the organization and LocalBusiness nodes agree with config/business.ts',
    async () => {
      const observations: NapObservation[] = [];
      for (const page of ['/', '/training-in-hyderabad', '/contact']) {
        const html = await (await fetch(`${SITE}${page}`)).text();
        const seo = extractSeo(html);
        // The legacy SPA is its own source, so its known differences are
        // tolerated only until the domain moves to the Next.js build.
        const source = seo.framework === 'legacy-spa' ? 'legacy-site' : `site:${new URL(SITE!).host}`;
        observations.push(...extractFromSchema(source, seo.nodes));
      }
      const report = check(observations);
      expect(report.observations).toBeGreaterThanOrEqual(8);
    },
    TIMEOUT,
  );

  it(
    'Course nodes: provider and venue by @id, real fields, no invented offers',
    async () => {
      const html = await (await fetch(`${SITE}/courses/data-science`)).text();
      const seo = extractSeo(html);
      if (seo.framework === 'legacy-spa') return; // the legacy build has its own, retired Course markup
      const course = seo.nodes.find((n) => [].concat(n['@type'] as never).includes('Course' as never)) as Record<string, unknown>;
      expect(course, 'no Course node').toBeDefined();
      expect(String(course.name)).toMatch(/\S/);
      // A real sentence, not a placeholder. (Was /\S{20,}/ — 20 characters with no
      // space — which no sentence satisfies; it only ever ran against the legacy SPA.)
      expect(String(course.description ?? '').trim().length, 'Course description').toBeGreaterThanOrEqual(20);
      expect((course.provider as { '@id': string })['@id']).toMatch(/\/#organization$/);
      const instances = course.hasCourseInstance as Record<string, unknown>[];
      expect(instances.map((i) => i.courseMode).sort()).toEqual(['online', 'onsite']);
      const onsite = instances.find((i) => i.courseMode === 'onsite')!;
      expect((onsite.location as { '@id': string })['@id']).toMatch(/\/#localbusiness$/);
      expect(JSON.stringify(course)).not.toMatch(/"offers"|"price"|"aggregateRating"|"startDate"/);
    },
    TIMEOUT,
  );
});
