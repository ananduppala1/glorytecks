import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  MERGED_ARTICLES,
  NOINDEX_ARTICLES,
  isMergedArticle,
  isNoindexArticle,
  isSitemapEligible,
  mergedRedirects,
} from '@/lib/blog/merged';
import {
  MAX_CLUSTER_LINKS,
  categoriesForCourse,
  courseForCategory,
  pillarArticles,
  siblingCategories,
} from '@/lib/blog/clusters';
import { hasSalaryContent } from '@/components/blog/SalaryDisclosure';
import type { Block, BlogPost, CategoryKnowledge, Course } from '@/types/content';

/* ── J. Content merging ───────────────────────────────────────────────────── */

describe('merged articles', () => {
  it('redirects each duplicate to a different, non-merged target', () => {
    for (const m of MERGED_ARTICLES) {
      expect(m.from, 'a merge must not point at itself').not.toBe(m.to);
      // No redirect chains: a target must not itself be merged away.
      expect(isMergedArticle(m.to), `${m.to} is both a target and a source`).toBe(false);
    }
  });

  it('records why each merge happened', () => {
    for (const m of MERGED_ARTICLES) {
      expect(m.reason.length, m.from).toBeGreaterThan(20);
    }
  });

  it('never lists a merged or noindexed article in the sitemap', () => {
    for (const m of MERGED_ARTICLES) {
      expect(isSitemapEligible(m.from), `${m.from} redirects but is sitemap-eligible`).toBe(false);
    }
    for (const slug of NOINDEX_ARTICLES) {
      expect(isSitemapEligible(slug), `${slug} is noindex but sitemap-eligible`).toBe(false);
    }
    // A normal article is still eligible.
    expect(isSitemapEligible('some-ordinary-article')).toBe(true);
  });

  it('keeps merged and noindexed sets disjoint', () => {
    for (const m of MERGED_ARTICLES) {
      expect(isNoindexArticle(m.from), `${m.from} is both merged and noindexed`).toBe(false);
    }
  });

  it('has no duplicate sources', () => {
    const sources = MERGED_ARTICLES.map((m) => m.from);
    expect(new Set(sources).size).toBe(sources.length);
  });

  /**
   * The redirects are declared in next.config.mjs (Next cannot import TS
   * there) and mirrored by MERGED_ARTICLES. This reads the real config file so
   * the two cannot drift — the failure mode being a sitemap that lists a URL
   * which 308s, or a redirect with no corresponding sitemap exclusion.
   */
  it('matches the redirect table in next.config.mjs exactly', () => {
    const config = readFileSync(path.join(process.cwd(), 'next.config.mjs'), 'utf8');

    for (const { source, destination } of mergedRedirects()) {
      expect(config, `next.config.mjs is missing a redirect for ${source}`).toContain(source);
      expect(config, `next.config.mjs is missing the destination ${destination}`).toContain(
        destination,
      );
    }

    // …and nothing under /blog/ redirects without being recorded here.
    const blogSources = [...config.matchAll(/source:\s*'(\/blog\/[^']+)'/g)].map((m) => m[1]);
    const known = new Set(mergedRedirects().map((r) => r.source));
    for (const s of blogSources) {
      expect(known.has(s), `${s} redirects in next.config.mjs but is not in MERGED_ARTICLES`).toBe(
        true,
      );
    }
    expect(blogSources).toHaveLength(MERGED_ARTICLES.length);
  });
});

/* ── D/E. Clusters and internal linking ───────────────────────────────────── */

const post = (slug: string, kind: string, date: string, title = slug): BlogPost =>
  ({
    slug,
    title,
    kind,
    date,
    updated: date,
    category: 'X',
    categorySlug: 'x',
    excerpt: '',
    metaDescription: '',
    tags: [],
    readTime: '5 min',
    author: null,
    featured: false,
    trending: false,
    popular: false,
  }) as unknown as BlogPost;

describe('cluster pillar selection', () => {
  const posts = [
    post('g1', 'guide', '2026-06-01'),
    post('r1', 'roadmap', '2026-01-01'),
    post('i1', 'interview', '2026-02-01'),
    post('g2', 'guide', '2026-07-01'),
    post('p1', 'projects', '2026-03-01'),
    post('s1', 'salary', '2026-04-01'),
  ];

  it('ranks differentiated cohorts above generic guides', () => {
    // Guides are 92–97% near-identical within a category, so featuring them
    // would spend internal links on the weakest pages — even the newest ones.
    const picked = pillarArticles(posts).map((l) => l.href);
    expect(picked[0]).toBe('/blog/r1');
    expect(picked).not.toContain('/blog/g2');
  });

  it('caps the number of links so nothing links to everything', () => {
    expect(pillarArticles(posts).length).toBeLessThanOrEqual(MAX_CLUSTER_LINKS);
    expect(pillarArticles(posts, 2)).toHaveLength(2);
  });

  it('breaks ties by recency', () => {
    const two = [post('old', 'guide', '2025-01-01'), post('new', 'guide', '2026-09-01')];
    expect(pillarArticles(two)[0].href).toBe('/blog/new');
  });

  it('uses the article title as anchor text, so anchors vary naturally', () => {
    const links = pillarArticles([post('a', 'roadmap', '2026-01-01', 'A Real Article Title')]);
    expect(links[0].label).toBe('A Real Article Title');
    // Never a stuffed, repeated anchor.
    expect(links[0].label).not.toMatch(/course in hyderabad|best|click here/i);
  });

  it('is empty for an empty archive rather than inventing links', () => {
    expect(pillarArticles([])).toEqual([]);
  });
});

describe('category ↔ course mapping', () => {
  const cats = [
    { slug: 'data-science', name: 'Data Science', short: 'DS', courseSlug: 'data-science' },
    { slug: 'python', name: 'Python', short: 'Py', courseSlug: 'python-programming' },
    { slug: 'mlops', name: 'MLOps', short: 'MLOps', courseSlug: 'mlops' },
    { slug: 'ghost', name: 'Ghost', short: 'G', courseSlug: 'retired-course' },
  ] as unknown as CategoryKnowledge[];

  const courses = [
    { slug: 'data-science', title: 'Data Science' },
    { slug: 'python-programming', title: 'Python Programming' },
    { slug: 'mlops', title: 'MLOps' },
  ] as unknown as Course[];

  it('resolves a category to the course the CMS says it supports', () => {
    expect(courseForCategory(cats[0], courses)?.slug).toBe('data-science');
    expect(courseForCategory(cats[1], courses)?.slug).toBe('python-programming');
  });

  it('emits no link when the course is unpublished or missing', () => {
    // A link is only worth emitting when it resolves — otherwise the hub link
    // 404s, which is worse than no link.
    expect(courseForCategory(cats[3], courses)).toBeNull();
    expect(courseForCategory(undefined, courses)).toBeNull();
  });

  it('reverses the lookup for course → categories', () => {
    expect(categoriesForCourse('data-science', cats).map((c) => c.slug)).toEqual(['data-science']);
    expect(categoriesForCourse('nothing', cats)).toEqual([]);
  });

  it('never links a category to itself as a sibling', () => {
    const sibs = siblingCategories(cats[0], cats);
    expect(sibs.map((s) => s.href)).not.toContain('/blog/category/data-science');
  });
});

/* ── I. Salary disclosure ─────────────────────────────────────────────────── */

describe('salary disclosure trigger', () => {
  const table = (head: string[], rows: string[][]): Block => ({ type: 'table', head, rows });

  it('fires on a salary table', () => {
    expect(
      hasSalaryContent([table(['Experience', 'Role', 'Annual CTC'], [['0–1 yr', 'Analyst', '₹4–6 LPA']])]),
    ).toBe(true);
    expect(hasSalaryContent([table(['Level', 'Indicative salary'], [['Senior', '₹25–45 LPA']])])).toBe(
      true,
    );
  });

  it('does not fire on an ordinary table', () => {
    expect(
      hasSalaryContent([table(['Tool', 'Use'], [['Pandas', 'Dataframes'], ['NumPy', 'Arrays']])]),
    ).toBe(false);
  });

  it('does not fire on an article with no tables', () => {
    expect(hasSalaryContent([{ type: 'paragraph', text: 'Salary is discussed in the course.' }])).toBe(
      false,
    );
    expect(hasSalaryContent([])).toBe(false);
  });
});
