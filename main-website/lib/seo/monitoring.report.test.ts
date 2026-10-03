import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { PRODUCTION_ORIGIN } from '@/lib/seo/canonical';
import { buildSnapshot, parseInventory, toCsv, type Snapshot } from '@/lib/seo/monitoring';
import { buildReport, pageCsvRows, queryCsvRows, renderReport, type LiveSitemapCheck } from '@/lib/seo/monitoringReport';
import { checkSitemapIndex, checkUrlset, sitemapLocs } from '@/lib/seo/smoke';

/**
 * SEO monitoring report — `npm run seo:report`.
 *
 * Reads one snapshot folder of Search Console exports and writes, into that
 * same folder, report.md plus normalized/{pages,queries,zero-impression-articles}.csv.
 * Offline by default: nothing is fetched unless SEO_SITEMAP_BASE is set.
 * Skipped unless SEO_DATA is set, so `npm test` is unaffected.
 *
 *   SEO_DATA=<root>/2026-10-05            the snapshot to report on (required)
 *   SEO_DATA_PREVIOUS=<root>/2026-09-28   compare with (default: the newest
 *                                         dated sibling folder before SEO_DATA)
 *   SEO_INVENTORY=path/to/inventory.csv   default docs/SEO_URL_INVENTORY.csv
 *   SEO_SITEMAP_BASE=https://glorytecks.com  also fetch /sitemap.xml and its
 *                                         children (8 cached requests)
 *
 * Folder layout and export steps: docs/SEO_MONITORING_PLAN.md §5.
 */

const DATA = process.env.SEO_DATA?.trim();
const PREVIOUS = process.env.SEO_DATA_PREVIOUS?.trim();
const INVENTORY = process.env.SEO_INVENTORY?.trim() || path.join(process.cwd(), 'docs', 'SEO_URL_INVENTORY.csv');
const SITEMAP_BASE = process.env.SEO_SITEMAP_BASE?.trim().replace(/\/+$/, '');

/** Every .csv under a snapshot folder, except the report's own output. */
function csvFiles(root: string): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name !== 'normalized') walk(full);
      } else if (/\.csv$/i.test(name)) {
        out.push({ path: path.relative(root, full).replace(/\\/g, '/'), text: readFileSync(full, 'utf8') });
      }
    }
  };
  walk(root);
  return out;
}

function loadSnapshot(dir: string): Snapshot {
  return buildSnapshot(path.basename(dir), csvFiles(dir));
}

/** The newest sibling folder named YYYY-MM-DD… that sorts before `dir`. */
function previousSibling(dir: string): string | null {
  const parent = path.dirname(dir);
  const me = path.basename(dir);
  const dated = readdirSync(parent)
    .filter((n) => /^\d{4}-\d{2}-\d{2}/.test(n) && n < me && statSync(path.join(parent, n)).isDirectory())
    .sort();
  return dated.length ? path.join(parent, dated[dated.length - 1]) : null;
}

async function liveSitemapCheck(base: string): Promise<LiveSitemapCheck> {
  const problems: string[] = [];
  const get = async (url: string) => {
    const res = await fetch(url, { headers: { 'user-agent': 'GloryTecks-SEO-monitor/1.0' } });
    return { status: res.status, text: res.status === 200 ? await res.text() : '' };
  };
  const index = await get(`${base}/sitemap.xml`);
  if (index.status !== 200) return { base, urls: 0, problems: [`/sitemap.xml returned ${index.status}`] };
  problems.push(...checkSitemapIndex(index.text, PRODUCTION_ORIGIN).map((p) => `index: ${p}`));
  const urls = new Set<string>();
  for (const loc of sitemapLocs(index.text)) {
    // Fetch each child from the base being checked, whatever host the index names.
    const child = `${base}${new URL(loc).pathname}`;
    const res = await get(child);
    if (res.status !== 200) {
      problems.push(`${new URL(loc).pathname} returned ${res.status}`);
      continue;
    }
    problems.push(...checkUrlset(res.text, PRODUCTION_ORIGIN).map((p) => `${new URL(loc).pathname}: ${p}`));
    for (const u of sitemapLocs(res.text)) urls.add(u);
  }
  return { base, urls: urls.size, problems };
}

describe.skipIf(!DATA)(`SEO monitoring report: ${DATA}`, () => {
  it('imports the snapshot, compares it and writes the report', async () => {
    expect(existsSync(DATA!), `SEO_DATA folder not found: ${DATA}`).toBe(true);
    const current = loadSnapshot(DATA!);
    const recognised = current.files.filter((f) => f.kind !== 'unknown');
    expect(recognised.length, `no Search Console export recognised in ${DATA}; see docs/SEO_MONITORING_PLAN.md §5`).toBeGreaterThan(0);

    const prevDir = PREVIOUS || previousSibling(DATA!);
    const previous = prevDir && existsSync(prevDir) ? loadSnapshot(prevDir) : null;
    const inventory = existsSync(INVENTORY) ? parseInventory(readFileSync(INVENTORY, 'utf8')) : null;
    const liveSitemap = SITEMAP_BASE ? await liveSitemapCheck(SITEMAP_BASE) : null;

    const report = buildReport({ current, previous, inventory, liveSitemap, generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC' });
    const outDir = path.join(DATA!, 'normalized');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(DATA!, 'report.md'), renderReport(report));
    writeFileSync(path.join(outDir, 'pages.csv'), toCsv(pageCsvRows(report)));
    writeFileSync(path.join(outDir, 'queries.csv'), toCsv(queryCsvRows(report)));
    if (report.zeroImpressionArticles) writeFileSync(path.join(outDir, 'zero-impression-articles.csv'), toCsv(report.zeroImpressionArticles.map((p) => ({ path: p }))));

    const crit = report.alerts.filter((a) => a.severity === 'critical').length;
    console.log(
      [
        `SEO report written: ${path.join(DATA!, 'report.md')}`,
        `  files recognised: ${recognised.length}/${current.files.length}; compared with: ${report.comparisonSource}`,
        `  alerts: ${crit} critical, ${report.alerts.length - crit} warning; inspection shortlist: ${report.shortlist.length}`,
        ...report.alerts.map((a) => `  - ${a.severity.toUpperCase()}: ${a.title}`),
      ].join('\n'),
    );
  }, 120_000);
});
