import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { MERGED_ARTICLES } from '@/lib/blog/merged';
import { targetsCourseIntent } from '@/lib/seo/intent';
import { REVIEWED_OVERLAPS } from '@/lib/seo/ownership';
import {
  CAREER_DUPLICATE_GROUPS,
  COURSE_CLUSTERS,
  PLATFORM_SUBPILLARS,
  clusterArticles,
  clusterFor,
  courseForArticle,
  topicGaps,
  upwardTarget,
  type CourseSlug,
} from '@/lib/seo/topical';

/**
 * The topical authority map (lib/seo/topical.ts, docs/COURSE_CLUSTER_MATRIX.md).
 *
 * Offline, these tests hold the map to the rules it is built on: one owner per
 * topic, redirected pages never placed, and Phase 3 ownership decisions
 * respected. With BLOG_AUDIT_BACKUP set, they also check every slug against a
 * CMS backup (backend/src/scripts/blog-backup.ts).
 */

const COURSES: CourseSlug[] = ['data-science', 'gen-ai', 'agentic-ai', 'python-programming', 'power-bi', 'data-analytics', 'data-engineering', 'mlops', 'sql-server'];

/** /compare pages published on 2026-09-24 (docs/SEO_KEYWORD_OWNERSHIP_MATRIX.md). */
const COMPARE_PAGES = [
  'power-bi-vs-tableau',
  'data-science-vs-data-analytics',
  'data-science-vs-machine-learning',
  'python-vs-r-for-data-science',
  'data-analyst-vs-data-scientist',
  'generative-ai-vs-machine-learning',
  'mlops-vs-devops',
  'sql-vs-nosql',
  'power-bi-vs-excel',
  'data-engineering-vs-data-science',
].map((s) => `/compare/${s}`);

const allSlugs = () => [
  ...COURSE_CLUSTERS.flatMap((c) => clusterArticles(c).map((a) => a.slug)),
  ...CAREER_DUPLICATE_GROUPS.flatMap((g) => [g.owner, ...g.duplicates]),
];
const owners = COURSE_CLUSTERS.flatMap((c) => c.topics.filter((t) => t.owner).map((t) => t.owner!));
const duplicates = new Set(COURSE_CLUSTERS.flatMap((c) => c.topics.flatMap((t) => t.duplicates ?? [])));
const blogSlug = (p: string) => (p.startsWith('/blog/') ? p.slice(6) : null);

describe('course clusters', () => {
  it('has one cluster per course, with the course page as its pillar', () => {
    expect(COURSE_CLUSTERS.map((c) => c.course).sort()).toEqual([...COURSES].sort());
    for (const c of COURSE_CLUSTERS) expect(c.pillar).toBe(`/courses/${c.course}`);
  });

  it('gives every course 5–15 supporting topics', () => {
    for (const c of COURSE_CLUSTERS) {
      expect(c.topics.length, c.course).toBeGreaterThanOrEqual(5);
      expect(c.topics.length, c.course).toBeLessThanOrEqual(15);
    }
  });

  it('assigns each of the 12 blog categories to exactly one course, as the CMS does', () => {
    const cats = COURSE_CLUSTERS.flatMap((c) => c.categories);
    expect(cats).toHaveLength(12);
    expect(new Set(cats).size).toBe(12);
    expect(clusterFor('agentic-ai').categories).toEqual([]);
    expect(clusterFor('sql-server').categories).toEqual([]);
  });

  it('uses well-formed slugs and only published /compare pages', () => {
    for (const s of allSlugs()) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const c of COURSE_CLUSTERS) for (const t of c.topics) if (t.compare) expect(COMPARE_PAGES).toContain(t.compare);
  });
});

describe('one page, one topic', () => {
  it('lets an article own at most one topic across the whole map', () => {
    const seen = new Map<string, number>();
    for (const o of owners) seen.set(o, (seen.get(o) ?? 0) + 1);
    expect([...seen].filter(([, n]) => n > 1)).toEqual([]);
  });

  it('never lists a topic owner as somebody else’s duplicate', () => {
    expect(owners.filter((o) => duplicates.has(o))).toEqual([]);
    for (const g of CAREER_DUPLICATE_GROUPS) expect(owners).not.toContain(g.duplicates[0]);
  });

  it('places an article once per cluster', () => {
    for (const c of COURSE_CLUSTERS) {
      const slugs = clusterArticles(c).map((a) => a.slug);
      expect(slugs.filter((s, i) => slugs.indexOf(s) !== i), c.course).toEqual([]);
    }
  });

  it('explains every gap and every duplicate', () => {
    for (const c of COURSE_CLUSTERS)
      for (const t of c.topics) {
        if (t.owner === null) expect(Boolean(t.compare || t.gap || t.supporting?.length), `${c.course}: ${t.topic}`).toBe(true);
        if (t.gap) expect(t.priority, t.topic).toBeDefined();
        if (t.duplicates?.length) {
          expect(t.note, t.topic).toBeTruthy();
          expect(t.priority, t.topic).toBeDefined();
        }
      }
  });
});

describe('consistency with earlier phases', () => {
  it('never places a redirected (Phase 1 merged) article', () => {
    const merged = new Set(MERGED_ARTICLES.map((m) => m.from));
    expect(allSlugs().filter((s) => merged.has(s))).toEqual([]);
  });

  it('keeps Phase 3 MERGE secondaries as duplicates and their owners as owners', () => {
    for (const o of REVIEWED_OVERLAPS.filter((r) => r.decision === 'MERGE')) {
      const primary = blogSlug(o.primary);
      for (const m of o.members.map(blogSlug).filter((s): s is string => Boolean(s) && s !== primary)) {
        expect(owners, `${m} is a Phase 3 merge candidate`).not.toContain(m);
        expect(duplicates.has(m), `${m} should be listed as a duplicate`).toBe(true);
      }
      if (primary) expect(duplicates.has(primary), `${primary} owns its Phase 3 cluster`).toBe(false);
    }
  });

  it('sends interview and career articles to the course they are about, not the CMS default', () => {
    expect(courseForArticle('sql-interview-questions-top-50-with-answers')).toBe('sql-server');
    expect(courseForArticle('power-bi-interview-questions-top-40-with-answers')).toBe('power-bi');
    expect(courseForArticle('mlops-interview-questions-and-answers')).toBe('mlops');
    expect(courseForArticle('how-to-transition-from-testing-to-data-engineering')).toBe('data-engineering');
    expect(courseForArticle('agentic-ai-roadmap-2026-from-prompts-to-autonomous-systems')).toBe('agentic-ai');
    expect(courseForArticle('an-article-the-map-does-not-place')).toBeNull();
  });

  it('gives every supporting article, and every platform article, one link target upwards', () => {
    const de = clusterFor('data-engineering');
    for (const owner of Object.values(PLATFORM_SUBPILLARS)) expect(de.topics.map((t) => t.owner)).toContain(owner);
    expect(upwardTarget('chunking-strategies-for-rag-getting-retrieval-right')).toBe('rag-architecture-explained-retrieval-augmented-generation');
    expect(upwardTarget('aws-iam-explained-users-roles-and-policies', 'aws')).toBe('aws-roadmap-2026-for-data-engineers');
    expect(upwardTarget('aws-roadmap-2026-for-data-engineers', 'aws')).toBeNull();
    expect(upwardTarget('data-science-roadmap-2026-a-complete-step-by-step-guide', 'data-science')).toBeNull();
  });

  it('lists the gaps where no article exists, and nowhere else', () => {
    const gaps = topicGaps();
    expect(gaps.every((g) => g.owner === null)).toBe(true);
    expect(gaps.filter((g) => g.course === 'sql-server').length).toBeGreaterThanOrEqual(3);
    // Mature clusters are improved, not extended.
    for (const c of ['data-science', 'gen-ai', 'python-programming', 'power-bi', 'data-analytics', 'data-engineering', 'mlops'] as const)
      expect(gaps.filter((g) => g.course === c), c).toEqual([]);
  });
});

/* ── Against a CMS backup (opt-in) ──────────────────────────────────────── */

const BACKUP = process.env.BLOG_AUDIT_BACKUP;

describe.skipIf(!BACKUP)('against the CMS backup', () => {
  type Row = { slug: string; title: string; status: string; category_slug: string; kind: string };
  const rows: Row[] = BACKUP && existsSync(path.join(BACKUP, 'blogs.json')) ? JSON.parse(readFileSync(path.join(BACKUP, 'blogs.json'), 'utf8')) : [];
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  it('places only articles that exist and are published', () => {
    const missing = allSlugs().filter((s) => bySlug.get(s)?.status !== 'published');
    expect(missing).toEqual([]);
  });

  it('never makes an article that reaches for a course query the owner of a topic', () => {
    expect(owners.filter((o) => targetsCourseIntent(bySlug.get(o)!.title))).toEqual([]);
  });

  it('uses the category mapping the CMS actually has', () => {
    const cats: { slug: string; course_slug: string | null }[] = JSON.parse(readFileSync(path.join(BACKUP!, 'blog_categories.json'), 'utf8'));
    for (const cat of cats) expect(COURSE_CLUSTERS.find((c) => c.categories.includes(cat.slug))?.course, cat.slug).toBe(cat.course_slug);
  });
});
