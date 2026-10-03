/**
 * Builds and renders the SEO monitoring report from imported snapshots.
 * Pure: the caller supplies parsed snapshots and gets back data + Markdown.
 * See lib/seo/monitoring.ts for the import rules and docs/SEO_MONITORING_PLAN.md.
 */

import {
  COURSE_PATHS,
  LANDING_PATHS,
  PRIORITY_PATHS,
  THRESHOLDS,
  classifyQuery,
  compareMetrics,
  courseOfPage,
  cwvAlerts,
  indexingAlerts,
  inspectionShortlist,
  pageGroupOf,
  performanceAlerts,
  sitemapAlerts,
  totals,
  type Alert,
  type Delta,
  type GroupDelta,
  type InventoryEntry,
  type Metrics,
  type PageGroup,
  type PerfRow,
  type QuerySegment,
  type Snapshot,
} from './monitoring';
import { COURSE_CLUSTERS } from './topical';

export interface LiveSitemapCheck {
  base: string;
  /** Unique <loc> URLs across the child sitemaps. */
  urls: number;
  problems: string[];
}

export interface ReportInput {
  current: Snapshot;
  previous: Snapshot | null;
  inventory: ReadonlyMap<string, InventoryEntry> | null;
  liveSitemap?: LiveSitemapCheck | null;
  generatedAt: string;
}

export interface PageLine {
  path: string;
  group: PageGroup;
  course: string;
  current: Metrics;
  previous: Metrics | null;
  delta: Delta;
}

export interface QueryLine {
  query: string;
  segment: QuerySegment;
  course: string;
  current: Metrics;
  previous: Metrics | null;
}

export interface Report {
  input: ReportInput;
  comparisonSource: string;
  pages: PageLine[];
  queries: QueryLine[];
  site: Delta;
  groups: { group: PageGroup; delta: Delta; pages: number }[];
  courses: { course: string; title: string; delta: Delta; pages: number; queries: Metrics | null }[];
  segments: { segment: QuerySegment; delta: Delta; queries: number }[];
  zeroImpressionArticles: string[] | null;
  zeroImpressionNote: string;
  alerts: Alert[];
  shortlist: { path: string; reason: string }[];
  anonymizedShare: number | null;
}

const EMPTY: Metrics = { clicks: 0, impressions: 0, ctr: 0, position: null };

/** Page rows for one period: the page export, or the page×query export summed per page. */
function pageRows(snap: Snapshot | null, period: 'current' | 'previous'): PerfRow[] | null {
  if (!snap) return null;
  const src = snap.performance.page ?? snap.performance['page-query'];
  if (!src) return null;
  const rows = src.rows.filter((r) => r.period === period && r.page);
  return rows.length || period === 'current' ? rows : null;
}

function queryRows(snap: Snapshot | null, period: 'current' | 'previous'): PerfRow[] | null {
  if (!snap) return null;
  const src = snap.performance.query ?? snap.performance['page-query'];
  if (!src) return null;
  const rows = src.rows.filter((r) => r.period === period && r.query);
  return rows.length || period === 'current' ? rows : null;
}

function byKey(rows: readonly PerfRow[] | null, key: (r: PerfRow) => string): Map<string, Metrics> {
  const groups = new Map<string, PerfRow[]>();
  for (const r of rows ?? []) {
    const k = key(r);
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  return new Map([...groups].map(([k, g]) => [k, totals(g)]));
}

export function buildReport(input: ReportInput): Report {
  const { current, previous, inventory } = input;

  // Previous period: Compare-mode columns in this snapshot win over the previous snapshot.
  const inSnapshotPrev = pageRows(current, 'previous');
  const prevPages = inSnapshotPrev ?? pageRows(previous, 'current');
  const comparisonSource = inSnapshotPrev
    ? `Compare-mode columns in this snapshot (${current.performance.page?.labels.current ?? ''} vs ${current.performance.page?.labels.previous ?? ''})`
    : previous
      ? `previous snapshot ${previous.name}${previous.dateRange && current.dateRange && previous.dateRange !== current.dateRange ? ` — ⚠️ date ranges differ (${previous.dateRange} vs ${current.dateRange})` : ''}`
      : 'none — first snapshot, so nothing is compared';

  const curPageMap = byKey(pageRows(current, 'current'), (r) => r.page);
  const prevPageMap = prevPages ? byKey(prevPages, (r) => r.page) : null;
  const allPaths = new Set([...curPageMap.keys(), ...(prevPageMap?.keys() ?? [])]);
  const pages: PageLine[] = [...allPaths].map((path) => {
    const cur = curPageMap.get(path) ?? EMPTY;
    const prev = prevPageMap ? (prevPageMap.get(path) ?? EMPTY) : null;
    return { path, group: pageGroupOf(path, inventory ?? undefined), course: courseOfPage(path, inventory ?? undefined) ?? '', current: cur, previous: prev, delta: compareMetrics(cur, prev) };
  });
  pages.sort((a, b) => b.current.clicks - a.current.clicks || b.current.impressions - a.current.impressions);

  const sumLines = (lines: readonly PageLine[], which: 'current' | 'previous'): Metrics | null => {
    if (which === 'previous' && !prevPageMap) return null;
    const rows = lines.map((l) => ({ ...(which === 'current' ? l.current : (l.previous ?? EMPTY)) }));
    return totals(rows.map((m) => ({ period: 'current', page: '', query: '', date: '', clicks: m.clicks, impressions: m.impressions, position: m.position })));
  };
  const site = compareMetrics(sumLines(pages, 'current')!, sumLines(pages, 'previous'));

  const groupNames = [...new Set(pages.map((p) => p.group))];
  const groups = groupNames
    .map((group) => {
      const lines = pages.filter((p) => p.group === group);
      return { group, delta: compareMetrics(sumLines(lines, 'current')!, sumLines(lines, 'previous')), pages: lines.length };
    })
    .sort((a, b) => b.delta.current.impressions - a.delta.current.impressions);

  // Queries.
  const inSnapshotPrevQ = queryRows(current, 'previous');
  const prevQ = inSnapshotPrevQ ?? queryRows(previous, 'current');
  const curQMap = byKey(queryRows(current, 'current'), (r) => r.query);
  const prevQMap = prevQ ? byKey(prevQ, (r) => r.query) : null;
  const queries: QueryLine[] = [...new Set([...curQMap.keys(), ...(prevQMap?.keys() ?? [])])].map((query) => {
    const c = classifyQuery(query);
    return { query, segment: c.segment, course: c.course ?? '', current: curQMap.get(query) ?? EMPTY, previous: prevQMap ? (prevQMap.get(query) ?? EMPTY) : null };
  });
  queries.sort((a, b) => b.current.clicks - a.current.clicks || b.current.impressions - a.current.impressions);
  const segmentDelta = (lines: readonly QueryLine[]) => {
    const toRows = (ms: Metrics[]) => ms.map((m) => ({ period: 'current' as const, page: '', query: '', date: '', clicks: m.clicks, impressions: m.impressions, position: m.position }));
    return compareMetrics(totals(toRows(lines.map((l) => l.current))), prevQMap ? totals(toRows(lines.map((l) => l.previous ?? EMPTY))) : null);
  };
  const segments = (['branded', 'local', 'commercial', 'informational'] as const).map((segment) => {
    const lines = queries.filter((q) => q.segment === segment);
    return { segment, delta: segmentDelta(lines), queries: lines.length };
  });

  const courses = COURSE_CLUSTERS.map((c) => {
    const lines = pages.filter((p) => p.course === c.course);
    const qs = queries.filter((q) => q.course === c.course);
    return { course: c.course, title: c.title, delta: compareMetrics(sumLines(lines, 'current')!, sumLines(lines, 'previous')), pages: lines.length, queries: qs.length ? segmentDelta(qs).current : null };
  });

  // Anonymised share: Dates totals cover every query; the query export does not.
  const dates = current.performance.date?.rows.filter((r) => r.period === 'current') ?? [];
  const dateClicks = dates.reduce((n, r) => n + r.clicks, 0);
  const queryClicks = [...curQMap.values()].reduce((n, m) => n + m.clicks, 0);
  const anonymizedShare = dates.length && curQMap.size && dateClicks > 0 ? Math.max(0, (dateClicks - queryClicks) / dateClicks) : null;

  // Zero-impression articles: needs the full inventory and an untruncated page export.
  const pageExport = current.performance.page;
  let zeroImpressionArticles: string[] | null = null;
  let zeroImpressionNote = '';
  if (!inventory) zeroImpressionNote = 'No URL inventory supplied.';
  else if (!pageExport) zeroImpressionNote = 'No Pages export in this snapshot.';
  else if (pageExport.truncated) zeroImpressionNote = 'The Pages export hit the 1,000-row UI limit, so absence from it proves nothing. Use the Search Console API or Looker Studio for a full export.';
  else {
    zeroImpressionArticles = [...inventory.values()].filter((e) => e.type === 'article' && !(curPageMap.get(e.path)?.impressions)).map((e) => e.path).sort();
    zeroImpressionNote = `Articles in docs/SEO_URL_INVENTORY.csv with no impressions in ${current.dateRange ?? 'the export period'}.`;
  }

  // Alerts.
  const groupDeltas: GroupDelta[] = [
    ...groups.filter((g) => ['course', 'landing', 'home', 'centre', 'blog-category', 'blog-article', 'course-hub'].includes(g.group)).map((g) => ({ name: `Group "${g.group}"`, kind: 'group' as const, delta: g.delta })),
    ...COURSE_PATHS.map((path) => {
      const line = pages.find((p) => p.path === path);
      return { name: path, kind: 'course-page' as const, path, delta: line?.delta ?? compareMetrics(EMPTY, prevPageMap ? EMPTY : null) };
    }),
  ];
  const expectedUrls = inventory ? inventory.size : null;
  const alerts: Alert[] = [
    ...indexingAlerts(current.indexingChart, current.indexingIssues, previous?.indexingIssues.length ? previous.indexingIssues : null, current.urlLists),
    ...sitemapAlerts(current.sitemaps, expectedUrls),
    ...(input.liveSitemap?.problems.length
      ? [{ severity: 'critical' as const, area: 'sitemap' as const, title: `Live sitemap check: ${input.liveSitemap.problems.length} problem(s)`, evidence: input.liveSitemap.problems.slice(0, 5).join('; '), action: 'Fix the sitemap generation or the host in <loc>; resubmit only /sitemap.xml.' }]
      : []),
    ...performanceAlerts(site, groupDeltas),
    ...cwvAlerts(current.cwv),
  ];
  alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));

  return { input, comparisonSource, pages, queries, site, groups, courses, segments, zeroImpressionArticles, zeroImpressionNote, alerts, shortlist: inspectionShortlist(alerts), anonymizedShare };
}

/* ── Markdown ─────────────────────────────────────────────────────────────── */

const n0 = (n: number) => Math.round(n).toLocaleString('en-US');
const ctr = (m: Metrics) => (m.impressions ? `${(m.ctr * 100).toFixed(1)}%` : '—');
const pos = (m: Metrics | null) => (m?.position != null ? m.position.toFixed(1) : '—');
const chg = (n: number | null) => (n === null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(0)}%`);
const posChg = (d: Delta) => (d.positionChange === null ? '—' : `${d.positionChange > 0 ? '+' : ''}${d.positionChange.toFixed(1)}`);
const cell = (s: string) => s.replace(/\|/g, '\\|');

function table(head: readonly string[], rows: readonly (readonly (string | number)[])[]): string {
  if (!rows.length) return '\n_No data._\n';
  return '\n' + [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map((c) => cell(String(c))).join(' | ')} |`)].join('\n') + '\n';
}

const metricHead = ['Clicks', 'Δ', 'Impressions', 'Δ', 'CTR', 'Position', 'Δ pos (− = better)'];
const metricCells = (d: Delta) => [n0(d.current.clicks), chg(d.clicksPct), n0(d.current.impressions), chg(d.impressionsPct), ctr(d.current), pos(d.current), posChg(d)];

function pageTable(lines: readonly PageLine[], paths?: readonly string[], limit = Infinity): string {
  const rows = paths
    ? paths.map((p) => lines.find((l) => l.path === p) ?? { path: p, delta: compareMetrics(EMPTY, null) } as PageLine)
    : lines.slice(0, limit);
  return table(['Page', ...metricHead], rows.map((l) => [`\`${l.path}\``, ...metricCells(l.delta)]));
}

export function renderReport(r: Report): string {
  const { current, previous, inventory, liveSitemap } = r.input;
  const out: string[] = [];
  const crit = r.alerts.filter((a) => a.severity === 'critical');
  const warn = r.alerts.filter((a) => a.severity === 'warning');

  out.push(`# SEO monitoring report — ${current.name}\n`);
  out.push(`Generated ${r.input.generatedAt} by \`npm run seo:report\` (lib/seo/monitoring*.ts). Operating guide: docs/SEO_MONITORING_PLAN.md.\n`);
  out.push(table(['', ''], [
    ['Snapshot', current.name],
    ['Search Console date range', current.dateRange ?? 'not recorded (no Filters.csv)'],
    ['Compared with', r.comparisonSource],
    ['URL inventory', inventory ? `${inventory.size} URLs` : 'not supplied'],
    ['Alerts', `${crit.length} critical, ${warn.length} warning`],
  ]));

  out.push('\n## 1. Alerts\n');
  if (!r.alerts.length) out.push('No alert conditions met. (Traffic rules need at least ' + n0(THRESHOLDS.minBaselineImpressions) + ' impressions in the previous period.)\n');
  for (const a of r.alerts) out.push(`- **${a.severity.toUpperCase()} · ${a.area}** — ${a.title}. _Evidence:_ ${a.evidence}. _Next step:_ ${a.action}\n`);

  out.push('\n## 2. URL Inspection shortlist\n');
  out.push(`At most ${THRESHOLDS.inspectionShortlistMax} URLs, taken only from the alerts above. Inspect (live test) first; request indexing only after a fix or a substantive change.\n\n`);
  out.push(r.shortlist.length ? table(['URL', 'Why'], r.shortlist.map((s) => [`\`${s.path}\``, s.reason])) : '_Nothing to inspect this week._\n');

  out.push('\n## 3. Indexation\n');
  const chart = current.indexingChart;
  if (chart.length) {
    const last = chart[chart.length - 1];
    const at = (days: number) => [...chart].reverse().find((p) => p.date <= new Date(Date.parse(`${last.date}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10));
    const w = at(7);
    const m = at(28);
    out.push(table(['', 'Indexed', 'Not indexed'], [
      [`Latest (${last.date})`, n0(last.indexed), n0(last.notIndexed)],
      ...(w ? [[`7 days earlier (${w.date})`, n0(w.indexed), n0(w.notIndexed)]] : []),
      ...(m ? [[`28 days earlier (${m.date})`, n0(m.indexed), n0(m.notIndexed)]] : []),
      ...(inventory ? [['URL inventory (expected)', n0(inventory.size), '']] : []),
    ]));
  } else out.push('_No Page indexing chart in this snapshot._\n');
  if (current.indexingIssues.length) {
    const prevOf = (reason: string) => previous?.indexingIssues.filter((x) => x.reason === reason).reduce((n, x) => n + x.pages, 0);
    out.push('\n' + table(['Why pages are not indexed', 'Pages', 'Previous', 'Change'], current.indexingIssues
      .slice()
      .sort((a, b) => b.pages - a.pages)
      .map((c) => {
        const p = previous?.indexingIssues.length ? prevOf(c.reason) ?? 0 : null;
        return [c.reason, n0(c.pages), p === null ? '—' : n0(p), p === null ? '—' : `${c.pages - p >= 0 ? '+' : ''}${n0(c.pages - p)}`];
      })));
  }
  if (current.urlLists.length) {
    out.push('\n' + table(['Drill-down list', 'URLs', 'Priority pages in it'], current.urlLists.map((l) => [l.label, n0(l.paths.length), l.paths.filter((p) => PRIORITY_PATHS.includes(p)).map((p) => `\`${p}\``).join(', ') || '—'])));
  }

  out.push('\n## 4. Sitemaps\n');
  out.push(current.sitemaps.length ? table(['Sitemap', 'Status', 'Discovered URLs'], current.sitemaps.map((s) => [s.sitemap, s.status || '—', s.discovered === null ? '—' : n0(s.discovered)])) : '_No sitemaps.csv in this snapshot (Search Console has no export for this report; see the plan)._\n');
  if (liveSitemap) out.push(`\nLive check of \`${liveSitemap.base}\`: ${n0(liveSitemap.urls)} unique URLs${liveSitemap.problems.length ? `; **${liveSitemap.problems.length} problem(s)**: ${liveSitemap.problems.slice(0, 5).join('; ')}` : ', no problems'}.\n`);

  out.push('\n## 5. Search performance\n');
  out.push(table(['Scope', ...metricHead], [['Whole site (sum of pages)', ...metricCells(r.site)]]));
  if (r.anonymizedShare !== null) out.push(`\n${(r.anonymizedShare * 100).toFixed(0)}% of clicks come from queries Search Console anonymises; they appear in page and date totals but in no query row.\n`);
  out.push('\n### By query segment\n');
  out.push('Branded → local (a course/institute query with a place, or a locality) → commercial → informational; one segment per query. Rules: `classifyQuery` in lib/seo/monitoring.ts.\n\n');
  out.push(r.queries.length ? table(['Segment', 'Queries', ...metricHead], r.segments.map((s) => [s.segment, n0(s.queries), ...metricCells(s.delta)])) : '_No query export in this snapshot._\n');
  out.push('\n### By page group\n');
  out.push(table(['Group', 'Pages', ...metricHead], r.groups.map((g) => [g.group, n0(g.pages), ...metricCells(g.delta)])));
  out.push('\n### By course (course page, its landings and the articles that support it)\n');
  out.push(table(['Course', 'Pages', ...metricHead, 'Course-tagged query clicks'], r.courses.map((c) => [c.title, n0(c.pages), ...metricCells(c.delta), c.queries ? n0(c.queries.clicks) : '—'])));
  const nonBranded = r.queries.filter((q) => q.segment !== 'branded').slice(0, 20);
  out.push('\n### Top 20 non-branded queries\n');
  out.push(table(['Query', 'Segment', 'Course', 'Clicks', 'Impressions', 'CTR', 'Position'], nonBranded.map((q) => [q.query, q.segment, q.course || '—', n0(q.current.clicks), n0(q.current.impressions), ctr(q.current), pos(q.current)])));

  out.push('\n## 6. Priority page groups\n');
  out.push('\n### 6.1 Course pages\n');
  out.push(pageTable(r.pages, COURSE_PATHS));
  out.push('\n### 6.2 Homepage and 6.3 training-in-hyderabad\n');
  out.push(pageTable(r.pages, ['/', '/training-in-hyderabad', '/courses']));
  out.push('\n### 6.4 Local landing pages\n');
  const legacyLandings = r.pages.filter((p) => p.group === 'landing' && !LANDING_PATHS.includes(p.path)).map((p) => p.path);
  out.push(pageTable(r.pages, [...LANDING_PATHS, ...legacyLandings]));
  if (legacyLandings.length) out.push(`\nNot in \`config/locationLandings.ts\` (legacy URLs; see LOCAL_LANDING_PAGE_AUDIT.md §7.3): ${legacyLandings.map((p) => `\`${p}\``).join(', ')}\n`);
  out.push('\n### 6.5 Blog categories\n');
  const categoryPaths = inventory ? [...inventory.values()].filter((e) => e.type === 'category').map((e) => e.path).sort() : r.pages.filter((p) => p.group === 'blog-category').map((p) => p.path);
  out.push(pageTable(r.pages, categoryPaths));
  const articles = r.pages.filter((p) => p.group === 'blog-article');
  out.push('\n### 6.6 Top 50 blog articles (by clicks)\n');
  out.push(pageTable(articles, undefined, 50));
  out.push('\n### 6.7 Highest-impression articles\n');
  out.push('Low CTR on a page-one position is a title/description problem, not a ranking one.\n\n');
  const byImp = [...articles].sort((a, b) => b.current.impressions - a.current.impressions).slice(0, 25);
  out.push(table(['Page', 'Impressions', 'Clicks', 'CTR', 'Position', 'Note'], byImp.map((l) => [`\`${l.path}\``, n0(l.current.impressions), n0(l.current.clicks), ctr(l.current), pos(l.current), l.current.position !== null && l.current.position <= 10 && l.current.impressions >= 200 && l.current.ctr < 0.01 ? 'page 1, CTR < 1% — review snippet' : ''])));
  out.push('\n### 6.8 Zero-impression articles\n');
  out.push(`${r.zeroImpressionNote}\n\n`);
  if (r.zeroImpressionArticles) out.push(`**${n0(r.zeroImpressionArticles.length)}** articles. Full list: \`normalized/zero-impression-articles.csv\`. Read with BLOG_CONTENT_ACTION_PLAN.md; zero impressions over 90+ days is the gate for merge/noindex decisions, never a single week.\n`);

  out.push('\n## 7. Core Web Vitals (field, Search Console)\n');
  if (!current.cwv.length) out.push('_No Core Web Vitals chart in this snapshot._\n');
  for (const s of current.cwv) {
    if (!s.points.length) continue;
    const last = s.points[s.points.length - 1];
    const first = s.points[0];
    const good = (p: typeof last) => {
      const all = p.poor + p.needsImprovement + p.good;
      return all ? `${((p.good / all) * 100).toFixed(0)}%` : '—';
    };
    out.push(`\n**${s.device}**\n\n` + table(['', 'Poor', 'Needs improvement', 'Good', 'Good share'], [
      [`${first.date} (first)`, n0(first.poor), n0(first.needsImprovement), n0(first.good), good(first)],
      [`${last.date} (latest)`, n0(last.poor), n0(last.needsImprovement), n0(last.good), good(last)],
    ]));
  }

  out.push('\n## 8. Data quality\n');
  out.push(table(['File', 'Detected as', 'Rows', 'Context'], current.files.map((f) => [f.path, f.kind + (f.dimension ? ` (${f.dimension})` : ''), n0(f.rows), f.context ?? ''])));
  const lv = (l: string) => current.issues.filter((i) => i.level === l);
  out.push(`\n${lv('error').length} error(s) (rows dropped), ${lv('warning').length} warning(s), ${lv('info').length} note(s).\n`);
  const shown = [...lv('error').slice(0, 15), ...lv('warning').slice(0, 15), ...lv('info').slice(0, 10)];
  if (shown.length) out.push('\n' + table(['Level', 'File', 'Line', 'Message'], shown.map((i) => [i.level, i.file, i.line || '', i.message])));

  return out.join('');
}

/* ── Normalised CSV rows ──────────────────────────────────────────────────── */

const r4 = (n: number | null) => (n === null ? '' : Math.round(n * 10000) / 10000);

export function pageCsvRows(r: Report) {
  return r.pages.map((l) => ({
    path: l.path,
    group: l.group,
    course: l.course,
    clicks: l.current.clicks,
    impressions: l.current.impressions,
    ctr: r4(l.current.ctr),
    position: r4(l.current.position),
    prev_clicks: l.previous ? l.previous.clicks : '',
    prev_impressions: l.previous ? l.previous.impressions : '',
    prev_position: l.previous ? r4(l.previous.position) : '',
  }));
}

export function queryCsvRows(r: Report) {
  return r.queries.map((q) => ({
    query: q.query,
    segment: q.segment,
    course: q.course,
    clicks: q.current.clicks,
    impressions: q.current.impressions,
    ctr: r4(q.current.ctr),
    position: r4(q.current.position),
    prev_clicks: q.previous ? q.previous.clicks : '',
    prev_impressions: q.previous ? q.previous.impressions : '',
  }));
}
