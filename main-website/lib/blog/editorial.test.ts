import { describe, expect, it } from 'vitest';

import {
  SCORE_WEIGHTS,
  STUFFING_LIMIT,
  editorialScore,
  entitiesIn,
  intentGroups,
  isPrimarySource,
  keywordDensity,
  keywordProfile,
  parseCsvRows,
  phase11Classification,
  readability,
  titlePromise,
  type ScoreInput,
} from '@/lib/blog/editorial';
import type { Classification } from '@/lib/blog/quality';
import type { Block } from '@/types/content';

const para = (text: string): Block => ({ type: 'paragraph', text });

describe('keywordProfile', () => {
  it('derives a primary keyword from the title, without the year, and says it is derived', () => {
    const k = keywordProfile({ title: 'AWS Roadmap 2026 for Data Engineers', tags: ['aws'], category: 'AWS' }, { intent: 'career' });
    expect(k.primary).toBe('aws roadmap for data engineers');
    expect(k.basis).toBe('derived');
    expect(k.secondary.length).toBeGreaterThan(0);
    expect(k.entities).toContain('AWS');
  });

  it('matches the longest entity name and does not double count nested ones', () => {
    expect(entitiesIn('Connecting Power BI to SQL Server')).toEqual(['SQL Server', 'Power BI']);
    expect(entitiesIn('PostgreSQL window functions')).toEqual(['PostgreSQL']);
  });
});

describe('titlePromise', () => {
  it('compares a numbered title with the items in the body', () => {
    const body: Block[] = [{ type: 'faq', items: [{ q: 'a', a: 'b' }, { q: 'c', a: 'd' }] }];
    expect(titlePromise('SQL Interview Questions: Top 50 with Answers', body)).toEqual({ promised: 50, delivered: 2 });
    expect(titlePromise('Python Projects for Beginners: 15 Ideas to Build', [{ type: 'list', items: ['x', 'y', 'z'] }])).toEqual({ promised: 15, delivered: 3 });
    expect(titlePromise('What is Generative AI?', body)).toBeNull();
  });
});

describe('intentGroups', () => {
  const posts = [
    { slug: 'learn-python-from-scratch-a-complete-2026-roadmap', title: 'Learn Python from Scratch: A Complete 2026 Roadmap' },
    { slug: 'from-python-beginner-to-job-ready-a-6-month-plan', title: 'From Python Beginner to Job-Ready: A 6-Month Plan' },
    { slug: 'kafka-streams-explained', title: 'Kafka Streams Explained' },
    { slug: 'kafka-streams-explained-for-beginners', title: 'Kafka Streams Explained for Beginners' },
  ];
  const audits = posts.map((p) => ({ slug: p.slug, intent: 'tutorial' as const }));
  const groups = intentGroups(posts, audits);

  it('includes the curated Phase 5 duplicate groups', () => {
    const g = groups.find((x) => x.owner === 'learn-python-from-scratch-a-complete-2026-roadmap');
    expect(g?.source).toBe('phase5-topical');
    expect(g?.members).toContain('from-python-beginner-to-job-ready-a-6-month-plan');
  });

  it('flags uncurated title look-alikes as candidates only', () => {
    const g = groups.find((x) => x.source === 'title-similarity');
    expect(g?.owner).toBe('kafka-streams-explained');
    expect(g?.members).toEqual(['kafka-streams-explained-for-beginners']);
    expect(g?.note).toMatch(/Unreviewed candidate/);
  });

  it('turns a curated duplicate into a gated MERGE, but never overrides a redirect or manual review', () => {
    const rewrite: Classification = { action: 'DEEP REWRITE', reason: 'template', gate: 'none' };
    const c = phase11Classification('from-python-beginner-to-job-ready-a-6-month-plan', rewrite, groups);
    expect(c.action).toBe('MERGE');
    expect(c.gate).toMatch(/Search Console/);
    const manual: Classification = { action: 'MANUAL REVIEW', reason: 'salary', gate: 'editor' };
    expect(phase11Classification('from-python-beginner-to-job-ready-a-6-month-plan', manual, groups).action).toBe('MANUAL REVIEW');
    expect(phase11Classification('kafka-streams-explained-for-beginners', rewrite, groups).action).toBe('DEEP REWRITE');
  });

  it('leaves Phase 3 ownership decisions to classify: a CHANGE INTERNAL TARGETING member is kept', () => {
    const all = intentGroups(
      [{ slug: 'excel-vs-power-bi-which-should-you-learn-first', title: 'Excel vs Power BI: Which Should You Learn First?' }],
      [{ slug: 'excel-vs-power-bi-which-should-you-learn-first', intent: 'comparison' }],
    );
    expect(all.some((g) => g.source === 'phase3-ownership' && g.members.includes('excel-vs-power-bi-which-should-you-learn-first'))).toBe(true);
    const rewrite: Classification = { action: 'DEEP REWRITE', reason: 'template', gate: 'none' };
    expect(phase11Classification('excel-vs-power-bi-which-should-you-learn-first', rewrite, all).action).toBe('DEEP REWRITE');
  });
});

describe('keyword stuffing and readability', () => {
  it('counts phrase uses per 100 words of prose', () => {
    const blocks = [para('SQL interview questions test joins. Good SQL interview questions also test NULL handling and window functions in depth.')];
    const d = keywordDensity(blocks, 'SQL interview questions');
    expect(d.occurrences).toBe(2);
    expect(d.per100).toBeGreaterThan(STUFFING_LIMIT);
    expect(keywordDensity(blocks, 'pandas').occurrences).toBe(0);
  });

  it('measures sentence length and long paragraphs', () => {
    const r = readability([para('One short sentence. Another short one.'), para('word '.repeat(160))]);
    expect(r.meanSentenceWords).toBeGreaterThan(0);
    expect(r.longParagraphs).toBe(1);
  });
});

describe('editorialScore', () => {
  const base: ScoreInput = {
    check: {
      wordsAfter: 1400,
      headingsAfter: 8,
      codeBlocksAfter: 2,
      tablesAfter: 1,
      internalLinks: ['/blog/a', '/blog/b', '/courses/c'],
      brokenLinks: [],
      similarityToOriginal: 0,
      maxSimilarityToCorpus: 0.004,
    },
    blocks: [para('Short sentences read well. They also score well here.')],
    maxSimilarityToOtherRewrites: 0.01,
    sources: [{ url: 'https://docs.python.org/3/tutorial/' }, { url: 'https://learn.microsoft.com/en-us/power-bi/' }, { url: 'https://arxiv.org/abs/1706.03762' }, { url: 'https://www.postgresql.org/docs/' }],
    citedUrls: ['https://docs.python.org/3/tutorial/', 'https://learn.microsoft.com/en-us/power-bi/', 'https://arxiv.org/abs/1706.03762', 'https://www.postgresql.org/docs/'],
    metaDescription: 'A description that is long enough to fall inside the recommended range for search results.',
    metaTitle: 'A Clear, Accurate Search Title',
    excerpt: 'An excerpt that is long enough to be useful on the blog archive and in social previews.',
    ratings: { intentAlignment: 5, accuracy: 5, completeness: 4, usefulness: 5, coverage: 4 },
  };

  it('weights sum to 100', () => {
    expect(Object.values(SCORE_WEIGHTS).reduce((n, w) => n + w.max, 0)).toBe(100);
  });

  it('scores a strong rewrite high, and never above 100', () => {
    const s = editorialScore(base);
    expect(s.total).not.toBeNull();
    expect(s.total!).toBeGreaterThanOrEqual(90);
    expect(s.total!).toBeLessThanOrEqual(100);
  });

  it('withholds the total when the second review is missing', () => {
    const s = editorialScore({ ...base, ratings: undefined });
    expect(s.total).toBeNull();
    expect(s.automated).toBeGreaterThan(0);
    expect(s.notes.join()).toMatch(/total withheld/);
  });

  it('penalises paraphrase, promotional metadata and weak sources', () => {
    const weak = editorialScore({
      ...base,
      check: { ...base.check, similarityToOriginal: 0.3, maxSimilarityToCorpus: 0.3 },
      metaTitle: 'Best Guaranteed Course',
      sources: [{ url: 'https://example.com/blog' }],
      citedUrls: [],
    });
    expect(weak.parts.originality).toBe(0);
    expect(weak.parts.uniqueness).toBe(0);
    expect(weak.parts.metadataQuality).toBeLessThan(6);
    expect(weak.parts.sourceQuality).toBeLessThan(3);
  });

  it('recognises primary documentation sources', () => {
    expect(isPrimarySource('https://docs.aws.amazon.com/athena/latest/ug/ctas-examples.html')).toBe(true);
    expect(isPrimarySource('https://github.com/microsoft/sql-server-samples')).toBe(true);
    expect(isPrimarySource('https://github.com/someone/notes')).toBe(false);
    expect(isPrimarySource('https://medium.com/@x/post')).toBe(false);
  });
});

describe('parseCsvRows', () => {
  it('reads quoted fields with commas, quotes and newlines', () => {
    expect(parseCsvRows('url,title\r\n/a,"One, two"\n/b,"Say ""hi""\nthere"\n')).toEqual([
      { url: '/a', title: 'One, two' },
      { url: '/b', title: 'Say "hi"\nthere' },
    ]);
  });
});
