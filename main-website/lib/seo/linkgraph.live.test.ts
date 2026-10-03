import { beforeAll, describe, expect, it } from 'vitest';

import { PRODUCTION_ORIGIN, resolveSiteOrigin } from '@/lib/seo/canonical';
import { REVIEWED_OVERLAPS } from '@/lib/seo/ownership';
import { extractSeo } from '@/lib/seo/smoke';
import {
  auditLinks,
  clickDepth,
  extractLinks,
  findOverlaps,
  inboundStats,
  overlapClusters,
  pageTypeOf,
  type CrawledPage,
  type IntentPage,
  type LinkAudit,
  type OverlapCluster,
} from '@/lib/seo/intent';

/**
 * Live internal-link graph and intent-ownership check — see
 * docs/SEO_PHASE_3_FINAL_REPORT.md. Crawls every page reachable from / and
 * every sitemap URL (real <a> links, paginated archives included), then runs
 * the same detectors as the Phase 3 reports.
 *
 *   SEO_GRAPH_BASE_URL=https://glorytecks.com npm run test:graph
 *   SEO_GRAPH_API=https://…/api/v1        optional: article kinds and comparison items from the CMS
 *   SEO_GRAPH_EXPECTED_ORIGIN=…           the origin canonicals must use (default https://glorytecks.com)
 *
 * Skipped unless SEO_GRAPH_BASE_URL is set.
 */

const BASE = process.env.SEO_GRAPH_BASE_URL?.trim().replace(/\/+$/, '');
const API = process.env.SEO_GRAPH_API?.trim().replace(/\/+$/, '');
const ORIGIN = resolveSiteOrigin(process.env.SEO_GRAPH_EXPECTED_ORIGIN || PRODUCTION_ORIGIN).origin;
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

/** Follow canonical-shaped pages only: no filters, no utilities. `?page=N` archives are real pages. */
const crawlable = (p: string) => {
  const [path, query] = p.split('?');
  if (path.startsWith('/brochures/')) return false;
  return !query || [...new URLSearchParams(query).keys()].every((k) => k === 'page');
};

async function inParallel<T>(items: T[], width: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: width }, async () => { while (i < items.length) await fn(items[i++]); }));
}

describe.skipIf(!BASE)(`internal-link graph and intent ownership: ${BASE}`, () => {
  const hosts = BASE ? [new URL(BASE).host, new URL(ORIGIN).host] : [];
  const sitemap = new Set<string>();
  const crawled = new Map<string, CrawledPage & { title?: string; h1?: string; description?: string }>();
  const statuses = new Map<string, number>();
  let audit: LinkAudit;
  let clusters: OverlapCluster[];
  let pages: IntentPage[];

  beforeAll(async () => {
    const get = (p: string) => fetch(`${BASE}${p}`, { redirect: 'manual', headers: { 'user-agent': UA } });

    const index = await (await get('/sitemap.xml')).text();
    for (const child of [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)) {
      const xml = await (await get(child)).text();
      for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        const u = new URL(m[1]);
        sitemap.add(u.pathname + u.search);
      }
    }

    const queue = ['/', ...sitemap];
    const seen = new Set(queue);
    let next = 0;
    await Promise.all(
      Array.from({ length: 8 }, async () => {
        while (next < queue.length) {
          const path = queue[next++];
          const res = await get(path);
          if (res.status !== 200) {
            await res.body?.cancel();
            crawled.set(path, { path, status: res.status, links: [] });
            continue;
          }
          const html = await res.text();
          const seo = extractSeo(html);
          const links = extractLinks(html, path, hosts);
          crawled.set(path, {
            path,
            status: 200,
            canonical: html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? null,
            links,
            title: seo.titles[0],
            h1: seo.h1[0],
            description: seo.meta.get('description')?.[0],
          });
          for (const l of links) if (!seen.has(l.to) && crawlable(l.to)) { seen.add(l.to); queue.push(l.to); }
        }
      }),
    );

    const others = [...new Set([...crawled.values()].flatMap((p) => p.links.map((l) => l.to)))].filter((t) => !crawled.has(t));
    await inParallel(others, 8, async (t) => {
      const r = await get(t);
      await r.body?.cancel();
      statuses.set(t, r.status);
    });

    // Optional CMS context: article kinds and categories sharpen the intent types.
    const kinds = new Map<string, { kind?: string; category?: string }>();
    const items = new Map<string, [string, string]>();
    if (API) {
      for (let page = 1, total = 1; page <= total && page <= 60; page++) {
        const r = (await (await fetch(`${API}/public/blogs?limit=24&page=${page}&sort=-date`)).json()) as { data: { slug: string; kind?: string; categorySlug?: string }[]; meta: { totalPages: number } };
        total = r.meta.totalPages;
        for (const b of r.data) kinds.set(`/blog/${b.slug}`, { kind: b.kind, category: b.categorySlug });
      }
      const cmp = (await (await fetch(`${API}/public/comparisons`)).json()) as { data: { slug: string; itemA: string; itemB: string }[] };
      for (const c of cmp.data) items.set(`/compare/${c.slug}`, [c.itemA, c.itemB]);
    }

    pages = [...sitemap].map((path) => {
      const c = crawled.get(path);
      return {
        path,
        type: pageTypeOf(path, /-course-/.test(path) && !path.startsWith('/courses') ? 'locations' : null),
        title: c?.title ?? '',
        h1: c?.h1,
        description: c?.description,
        ...kinds.get(path),
        items: items.get(path),
      };
    });
    const stats = inboundStats([...crawled.values()]);
    clusters = overlapClusters(findOverlaps(pages, (p) => stats.get(p)?.total ?? 0), pages, (p) => stats.get(p)?.total ?? 0);
    audit = auditLinks([...crawled.values()], [...sitemap], ORIGIN, (t) => statuses.get(t));

    const depth = clickDepth([...crawled.values()]);
    const deep = [...sitemap].filter((p) => (depth.get(p) ?? 99) >= 5).length;
    console.warn(
      `[graph] crawled ${crawled.size} pages (${sitemap.size} indexable). ` +
        `${audit.weak.length} indexable pages have no editorial inbound link; ${deep} sit 5+ clicks from /. ` +
        `See docs/SEO_INTERNAL_LINK_RECOMMENDATIONS.csv.`,
    );
  }, 900_000);

  it('reached every sitemap URL, all 200', () => {
    const bad = [...sitemap].filter((p) => crawled.get(p)?.status !== 200).map((p) => `${p} → ${crawled.get(p)?.status ?? 'not crawled'}`);
    expect(bad).toEqual([]);
  });

  it('has no orphan indexable pages', () => {
    expect(audit.orphans).toEqual([]);
  });

  it('has no internal link to a missing page', () => {
    expect(audit.broken.map((b) => `${b.from} → ${b.to} (${b.status})`)).toEqual([]);
  });

  it('has no internal link that goes through a redirect', () => {
    expect(audit.redirected.map((b) => `${b.from} → ${b.to} (${b.status})`)).toEqual([]);
  });

  it('has no internal link to a page whose canonical is a different URL', () => {
    expect(audit.nonCanonical.map((b) => `${b.from} → ${b.to} (canonical ${b.canonical})`)).toEqual([]);
  });

  it('has no duplicate title, H1 or meta description across indexable pages', () => {
    const dupes = clusters.filter((c) => c.kinds.some((k) => k.startsWith('duplicate-') && k !== 'duplicate-commercial-intent'));
    expect(dupes.map((c) => `${c.members.join(' ⇄ ')}: ${c.reasons.join('; ')}`)).toEqual([]);
  });

  it('has no blog post reaching for a course query', () => {
    const offenders = clusters.filter((c) => c.kinds.includes('blog-targets-course'));
    expect(offenders.map((c) => c.reasons.join('; '))).toEqual([]);
  });

  it('every intent overlap has been reviewed, and every reviewed one still exists', () => {
    const key = (members: string[]) => [...members].sort().join(' ');
    const reviewed = new Set(REVIEWED_OVERLAPS.map((r) => key(r.members)));
    const detected = new Set(clusters.map((c) => key(c.members)));
    const unreviewed = clusters.filter((c) => !reviewed.has(key(c.members))).map((c) => `NEW ${c.kinds.join(',')}: ${c.members.join(' ⇄ ')} — ${c.reasons[0]}`);
    const stale = REVIEWED_OVERLAPS.filter((r) => !detected.has(key(r.members))).map((r) => `STALE ${r.decision}: ${r.members.join(' ⇄ ')} — update lib/seo/ownership.ts`);
    expect([...unreviewed, ...stale]).toEqual([]);
  });

  it('every course page has editorial support from somewhere', () => {
    const stats = inboundStats([...crawled.values()]);
    const unsupported = [...sitemap].filter((p) => p.startsWith('/courses/') && (stats.get(p)?.editorial ?? 0) === 0);
    expect(unsupported).toEqual([]);
  });
});
