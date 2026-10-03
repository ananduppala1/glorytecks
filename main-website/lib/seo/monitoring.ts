/**
 * SEO monitoring — Search Console export import, normalisation, page and query
 * segmentation, period comparison, alert rules and the Markdown report.
 *
 * Pure functions only: no network and no file system. The runner
 * (monitoring.report.test.ts, `npm run seo:report`) reads a snapshot folder of
 * Search Console exports, calls into this module and writes the report.
 * docs/SEO_MONITORING_PLAN.md is the operating guide.
 *
 * Input is whatever Search Console lets you export, identified by its header
 * row rather than its file name (every export zip reuses Chart.csv/Table.csv):
 *
 *   Performance  Pages.csv, Queries.csv, Dates.csv, Filters.csv — single
 *                period or "Compare" mode — or dated API rows
 *                (date, query, page, clicks, impressions, ctr, position)
 *   Indexing     Chart.csv (Date, Indexed, Not indexed), Critical issues.csv
 *                (Reason, …, Pages), and per-reason drill-down URL lists
 *   Core Web Vitals  Chart.csv (Date, Poor, Need improvement, Good) per device
 *   Sitemaps     a hand-kept sitemaps.csv (the report has no export)
 */

import { PRODUCTION_ORIGIN, normalizePath } from './canonical';
import { pageTypeOf } from './intent';
import { COURSE_CLUSTERS, type CourseSlug } from './topical';
import { locationLandings } from '../../config/locationLandings';

/* ── CSV ──────────────────────────────────────────────────────────────────── */

/** RFC 4180 CSV: quoted fields, doubled quotes, CRLF or LF, optional BOM. Blank lines dropped. */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export function toCsv(rows: readonly Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v === undefined || v === null ? '' : typeof v === 'number' ? String(Math.round(v * 10000) / 10000) : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `${[cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')}\n`;
}

/**
 * A Search Console number. Handles "1,234", "4.35%", decimal commas in CTR and
 * position, and blanks ("", "-", "—" → null).
 *
 * CTR comes back as a fraction: "4.35%" → 0.0435, and 0.0435 (API) → 0.0435.
 * An unsigned CTR above 1 is read as a percentage. CTR is only ever used to
 * validate a row; the report recomputes it from clicks and impressions.
 */
export function parseMetric(raw: string | undefined, kind: 'count' | 'ctr' | 'position'): number | null {
  if (raw == null) return null;
  let s = raw.trim().replace(/[ \s]/g, '');
  if (!s || s === '-' || s === '—' || s === '–') return null;
  const percent = s.endsWith('%');
  if (percent) s = s.slice(0, -1);
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else if (kind !== 'count' && /^\d+,\d+$/.test(s)) s = s.replace(',', '.');
  if (!/^-?\d+(\.\d+)?(e-?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (kind === 'ctr') return percent || n > 1 ? n / 100 : n;
  return n;
}

/* ── URL and query normalisation ──────────────────────────────────────────── */

/** Hosts that are this site. A Domain property also reports http:// and www. */
export const SITE_HOSTS: readonly string[] = ['glorytecks.com', 'www.glorytecks.com'];

export type NormalizedUrl = { path: string; droppedParams: string[] } | { error: string };

/**
 * One key per page, whatever form Search Console reports it in:
 * http/https, www or not, trailing slash, doubled slashes, percent-encoding,
 * fragments and tracking parameters all collapse to the canonical path.
 * `?page=N` (N ≥ 2) is kept — paginated archives are separate canonical pages
 * (CANONICAL_QUERY_ALLOWLIST) — and `?page=1` folds into the bare path.
 * Path case is kept: `/Courses` and `/courses` are different URLs.
 */
export function normalizeUrl(raw: string, hosts: readonly string[] = SITE_HOSTS): NormalizedUrl {
  let s = raw.trim();
  if (!s) return { error: 'empty URL' };
  if (s.startsWith('//')) s = `https:${s}`;
  let url: URL;
  try {
    url = new URL(s, PRODUCTION_ORIGIN);
  } catch {
    return { error: `unparseable URL "${raw}"` };
  }
  if (!/^https?:$/.test(url.protocol)) return { error: `not a web URL "${raw}"` };
  const host = url.hostname.toLowerCase();
  if (!hosts.includes(host)) return { error: `host "${host}" is not the site` };
  let path = url.pathname;
  try {
    path = decodeURI(path);
  } catch {
    /* keep the encoded form */
  }
  path = normalizePath(path);
  const page = url.searchParams.get('page');
  const n = page && /^\d+$/.test(page) ? Number(page) : 0;
  const droppedParams = [...new Set([...url.searchParams.keys()].filter((k) => k !== 'page'))];
  return { path: n > 1 ? `${path}?page=${n}` : path, droppedParams };
}

/** "  Data  Science COURSE " → "data science course". */
export function normalizeSearchQuery(q: string): string {
  return q.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Search Console dates are ISO; Sheets re-exports sometimes are not. */
export function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) {
    m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  }
  if (!m) return null;
  const iso = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

/* ── Export detection ─────────────────────────────────────────────────────── */

export type ExportKind =
  | 'performance'
  | 'indexing-chart'
  | 'indexing-issues'
  | 'url-list'
  | 'cwv-chart'
  | 'filters'
  | 'sitemaps'
  | 'unknown';

export type Dimension = 'page' | 'query' | 'page-query' | 'date' | 'other';

const H = {
  page: /^(top pages|pages?|urls?|page url|landing page|address)$/i,
  query: /^(top queries|queries|query|search query|keyword)$/i,
  date: /^(date|day)$/i,
  metric: /^(.*?)\s*\b(clicks|impressions|ctr|position)$/i,
};

export interface Detected {
  kind: ExportKind;
  dimension?: Dimension;
}

export function detectExport(header: readonly string[]): Detected {
  const h = header.map((c) => c.trim().toLowerCase());
  const has = (re: RegExp) => h.some((c) => re.test(c));
  if (has(/^date$/) && has(/^indexed$/) && has(/^not indexed$/)) return { kind: 'indexing-chart' };
  if (has(/^date$/) && has(/^poor$/) && has(/^needs? improvement$/) && has(/^good$/)) return { kind: 'cwv-chart' };
  if (has(/^reason$/) && has(/^pages$/)) return { kind: 'indexing-issues' };
  if (has(/^filter$/) && has(/^value$/)) return { kind: 'filters' };
  if (has(/^sitemaps?$/) && has(/^status$/)) return { kind: 'sitemaps' };
  const metrics = h.filter((c) => H.metric.test(c));
  if (metrics.some((c) => /clicks$/.test(c)) && metrics.some((c) => /impressions$/.test(c))) {
    const page = has(H.page);
    const query = has(H.query);
    const date = has(H.date);
    const dimension: Dimension = page && query ? 'page-query' : page ? 'page' : query ? 'query' : date ? 'date' : 'other';
    return { kind: 'performance', dimension };
  }
  if (h[0] && /^(url|urls|page)$/.test(h[0])) return { kind: 'url-list' };
  return { kind: 'unknown' };
}

/* ── Import ───────────────────────────────────────────────────────────────── */

export type Period = 'current' | 'previous';

export interface Metrics {
  clicks: number;
  impressions: number;
  /** clicks / impressions, recomputed — never an average of CTRs. */
  ctr: number;
  /** Impression-weighted average position; null with no impressions. */
  position: number | null;
}

export interface PerfRow {
  period: Period;
  /** Normalised path (page exports) — or '' when the export has no page column. */
  page: string;
  /** Normalised query — or ''. */
  query: string;
  /** ISO date — or ''. */
  date: string;
  clicks: number;
  impressions: number;
  position: number | null;
}

export interface ImportIssue {
  file: string;
  /** 1-based line in the file; 0 for a file-level note. */
  line: number;
  level: 'error' | 'warning' | 'info';
  message: string;
}

export interface PerformanceImport {
  file: string;
  dimension: Dimension;
  rows: PerfRow[];
  /** Period labels from Compare-mode headers, e.g. { current: 'Last 28 days', previous: 'Previous 28 days' }. */
  labels: { current: string; previous?: string };
  rawRows: number;
  /** Rows that collapsed into another after normalisation (trailing slash, host, …). */
  merged: number;
  /** The UI export stops at 1,000 rows — anything beyond is silently missing. */
  truncated: boolean;
}

interface MetricColumns {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

const blankColumns = (): MetricColumns => ({ clicks: -1, impressions: -1, ctr: -1, position: -1 });

/** Accumulates rows under a key; position is weighted by impressions. */
class Accumulator {
  private map = new Map<string, PerfRow & { weighted: number; positioned: number }>();
  merged = 0;
  add(row: PerfRow) {
    const key = `${row.period}\u0000${row.page}\u0000${row.query}\u0000${row.date}`;
    const hit = this.map.get(key);
    const w = row.position !== null && row.impressions > 0 ? row.impressions : 0;
    if (!hit) {
      this.map.set(key, { ...row, weighted: w * (row.position ?? 0), positioned: w });
      return;
    }
    this.merged++;
    hit.clicks += row.clicks;
    hit.impressions += row.impressions;
    hit.weighted += w * (row.position ?? 0);
    hit.positioned += w;
  }
  rows(): PerfRow[] {
    return [...this.map.values()].map(({ weighted, positioned, ...r }) => ({ ...r, position: positioned > 0 ? weighted / positioned : r.position }));
  }
}

/**
 * Import one Performance export. Invalid rows are dropped and reported, never
 * guessed: a missing or foreign URL, a non-numeric or negative count, clicks
 * above impressions, an unreadable date. A stated CTR that disagrees with
 * clicks / impressions is reported and ignored.
 */
export function importPerformance(
  file: string,
  table: string[][],
  hosts: readonly string[] = SITE_HOSTS,
): { data: PerformanceImport; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const [header, ...body] = table;
  const h = header.map((c) => c.trim());
  const pageCol = h.findIndex((c) => H.page.test(c));
  const queryCol = h.findIndex((c) => H.query.test(c));
  const dateCol = h.findIndex((c) => H.date.test(c));

  // Metric columns, grouped by period prefix ("" for a single-period export).
  const byPrefix = new Map<string, MetricColumns>();
  h.forEach((c, i) => {
    const m = c.match(H.metric);
    if (!m) return;
    let prefix = m[1].trim();
    if (/^(url|average|avg\.?)$/i.test(prefix)) prefix = '';
    const cols = byPrefix.get(prefix) ?? blankColumns();
    cols[m[2].toLowerCase() as keyof MetricColumns] = i;
    byPrefix.set(prefix, cols);
  });
  const prefixes = [...byPrefix.keys()];
  let currentPrefix = prefixes[0] ?? '';
  let previousPrefix: string | undefined;
  if (prefixes.length >= 2) {
    const prev = prefixes.find((p) => /^(previous|prior|earlier)\b/i.test(p));
    previousPrefix = prev ?? prefixes[1];
    currentPrefix = prefixes.find((p) => p !== previousPrefix) ?? prefixes[0];
  }
  if (prefixes.length > 2) issues.push({ file, line: 1, level: 'warning', message: `more than two period groups in the header (${prefixes.join(' / ')}); using "${currentPrefix}" vs "${previousPrefix}"` });

  const periods: [Period, MetricColumns][] = [['current', byPrefix.get(currentPrefix)!]];
  if (previousPrefix !== undefined) periods.push(['previous', byPrefix.get(previousPrefix)!]);

  const acc = new Accumulator();
  const dropped = new Map<string, number>();
  body.forEach((cells, idx) => {
    const line = idx + 2;
    let page = '';
    let query = '';
    let date = '';
    if (pageCol >= 0) {
      const n = normalizeUrl(cells[pageCol] ?? '', hosts);
      if ('error' in n) {
        issues.push({ file, line, level: 'error', message: `row dropped: ${n.error}` });
        return;
      }
      page = n.path;
      for (const p of n.droppedParams) dropped.set(p, (dropped.get(p) ?? 0) + 1);
    }
    if (queryCol >= 0) {
      query = normalizeSearchQuery(cells[queryCol] ?? '');
      if (!query) {
        issues.push({ file, line, level: 'error', message: 'row dropped: empty query' });
        return;
      }
    }
    if (dateCol >= 0) {
      const d = normalizeDate(cells[dateCol] ?? '');
      if (!d) {
        issues.push({ file, line, level: 'error', message: `row dropped: unreadable date "${cells[dateCol]}"` });
        return;
      }
      date = d;
    }
    for (const [period, cols] of periods) {
      const clicks = parseMetric(cells[cols.clicks], 'count');
      const impressions = parseMetric(cells[cols.impressions], 'count');
      // A Compare export leaves the other period blank for rows seen in only one.
      if (period === 'previous' && clicks === null && impressions === null) continue;
      if (clicks === null || impressions === null || clicks < 0 || impressions < 0) {
        issues.push({ file, line, level: 'error', message: `row dropped (${period}): clicks/impressions not a non-negative number` });
        continue;
      }
      if (clicks > impressions) {
        issues.push({ file, line, level: 'error', message: `row dropped (${period}): ${clicks} clicks > ${impressions} impressions` });
        continue;
      }
      let position = cols.position >= 0 ? parseMetric(cells[cols.position], 'position') : null;
      if (position !== null && (position < 1 || position > 1000)) {
        issues.push({ file, line, level: 'warning', message: `position ${position} out of range; ignored` });
        position = null;
      }
      const ctr = cols.ctr >= 0 ? parseMetric(cells[cols.ctr], 'ctr') : null;
      if (ctr !== null && impressions > 0 && Math.abs(ctr - clicks / impressions) > 0.005) {
        issues.push({ file, line, level: 'warning', message: `stated CTR ${(ctr * 100).toFixed(2)}% ≠ clicks/impressions ${((clicks / impressions) * 100).toFixed(2)}%; recomputed` });
      }
      acc.add({ period, page, query, date, clicks, impressions, position: impressions > 0 ? position : null });
    }
  });

  for (const [p, n] of dropped) issues.push({ file, line: 0, level: 'info', message: `query parameter "${p}" removed from ${n} URL(s) before matching` });
  const truncated = body.length === 1000;
  if (truncated) issues.push({ file, line: 0, level: 'warning', message: 'exactly 1,000 rows — the Search Console UI export limit; rows beyond it are missing' });
  if (acc.merged) issues.push({ file, line: 0, level: 'info', message: `${acc.merged} row(s) merged into an existing URL/query after normalisation` });

  const dimension = detectExport(header).dimension ?? 'other';
  return {
    data: {
      file,
      dimension,
      rows: acc.rows(),
      labels: { current: currentPrefix || 'export period', ...(previousPrefix !== undefined ? { previous: previousPrefix } : {}) },
      rawRows: body.length,
      merged: acc.merged,
      truncated,
    },
    issues,
  };
}

/* ── Indexing and Core Web Vitals exports ─────────────────────────────────── */

export interface IndexingPoint {
  date: string;
  indexed: number;
  notIndexed: number;
}

export interface CwvPoint {
  date: string;
  poor: number;
  needsImprovement: number;
  good: number;
}

export interface IssueCount {
  reason: string;
  key: IndexingReasonKey | 'other';
  pages: number;
}

export type IndexingReasonKey =
  | 'server-error'
  | 'redirect-error'
  | 'soft-404'
  | 'not-found'
  | 'unauthorized'
  | 'blocked-4xx'
  | 'robots-blocked'
  | 'noindex'
  | 'canonical-mismatch'
  | 'duplicate-no-canonical'
  | 'alternate-canonical'
  | 'redirect'
  | 'crawled-not-indexed'
  | 'discovered-not-indexed';

/** Search Console's "Why pages aren't indexed" reasons, most specific first. */
export const INDEXING_REASONS: readonly { key: IndexingReasonKey; label: string; match: RegExp }[] = [
  { key: 'server-error', label: 'Server error (5xx)', match: /server error|\b5xx\b/i },
  { key: 'redirect-error', label: 'Redirect error', match: /redirect error/i },
  { key: 'soft-404', label: 'Soft 404', match: /soft[\s-]?404/i },
  { key: 'not-found', label: 'Not found (404)', match: /not found|\b404\b/i },
  { key: 'unauthorized', label: 'Blocked (401/403)', match: /\b40[13]\b|unauthori[sz]ed|forbidden|access denied/i },
  { key: 'blocked-4xx', label: 'Blocked (other 4xx)', match: /\b4xx\b/i },
  { key: 'robots-blocked', label: 'Blocked by robots.txt', match: /robots\.txt/i },
  { key: 'noindex', label: "Excluded by 'noindex' tag", match: /noindex/i },
  { key: 'canonical-mismatch', label: 'Duplicate, Google chose different canonical than user', match: /google chose different canonical/i },
  { key: 'duplicate-no-canonical', label: 'Duplicate without user-selected canonical', match: /without user-selected canonical/i },
  { key: 'alternate-canonical', label: 'Alternate page with proper canonical tag', match: /alternate page with proper canonical/i },
  { key: 'redirect', label: 'Page with redirect', match: /page with redirect/i },
  { key: 'crawled-not-indexed', label: 'Crawled – currently not indexed', match: /crawled\s*[-–—]?\s*currently not indexed/i },
  { key: 'discovered-not-indexed', label: 'Discovered – currently not indexed', match: /discovered\s*[-–—]?\s*currently not indexed/i },
];

export function indexingReasonKey(text: string): IndexingReasonKey | null {
  return INDEXING_REASONS.find((r) => r.match.test(text))?.key ?? null;
}

function columnIndex(header: readonly string[], re: RegExp) {
  return header.findIndex((c) => re.test(c.trim()));
}

export function importIndexingChart(file: string, table: string[][]): { points: IndexingPoint[]; issues: ImportIssue[] } {
  const [header, ...body] = table;
  const [d, i, n] = [columnIndex(header, /^date$/i), columnIndex(header, /^indexed$/i), columnIndex(header, /^not indexed$/i)];
  const issues: ImportIssue[] = [];
  const points: IndexingPoint[] = [];
  body.forEach((c, idx) => {
    const date = normalizeDate(c[d] ?? '');
    const indexed = parseMetric(c[i], 'count');
    const notIndexed = parseMetric(c[n], 'count');
    if (!date || indexed === null || notIndexed === null) {
      issues.push({ file, line: idx + 2, level: 'error', message: 'row dropped: unreadable date or count' });
      return;
    }
    points.push({ date, indexed, notIndexed });
  });
  return { points: points.sort((a, b) => a.date.localeCompare(b.date)), issues };
}

export function importCwvChart(file: string, table: string[][]): { points: CwvPoint[]; issues: ImportIssue[] } {
  const [header, ...body] = table;
  const [d, p, ni, g] = [columnIndex(header, /^date$/i), columnIndex(header, /^poor$/i), columnIndex(header, /^needs? improvement$/i), columnIndex(header, /^good$/i)];
  const issues: ImportIssue[] = [];
  const points: CwvPoint[] = [];
  body.forEach((c, idx) => {
    const date = normalizeDate(c[d] ?? '');
    const [poor, needsImprovement, good] = [parseMetric(c[p], 'count'), parseMetric(c[ni], 'count'), parseMetric(c[g], 'count')];
    if (!date || poor === null || needsImprovement === null || good === null) {
      issues.push({ file, line: idx + 2, level: 'error', message: 'row dropped: unreadable date or count' });
      return;
    }
    points.push({ date, poor, needsImprovement, good });
  });
  return { points: points.sort((a, b) => a.date.localeCompare(b.date)), issues };
}

export function importIndexingIssues(file: string, table: string[][]): { counts: IssueCount[]; issues: ImportIssue[] } {
  const [header, ...body] = table;
  const [r, p] = [columnIndex(header, /^reason$/i), columnIndex(header, /^pages$/i)];
  const issues: ImportIssue[] = [];
  const byReason = new Map<string, IssueCount>();
  body.forEach((c, idx) => {
    const reason = (c[r] ?? '').trim();
    const pages = parseMetric(c[p], 'count');
    if (!reason || pages === null) {
      issues.push({ file, line: idx + 2, level: 'error', message: 'row dropped: missing reason or page count' });
      return;
    }
    const key = indexingReasonKey(reason) ?? 'other';
    // "Source" splits one reason into Website / Google systems rows — sum them.
    const hit = byReason.get(reason);
    if (hit) hit.pages += pages;
    else byReason.set(reason, { reason, key, pages });
  });
  return { counts: [...byReason.values()], issues };
}

export interface SitemapStatus {
  sitemap: string;
  status: string;
  discovered: number | null;
}

export function importSitemaps(file: string, table: string[][]): { sitemaps: SitemapStatus[]; issues: ImportIssue[] } {
  const [header, ...body] = table;
  const [s, st, dc] = [columnIndex(header, /^sitemaps?$/i), columnIndex(header, /^status$/i), columnIndex(header, /discovered/i)];
  const issues: ImportIssue[] = [];
  const sitemaps = body
    .map((c, idx) => {
      if (!(c[s] ?? '').trim()) {
        issues.push({ file, line: idx + 2, level: 'error', message: 'row dropped: no sitemap URL' });
        return null;
      }
      return { sitemap: c[s].trim(), status: (c[st] ?? '').trim(), discovered: dc >= 0 ? parseMetric(c[dc], 'count') : null };
    })
    .filter((x): x is SitemapStatus => x !== null);
  return { sitemaps, issues };
}

/** A drill-down URL list; the reason comes from the folder or file name (see the plan). */
export function importUrlList(file: string, table: string[][], hosts: readonly string[] = SITE_HOSTS): { paths: string[]; issues: ImportIssue[] } {
  const [, ...body] = table;
  const issues: ImportIssue[] = [];
  const paths = new Set<string>();
  body.forEach((c, idx) => {
    const n = normalizeUrl(c[0] ?? '', hosts);
    if ('error' in n) issues.push({ file, line: idx + 2, level: 'error', message: `row dropped: ${n.error}` });
    else paths.add(n.path);
  });
  return { paths: [...paths], issues };
}

/* ── Snapshot ─────────────────────────────────────────────────────────────── */

export interface SnapshotFile {
  path: string;
  kind: ExportKind;
  dimension?: Dimension;
  rows: number;
  /** Device for CWV charts, reason for URL lists — taken from the folder/file name. */
  context?: string;
}

export interface Snapshot {
  name: string;
  files: SnapshotFile[];
  performance: Partial<Record<Dimension, PerformanceImport>>;
  indexingChart: IndexingPoint[];
  indexingIssues: IssueCount[];
  urlLists: { reason: IndexingReasonKey | 'other'; label: string; paths: string[]; file: string }[];
  cwv: { device: 'mobile' | 'desktop' | 'unknown'; points: CwvPoint[] }[];
  sitemaps: SitemapStatus[];
  /** Date range from Filters.csv, e.g. "Last 28 days". */
  dateRange?: string;
  issues: ImportIssue[];
}

/**
 * Build a snapshot from the files in one export folder. `path` is relative to
 * the snapshot folder; its directory and file name supply the context the
 * CSV itself lacks (device, drill-down reason).
 */
export function buildSnapshot(name: string, files: readonly { path: string; text: string }[], hosts: readonly string[] = SITE_HOSTS): Snapshot {
  const snap: Snapshot = { name, files: [], performance: {}, indexingChart: [], indexingIssues: [], urlLists: [], cwv: [], sitemaps: [], issues: [] };
  for (const f of files) {
    const table = parseCsv(f.text);
    if (table.length === 0) {
      snap.issues.push({ file: f.path, line: 0, level: 'warning', message: 'empty file' });
      snap.files.push({ path: f.path, kind: 'unknown', rows: 0 });
      continue;
    }
    const det = detectExport(table[0]);
    const lowerPath = f.path.toLowerCase().replace(/\\/g, '/');
    const entry: SnapshotFile = { path: f.path, kind: det.kind, dimension: det.dimension, rows: table.length - 1 };
    switch (det.kind) {
      case 'performance': {
        const { data, issues } = importPerformance(f.path, table, hosts);
        snap.issues.push(...issues);
        const dim = data.dimension;
        if (snap.performance[dim]) snap.issues.push({ file: f.path, line: 0, level: 'warning', message: `a second ${dim} performance export; using the first (${snap.performance[dim]!.file})` });
        else snap.performance[dim] = data;
        break;
      }
      case 'indexing-chart': {
        const { points, issues } = importIndexingChart(f.path, table);
        snap.issues.push(...issues);
        snap.indexingChart = points;
        break;
      }
      case 'indexing-issues': {
        const { counts, issues } = importIndexingIssues(f.path, table);
        snap.issues.push(...issues);
        for (const c of counts) {
          const hit = snap.indexingIssues.find((x) => x.reason === c.reason);
          if (hit) hit.pages += c.pages;
          else snap.indexingIssues.push(c);
        }
        break;
      }
      case 'cwv-chart': {
        const { points, issues } = importCwvChart(f.path, table);
        snap.issues.push(...issues);
        const device = /desktop/.test(lowerPath) ? 'desktop' : /mobile/.test(lowerPath) ? 'mobile' : 'unknown';
        entry.context = device;
        snap.cwv.push({ device, points });
        break;
      }
      case 'url-list': {
        const label = lowerPath.split('/').slice(-2).join(' ');
        const key = indexingReasonKey(label) ?? urlListKeyFromSlug(lowerPath) ?? indexingReasonKey(label.replace(/[-_]/g, ' ')) ?? 'other';
        const { paths, issues } = importUrlList(f.path, table, hosts);
        snap.issues.push(...issues);
        entry.context = key;
        snap.urlLists.push({ reason: key, label: INDEXING_REASONS.find((r) => r.key === key)?.label ?? label, paths, file: f.path });
        if (key === 'other') snap.issues.push({ file: f.path, line: 0, level: 'warning', message: 'URL list with no recognisable reason in its folder/file name — see the plan, §5' });
        break;
      }
      case 'filters': {
        const dateRow = table.slice(1).find((r) => /^date$/i.test((r[0] ?? '').trim()));
        if (dateRow) snap.dateRange = (dateRow[1] ?? '').trim();
        break;
      }
      case 'sitemaps': {
        const { sitemaps, issues } = importSitemaps(f.path, table);
        snap.issues.push(...issues);
        snap.sitemaps.push(...sitemaps);
        break;
      }
      default:
        snap.issues.push({ file: f.path, line: 0, level: 'info', message: `not a recognised export (header: ${table[0].slice(0, 6).join(', ')}) — ignored` });
    }
    snap.files.push(entry);
  }
  return snap;
}

/** Folder/file slugs used in the plan's naming convention (e.g. `indexing-canonical-mismatch/Table.csv`). */
function urlListKeyFromSlug(path: string): IndexingReasonKey | null {
  const keys = INDEXING_REASONS.map((r) => r.key).sort((a, b) => b.length - a.length);
  return keys.find((k) => path.includes(k)) ?? null;
}

/* ── Pages ────────────────────────────────────────────────────────────────── */

export type PageGroup =
  | 'home'
  | 'course-hub'
  | 'course'
  | 'centre'
  | 'landing'
  | 'blog-index'
  | 'blog-category'
  | 'blog-article'
  | 'compare'
  | 'resource'
  | 'static';

export interface InventoryEntry {
  path: string;
  type: string;
  category: string;
  course: string;
}

/** docs/SEO_URL_INVENTORY.csv → path → entry (url, page_type, category, supports_course). */
export function parseInventory(text: string): Map<string, InventoryEntry> {
  const [header, ...body] = parseCsv(text);
  const col = (name: string) => header.indexOf(name);
  const [u, t, c, s] = [col('url'), col('page_type'), col('category'), col('supports_course')];
  const out = new Map<string, InventoryEntry>();
  for (const r of body) {
    const n = normalizeUrl(r[u] ?? '');
    if ('error' in n) continue;
    out.set(n.path, { path: n.path, type: r[t] ?? '', category: c >= 0 ? (r[c] ?? '') : '', course: s >= 0 ? (r[s] ?? '') : '' });
  }
  return out;
}

const GROUP_OF_TYPE: Record<string, PageGroup> = {
  home: 'home',
  'course-hub': 'course-hub',
  course: 'course',
  location: 'centre',
  landing: 'landing',
  'blog-hub': 'blog-index',
  category: 'blog-category',
  article: 'blog-article',
  'compare-hub': 'compare',
  comparison: 'compare',
  'resource-hub': 'resource',
  resource: 'resource',
  static: 'static',
};

export function pageGroupOf(path: string, inventory?: ReadonlyMap<string, InventoryEntry>): PageGroup {
  const base = path.split('?')[0];
  const type = inventory?.get(base)?.type || pageTypeOf(base);
  return GROUP_OF_TYPE[type] ?? 'static';
}

export const COURSE_PATHS: readonly string[] = COURSE_CLUSTERS.map((c) => c.pillar);
export const LANDING_PATHS: readonly string[] = locationLandings.map((l) => `/${l.slug}`);
/** Pages whose loss of indexing or visibility is always worth an alert on its own. */
export const PRIORITY_PATHS: readonly string[] = ['/', '/courses', '/training-in-hyderabad', '/contact', '/about', ...COURSE_PATHS, ...LANDING_PATHS];

/** The course a page belongs to: its own slug, a landing's course, or the inventory's supports_course. */
export function courseOfPage(path: string, inventory?: ReadonlyMap<string, InventoryEntry>): CourseSlug | null {
  const base = path.split('?')[0];
  const courseMatch = base.match(/^\/courses\/([^/]+)$/);
  const slugs = COURSE_CLUSTERS.map((c) => c.course) as string[];
  if (courseMatch && slugs.includes(courseMatch[1])) return courseMatch[1] as CourseSlug;
  const landing = locationLandings.find((l) => `/${l.slug}` === base);
  if (landing && slugs.includes(landing.courseSlug)) return landing.courseSlug as CourseSlug;
  const supports = inventory?.get(base)?.course;
  return supports && slugs.includes(supports) ? (supports as CourseSlug) : null;
}

/* ── Queries ──────────────────────────────────────────────────────────────── */

export type QuerySegment = 'branded' | 'local' | 'commercial' | 'informational';

export interface QueryClass {
  segment: QuerySegment;
  course: CourseSlug | null;
}

const BRAND = /\bglory\s*-?\s*te(c|k)+h?s?\b|\bglorytecks?\b/;
const LOCALITY = /\b(ameerpet|kukatpally|kphb|madhapur|gachibowli|hitec ?h? city|hitech ?city|dilsukhnagar|sr nagar|punjagutta|begumpet|miyapur|kondapur|lb nagar|secunderabad)\b/;
const CITY = /\b(hyderabad|hyd|telangana|near me|nearby)\b/;
const COMMERCIAL = /\b(courses?|training|trainings|institutes?|classes|class|coaching|academy|fees?|cost|price|online course|bootcamp|admissions?|placements?|batch|batches|enrol+|join|certification course|best .*(course|institute|training))\b/;

/** Most specific first: "python for data science" is a Data Science query. */
const COURSE_TERMS: readonly [CourseSlug, RegExp][] = [
  ['agentic-ai', /\bagentic\b|\bai agents?\b|\blanggraph\b|\bcrewai\b|\bautogen\b/],
  ['gen-ai', /\bgenerative ai\b|\bgen ?ai\b|\bllms?\b|\blarge language models?\b|\bprompt engineering\b|\brag\b|\blangchain\b|\bchatgpt\b/],
  ['mlops', /\bml ?ops\b|\bmlflow\b|\bkubeflow\b|\bmodel deployment\b/],
  ['data-engineering', /\bdata engineer(ing)?\b|\betl\b|\belt\b|\bdatabricks\b|\bpy?spark\b|\bairflow\b|\bazure data factory\b|\badf\b|\bsnowflake\b|\bbigquery\b|\bredshift\b|\bdata (lake|warehouse)\b|\bdbt\b/],
  ['power-bi', /\bpower ?bi\b|\bdax\b|\bpower query\b/],
  ['data-analytics', /\bdata analy(tics|st|sts)\b|\btableau\b|\bexcel\b/],
  ['data-science', /\bdata scien(ce|tist|tists)\b|\bmachine learning\b|\bdeep learning\b|\bml\b|\bnlp\b|\bcomputer vision\b/],
  ['python-programming', /\bpython\b|\bpandas\b|\bnumpy\b/],
  ['sql-server', /\bsql server\b|\bt-?sql\b|\bssms\b|\bsql\b|\bmysql\b|\bpostgres(ql)?\b/],
];

/**
 * Segment a search query. One segment each, in priority order: a branded
 * query is branded whatever else it says; "local" is a course or institute
 * query tied to a place (or naming a locality outright); "commercial" is a
 * buying query without a place; everything else is informational.
 * The course tag is independent of the segment.
 */
export function classifyQuery(raw: string): QueryClass {
  const q = normalizeSearchQuery(raw);
  const course = COURSE_TERMS.find(([, re]) => re.test(q))?.[0] ?? null;
  if (BRAND.test(q)) return { segment: 'branded', course };
  const commercial = COMMERCIAL.test(q);
  if (LOCALITY.test(q) || (CITY.test(q) && commercial)) return { segment: 'local', course };
  if (commercial) return { segment: 'commercial', course };
  return { segment: 'informational', course };
}

/* ── Metrics and comparison ───────────────────────────────────────────────── */

export function totals(rows: readonly PerfRow[]): Metrics {
  let clicks = 0;
  let impressions = 0;
  let weighted = 0;
  let positioned = 0;
  for (const r of rows) {
    clicks += r.clicks;
    impressions += r.impressions;
    if (r.position !== null && r.impressions > 0) {
      weighted += r.position * r.impressions;
      positioned += r.impressions;
    }
  }
  return { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: positioned ? weighted / positioned : null };
}

export interface Delta {
  current: Metrics;
  previous: Metrics | null;
  clicksPct: number | null;
  impressionsPct: number | null;
  /** Positive = worse (moved down the results). */
  positionChange: number | null;
}

const pct = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null);

export function compareMetrics(current: Metrics, previous: Metrics | null): Delta {
  return {
    current,
    previous,
    clicksPct: previous ? pct(current.clicks, previous.clicks) : null,
    impressionsPct: previous ? pct(current.impressions, previous.impressions) : null,
    positionChange: previous && current.position !== null && previous.position !== null ? current.position - previous.position : null,
  };
}

/* ── Alert rules ──────────────────────────────────────────────────────────── */

/**
 * Every alert needs both a relative AND an absolute change, so a page going
 * from 4 clicks to 2 is never "−50%". Traffic rules are silent until the
 * previous period has enough impressions to mean anything.
 */
export const THRESHOLDS = {
  /** Previous-period site impressions below this → traffic alerts are suppressed. */
  minBaselineImpressions: 500,
  siteClicksDropPct: 25,
  siteClicksDropMin: 50,
  siteImpressionsChangePct: 30,
  siteImpressionsChangeMin: 2000,
  /**
   * A group or course page only alerts on a drop at least this many percentage
   * points worse than the whole site's — when everything fell together, the
   * site-level alert already says so.
   */
  beyondSitePts: 15,
  groupClicksDropPct: 30,
  groupClicksDropMin: 20,
  groupImpressionsDropPct: 30,
  groupImpressionsDropMin: 300,
  coursePageImpressionsDropPct: 40,
  coursePageImpressionsMin: 100,
  positionWorsening: 3,
  positionMinImpressions: 100,
  indexedDropPct: 10,
  indexedDropMin: 20,
  indexedLookbackDays: 7,
  notFoundIncreasePct: 20,
  notFoundIncreaseMin: 25,
  serverErrorIncreaseMin: 5,
  soft404IncreaseMin: 3,
  canonicalIncreaseMin: 5,
  notIndexedIncreasePct: 25,
  notIndexedIncreaseMin: 30,
  cwvPoorIncreaseMin: 5,
  cwvGoodShareDropPts: 10,
  cwvLookbackDays: 28,
  sitemapDiscoveredGapPct: 5,
  /** Daily manual "Request indexing" budget worth spending. */
  inspectionShortlistMax: 10,
} as const;

export type Severity = 'critical' | 'warning';

export interface Alert {
  severity: Severity;
  area: 'indexing' | 'sitemap' | 'canonical' | 'not-found' | 'server-error' | 'traffic' | 'impressions' | 'course' | 'cwv' | 'priority-page';
  title: string;
  evidence: string;
  action: string;
  /** URLs worth a URL Inspection because of this alert. */
  inspect?: string[];
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const fmtPct = (n: number | null) => (n === null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(0)}%`);

export interface GroupDelta {
  name: string;
  /** Course pages and the other priority groups get tighter rules. */
  kind: 'site' | 'group' | 'course-page';
  path?: string;
  delta: Delta;
}

export function performanceAlerts(site: Delta, groups: readonly GroupDelta[]): Alert[] {
  const T = THRESHOLDS;
  const out: Alert[] = [];
  if (!site.previous || site.previous.impressions < T.minBaselineImpressions) return out;

  const lostClicks = site.previous.clicks - site.current.clicks;
  if (site.clicksPct !== null && site.clicksPct <= -T.siteClicksDropPct && lostClicks >= T.siteClicksDropMin) {
    out.push({
      severity: 'critical',
      area: 'traffic',
      title: `Site clicks down ${Math.abs(site.clicksPct).toFixed(0)}%`,
      evidence: `${fmt(site.previous.clicks)} → ${fmt(site.current.clicks)} clicks (−${fmt(lostClicks)})`,
      action: 'Check indexing and manual actions first; then find the pages that lost the most clicks (page table) before changing anything.',
    });
  }
  const impDiff = site.current.impressions - site.previous.impressions;
  if (site.impressionsPct !== null && Math.abs(site.impressionsPct) >= T.siteImpressionsChangePct && Math.abs(impDiff) >= T.siteImpressionsChangeMin) {
    out.push({
      severity: impDiff < 0 ? 'critical' : 'warning',
      area: 'impressions',
      title: `Site impressions ${impDiff < 0 ? 'down' : 'up'} ${Math.abs(site.impressionsPct).toFixed(0)}%`,
      evidence: `${fmt(site.previous.impressions)} → ${fmt(site.current.impressions)}`,
      action: impDiff < 0 ? 'Compare with the indexed-pages trend; a matching indexing drop is a technical cause, a flat one is a ranking change.' : 'Usually good news; confirm it is not a single query or a branded spike before reporting it.',
    });
  }

  // A drop only counts if it is clearly worse than the site's own change.
  const beyondSite = (groupPct: number | null, sitePct: number | null) =>
    groupPct !== null && (sitePct === null || groupPct - Math.min(sitePct, 0) <= -T.beyondSitePts);

  for (const g of groups) {
    const d = g.delta;
    if (!d.previous) continue;
    const lost = d.previous.clicks - d.current.clicks;
    const lostImp = d.previous.impressions - d.current.impressions;
    if (g.kind === 'course-page') {
      if (d.previous.impressions >= T.coursePageImpressionsMin && d.current.impressions === 0) {
        out.push({ severity: 'critical', area: 'course', title: `${g.name}: no impressions this period`, evidence: `${fmt(d.previous.impressions)} → 0 impressions`, action: 'Inspect the URL now: indexing, canonical and robots.', inspect: g.path ? [g.path] : [] });
      } else if (d.impressionsPct !== null && d.impressionsPct <= -T.coursePageImpressionsDropPct && d.previous.impressions >= T.coursePageImpressionsMin && beyondSite(d.impressionsPct, site.impressionsPct)) {
        out.push({ severity: 'warning', area: 'course', title: `${g.name}: impressions ${fmtPct(d.impressionsPct)}`, evidence: `${fmt(d.previous.impressions)} → ${fmt(d.current.impressions)} impressions`, action: 'Check its top queries for a lost ranking or a competing URL of ours; inspect the URL if indexing is in doubt.', inspect: g.path ? [g.path] : [] });
      }
      if (d.positionChange !== null && d.positionChange >= T.positionWorsening && d.previous.impressions >= T.positionMinImpressions && d.current.impressions >= T.positionMinImpressions) {
        out.push({ severity: 'warning', area: 'course', title: `${g.name}: average position worse by ${d.positionChange.toFixed(1)}`, evidence: `${d.previous.position!.toFixed(1)} → ${d.current.position!.toFixed(1)}`, action: 'Look at which queries moved; a new competing page of ours is the first thing to rule out.' });
      }
      continue;
    }
    if (g.kind !== 'group') continue;
    if (d.clicksPct !== null && d.clicksPct <= -T.groupClicksDropPct && lost >= T.groupClicksDropMin && beyondSite(d.clicksPct, site.clicksPct)) {
      out.push({ severity: 'warning', area: 'traffic', title: `${g.name}: clicks ${fmtPct(d.clicksPct)}`, evidence: `${fmt(d.previous.clicks)} → ${fmt(d.current.clicks)} (−${fmt(lost)}); site ${fmtPct(site.clicksPct)}`, action: 'Find the pages in this group that lost the most; compare their positions and CTR.' });
    } else if (d.impressionsPct !== null && d.impressionsPct <= -T.groupImpressionsDropPct && lostImp >= T.groupImpressionsDropMin && beyondSite(d.impressionsPct, site.impressionsPct)) {
      out.push({ severity: 'warning', area: 'impressions', title: `${g.name}: impressions ${fmtPct(d.impressionsPct)}`, evidence: `${fmt(d.previous.impressions)} → ${fmt(d.current.impressions)}`, action: 'Check indexing for this group and whether one query drove the change.' });
    }
  }
  return out;
}

export function indexingAlerts(
  chart: readonly IndexingPoint[],
  current: readonly IssueCount[],
  previous: readonly IssueCount[] | null,
  urlLists: Snapshot['urlLists'],
): Alert[] {
  const T = THRESHOLDS;
  const out: Alert[] = [];

  // Indexed pages: latest vs N days earlier, from the chart's own history.
  if (chart.length >= 2) {
    const last = chart[chart.length - 1];
    const cutoff = new Date(Date.parse(`${last.date}T00:00:00Z`) - T.indexedLookbackDays * 86_400_000).toISOString().slice(0, 10);
    const base = [...chart].reverse().find((p) => p.date <= cutoff);
    if (base) {
      const drop = base.indexed - last.indexed;
      const dropPct = base.indexed ? (drop / base.indexed) * 100 : 0;
      if (drop >= T.indexedDropMin && dropPct >= T.indexedDropPct) {
        out.push({
          severity: 'critical',
          area: 'indexing',
          title: `Indexed pages down ${dropPct.toFixed(0)}% in ${T.indexedLookbackDays} days`,
          evidence: `${fmt(base.indexed)} (${base.date}) → ${fmt(last.indexed)} (${last.date})`,
          action: 'Open Page indexing → which reason grew by the same amount; check robots.txt, the sitemap and a deploy on that date before anything else.',
        });
      }
    }
  }

  // Reason counts: this snapshot vs the previous one.
  if (previous) {
    const sum = (list: readonly IssueCount[], key: IssueCount['key']) => list.filter((c) => c.key === key).reduce((n, c) => n + c.pages, 0);
    const rule = (key: IndexingReasonKey, area: Alert['area'], severity: Severity, minIncrease: number, minPct: number, action: string) => {
      const now = sum(current, key);
      const before = sum(previous, key);
      const inc = now - before;
      const incPct = before ? (inc / before) * 100 : Infinity;
      if (inc >= minIncrease && incPct >= minPct) {
        const label = INDEXING_REASONS.find((r) => r.key === key)!.label;
        out.push({ severity, area, title: `${label}: +${fmt(inc)} pages`, evidence: `${fmt(before)} → ${fmt(now)}`, action });
      }
    };
    rule('server-error', 'server-error', 'critical', T.serverErrorIncreaseMin, 0, 'Export the URL list; reproduce with curl; check Vercel function logs and the backend for the same dates.');
    rule('not-found', 'not-found', 'warning', T.notFoundIncreaseMin, T.notFoundIncreasePct, 'Export the URL list: removed content → decide 404/410 vs 308; broken internal links → fix the link.');
    rule('soft-404', 'not-found', 'warning', T.soft404IncreaseMin, 0, 'A soft 404 is a thin or empty page returning 200 — check the listed pages render real content.');
    rule('canonical-mismatch', 'canonical', 'warning', T.canonicalIncreaseMin, 0, 'Export the list; for each URL compare our canonical with the Google-selected one in URL Inspection.');
    rule('duplicate-no-canonical', 'canonical', 'warning', T.canonicalIncreaseMin, 0, 'These URLs have no canonical of their own — usually parameter variants; check what links to them.');
    rule('crawled-not-indexed', 'indexing', 'warning', T.notIndexedIncreaseMin, T.notIndexedIncreasePct, 'A quality signal, not a technical one. Check whether the listed pages are thin or duplicate before requesting anything.');
    rule('discovered-not-indexed', 'indexing', 'warning', T.notIndexedIncreaseMin, T.notIndexedIncreasePct, 'Google knows the URLs but has not crawled them: check internal links and server speed; do not bulk-request indexing.');
  }

  // Any priority page in a problem list is an alert on its own.
  const serious = new Set<IndexingReasonKey | 'other'>(['server-error', 'redirect-error', 'soft-404', 'not-found', 'canonical-mismatch', 'duplicate-no-canonical', 'crawled-not-indexed', 'discovered-not-indexed', 'noindex', 'robots-blocked', 'unauthorized']);
  for (const list of urlLists) {
    if (!serious.has(list.reason)) continue;
    const hits = list.paths.filter((p) => PRIORITY_PATHS.includes(p));
    if (hits.length) {
      out.push({
        severity: 'critical',
        area: list.reason === 'canonical-mismatch' || list.reason === 'duplicate-no-canonical' ? 'canonical' : 'priority-page',
        title: `${hits.length} priority page(s) listed under "${list.label}"`,
        evidence: hits.join(', '),
        action: 'Inspect each URL (live test), fix the cause, then request indexing for these pages only.',
        inspect: hits,
      });
    }
  }
  return out;
}

export function cwvAlerts(series: Snapshot['cwv']): Alert[] {
  const T = THRESHOLDS;
  const out: Alert[] = [];
  for (const s of series) {
    if (s.points.length < 2) continue;
    const last = s.points[s.points.length - 1];
    const cutoff = new Date(Date.parse(`${last.date}T00:00:00Z`) - T.cwvLookbackDays * 86_400_000).toISOString().slice(0, 10);
    const base = [...s.points].reverse().find((p) => p.date <= cutoff) ?? s.points[0];
    const share = (p: CwvPoint) => {
      const all = p.poor + p.needsImprovement + p.good;
      return all ? (p.good / all) * 100 : null;
    };
    if (last.poor - base.poor >= T.cwvPoorIncreaseMin) {
      out.push({ severity: 'warning', area: 'cwv', title: `Core Web Vitals (${s.device}): Poor URLs +${fmt(last.poor - base.poor)}`, evidence: `${fmt(base.poor)} (${base.date}) → ${fmt(last.poor)} (${last.date})`, action: 'Open the CWV report for the failing metric and its example URL group; re-measure with applied throttling (PERFORMANCE_SEO_VERIFICATION.md §2) before changing code.' });
    }
    const [a, b] = [share(base), share(last)];
    if (a !== null && b !== null && a - b >= T.cwvGoodShareDropPts) {
      out.push({ severity: 'warning', area: 'cwv', title: `Core Web Vitals (${s.device}): Good URLs ${b.toFixed(0)}%, down ${(a - b).toFixed(0)} points`, evidence: `${a.toFixed(0)}% → ${b.toFixed(0)}% of assessed URLs`, action: 'Find which metric moved (LCP, INP or CLS) and whether a deploy happened at the turn of the trend.' });
    }
  }
  return out;
}

export function sitemapAlerts(sitemaps: readonly SitemapStatus[], expectedUrls: number | null): Alert[] {
  const out: Alert[] = [];
  for (const s of sitemaps) {
    if (s.status && !/^success$/i.test(s.status)) {
      out.push({ severity: 'critical', area: 'sitemap', title: `Sitemap status "${s.status}": ${s.sitemap}`, evidence: `Search Console → Sitemaps`, action: 'Fetch the sitemap yourself (status code, XML validity, host in <loc>); "Couldn\'t fetch" within 48 h of submission is usually just pending.' });
    }
  }
  const index = sitemaps.find((s) => /\/sitemap\.xml$/i.test(s.sitemap)) ?? (sitemaps.length === 1 ? sitemaps[0] : undefined);
  if (index && index.discovered !== null && expectedUrls) {
    const gap = Math.abs(index.discovered - expectedUrls) / expectedUrls * 100;
    if (gap >= THRESHOLDS.sitemapDiscoveredGapPct) {
      out.push({ severity: 'warning', area: 'sitemap', title: `Sitemap discovered ${fmt(index.discovered)} URLs; inventory has ${fmt(expectedUrls)}`, evidence: `${gap.toFixed(0)}% apart`, action: 'Re-generate docs/SEO_URL_INVENTORY.csv if the site changed; otherwise fetch the sitemap children and count <loc> entries.' });
    }
  }
  return out;
}

/** At most THRESHOLDS.inspectionShortlistMax URLs, priority pages first, each with the alert that put it there. */
export function inspectionShortlist(alerts: readonly Alert[]): { path: string; reason: string }[] {
  const seen = new Map<string, string>();
  const ordered = [...alerts].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));
  for (const a of ordered) for (const p of a.inspect ?? []) if (!seen.has(p)) seen.set(p, a.title);
  return [...seen.entries()]
    .sort(([a], [b]) => Number(!PRIORITY_PATHS.includes(a)) - Number(!PRIORITY_PATHS.includes(b)))
    .slice(0, THRESHOLDS.inspectionShortlistMax)
    .map(([path, reason]) => ({ path, reason }));
}
