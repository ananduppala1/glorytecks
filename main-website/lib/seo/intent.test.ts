import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { locationLandings } from '@/config/locationLandings';
import { STATIC_ROUTES } from '@/lib/seo/routes';
import { REVIEWED_OVERLAPS } from '@/lib/seo/ownership';
import {
  auditLinks,
  clickDepth,
  commercialKey,
  comparisonKey,
  extractLinks,
  findOverlaps,
  inboundStats,
  overlapClusters,
  pageTypeOf,
  searchIntentOf,
  subjectTokens,
  targetsCourseIntent,
  type CrawledPage,
  type IntentPage,
} from '@/lib/seo/intent';

/**
 * Phase 3 — search-intent ownership. See docs/SEO_PHASE_3_FINAL_REPORT.md.
 *
 * Offline: the route registry and the course / landing title templates are
 * held to the ownership contract (docs/SEO_KEYWORD_MAP.md), and every detector
 * is exercised on fixtures. The ~600 CMS pages are checked against a crawl in
 * linkgraph.live.test.ts.
 */

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8');

/* ── The fixed pages and templates ────────────────────────────────────────── */

// Names as the CMS returns them (live, 2026-09-24). The titles are built from
// the same templates the page files use — pinned below so they cannot drift.
const COURSES: Record<string, string> = {
  'data-science': 'Data Science', 'gen-ai': 'Generative AI', 'agentic-ai': 'Agentic AI', 'python-programming': 'Python Programming',
  'power-bi': 'Power BI', 'data-engineering': 'Data Engineering', 'data-analytics': 'Data Analytics', mlops: 'MLOps', 'sql-server': 'SQL Server',
};
const LOCALITIES: Record<string, string> = {
  ameerpet: 'Ameerpet', kukatpally: 'Kukatpally (KPHB)', madhapur: 'Madhapur', gachibowli: 'Gachibowli', 'hitech-city': 'HITEC City', dilsukhnagar: 'Dilsukhnagar',
};
const courseTitle = (slug: string) => `${COURSES[slug]} Course in Hyderabad | GloryTecks`;
const landingTitle = (course: string, loc: string) => `${COURSES[course]} Course in ${LOCALITIES[loc]}, Hyderabad | GloryTecks`;

const fixedPages = (): IntentPage[] => [
  ...STATIC_ROUTES.filter((r) => r.index).map((r) => ({ path: r.path, type: pageTypeOf(r.path), title: r.title, description: r.description })),
  ...Object.keys(COURSES).map((slug) => ({ path: `/courses/${slug}`, type: 'course' as const, title: courseTitle(slug), courseSlug: slug })),
  ...locationLandings.map((l) => ({ path: `/${l.slug}`, type: 'landing' as const, title: landingTitle(l.courseSlug, l.localitySlug), courseSlug: l.courseSlug })),
];

describe('ownership contract — fixed pages and templates', () => {
  it('the templates in this test are the ones the pages render', () => {
    expect(read('app/(site)/courses/[slug]/page.tsx')).toContain('title: `${course.title} Course in Hyderabad | GloryTecks`');
    expect(read('app/(site)/[landingSlug]/page.tsx')).toContain('title: `${course.title} Course in ${loc.name}, Hyderabad | GloryTecks`');
  });

  it('no two commercial pages make the same offer in the same place — except the one under review', () => {
    const clusters = overlapClusters(findOverlaps(fixedPages()), fixedPages());
    const reviewed = new Set(REVIEWED_OVERLAPS.map((r) => [...r.members].sort().join(' ')));
    const unreviewed = clusters.filter((c) => !reviewed.has([...c.members].sort().join(' ')));
    expect(unreviewed.map((c) => `${c.kinds.join(',')}: ${c.members.join(' ⇄ ')} — ${c.reasons[0]}`)).toEqual([]);
    // The homepage/centre overlap is real and recorded — this pins it until the title is rewritten.
    expect(clusters.map((c) => c.primary)).toContain('/training-in-hyderabad');
  });

  it('every course owns "{course} @ hyderabad" and every landing "{course} @ {locality}"', () => {
    const keys = fixedPages().filter((p) => p.type === 'course' || p.type === 'landing').map(commercialKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(commercialKey({ path: '/courses/data-science', type: 'course', title: courseTitle('data-science') })).toBe('data science @ hyderabad');
    expect(commercialKey({ path: '/x', type: 'landing', title: landingTitle('data-science', 'kukatpally') })).toBe('data science @ kukatpally');
    expect(commercialKey({ path: '/x', type: 'landing', title: landingTitle('data-science', 'hitech-city') })).toBe('data science @ hitec city');
  });
});

describe('the reviewed-overlap ledger', () => {
  it('names a primary inside each cluster, lists each URL once, and explains itself', () => {
    const seen = new Set<string>();
    for (const r of REVIEWED_OVERLAPS) {
      expect(r.members.length, r.primary).toBeGreaterThanOrEqual(2);
      expect(r.members, r.primary).toContain(r.primary);
      expect(r.note.length, r.primary).toBeGreaterThan(40);
      for (const m of r.members) {
        expect(seen.has(m), `${m} is in two clusters`).toBe(false);
        seen.add(m);
      }
    }
  });
});

/* ── Detectors ────────────────────────────────────────────────────────────── */

const article = (slug: string, title: string, extra: Partial<IntentPage> = {}): IntentPage => ({
  path: `/blog/${slug}`,
  type: 'article',
  title: `${title} | GloryTecks Blog`,
  ...extra,
});

describe('subjects and comparisons', () => {
  it('reads the subject, not the template', () => {
    expect(subjectTokens('AWS Interview Questions for Data Engineers')).toEqual(['aws']);
    expect(subjectTokens('Data Scientist Salary in Hyderabad 2026: Freshers to Senior')).toEqual(['data', 'science']);
    expect(subjectTokens('Deep Learning Interview Questions and Answers')).toEqual(['deep', 'learning']);
    expect(subjectTokens('Azure Data Factory (ADF) Interview Questions')).toEqual(['azure', 'data', 'factory']);
  });

  it('keys a comparison independently of order, colon placement and phrasing', () => {
    const key = (t: string) => comparisonKey({ title: t });
    expect(key('Power BI vs Tableau: A Detailed 2026 Comparison')).toBe(key('Tableau vs Power BI'));
    expect(key('Orchestration: Airflow vs Dagster vs Prefect')).toBe(key('Pipeline Orchestration: Airflow vs Prefect vs Dagster'));
    expect(key('Data Analyst vs Data Scientist')).toBe(key('Data Science vs Data Analytics: Which Career Is Right for You?'));
    expect(key('Python vs R for Data Science')).toBe('python || r');
    expect(comparisonKey({ title: 'x', items: ['Power BI', 'Excel'] })).toBe(key('Excel vs Power BI: Which Should You Learn First?'));
  });

  it('never equates a two-way comparison with a three-way one', () => {
    expect(comparisonKey({ title: 'Power BI vs Tableau' })).not.toBe(comparisonKey({ title: 'Power BI vs Tableau vs Looker: A 2026 Comparison' }));
  });
});

describe('targetsCourseIntent', () => {
  it('flags a blog title reaching for the course query', () => {
    for (const t of ['Best Data Science Course in Hyderabad', 'Data Science Course Fees Explained', 'Power BI Training in Ameerpet', 'Weekend Python Classes for Working Professionals'])
      expect(targetsCourseIntent(t), t).toBe(true);
  });

  it('leaves ordinary technical wording alone', () => {
    for (const t of ['Amazon S3 Explained: Storage, Classes and Best Practices', 'Continuous Training: Automating Model Retraining', 'Scaling Model Training with Distributed Computing'])
      expect(targetsCourseIntent(t), t).toBe(false);
  });
});

describe('findOverlaps', () => {
  const pages: IntentPage[] = [
    { path: '/compare/power-bi-vs-tableau', type: 'comparison', title: 'Power BI vs Tableau 2026 | GloryTecks', items: ['Power BI', 'Tableau'] },
    article('power-bi-vs-tableau-a-detailed-2026-comparison', 'Power BI vs Tableau: A Detailed 2026 Comparison', { kind: 'comparison', category: 'power-bi' }),
    article('power-bi-interview-questions-top-40-with-answers', 'Power BI Interview Questions: Top 40 with Answers', { kind: 'interview', category: 'power-bi' }),
    article('power-bi-interview-questions-with-detailed-answers', 'Power BI Interview Questions with Detailed Answers', { kind: 'interview', category: 'interview-questions' }),
    article('aws-interview-questions-for-data-engineers', 'AWS Interview Questions for Data Engineers', { kind: 'interview', category: 'aws' }),
    article('gcp-interview-questions-for-data-engineers', 'GCP Interview Questions for Data Engineers', { kind: 'interview', category: 'gcp' }),
    article('best-data-science-course-in-hyderabad', 'Best Data Science Course in Hyderabad', { kind: 'guide', category: 'data-science', courseSlug: 'data-science' }),
    { path: '/courses/data-science', type: 'course', title: courseTitle('data-science'), courseSlug: 'data-science' },
    article('a', 'Kafka Basics', { h1: 'Same Heading' }),
    article('b', 'Spark Basics', { h1: 'Same Heading' }),
  ];
  const found = findOverlaps(pages);
  const has = (kind: string, primary: string, secondary: string) =>
    found.some((o) => o.kind === kind && o.primary === primary && o.secondary === secondary);

  it('sends a blog comparison to the /compare page that owns it', () => {
    expect(has('same-comparison', '/compare/power-bi-vs-tableau', '/blog/power-bi-vs-tableau-a-detailed-2026-comparison')).toBe(true);
  });

  it('keeps the topic-category copy of a duplicated interview topic', () => {
    expect(has('same-subject', '/blog/power-bi-interview-questions-top-40-with-answers', '/blog/power-bi-interview-questions-with-detailed-answers')).toBe(true);
  });

  it('does not confuse two interview sets that only share a template', () => {
    expect(found.some((o) => o.a.includes('aws-interview') || o.b.includes('aws-interview'))).toBe(false);
  });

  it('puts the course page first when a post reaches for its query', () => {
    expect(has('blog-targets-course', '/courses/data-science', '/blog/best-data-science-course-in-hyderabad')).toBe(true);
  });

  it('reports exact duplicate H1s', () => {
    expect(found.some((o) => o.kind === 'duplicate-h1' && o.a === '/blog/a' && o.b === '/blog/b')).toBe(true);
  });

  it('gives the more place-specific page the local offer', () => {
    const local = findOverlaps([
      { path: '/', type: 'home', title: 'GloryTecks — IT Training Institute in Ameerpet, Hyderabad' },
      { path: '/training-in-hyderabad', type: 'location', title: 'IT Training in Ameerpet, Hyderabad — GloryTecks Centre' },
    ]);
    expect(local).toMatchObject([{ kind: 'duplicate-commercial-intent', primary: '/training-in-hyderabad', secondary: '/' }]);
    expect(searchIntentOf({ path: '/training-in-hyderabad', type: 'location', title: '' })).toBe('local');
  });

  it('groups pairwise findings into one cluster with one owner', () => {
    const trio = [
      article('bigquery-vs-snowflake-vs-redshift-a-comparison', 'BigQuery vs Snowflake vs Redshift: A Comparison', { kind: 'comparison', category: 'gcp' }),
      article('redshift-vs-snowflake-vs-bigquery-a-comparison', 'Redshift vs Snowflake vs BigQuery: A Comparison', { kind: 'comparison', category: 'aws' }),
      article('cloud-data-warehouses-compared-snowflake-vs-bigquery-vs-redshift', 'Cloud Data Warehouses Compared: Snowflake vs BigQuery vs Redshift', { kind: 'comparison', category: 'data-engineering' }),
    ];
    const clusters = overlapClusters(findOverlaps(trio), trio, (p) => (p.includes('bigquery-vs') ? 10 : 1));
    expect(clusters).toHaveLength(1);
    expect(clusters[0].members).toHaveLength(3);
    expect(clusters[0].primary).toBe('/blog/bigquery-vs-snowflake-vs-redshift-a-comparison');
  });
});

/* ── Link graph ───────────────────────────────────────────────────────────── */

describe('extractLinks', () => {
  const html = `<html><body><header><nav><a href="/courses">Courses</a></nav></header>
    <main id="main-content"><nav aria-label="Breadcrumb"><a href="/">Home</a></nav>
      <p>Read the <a href="/blog/sql-joins#top">SQL joins guide</a> or <a href="https://glorytecks.com/courses/sql-server">the SQL Server course</a>.</p>
      <a href="https://example.com/x">external</a><a href="mailto:x@y.z">mail</a><a href="/logo.png">img</a>
    </main><footer><a href="/contact">Contact</a></footer></body></html>`;
  const links = extractLinks(html, '/blog/x', ['glorytecks.com']);

  it('keeps internal page links only, without fragments', () => {
    expect(links.map((l) => l.to)).toEqual(['/courses', '/', '/blog/sql-joins', '/courses/sql-server', '/contact']);
  });

  it('records the zone, nav membership and anchor text', () => {
    expect(links[0]).toMatchObject({ zone: 'header', nav: true });
    expect(links[1]).toMatchObject({ zone: 'main', nav: true });
    expect(links[2]).toMatchObject({ zone: 'main', nav: false, anchor: 'SQL joins guide' });
    expect(links[4]).toMatchObject({ zone: 'footer' });
  });
});

describe('inbound stats and the link audit', () => {
  const edge = (from: string, to: string, anchor = 'x', zone: 'main' | 'footer' = 'main', nav = false) => ({ from, to, anchor, zone, nav });
  const pages: CrawledPage[] = [
    { path: '/', status: 200, canonical: 'https://glorytecks.com', links: [edge('/', '/courses', 'Courses', 'footer'), edge('/', '/blog', 'Blog')] },
    { path: '/courses', status: 200, canonical: 'https://glorytecks.com/courses', links: [edge('/courses', '/blog/a', 'A guide')] },
    { path: '/blog', status: 200, canonical: 'https://glorytecks.com/blog', links: [edge('/blog', '/blog/b', 'B'), edge('/blog', '/blog/old', 'Old'), edge('/blog', '/blog/gone', 'Gone')] },
    { path: '/blog/a', status: 200, canonical: 'https://glorytecks.com/blog/a', links: [edge('/blog/a', '/blog/b', 'Next B'), edge('/blog/a', '/blog/dup', 'Read more')] },
    { path: '/blog/b', status: 200, canonical: 'https://glorytecks.com/blog/b', links: [] },
    { path: '/blog/dup', status: 200, canonical: 'https://glorytecks.com/blog/a', links: [] },
    { path: '/blog/orphan', status: 200, canonical: 'https://glorytecks.com/blog/orphan', links: [] },
  ];
  const statusOf = (p: string) => ({ '/blog/old': 308, '/blog/gone': 404 } as Record<string, number>)[p];
  const audit = auditLinks(pages, ['/', '/courses', '/blog', '/blog/a', '/blog/b', '/blog/orphan'], 'https://glorytecks.com', statusOf);

  it('counts only chosen links as editorial — not archives, not prev/next, not menus', () => {
    const s = inboundStats(pages);
    expect(s.get('/blog/a')).toEqual({ total: 1, contextual: 1, editorial: 1 });
    expect(s.get('/blog/b')).toEqual({ total: 2, contextual: 2, editorial: 0 });
    expect(s.get('/courses')).toEqual({ total: 1, contextual: 0, editorial: 0 });
  });

  it('finds orphans and pages with no editorial support', () => {
    expect(audit.orphans).toEqual(['/blog/orphan']);
    // /blog is linked from the homepage's main content, so it has editorial support.
    expect(audit.weak).toEqual(['/courses', '/blog/b', '/blog/orphan']);
  });

  it('finds broken, redirected and non-canonical link targets', () => {
    expect(audit.broken).toEqual([{ from: '/blog', to: '/blog/gone', status: 404 }]);
    expect(audit.redirected).toEqual([{ from: '/blog', to: '/blog/old', status: 308 }]);
    expect(audit.nonCanonical).toEqual([{ from: '/blog/a', to: '/blog/dup', canonical: 'https://glorytecks.com/blog/a' }]);
  });

  it('finds generic anchors', () => {
    expect(audit.genericAnchors).toEqual([{ anchor: 'read more', to: '/blog/dup', links: 1 }]);
  });

  it('measures click depth from the homepage', () => {
    const d = clickDepth(pages);
    expect(d.get('/blog')).toBe(1);
    expect(d.get('/blog/a')).toBe(2);
    expect(d.has('/blog/orphan')).toBe(false);
  });
});
