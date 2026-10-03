import { describe, expect, it } from 'vitest';

import {
  THRESHOLDS,
  buildSnapshot,
  classifyQuery,
  compareMetrics,
  courseOfPage,
  cwvAlerts,
  detectExport,
  importPerformance,
  indexingAlerts,
  indexingReasonKey,
  inspectionShortlist,
  normalizeDate,
  normalizeUrl,
  pageGroupOf,
  parseCsv,
  parseInventory,
  parseMetric,
  performanceAlerts,
  sitemapAlerts,
  type Alert,
  type IssueCount,
  type Metrics,
} from '@/lib/seo/monitoring';
import { buildReport, pageCsvRows, renderReport } from '@/lib/seo/monitoringReport';

const csv = (rows: (string | number)[][]) => rows.map((r) => r.join(',')).join('\n');
const m = (clicks: number, impressions: number, position: number | null = 5): Metrics => ({ clicks, impressions, ctr: impressions ? clicks / impressions : 0, position });

describe('CSV and numbers', () => {
  it('parses quoted fields, doubled quotes, CRLF, a BOM and blank lines', () => {
    const t = '﻿Top pages,Clicks\r\n"https://glorytecks.com/a,b",3\r\n\r\n"say ""hi""",4\n';
    expect(parseCsv(t)).toEqual([['Top pages', 'Clicks'], ['https://glorytecks.com/a,b', '3'], ['say "hi"', '4']]);
  });

  it('reads Search Console number formats', () => {
    expect(parseMetric('1,234', 'count')).toBe(1234);
    expect(parseMetric('4.35%', 'ctr')).toBeCloseTo(0.0435);
    expect(parseMetric('0.0435', 'ctr')).toBeCloseTo(0.0435);
    expect(parseMetric('12,3', 'position')).toBeCloseTo(12.3);
    expect(parseMetric('—', 'count')).toBeNull();
    expect(parseMetric('n/a', 'count')).toBeNull();
    expect(normalizeDate('2026-9-7')).toBe('2026-09-07');
    expect(normalizeDate('2026-02-30')).toBeNull();
  });
});

describe('URL normalisation — one key per page', () => {
  it('collapses scheme, www, case of host, trailing and doubled slashes, fragments and tracking parameters', () => {
    const variants = [
      'https://glorytecks.com/courses/data-science',
      'https://glorytecks.com/courses/data-science/',
      'http://www.glorytecks.com/courses/data-science',
      'https://GLORYTECKS.com//courses/data-science',
      'https://glorytecks.com/courses/data-science?utm_source=x#syllabus',
      '/courses/data-science',
    ];
    for (const v of variants) expect(normalizeUrl(v)).toMatchObject({ path: '/courses/data-science' });
    expect(normalizeUrl('https://glorytecks.com/courses/data-science?utm_source=x')).toEqual({ path: '/courses/data-science', droppedParams: ['utm_source'] });
  });

  it('keeps ?page=N as its own canonical page and folds ?page=1', () => {
    expect(normalizeUrl('https://glorytecks.com/blog?page=2')).toMatchObject({ path: '/blog?page=2' });
    expect(normalizeUrl('https://glorytecks.com/blog/?page=1')).toMatchObject({ path: '/blog' });
    expect(normalizeUrl('https://glorytecks.com')).toMatchObject({ path: '/' });
  });

  it('rejects hosts that are not the site, including preview deployments', () => {
    expect(normalizeUrl('https://glorytecks-psi.vercel.app/courses')).toHaveProperty('error');
    expect(normalizeUrl('https://example.com/courses')).toHaveProperty('error');
    expect(normalizeUrl('')).toHaveProperty('error');
  });
});

describe('Performance import', () => {
  it('merges URL variants, sums counts, weights position by impressions and recomputes CTR', () => {
    const t = parseCsv(csv([
      ['Top pages', 'Clicks', 'Impressions', 'CTR', 'Position'],
      ['https://glorytecks.com/courses/power-bi', 10, 100, '10%', 4],
      ['https://www.glorytecks.com/courses/power-bi/', 30, 300, '10%', 8],
      ['https://glorytecks.com/courses/mlops', 5, 3, '0%', 2],
      ['https://other.com/x', 1, 10, '10%', 3],
      ['https://glorytecks.com/courses/sql-server', 1, 100, '50%', 9],
    ]));
    const { data, issues } = importPerformance('Pages.csv', t);
    expect(data.dimension).toBe('page');
    const pb = data.rows.filter((r) => r.page === '/courses/power-bi');
    expect(pb).toHaveLength(1);
    expect(pb[0]).toMatchObject({ clicks: 40, impressions: 400, period: 'current' });
    expect(pb[0].position).toBeCloseTo(7); // (4×100 + 8×300) / 400
    expect(data.merged).toBe(1);
    expect(data.rows.some((r) => r.page === '/courses/mlops')).toBe(false); // 5 clicks > 3 impressions
    expect(issues.filter((i) => i.level === 'error')).toHaveLength(2);
    expect(issues.some((i) => /stated CTR 50\.00%/.test(i.message))).toBe(true);
  });

  it('flags an export cut off at the 1,000-row UI limit', () => {
    const rows = [['Top queries', 'Clicks', 'Impressions', 'CTR', 'Position'], ...Array.from({ length: 1000 }, (_, i) => [`q${i}`, 0, 1, '0%', 10])];
    const { data, issues } = importPerformance('Queries.csv', parseCsv(csv(rows)));
    expect(data.truncated).toBe(true);
    expect(issues.some((i) => /1,000 rows/.test(i.message))).toBe(true);
  });

  it('splits a Compare-mode export into current and previous periods', () => {
    const t = parseCsv(csv([
      ['Top pages', 'Last 28 days Clicks', 'Previous 28 days Clicks', 'Last 28 days Impressions', 'Previous 28 days Impressions', 'Last 28 days CTR', 'Previous 28 days CTR', 'Last 28 days Position', 'Previous 28 days Position'],
      ['https://glorytecks.com/', 50, 40, 1000, 900, '5%', '4.44%', 3, 3.5],
      ['https://glorytecks.com/new-page', 5, '', 100, '', '5%', '', 9, ''],
    ]));
    const { data } = importPerformance('Pages.csv', t);
    expect(data.labels).toEqual({ current: 'Last 28 days', previous: 'Previous 28 days' });
    expect(data.rows.find((r) => r.page === '/' && r.period === 'previous')).toMatchObject({ clicks: 40, impressions: 900 });
    expect(data.rows.filter((r) => r.page === '/new-page')).toHaveLength(1);
  });

  it('reads dated API rows with a fractional CTR', () => {
    const t = parseCsv(csv([
      ['date', 'query', 'page', 'clicks', 'impressions', 'ctr', 'position'],
      ['2026-10-01', 'Data Science Course Hyderabad', 'https://glorytecks.com/courses/data-science', 3, 60, 0.05, 6.5],
      ['2026-10-01', 'data science  course hyderabad', 'https://glorytecks.com/courses/data-science/', 1, 40, 0.025, 7.5],
    ]));
    const { data } = importPerformance('api.csv', t);
    expect(data.dimension).toBe('page-query');
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0]).toMatchObject({ date: '2026-10-01', query: 'data science course hyderabad', clicks: 4, impressions: 100 });
  });
});

describe('export detection and snapshot assembly', () => {
  it('identifies each Search Console export by its header', () => {
    expect(detectExport(['Date', 'Not indexed', 'Indexed', 'Impressions'])).toEqual({ kind: 'indexing-chart' });
    expect(detectExport(['Reason', 'Source', 'Validation', 'Trend', 'Pages'])).toEqual({ kind: 'indexing-issues' });
    expect(detectExport(['Date', 'Poor', 'Need improvement', 'Good'])).toEqual({ kind: 'cwv-chart' });
    expect(detectExport(['URL', 'Last crawled'])).toEqual({ kind: 'url-list' });
    expect(detectExport(['Filter', 'Value'])).toEqual({ kind: 'filters' });
    expect(detectExport(['Date', 'Clicks', 'Impressions', 'CTR', 'Position'])).toEqual({ kind: 'performance', dimension: 'date' });
    expect(detectExport(['Country', 'Clicks', 'Impressions', 'CTR', 'Position'])).toEqual({ kind: 'performance', dimension: 'other' });
    expect(detectExport(['Foo', 'Bar'])).toEqual({ kind: 'unknown' });
  });

  it('takes device and drill-down reason from the folder name', () => {
    const snap = buildSnapshot('2026-10-05', [
      { path: 'cwv-mobile/Chart.csv', text: 'Date,Poor,Need improvement,Good\n2026-10-01,1,2,30' },
      { path: 'indexing-canonical-mismatch/Table.csv', text: 'URL,Last crawled\nhttps://glorytecks.com/courses/mlops/,2026-10-01' },
      { path: 'Crawled - currently not indexed/Table.csv', text: 'URL,Last crawled\nhttps://glorytecks.com/blog/x,2026-10-01' },
      { path: 'performance/Filters.csv', text: 'Filter,Value\nSearch type,Web\nDate,Last 28 days' },
      { path: 'notes.csv', text: 'Foo,Bar\n1,2' },
    ]);
    expect(snap.cwv[0].device).toBe('mobile');
    expect(snap.urlLists.map((l) => [l.reason, l.paths])).toEqual([
      ['canonical-mismatch', ['/courses/mlops']],
      ['crawled-not-indexed', ['/blog/x']],
    ]);
    expect(snap.dateRange).toBe('Last 28 days');
    expect(snap.files.find((f) => f.path === 'notes.csv')?.kind).toBe('unknown');
  });

  it('maps Search Console reason wording to keys', () => {
    expect(indexingReasonKey('Soft 404')).toBe('soft-404');
    expect(indexingReasonKey('Not found (404)')).toBe('not-found');
    expect(indexingReasonKey('Server error (5xx)')).toBe('server-error');
    expect(indexingReasonKey('Duplicate, Google chose different canonical than user')).toBe('canonical-mismatch');
    expect(indexingReasonKey('Crawled - currently not indexed')).toBe('crawled-not-indexed');
    expect(indexingReasonKey('Page with redirect')).toBe('redirect');
  });
});

describe('segmentation', () => {
  it('segments queries: branded → local → commercial → informational, with a course tag', () => {
    expect(classifyQuery('glorytecks')).toEqual({ segment: 'branded', course: null });
    expect(classifyQuery('Glory Tecks data science')).toEqual({ segment: 'branded', course: 'data-science' });
    expect(classifyQuery('data science course in ameerpet')).toEqual({ segment: 'local', course: 'data-science' });
    expect(classifyQuery('python training hyderabad')).toEqual({ segment: 'local', course: 'python-programming' });
    expect(classifyQuery('data scientist salary in hyderabad')).toEqual({ segment: 'informational', course: 'data-science' });
    expect(classifyQuery('power bi course fees')).toEqual({ segment: 'commercial', course: 'power-bi' });
    expect(classifyQuery('what is mlops')).toEqual({ segment: 'informational', course: 'mlops' });
    expect(classifyQuery('python for data science')).toEqual({ segment: 'informational', course: 'data-science' });
    expect(classifyQuery('sql interview questions')).toEqual({ segment: 'informational', course: 'sql-server' });
    expect(classifyQuery('agentic ai course')).toEqual({ segment: 'commercial', course: 'agentic-ai' });
  });

  it('groups pages and assigns courses', () => {
    expect(pageGroupOf('/courses/power-bi')).toBe('course');
    expect(pageGroupOf('/python-course-kukatpally')).toBe('landing');
    expect(pageGroupOf('/training-in-hyderabad')).toBe('centre');
    expect(pageGroupOf('/blog/category/aws')).toBe('blog-category');
    expect(pageGroupOf('/blog?page=2')).toBe('blog-index');
    expect(courseOfPage('/python-course-kukatpally')).toBe('python-programming');
    expect(courseOfPage('/courses/gen-ai')).toBe('gen-ai');
    const inv = parseInventory('url,page_type,category,supports_course\nhttps://glorytecks.com/blog/x,article,power-bi,power-bi\n');
    expect(courseOfPage('/blog/x', inv)).toBe('power-bi');
  });
});

describe('alert rules stay quiet on noise', () => {
  const site = (prev: Metrics, cur: Metrics) => compareMetrics(cur, prev);

  it('suppresses traffic alerts until the baseline is big enough', () => {
    expect(performanceAlerts(site(m(40, 400), m(5, 100)), [])).toEqual([]);
  });

  it('needs a relative AND an absolute change', () => {
    // Group −50% but only 15 clicks lost: quiet.
    const quiet = performanceAlerts(site(m(1000, 20000), m(950, 19500)), [{ name: 'Group "course"', kind: 'group', delta: compareMetrics(m(15, 400), m(30, 500)) }]);
    expect(quiet).toEqual([]);
    const loud = performanceAlerts(site(m(1000, 20000), m(950, 19500)), [{ name: 'Group "course"', kind: 'group', delta: compareMetrics(m(60, 2000), m(100, 2100)) }]);
    expect(loud.map((a) => [a.severity, a.area])).toEqual([['warning', 'traffic']]);
  });

  it('does not repeat a site-wide drop once per group', () => {
    const siteDrop = site(m(1000, 20000), m(600, 19000)); // −40%
    const alerts = performanceAlerts(siteDrop, [
      { name: 'Group "blog-article"', kind: 'group', delta: compareMetrics(m(300, 9000), m(500, 9500)) }, // −40%: follows the site
      { name: 'Group "course"', kind: 'group', delta: compareMetrics(m(20, 900), m(100, 1000)) }, // −80%: worse than the site
    ]);
    expect(alerts.map((a) => a.title.split(':')[0])).toEqual(['Site clicks down 40%', 'Group "course"']);
  });

  it('flags a course page that vanished or slid, with the URL to inspect', () => {
    const alerts = performanceAlerts(site(m(1000, 20000), m(1000, 20000)), [
      { name: '/courses/mlops', kind: 'course-page', path: '/courses/mlops', delta: compareMetrics(m(0, 0, null), m(3, 150)) },
      { name: '/courses/power-bi', kind: 'course-page', path: '/courses/power-bi', delta: compareMetrics(m(2, 120, 12), m(4, 130, 7)) },
      { name: '/courses/sql-server', kind: 'course-page', path: '/courses/sql-server', delta: compareMetrics(m(0, 20), m(1, 60)) },
    ]);
    expect(alerts.map((a) => [a.severity, a.title.split(':')[0]])).toEqual([
      ['critical', '/courses/mlops'],
      ['warning', '/courses/power-bi'],
    ]);
    expect(alerts[0].inspect).toEqual(['/courses/mlops']);
  });

  it('indexing: chart drop, reason increases and priority pages', () => {
    const chart = [
      { date: '2026-09-20', indexed: 600, notIndexed: 50 },
      { date: '2026-09-27', indexed: 520, notIndexed: 130 },
    ];
    const prev: IssueCount[] = [
      { reason: 'Server error (5xx)', key: 'server-error', pages: 0 },
      { reason: 'Not found (404)', key: 'not-found', pages: 10 },
      { reason: 'Duplicate, Google chose different canonical than user', key: 'canonical-mismatch', pages: 2 },
    ];
    const cur: IssueCount[] = [
      { reason: 'Server error (5xx)', key: 'server-error', pages: 6 },
      { reason: 'Not found (404)', key: 'not-found', pages: 30 },
      { reason: 'Duplicate, Google chose different canonical than user', key: 'canonical-mismatch', pages: 8 },
    ];
    const lists = [{ reason: 'crawled-not-indexed' as const, label: 'Crawled – currently not indexed', paths: ['/courses/data-science', '/blog/x'], file: 'x' }];
    const alerts = indexingAlerts(chart, cur, prev, lists);
    const titles = alerts.map((a) => `${a.severity} ${a.area}`);
    expect(titles).toContain('critical indexing'); // −13% / −80 in 7 days
    expect(titles).toContain('critical server-error');
    expect(titles).toContain('warning canonical');
    expect(titles).toContain('critical priority-page');
    expect(alerts.some((a) => a.area === 'not-found')).toBe(false); // +20 < 25
    expect(indexingAlerts([{ date: '2026-09-20', indexed: 600, notIndexed: 0 }, { date: '2026-09-27', indexed: 590, notIndexed: 10 }], [], null, [])).toEqual([]);
  });

  it('Core Web Vitals and sitemaps', () => {
    const cwv = cwvAlerts([{ device: 'mobile', points: [{ date: '2026-08-30', poor: 2, needsImprovement: 18, good: 80 }, { date: '2026-09-27', poor: 9, needsImprovement: 26, good: 65 }] }]);
    expect(cwv).toHaveLength(2);
    expect(cwvAlerts([{ device: 'mobile', points: [{ date: '2026-08-30', poor: 0, needsImprovement: 5, good: 95 }, { date: '2026-09-27', poor: 1, needsImprovement: 5, good: 94 }] }])).toEqual([]);
    const sm = sitemapAlerts([{ sitemap: 'https://glorytecks.com/sitemap.xml', status: "Couldn't fetch", discovered: 600 }], 656);
    expect(sm.map((a) => a.severity)).toEqual(['critical', 'warning']);
    expect(sitemapAlerts([{ sitemap: 'https://glorytecks.com/sitemap.xml', status: 'Success', discovered: 650 }], 656)).toEqual([]);
  });

  it('keeps the inspection shortlist short, de-duplicated and priority-first', () => {
    const alerts: Alert[] = Array.from({ length: 15 }, (_, i) => ({ severity: 'warning', area: 'course', title: `a${i}`, evidence: '', action: '', inspect: [`/blog/p${i}`, '/courses/mlops'] }));
    const list = inspectionShortlist(alerts);
    expect(list).toHaveLength(THRESHOLDS.inspectionShortlistMax);
    expect(list[0].path).toBe('/courses/mlops');
    expect(new Set(list.map((l) => l.path)).size).toBe(list.length);
  });
});

describe('report', () => {
  const inventory = parseInventory([
    'url,page_type,category,supports_course',
    'https://glorytecks.com,home,,',
    'https://glorytecks.com/courses/data-science,course,,data-science',
    'https://glorytecks.com/blog/category/python,category,python,python-programming',
    'https://glorytecks.com/blog/learn-python,article,python,python-programming',
    'https://glorytecks.com/blog/never-seen,article,python,python-programming',
  ].join('\n'));
  const pages = (rows: (string | number)[][]) => ({ path: 'performance/Pages.csv', text: csv([['Top pages', 'Clicks', 'Impressions', 'CTR', 'Position'], ...rows]) });
  const current = buildSnapshot('2026-10-05', [
    pages([
      ['https://glorytecks.com/', 40, 900, '4.44%', 2],
      ['https://glorytecks.com/courses/data-science/', 10, 400, '2.5%', 8],
      ['http://www.glorytecks.com/courses/data-science', 5, 100, '5%', 6],
      ['https://glorytecks.com/blog/learn-python', 20, 2000, '1%', 7],
    ]),
    { path: 'performance/Queries.csv', text: csv([['Top queries', 'Clicks', 'Impressions', 'CTR', 'Position'], ['glorytecks', 30, 100, '30%', 1], ['data science course hyderabad', 10, 500, '2%', 8]]) },
  ]);
  const previous = buildSnapshot('2026-09-28', [pages([['https://glorytecks.com/', 50, 1000, '5%', 2], ['https://glorytecks.com/courses/data-science', 30, 600, '5%', 5]])]);

  it('builds one line per page, compares periods and lists zero-impression articles', () => {
    const r = buildReport({ current, previous, inventory, generatedAt: 'test' });
    expect(r.pages.filter((p) => p.path === '/courses/data-science')).toHaveLength(1);
    expect(r.pages.find((p) => p.path === '/courses/data-science')?.current).toMatchObject({ clicks: 15, impressions: 500 });
    expect(r.site.previous).toMatchObject({ clicks: 80, impressions: 1600 });
    expect(r.zeroImpressionArticles).toEqual(['/blog/never-seen']);
    expect(r.segments.find((s) => s.segment === 'branded')?.delta.current.clicks).toBe(30);
    expect(r.comparisonSource).toMatch(/previous snapshot 2026-09-28/);
    const paths = pageCsvRows(r).map((row) => row.path);
    expect(new Set(paths).size).toBe(paths.length);

    const md = renderReport(r);
    for (const heading of ['## 1. Alerts', '## 2. URL Inspection shortlist', '## 3. Indexation', '### 6.1 Course pages', '### 6.8 Zero-impression articles', '## 8. Data quality']) {
      expect(md).toContain(heading);
    }
  });

  it('says so when there is nothing to compare against', () => {
    const r = buildReport({ current, previous: null, inventory: null, generatedAt: 'test' });
    expect(r.site.previous).toBeNull();
    expect(r.alerts.filter((a) => a.area === 'traffic')).toEqual([]);
    expect(r.zeroImpressionArticles).toBeNull();
  });
});
