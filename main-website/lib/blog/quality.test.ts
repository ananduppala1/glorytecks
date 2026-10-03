import { describe, expect, it } from 'vitest';

import type { Block } from '@/types/content';
import {
  TEMPLATE_DF,
  auditArticles,
  buildCorpus,
  checkRewrite,
  classify,
  clusterArticles,
  gscClass,
  imagePlan,
  inlineLinks,
  intentProfile,
  jaccardSorted,
  parseGscCsv,
  plain,
  proseOf,
  rawTokens,
  repetitionReport,
  rewritePriority,
  shingleSet,
  sourceFor,
  subjectPhrase,
  templateTokens,
  toCsv,
  type ArticleAudit,
  type BackupPost,
} from '@/lib/blog/quality';

/**
 * The blog quality audit (lib/blog/quality.ts). Fixtures reproduce the three
 * shapes found in the real corpus: a template filled in with different
 * topics, a same-topic copy, and an article written from scratch.
 */

const slugOf = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function post(title: string, content: Block[], over: Partial<BackupPost> = {}): BackupPost {
  return {
    id: `id-${slugOf(title)}`,
    slug: slugOf(title),
    title,
    category: 'Data Science',
    category_slug: 'data-science',
    kind: 'guide',
    status: 'published',
    tags: [],
    author_key: 'ravi-kumar',
    date: '2026-01-01',
    updated: '2026-01-01',
    content,
    ...over,
  };
}

/** The corpus template: the same sentences with the title and category substituted. */
const templated = (title: string, over: Partial<BackupPost> = {}) => {
  const cat = over.category ?? 'Data Science';
  return post(
    title,
    [
      { type: 'paragraph', text: `**${title}** is one of the topics learners ask about most when they start with ${cat}. The fundamentals you build here transfer directly to real work in teams of every size.` },
      { type: 'heading', id: 'key-takeaways', text: 'Key takeaways' },
      { type: 'list', items: ['Understand the core idea before the tooling.', 'Apply it immediately in a small project of your own.', 'Collecting tutorials without ever shipping anything is the classic trap.'] },
      // Real template articles run to ~650 words, so the substituted title is a small share of the text.
      { type: 'heading', id: 'step-by-step', text: 'Step-by-step' },
      { type: 'list', ordered: true, items: ['Start with the concept and a clear mental model of how the pieces fit together.', 'Set up your environment and reproduce a small, real example end to end.', 'Write down what you learned so that you can explain it in an interview later.', 'Extend the example with one change of your own and compare the results carefully.'] },
      { type: 'paragraph', text: 'The tools change; the fundamentals do not. Strong basics make every framework easier to pick up, and employers value depth first and breadth second when they hire juniors.' },
      { type: 'paragraph', text: 'Numbers move with proof of skill. Two or three solid, deployed projects on your GitHub will do more for your offer than another certificate ever will.' },
      { type: 'callout', variant: 'info', text: `${cat} skills are in active demand across Hyderabad, with freshers earning ₹5–9 LPA.` },
      { type: 'heading', id: 'conclusion', text: 'Conclusion' },
      { type: 'paragraph', text: `${title} is very learnable with the right sequence and steady practice. Start small, build in public, and let projects pull you through the harder topics.` },
    ],
    over,
  );
};

const TOPICS = [
  'Feature Scaling Explained',
  'Cross Validation Explained',
  'Confusion Matrix Explained',
  'Gradient Boosting Explained',
  'Decision Trees Explained',
  'Linear Regression Explained',
  'Logistic Regression Explained',
  'K-Means Clustering Explained',
  'Principal Component Analysis Explained',
  'Random Forests Explained',
  'Time Series Forecasting Explained',
  'Outlier Detection Explained',
];

const original = post(
  'Bootstrapping Confidence Intervals',
  [
    { type: 'paragraph', text: 'Resampling your observed sample with replacement, thousands of times, approximates the sampling distribution of almost any statistic without assuming normality.' },
    { type: 'heading', id: 'percentile-method', text: 'The percentile method' },
    { type: 'paragraph', text: 'Sort the resampled medians and read off the 2.5th and 97.5th percentiles; that interval is the simplest bootstrap estimate, and it works poorly for heavily skewed estimators.' },
    { type: 'paragraph', text: 'For a worked reference, see the [SciPy bootstrap documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html) and our [statistics primer](/blog/statistics-primer).' },
    { type: 'code', lang: 'python', code: 'from scipy.stats import bootstrap\nres = bootstrap((data,), np.median, confidence_level=0.95)' },
  ],
  { author_key: 'priya-sharma' },
);

const corpusPosts = [...TOPICS.map((t) => templated(t)), original];

describe('text extraction', () => {
  it('reads inline links and strips inline markup the way the renderer does', () => {
    expect(inlineLinks('See [the docs](https://x.org/a) and [home](/)')).toEqual([
      { text: 'the docs', url: 'https://x.org/a' },
      { text: 'home', url: '/' },
    ]);
    expect(plain('**Bold** and `code` and [a link](/x)')).toBe('Bold and code and a link');
  });

  it('keeps headings and code out of the prose, and FAQ answers in it', () => {
    const p = proseOf([
      { type: 'heading', id: 'h', text: 'Heading' },
      { type: 'paragraph', text: 'One [two](/t).' },
      { type: 'code', lang: 'py', code: 'print(1)' },
      { type: 'faq', items: [{ q: 'Q?', a: 'An answer with [a source](https://s.org).' }] },
    ]);
    expect(p.headings).toEqual(['Heading']);
    expect(p.code).toEqual(['print(1)']);
    expect(p.units).toEqual(['One two.', 'An answer with a source.']);
    expect(p.links.map((l) => l.url)).toEqual(['/t', 'https://s.org']);
  });

  it('substitutes the title and category so keyword-swapped sentences compare equal', () => {
    const a = templateTokens('Feature Scaling Explained is very learnable in Data Science.', templated('Feature Scaling Explained'));
    const b = templateTokens('Decision Trees Explained is very learnable in Data Science.', templated('Decision Trees Explained'));
    expect(a).toEqual(b);
    expect(a).toEqual(['ttl', 'is', 'very', 'learnable', 'in', 'cat']);
    expect(rawTokens('Feature Scaling Explained')).not.toEqual(rawTokens('Decision Trees Explained'));
  });

  it('measures shingle overlap exactly', () => {
    const a = shingleSet([['a', 'b', 'c', 'd', 'e', 'f']]);
    const b = shingleSet([['a', 'b', 'c', 'd', 'e', 'x']]);
    expect(a.length).toBe(2);
    expect(jaccardSorted(a, a)).toBe(1);
    expect(jaccardSorted(a, b)).toBeCloseTo(1 / 3);
    expect(jaccardSorted(new Uint32Array(), new Uint32Array())).toBe(0);
  });
});

describe('corpus audit', () => {
  const corpus = buildCorpus(corpusPosts);
  const audits = auditArticles(corpus, [{ key: 'priya-sharma', name: 'Priya Sharma' }, { key: 'ravi-kumar', name: 'Ravi Kumar' }]);
  const by = (slug: string) => audits.find((a) => a.slug === slug)!;
  const tpl = by(slugOf(TOPICS[0]));
  const orig = by(original.slug);

  it(`scores a filled-in template as boilerplate (phrases in ${TEMPLATE_DF}+ articles)`, () => {
    expect(TOPICS.length).toBeGreaterThanOrEqual(TEMPLATE_DF);
    expect(tpl.templateRatio).toBeGreaterThan(0.9);
    expect(tpl.uniqueRatio).toBe(0);
    expect(tpl.simSameCategory.max).toBe(1);
    expect(tpl.unsourcedClaims).toBe(1);
  });

  it('scores an original article as original, with its sources and links counted', () => {
    expect(orig.uniqueRatio).toBe(1);
    expect(orig.templateRatio).toBe(0);
    expect(orig.simAny.max).toBe(0);
    expect(orig.externalLinks).toBe(1);
    expect(orig.internalLinks).toBe(1);
    expect(orig.codeBlocks).toBe(1);
    expect(orig.authorIsTeam).toBe(false);
  });

  it('finds the repeated intro, conclusion and outline', () => {
    const r = repetitionReport(corpus, audits);
    expect(r.intros.articles).toBe(TOPICS.length);
    expect(r.conclusions.top[0].count).toBe(TOPICS.length);
    expect(r.outlines.repeated).toBe(1);
  });

  it('groups keyword-swapped articles and never proposes merging different topics', () => {
    const clusters = clusterArticles(corpus, audits);
    const topicSlugs = TOPICS.map(slugOf);
    // Word-for-word copies (raw similarity ≥ 0.95): the shorter titles here.
    const swapped = clusters.find((c) => c.kind === 'keyword-swapped')!;
    expect(swapped.members.length).toBeGreaterThan(1);
    expect(swapped.members.every((m) => topicSlugs.includes(m))).toBe(true);
    expect(swapped.action).toBe('DEEP REWRITE');
    // The template family catches every one of them, whatever the title length.
    const family = clusters.find((c) => c.kind === 'template-family')!;
    expect([...family.members].sort()).toEqual([...topicSlugs].sort());
    expect(family.action).toBe('DEEP REWRITE');
    expect(clusters.some((c) => c.members.includes(original.slug))).toBe(false);
    expect(clusters.some((c) => c.action === 'MERGE')).toBe(false);
  });

  it('treats the same article under two URLs as an exact duplicate', () => {
    const copy = { ...templated(TOPICS[0]), id: 'copy', slug: `${slugOf(TOPICS[0])}-2` };
    const c2 = buildCorpus([...corpusPosts, copy]);
    const clusters = clusterArticles(c2, auditArticles(c2));
    const exact = clusters.find((c) => c.kind === 'exact-duplicate')!;
    expect(exact.members.sort()).toEqual([slugOf(TOPICS[0]), `${slugOf(TOPICS[0])}-2`].sort());
    expect(exact.action).toBe('REDIRECT');
  });
});

describe('classification', () => {
  const base = (over: Partial<ArticleAudit>): ArticleAudit =>
    ({ slug: 'x', path: '/blog/x', kind: 'guide', title: 'X', uniqueRatio: 0, templateRatio: 1, commercialConflict: '', sourceAvailability: 'official-docs', promoted: '', ...over }) as ArticleAudit;

  it('keeps a Phase 1 redirect as a redirect', () => {
    const c = classify(base({ slug: 'mlops-interview-questions-and-answers-2', path: '/blog/mlops-interview-questions-and-answers-2' }), []);
    expect(c.action).toBe('REDIRECT');
    expect(c.target).toBe('mlops-interview-questions-and-answers');
  });

  it('carries Phase 3 ownership decisions', () => {
    const rewrite = classify(base({ slug: 'python-interview-questions-for-data-roles', path: '/blog/python-interview-questions-for-data-roles' }), []);
    expect(rewrite.action).toBe('DEEP REWRITE');
    expect(rewrite.target).toBe('/blog/python-interview-questions-top-50-with-answers');
    const merge = classify(base({ slug: 'power-bi-interview-questions-with-detailed-answers', path: '/blog/power-bi-interview-questions-with-detailed-answers' }), []);
    expect(merge.action).toBe('MERGE');
    // A page Search Console shows earning clicks is never merged away.
    expect(classify(base({ slug: 'power-bi-interview-questions-with-detailed-answers', path: '/blog/power-bi-interview-questions-with-detailed-answers' }), [], 'A').action).not.toBe('MERGE');
  });

  it('sends unsourced salary pages and commercial conflicts to a person', () => {
    expect(classify(base({ kind: 'salary' }), []).action).toBe('MANUAL REVIEW');
    expect(classify(base({ commercialConflict: 'title uses course wording' }), []).action).toBe('MANUAL REVIEW');
  });

  it('grades by originality, and never de-indexes on similarity alone', () => {
    expect(classify(base({ uniqueRatio: 0.8, templateRatio: 0.1 }), []).action).toBe('KEEP');
    expect(classify(base({ uniqueRatio: 0.4, templateRatio: 0.5 }), []).action).toBe('IMPROVE');
    const weak = classify(base({}), []);
    expect(weak.action).toBe('DEEP REWRITE');
    for (const g of ['unknown', 'A', 'B', 'C', 'D'] as const) expect(classify(base({}), [], g).action).not.toBe('NOINDEX');
  });

  it('ranks promoted, pillar and well-sourced articles first, and Search Console above all', () => {
    const c = classify(base({}), []);
    const plainGuide = rewritePriority(base({ sourceAvailability: 'none-identified' }), c);
    expect(rewritePriority(base({ promoted: 'featured' }), c)).toBeGreaterThan(plainGuide);
    expect(rewritePriority(base({ kind: 'roadmap' }), c)).toBeGreaterThan(rewritePriority(base({}), c));
    expect(rewritePriority(base({}), c, 'A')).toBeGreaterThan(rewritePriority(base({ promoted: 'featured', kind: 'roadmap' }), c));
    expect(rewritePriority(base({}), { action: 'MERGE', reason: '', gate: '' })).toBe(0);
  });
});

describe('Search Console', () => {
  const csv = '﻿Top pages,Clicks,Impressions,CTR,Position\nhttps://glorytecks.com/blog/a,12,400,3%,8.1\nhttps://glorytecks.com/blog/b,0,"1,200",0%,31\nhttps://glorytecks.com/blog/c,0,0,0%,0\n';
  const rows = parseGscCsv(csv);

  it('parses a Pages export by header name', () => {
    expect(rows.get('/blog/a')).toEqual({ path: '/blog/a', clicks: 12, impressions: 400, position: 8.1 });
    expect(rows.get('/blog/b')?.impressions).toBe(1200);
    expect(() => parseGscCsv('Foo,Bar\n1,2')).toThrow(/Page, Clicks and Impressions/);
  });

  it('classifies A/B/C/D, and says unknown when there is no export', () => {
    expect(gscClass(rows.get('/blog/a'), true)).toBe('A');
    expect(gscClass(rows.get('/blog/b'), true)).toBe('B');
    expect(gscClass(rows.get('/blog/c'), true)).toBe('C');
    expect(gscClass(undefined, true)).toBe('D');
    expect(gscClass(undefined, false)).toBe('unknown');
  });
});

describe('per-article planning', () => {
  it('finds the primary source a rewrite can cite', () => {
    expect(sourceFor({ title: 'Amazon S3 Explained: Storage Classes', tags: [], category: 'AWS', kind: 'guide' }).source?.url).toBe('https://docs.aws.amazon.com/AmazonS3/latest/userguide/');
    expect(sourceFor({ title: 'Power BI Bookmarks and Buttons', tags: [], category: 'Power BI', kind: 'guide' }).source?.name).toMatch(/Power BI/);
    expect(sourceFor({ title: 'Data Engineer Salary in Hyderabad', tags: [], category: 'Data Engineering', kind: 'salary' }).availability).toBe('market-data');
    expect(sourceFor({ title: 'Imposter Syndrome in Tech', tags: [], category: 'Career Guidance', kind: 'guide' }).availability).toBe('none-identified');
  });

  it('plans a useful image, or none', () => {
    const p = { title: 'Python Interview Questions', kind: 'interview', category_slug: 'python' };
    expect(imagePlan(p, 'interview').needed).toBe(false);
    expect(imagePlan({ title: 'Power BI vs Tableau', kind: 'comparison', category_slug: 'power-bi' }, 'comparison').type).toBe('comparison diagram');
    expect(imagePlan({ title: 'Power BI Bookmarks and Buttons', kind: 'guide', category_slug: 'power-bi' }, 'tutorial').type).toBe('annotated screenshot');
    expect(imagePlan({ title: 'Data Scientist Salary', kind: 'salary', category_slug: 'data-science' }, 'salary').needed).toBe(false);
  });

  it('states the question an article answers', () => {
    const cmp = templated('Power BI vs Tableau: Which to Learn', { kind: 'comparison', category: 'Power BI', category_slug: 'power-bi' });
    const c = buildCorpus([cmp]);
    const [a] = auditArticles(c);
    const prof = intentProfile(cmp, a, [], [{ slug: 'power-bi', name: 'Power BI', course_slug: 'power-bi' }]);
    expect(prof.intent).toBe('comparison');
    expect(prof.primaryQuestion).toMatch(/power bi or tableau|tableau or power bi/i);
    expect(prof.uniquePurpose).toContain('/courses/power-bi');
    expect(subjectPhrase('AWS Roadmap 2026 for Data Engineers')).toBe('AWS for Data Engineers');
    expect(subjectPhrase('Airflow Interview Questions for Data Engineers')).toBe('Airflow for Data Engineers');
  });

  it('passes a genuine rewrite and fails a paraphrased template', () => {
    const corpus = buildCorpus(corpusPosts);
    const target = corpusPosts[0];
    const known = new Set(['/blog/bootstrapping-confidence-intervals', '/courses/data-science']);
    const sentence = (i: number) =>
      `Feature scaling step ${i} rescales each numeric column so that distance-based models such as k-nearest neighbours weigh features comparably, and the scaler must be fitted on training rows only.`;
    const rewrite: Block[] = [
      ...Array.from({ length: 30 }, (_, i) => ({ type: 'paragraph' as const, text: `${sentence(i)} Variant ${i} discusses case ${i * 7} in detail.` })),
      { type: 'paragraph', text: 'See [scikit-learn preprocessing](https://scikit-learn.org/stable/modules/preprocessing.html) and [StandardScaler](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.StandardScaler.html).' },
      { type: 'paragraph', text: 'Related: [bootstrapping](/blog/bootstrapping-confidence-intervals) and the [course](/courses/data-science).' },
    ];
    const ok = checkRewrite(corpus, target, rewrite, known);
    expect(ok.failures).toEqual([]);
    expect(ok.similarityToOriginal).toBeLessThan(0.05);

    // The original template with the words shuffled a little is still the template.
    const paraphrase = checkRewrite(corpus, target, [...target.content, { type: 'paragraph', text: 'See [x](/blog/nowhere) and [y](/courses/data-science).' }], known);
    expect(paraphrase.failures.join()).toMatch(/similarity to original/);
    expect(paraphrase.failures.join()).toMatch(/template sentence/);
    expect(paraphrase.brokenLinks).toEqual(['/blog/nowhere']);
  });

  it('writes CSV that survives commas, quotes and newlines', () => {
    expect(toCsv([{ a: 'x, y', b: 'say "hi"', c: 0.12345 }])).toBe('a,b,c\n"x, y","say ""hi""",0.123\n');
  });
});
