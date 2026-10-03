// ─────────────────────────────────────────────────────────────────────────────
// Blog content quality audit (Phase 4, docs/BLOG_CONTENT_QUALITY_REPORT.md).
//
// Measures every article in a CMS backup (backend/src/scripts/blog-backup.ts):
// size and structure, how much of the body is shared boilerplate, how similar
// each article is to its neighbours, which articles answer the same question,
// what is repeated verbatim across the corpus, and what each article is for.
// Then it classifies each article and plans the rewrite queue.
//
// The similarity measure is built for this corpus. The articles were produced
// from templates, with the title and category name substituted into the same
// sentences. Comparing raw text understates that. So each article's own title
// and category name are replaced by placeholders first ("TTL is one of the
// topics learners ask about most when they start with CAT"). A keyword-swapped
// copy then scores as the duplicate it is.
//
// Nothing here decides to delete, redirect or de-index a page on similarity
// alone. Those actions need Search Console evidence (`gscClass`), and the
// classifier says so instead of guessing.
//
// Pure: backup rows in, findings out. Used by quality.test.ts (fixtures) and
// quality.export.test.ts (the real backup, opt-in).
// ─────────────────────────────────────────────────────────────────────────────

import type { Block } from '@/types/content';
import { REVIEWED_OVERLAPS, type OwnershipDecision } from '@/lib/seo/ownership';
import { MERGED_ARTICLES } from '@/lib/blog/merged';
import {
  comparisonKey,
  findOverlaps,
  overlapClusters,
  searchIntentOf,
  stripBrand,
  subjectTokens,
  targetsCourseIntent,
  jaccard,
  type IntentPage,
  type SearchIntent,
} from '@/lib/seo/intent';

/* ── Input ────────────────────────────────────────────────────────────────── */

/** One `blogs` row, as blog-backup.ts writes it (snake_case columns). */
export interface BackupPost {
  id: string;
  slug: string;
  title: string;
  category: string;
  category_slug: string;
  kind: string;
  excerpt?: string | null;
  status: string;
  tags?: string[] | null;
  author_key?: string | null;
  featured_image?: string | null;
  date?: string | null;
  updated?: string | null;
  content: Block[];
  seo_meta_title?: string | null;
  seo_meta_description?: string | null;
  seo_noindex?: boolean | null;
  /** Editor flags the site uses to pick sitewide sidebar and homepage articles. */
  featured?: boolean | null;
  trending?: boolean | null;
  popular?: boolean | null;
}

export interface BackupCategory {
  slug: string;
  name: string;
  course_slug?: string | null;
}

export interface BackupAuthor {
  key: string;
  name: string;
  role?: string | null;
  bio?: string | null;
  avatar?: string | null;
  /** No author profile pages exist today; kept so the check reads a real field when one is added. */
  url?: string | null;
}

/* ── Tunables (documented in the report) ──────────────────────────────────── */

/** Words per shingle. Five is long enough that a match is a shared phrase, not shared vocabulary. */
export const SHINGLE_SIZE = 5;
/** A shingle found in this many articles or more is boilerplate. */
export const TEMPLATE_DF = 10;
/** Normalised similarity at which two articles are near-duplicates of each other. */
export const NEAR_DUPLICATE = 0.8;
/** Normalised similarity at which two articles share one body template. */
export const TEMPLATE_FAMILY = 0.5;
/** Raw similarity (no placeholders) at which two articles are the same text. */
export const EXACT_DUPLICATE = 0.95;

/* ── Text extraction ──────────────────────────────────────────────────────── */

export interface InlineLink {
  text: string;
  url: string;
}

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

export function inlineLinks(text: string): InlineLink[] {
  return [...text.matchAll(LINK)].map((m) => ({ text: m[1], url: m[2] }));
}

/** Markdown-lite (bold, code, links) to plain text — the renderer's inline syntax. */
export function plain(text: string): string {
  return text
    .replace(LINK, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The prose of an article as separate units: one per paragraph, list item,
 * table row, callout, quote, FAQ answer. Headings are kept apart (`headings`),
 * code apart (`code`), so neither inflates the word count.
 */
export interface Prose {
  units: string[];
  /** `units` before inline markup is stripped, index for index. */
  rawUnits: string[];
  headings: string[];
  code: string[];
  faq: { q: string; a: string }[];
  /** Every link written in the body (not the page chrome). */
  links: InlineLink[];
}

export function proseOf(blocks: readonly Block[]): Prose {
  const out: Prose = { units: [], rawUnits: [], headings: [], code: [], faq: [], links: [] };
  const take = (raw: string | undefined) => {
    if (!raw) return;
    out.links.push(...inlineLinks(raw));
    const t = plain(raw);
    if (!t) return;
    out.units.push(t);
    out.rawUnits.push(raw);
  };
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
      case 'subheading':
        out.headings.push(plain(b.text));
        break;
      case 'paragraph':
        take(b.text);
        break;
      case 'list':
        b.items.forEach(take);
        break;
      case 'table':
        for (const row of b.rows) take(row.join(' · '));
        break;
      case 'callout':
        take([b.title, b.text].filter(Boolean).join('. '));
        break;
      case 'quote':
        take(b.text);
        break;
      case 'code':
        out.code.push(b.code);
        break;
      case 'faq':
        for (const item of b.items) {
          out.faq.push({ q: plain(item.q), a: plain(item.a) });
          take(item.a);
        }
        break;
      case 'image':
        break;
    }
  }
  return out;
}

export const wordCount = (s: string): number => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’+#.-]*/gu) ?? []).length;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Lower-case tokens with the article's own title, title head (before the
 * colon) and category name replaced by placeholders, so a sentence that only
 * differs by the substituted topic compares equal.
 */
export function templateTokens(text: string, post: Pick<BackupPost, 'title' | 'category'>): string[] {
  let s = plain(text).toLowerCase();
  const title = plain(post.title).toLowerCase();
  const head = title.split(':')[0].trim();
  const subs: [string, string][] = [
    [title, ' ttl '],
    [head, ' ttl '],
    [plain(post.category).toLowerCase(), ' cat '],
  ];
  for (const [from, to] of subs) if (from.length > 2) s = s.replace(new RegExp(escapeRe(from), 'g'), to);
  return s.split(/[^\p{L}\p{N}+#]+/u).filter(Boolean);
}

/** Plain lower-case tokens, nothing substituted. */
export const rawTokens = (text: string): string[] => plain(text).toLowerCase().split(/[^\p{L}\p{N}+#]+/u).filter(Boolean);

/** FNV-1a, 32-bit. Shingles are compared as numbers; collisions at this scale are negligible. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Word k-shingles of each unit (never spanning two blocks), as a sorted, de-duplicated array. */
export function shingleSet(units: readonly string[][], k = SHINGLE_SIZE): Uint32Array {
  const set = new Set<number>();
  for (const tokens of units) {
    if (tokens.length < k) {
      if (tokens.length >= 3) set.add(hash(tokens.join(' ')));
      continue;
    }
    for (let i = 0; i + k <= tokens.length; i++) set.add(hash(tokens.slice(i, i + k).join(' ')));
  }
  return Uint32Array.from(set).sort();
}

/** Jaccard similarity of two sorted shingle arrays. */
export function jaccardSorted(a: Uint32Array, b: Uint32Array): number {
  if (a.length === 0 && b.length === 0) return 0;
  let i = 0;
  let j = 0;
  let inter = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      inter++;
      i++;
      j++;
    } else if (a[i] < b[j]) i++;
    else j++;
  }
  return inter / (a.length + b.length - inter);
}

/* ── Claims, sources and evidence ─────────────────────────────────────────── */

/**
 * Official documentation for the technologies the blog covers. "Source
 * available" means a primary, vendor- or project-maintained reference exists
 * that a rewrite can cite; it does not mean the article cites it (none do).
 * First match wins, so specific products come before their platforms.
 */
export const OFFICIAL_SOURCES: readonly { match: RegExp; name: string; url: string }[] = [
  { match: /\bpower query\b|\bm language\b/, name: 'Power Query documentation (Microsoft Learn)', url: 'https://learn.microsoft.com/en-us/power-query/' },
  { match: /\bdax\b/, name: 'DAX reference (Microsoft Learn)', url: 'https://learn.microsoft.com/en-us/dax/' },
  { match: /\bpower bi\b/, name: 'Power BI documentation (Microsoft Learn)', url: 'https://learn.microsoft.com/en-us/power-bi/' },
  { match: /\bazure data factory\b|\badf\b/, name: 'Azure Data Factory documentation (Microsoft Learn)', url: 'https://learn.microsoft.com/en-us/azure/data-factory/' },
  { match: /\bsynapse\b/, name: 'Azure Synapse Analytics documentation', url: 'https://learn.microsoft.com/en-us/azure/synapse-analytics/' },
  { match: /\bdatabricks\b|\bdelta lake\b|\bunity catalog\b/, name: 'Databricks documentation', url: 'https://docs.databricks.com/' },
  { match: /\bsql server\b|\bt-sql\b|\bssis\b/, name: 'SQL Server documentation (Microsoft Learn)', url: 'https://learn.microsoft.com/en-us/sql/' },
  { match: /\bbigquery\b/, name: 'BigQuery documentation', url: 'https://cloud.google.com/bigquery/docs' },
  { match: /\bdataflow\b|\bapache beam\b/, name: 'Dataflow documentation', url: 'https://cloud.google.com/dataflow/docs' },
  { match: /\bpub\/?sub\b/, name: 'Pub/Sub documentation', url: 'https://cloud.google.com/pubsub/docs' },
  { match: /\bvertex\b/, name: 'Vertex AI documentation', url: 'https://cloud.google.com/vertex-ai/docs' },
  { match: /\bcloud composer\b/, name: 'Cloud Composer documentation', url: 'https://cloud.google.com/composer/docs' },
  { match: /\bgcp\b|\bgoogle cloud\b|\bdataproc\b|\blooker\b/, name: 'Google Cloud documentation', url: 'https://cloud.google.com/docs' },
  { match: /\bs3\b/, name: 'Amazon S3 User Guide', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/' },
  { match: /\bglue\b/, name: 'AWS Glue Developer Guide', url: 'https://docs.aws.amazon.com/glue/latest/dg/' },
  { match: /\bredshift\b/, name: 'Amazon Redshift documentation', url: 'https://docs.aws.amazon.com/redshift/' },
  { match: /\bsagemaker\b/, name: 'Amazon SageMaker documentation', url: 'https://docs.aws.amazon.com/sagemaker/' },
  { match: /\baws\b|\blambda\b|\bathena\b|\bkinesis\b|\bemr\b/, name: 'AWS documentation', url: 'https://docs.aws.amazon.com/' },
  { match: /\bsnowflake\b/, name: 'Snowflake documentation', url: 'https://docs.snowflake.com/' },
  { match: /\bdbt\b/, name: 'dbt documentation', url: 'https://docs.getdbt.com/' },
  { match: /\bairflow\b/, name: 'Apache Airflow documentation', url: 'https://airflow.apache.org/docs/' },
  { match: /\bkafka\b/, name: 'Apache Kafka documentation', url: 'https://kafka.apache.org/documentation/' },
  { match: /\bspark\b|\bpyspark\b/, name: 'Apache Spark documentation', url: 'https://spark.apache.org/docs/latest/' },
  { match: /\bmlflow\b/, name: 'MLflow documentation', url: 'https://mlflow.org/docs/latest/' },
  { match: /\bkubernetes\b|\bk8s\b|\bkubeflow\b/, name: 'Kubernetes documentation', url: 'https://kubernetes.io/docs/' },
  { match: /\bdocker\b|\bcontaineri[sz]/, name: 'Docker documentation', url: 'https://docs.docker.com/' },
  { match: /\blanggraph\b/, name: 'LangGraph documentation', url: 'https://langchain-ai.github.io/langgraph/' },
  { match: /\blangchain\b/, name: 'LangChain documentation', url: 'https://python.langchain.com/docs/' },
  { match: /\bhugging ?face\b|\btransformers\b/, name: 'Hugging Face documentation', url: 'https://huggingface.co/docs' },
  { match: /\bopenai\b|\bgpt\b/, name: 'OpenAI platform documentation', url: 'https://platform.openai.com/docs' },
  { match: /\bpytorch\b/, name: 'PyTorch documentation', url: 'https://pytorch.org/docs/stable/' },
  { match: /\btensorflow\b|\bkeras\b/, name: 'TensorFlow documentation', url: 'https://www.tensorflow.org/api_docs' },
  { match: /\bscikit-learn\b|\bsklearn\b/, name: 'scikit-learn user guide', url: 'https://scikit-learn.org/stable/user_guide.html' },
  { match: /\bpandas\b/, name: 'pandas documentation', url: 'https://pandas.pydata.org/docs/' },
  { match: /\bnumpy\b/, name: 'NumPy documentation', url: 'https://numpy.org/doc/stable/' },
  { match: /\btableau\b/, name: 'Tableau help', url: 'https://help.tableau.com/' },
  { match: /\bexcel\b/, name: 'Microsoft Excel help', url: 'https://support.microsoft.com/en-us/excel' },
  { match: /\bgit\b|\bgithub\b/, name: 'Git documentation', url: 'https://git-scm.com/doc' },
  { match: /\bpostgres(ql)?\b/, name: 'PostgreSQL documentation', url: 'https://www.postgresql.org/docs/current/' },
  { match: /\bsql\b|\bwindow functions?\b/, name: 'PostgreSQL documentation (SQL reference)', url: 'https://www.postgresql.org/docs/current/' },
  { match: /\bpython\b/, name: 'Python documentation', url: 'https://docs.python.org/3/' },
];

export type SourceAvailability = 'official-docs' | 'market-data' | 'none-identified';

/** Where a rewrite of this article could get primary sources. Title first, then tags, then category. */
export function sourceFor(post: Pick<BackupPost, 'title' | 'tags' | 'category' | 'kind'>): {
  availability: SourceAvailability;
  source?: { name: string; url: string };
} {
  // Salary, roadmap and career articles make claims about a job market. No
  // vendor documents that; the sources are salary surveys and job boards.
  if (post.kind === 'salary') return { availability: 'market-data' };
  for (const text of [post.title, (post.tags ?? []).join(' '), post.category]) {
    const t = ` ${text.toLowerCase()} `;
    const hit = OFFICIAL_SOURCES.find((s) => s.match.test(t));
    if (hit) return { availability: 'official-docs', source: { name: hit.name, url: hit.url } };
  }
  if (post.kind === 'roadmap' || post.kind === 'certification') return { availability: 'market-data' };
  return { availability: 'none-identified' };
}

/** Salary figures, percentages and market-demand assertions — claims a reader cannot check without a source. */
const MARKET_CLAIM = /₹\s?\d|\b\d+(\.\d+)?\s?(lpa|lakhs?|crore)\b|\b\d+(\.\d+)?\s?%|\bin (active |strong |high )?demand\b|\bhighest[- ]paying\b|\bfastest[- ]growing\b/i;

/** A claim of the author's own experience ("we've seen", "our students", "in my experience"). */
const FIRST_PERSON = /\b(we['’]ve|we have|we see|we saw|our (students|learners|trainees|mentors|trainers|team|graduates|placement)|in (our|my) experience|i['’]ve|i have seen|i recommend)\b/i;

export const isInternalUrl = (url: string): boolean => url.startsWith('/') || /^https?:\/\/(www\.)?glorytecks\.com(\/|$)/i.test(url);

/* ── Per-article audit ────────────────────────────────────────────────────── */

export interface Similarity {
  max: number;
  mean: number;
  nearest: string | null;
}

export interface ArticleAudit {
  id: string;
  slug: string;
  path: string;
  title: string;
  category: string;
  categorySlug: string;
  kind: string;
  intent: SearchIntent;
  topic: string;
  author: string;
  authorIsTeam: boolean;
  authorUrl: string | null;
  /** The strongest editor flag (featured > trending > popular): these articles are linked sitewide. */
  promoted: 'featured' | 'trending' | 'popular' | '';
  date: string;
  updated: string;
  words: number;
  headings: number;
  paragraphs: number;
  lists: number;
  tables: number;
  codeBlocks: number;
  callouts: number;
  faqItems: number;
  images: number;
  featuredImage: boolean;
  internalLinks: number;
  externalLinks: number;
  authoritativeLinks: number;
  /** Code blocks plus sentences that give an example. */
  examples: number;
  /** Ordered lists, code or tables: something a reader can follow or run. */
  practical: boolean;
  /** Screenshots, repositories, outputs — artefacts showing the work was done. */
  firstHandEvidence: number;
  /** Sentences claiming the author's own experience. */
  firstPersonClaims: number;
  /** Salary figures, percentages and demand claims with no link in the same block. */
  unsourcedClaims: number;
  shingles: number;
  /** Share of the article's phrases found in no other article. */
  uniqueRatio: number;
  /** Share of the article's phrases found in TEMPLATE_DF or more articles. */
  templateRatio: number;
  simSameCategory: Similarity;
  simSameIntent: Similarity;
  simAny: Similarity;
  /** Highest raw-text similarity (no placeholders) to any template neighbour: 1.0 means the same text. */
  rawMax: number;
  commercialConflict: string;
  sourceAvailability: SourceAvailability;
  officialSource: string;
  metaDescriptionLength: number;
  /** Fingerprints for the repetition report. */
  introKey: string;
  conclusionKey: string;
  outlineKey: string;
}

const EXAMPLE = /\bfor example\b|\bfor instance\b|\be\.g\.|\bsuppose\b|\bimagine\b|\bhere['’]s (a|an) (small|simple|quick)?\s?example\b/i;

const normKey = (tokens: string[]) => tokens.join(' ');

function simStats(scores: { slug: string; s: number }[]): Similarity {
  if (scores.length === 0) return { max: 0, mean: 0, nearest: null };
  let best = scores[0];
  let sum = 0;
  for (const x of scores) {
    sum += x.s;
    if (x.s > best.s) best = x;
  }
  return { max: best.s, mean: sum / scores.length, nearest: best.slug };
}

export interface Corpus {
  posts: BackupPost[];
  prose: Map<string, Prose>;
  /** Normalised (placeholder) shingles per slug. */
  norm: Map<string, Uint32Array>;
  /** Raw shingles per slug. */
  raw: Map<string, Uint32Array>;
  /** Normalised shingle → number of articles containing it. */
  df: Map<number, number>;
  intents: Map<string, SearchIntent>;
  /** Pairwise normalised similarity, upper triangle, indexed by `pairIndex` over `posts`. */
  pair: Float32Array;
}

const pairIndex = (n: number, i: number, j: number) => (i < j ? i * n - (i * (i + 1)) / 2 + (j - i - 1) : j * n - (j * (j + 1)) / 2 + (i - j - 1));

export function buildCorpus(posts: readonly BackupPost[]): Corpus {
  const list = [...posts].sort((a, b) => a.slug.localeCompare(b.slug));
  const prose = new Map<string, Prose>();
  const norm = new Map<string, Uint32Array>();
  const raw = new Map<string, Uint32Array>();
  const df = new Map<number, number>();
  const intents = new Map<string, SearchIntent>();
  for (const p of list) {
    const pr = proseOf(p.content ?? []);
    prose.set(p.slug, pr);
    const units = [...pr.units, ...pr.headings];
    const n = shingleSet(units.map((u) => templateTokens(u, p)));
    norm.set(p.slug, n);
    raw.set(p.slug, shingleSet(units.map(rawTokens)));
    for (const h of n) df.set(h, (df.get(h) ?? 0) + 1);
    intents.set(p.slug, searchIntentOf(asIntentPage(p)));
  }
  const n = list.length;
  const pair = new Float32Array((n * (n - 1)) / 2);
  for (let i = 0; i < n; i++) {
    const a = norm.get(list[i].slug)!;
    for (let j = i + 1; j < n; j++) pair[pairIndex(n, i, j)] = jaccardSorted(a, norm.get(list[j].slug)!);
  }
  return { posts: list, prose, norm, raw, df, intents, pair };
}

export const similarity = (c: Corpus, i: number, j: number): number => (i === j ? 1 : c.pair[pairIndex(c.posts.length, i, j)]);

export const articlePath = (slug: string) => `/blog/${slug}`;

export function asIntentPage(p: Pick<BackupPost, 'slug' | 'title' | 'kind' | 'category_slug' | 'seo_meta_description'>): IntentPage {
  return {
    path: articlePath(p.slug),
    type: 'article',
    title: p.title,
    h1: p.title,
    description: p.seo_meta_description ?? undefined,
    kind: p.kind,
    category: p.category_slug,
  };
}

export function auditArticles(corpus: Corpus, authors: readonly BackupAuthor[] = []): ArticleAudit[] {
  const byKey = new Map(authors.map((a) => [a.key, a]));
  const { posts } = corpus;
  return posts.map((p, i) => {
    const pr = corpus.prose.get(p.slug)!;
    const shingles = corpus.norm.get(p.slug)!;
    let unique = 0;
    let template = 0;
    for (const h of shingles) {
      const d = corpus.df.get(h) ?? 0;
      if (d <= 1) unique++;
      if (d >= TEMPLATE_DF) template++;
    }
    const sameCat: { slug: string; s: number }[] = [];
    const sameIntent: { slug: string; s: number }[] = [];
    const any: { slug: string; s: number }[] = [];
    let rawMax = 0;
    const rawA = corpus.raw.get(p.slug)!;
    for (let j = 0; j < posts.length; j++) {
      if (j === i) continue;
      const q = posts[j];
      const s = similarity(corpus, i, j);
      any.push({ slug: q.slug, s });
      if (q.category_slug === p.category_slug) sameCat.push({ slug: q.slug, s });
      if (corpus.intents.get(q.slug) === corpus.intents.get(p.slug)) sameIntent.push({ slug: q.slug, s });
      if (s >= TEMPLATE_FAMILY) rawMax = Math.max(rawMax, jaccardSorted(rawA, corpus.raw.get(q.slug)!));
    }
    const blocks = p.content ?? [];
    const count = (t: Block['type']) => blocks.filter((b) => b.type === t).length;
    const external = pr.links.filter((l) => !isInternalUrl(l.url));
    const authoritative = external.filter((l) => OFFICIAL_SOURCES.some((s) => l.url.startsWith(new URL(s.url).origin)));
    const units = pr.units;
    const words = units.reduce((n, u) => n + wordCount(u), 0);
    const src = sourceFor(p);
    const author = byKey.get(p.author_key ?? '');
    const paragraphTexts = blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.text);
    const conclusionAt = blocks.findIndex((b) => b.type === 'heading' && /conclusion|final thoughts|wrapping up|summary/i.test(b.text));
    const conclusion = conclusionAt >= 0 ? blocks.slice(conclusionAt + 1).find((b) => b.type === 'paragraph') : undefined;
    return {
      id: p.id,
      slug: p.slug,
      path: articlePath(p.slug),
      title: p.title,
      category: p.category,
      categorySlug: p.category_slug,
      kind: p.kind,
      intent: corpus.intents.get(p.slug)!,
      topic: subjectTokens(p.title).join(' '),
      author: author?.name ?? p.author_key ?? '',
      authorIsTeam: !author || /team|faculty/i.test(author.name),
      authorUrl: author?.url ?? null,
      promoted: p.featured ? 'featured' : p.trending ? 'trending' : p.popular ? 'popular' : '',
      date: p.date ?? '',
      updated: p.updated ?? '',
      words,
      headings: count('heading') + count('subheading'),
      paragraphs: count('paragraph'),
      lists: count('list'),
      tables: count('table'),
      codeBlocks: count('code'),
      callouts: count('callout'),
      faqItems: pr.faq.length,
      images: count('image'),
      featuredImage: Boolean(p.featured_image),
      internalLinks: pr.links.length - external.length,
      externalLinks: external.length,
      authoritativeLinks: authoritative.length,
      examples: count('code') + units.filter((u) => EXAMPLE.test(u)).length,
      practical: blocks.some((b) => (b.type === 'list' && b.ordered) || b.type === 'code' || b.type === 'table'),
      firstHandEvidence: count('image') + pr.links.filter((l) => /github\.com|kaggle\.com|colab\.research/.test(l.url)).length,
      firstPersonClaims: units.filter((u) => FIRST_PERSON.test(u)).length,
      unsourcedClaims: pr.rawUnits.filter((u) => MARKET_CLAIM.test(u) && inlineLinks(u).length === 0).length,
      shingles: shingles.length,
      uniqueRatio: shingles.length ? unique / shingles.length : 0,
      templateRatio: shingles.length ? template / shingles.length : 0,
      simSameCategory: simStats(sameCat),
      simSameIntent: simStats(sameIntent),
      simAny: simStats(any),
      rawMax,
      commercialConflict: targetsCourseIntent(p.title) ? `title uses course wording ("${stripBrand(p.title)}")` : '',
      sourceAvailability: src.availability,
      officialSource: src.source ? `${src.source.name} <${src.source.url}>` : '',
      metaDescriptionLength: (p.seo_meta_description ?? '').length,
      introKey: paragraphTexts[0] ? normKey(templateTokens(paragraphTexts[0], p)) : '',
      conclusionKey: conclusion && conclusion.type === 'paragraph' ? normKey(templateTokens(conclusion.text, p)) : '',
      outlineKey: pr.headings.map((h) => normKey(templateTokens(h, p))).join(' | '),
    };
  });
}

/* ── Repetition ───────────────────────────────────────────────────────────── */

export interface Repetition {
  /** Distinct values that occur in two or more articles. */
  repeated: number;
  /** Articles whose value is shared with at least one other article. */
  articles: number;
  /** Most common values, most frequent first. */
  top: { value: string; count: number }[];
}

export function repetition(values: readonly (readonly string[])[], top = 5): Repetition {
  const count = new Map<string, number>();
  const per = values.map((vs) => [...new Set(vs.filter(Boolean))]);
  for (const vs of per) for (const v of vs) count.set(v, (count.get(v) ?? 0) + 1);
  const shared = new Set([...count].filter(([, n]) => n > 1).map(([v]) => v));
  return {
    repeated: shared.size,
    articles: per.filter((vs) => vs.some((v) => shared.has(v))).length,
    top: [...count]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, top)
      .map(([value, n]) => ({ value, count: n })),
  };
}

export interface RepetitionReport {
  intros: Repetition;
  conclusions: Repetition;
  outlines: Repetition;
  headings: Repetition;
  faqAnswers: Repetition;
  faqQuestions: Repetition;
  codeExamples: Repetition;
  /** Template sentences: normalised prose units found in TEMPLATE_DF+ articles. */
  sentences: Repetition;
}

export function repetitionReport(corpus: Corpus, audits: readonly ArticleAudit[]): RepetitionReport {
  const by = (f: (p: BackupPost, pr: Prose) => string[]) => corpus.posts.map((p) => f(p, corpus.prose.get(p.slug)!));
  const t = (p: BackupPost) => (s: string) => normKey(templateTokens(s, p));
  const sentences = by((p, pr) => pr.units.flatMap((u) => u.split(/(?<=[.!?])\s+/)).map(t(p)).filter((s) => s.split(' ').length >= 6));
  const sentenceRep = repetition(sentences, 10);
  const templateSentences = new Set(
    (() => {
      const c = new Map<string, number>();
      for (const vs of sentences) for (const v of new Set(vs)) c.set(v, (c.get(v) ?? 0) + 1);
      return [...c].filter(([, n]) => n >= TEMPLATE_DF).map(([v]) => v);
    })(),
  );
  return {
    intros: repetition(audits.map((a) => [a.introKey])),
    conclusions: repetition(audits.map((a) => [a.conclusionKey])),
    outlines: repetition(audits.map((a) => [a.outlineKey])),
    headings: repetition(by((p, pr) => pr.headings.map(t(p))), 10),
    faqAnswers: repetition(by((p, pr) => pr.faq.map((f) => t(p)(f.a))), 5),
    faqQuestions: repetition(by((p, pr) => pr.faq.map((f) => t(p)(f.q))), 5),
    codeExamples: repetition(by((p, pr) => pr.code.map((c) => c.replace(/\s+/g, ' ').trim())), 5),
    sentences: { ...sentenceRep, repeated: templateSentences.size },
  };
}

/* ── Clusters ─────────────────────────────────────────────────────────────── */

export type ClusterAction = 'KEEP' | 'DEEP REWRITE' | 'MERGE' | 'REDIRECT' | 'NOINDEX' | 'MANUAL REVIEW';

export type ClusterKind =
  /** The same article (same topic, same text) published at two URLs. */
  | 'exact-duplicate'
  /** Different topics, word-for-word the same body: only the topic name differs. */
  | 'keyword-swapped'
  /** Different topics sharing one body template, allowing for small variations. */
  | 'template-family'
  /** Two or more articles answering the same question. */
  | 'same-topic';

export interface Cluster {
  id: string;
  kind: ClusterKind;
  members: string[];
  /** The strongest article: the one to keep, merge into, or model a rewrite on. */
  strongest: string;
  category: string;
  intent: string;
  /** Mean pairwise normalised similarity across members. */
  similarity: number;
  action: ClusterAction;
  /** What must be true before the action is taken. */
  gate: string;
  reason: string;
}

/** Union-find over indexes. */
function components(n: number, linked: (i: number, j: number) => boolean): number[][] {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (linked(i, j)) parent[find(i)] = find(j);
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) groups.set(find(i), [...(groups.get(find(i)) ?? []), i]);
  return [...groups.values()].filter((g) => g.length > 1);
}

/** Content strength: original material first, then substance. Used to pick a cluster's strongest member. */
export function strength(a: ArticleAudit): number {
  return (
    a.uniqueRatio * 100 +
    Math.min(a.words, 2500) / 100 +
    (a.codeBlocks > 0 ? 3 : 0) +
    (a.tables > 0 ? 2 : 0) +
    a.authoritativeLinks * 2 -
    a.unsourcedClaims * 0.5
  );
}

const pickStrongest = (members: ArticleAudit[]) =>
  [...members].sort((a, b) => strength(b) - strength(a) || a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug))[0];

const meanSimilarity = (corpus: Corpus, idx: number[]) => {
  let sum = 0;
  let n = 0;
  for (let x = 0; x < idx.length; x++)
    for (let y = x + 1; y < idx.length; y++) {
      sum += similarity(corpus, idx[x], idx[y]);
      n++;
    }
  return n ? sum / n : 1;
};

const mode = (xs: string[]) => {
  const c = new Map<string, number>();
  for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1);
  const sorted = [...c].sort((a, b) => b[1] - a[1]);
  return sorted.length === 1 ? sorted[0][0] : `${sorted[0][0]} (+${sorted.length - 1} more)`;
};

const reviewedFor = (path: string) => REVIEWED_OVERLAPS.find((o) => o.members.includes(path));

export function clusterArticles(corpus: Corpus, audits: readonly ArticleAudit[]): Cluster[] {
  const out: Cluster[] = [];
  const counters = new Map<string, number>();
  const nextId = (prefix: string) => {
    counters.set(prefix, (counters.get(prefix) ?? 0) + 1);
    return `${prefix}${counters.get(prefix)}`;
  };
  const bySlug = new Map(audits.map((a) => [a.slug, a]));
  const idx = new Map(corpus.posts.map((p, i) => [p.slug, i]));
  const n = corpus.posts.length;
  const describe = (members: number[]) => {
    const as = members.map((i) => bySlug.get(corpus.posts[i].slug)!);
    return { as, category: mode(as.map((a) => a.categorySlug)), intent: mode(as.map((a) => a.intent)) };
  };

  // Raw similarity is only worth computing where the normalised one is high.
  const rawSim = (i: number, j: number) =>
    similarity(corpus, i, j) >= TEMPLATE_FAMILY ? jaccardSorted(corpus.raw.get(corpus.posts[i].slug)!, corpus.raw.get(corpus.posts[j].slug)!) : 0;
  const sameSubject = (i: number, j: number) => {
    const [a, b] = [corpus.posts[i], corpus.posts[j]];
    return stripBrand(a.title) === stripBrand(b.title) || jaccard(subjectTokens(a.title), subjectTokens(b.title)) >= 0.8;
  };

  // 1. Exact duplicates: the same article twice — same subject and the same text.
  const exact = components(n, (i, j) => sameSubject(i, j) && rawSim(i, j) >= EXACT_DUPLICATE);
  for (const g of exact) {
    const { as, category, intent } = describe(g);
    const merged = as.filter((a) => MERGED_ARTICLES.some((m) => m.from === a.slug));
    const strongest = merged.length ? as.find((a) => !merged.includes(a))! : pickStrongest(as);
    out.push({
      id: nextId('X'),
      kind: 'exact-duplicate',
      members: [strongest.slug, ...as.filter((a) => a !== strongest).map((a) => a.slug)],
      strongest: strongest.slug,
      category,
      intent,
      similarity: meanSimilarity(corpus, g),
      action: 'REDIRECT',
      gate: merged.length === as.length - 1 ? 'Done in Phase 1: the copies 301 to the strongest article.' : 'Redirect the copies to the strongest article.',
      reason: 'Same text published at more than one URL.',
    });
  }

  // 1b. Keyword-swapped: different subjects, the same words. Members each have
  //     a topic of their own; the body just is not about it.
  const swapped = components(n, (i, j) => !sameSubject(i, j) && rawSim(i, j) >= EXACT_DUPLICATE);
  for (const g of swapped) {
    const { as, category, intent } = describe(g);
    const strongest = pickStrongest(as);
    out.push({
      id: nextId('S'),
      kind: 'keyword-swapped',
      members: [strongest.slug, ...as.filter((a) => a !== strongest).map((a) => a.slug).sort()],
      strongest: strongest.slug,
      category,
      intent,
      similarity: meanSimilarity(corpus, g),
      action: 'DEEP REWRITE',
      gate: 'Rewrite each member about its own topic. None is a merge target: the topics differ, only the text is shared.',
      reason: `${as.length} articles with different titles and word-for-word the same body (raw similarity ≥ ${EXACT_DUPLICATE}).`,
    });
  }

  // 2. Same topic: two articles answering one question (intent.ts rules, plus the Phase 3 ledger).
  const pages = corpus.posts.map(asIntentPage);
  const topicClusters = overlapClusters(
    findOverlaps(pages).filter((o) => o.kind !== 'blog-targets-course' && o.kind !== 'duplicate-commercial-intent'),
    pages,
  );
  for (const c of topicClusters) {
    const members = c.members.map((m) => m.replace(/^\/blog\//, '')).filter((s) => bySlug.has(s));
    if (members.length < 2) continue;
    const g = members.map((s) => idx.get(s)!);
    const { as, category, intent } = describe(g);
    // A pair Phase 1 already merged (the -2 copies): record it as done.
    if (as.every((a) => MERGED_ARTICLES.some((m) => m.from === a.slug || m.to === a.slug))) {
      const kept = as.find((a) => MERGED_ARTICLES.some((m) => m.to === a.slug)) ?? as[0];
      out.push({
        id: nextId('X'),
        kind: 'exact-duplicate',
        members: [kept.slug, ...as.filter((a) => a !== kept).map((a) => a.slug)],
        strongest: kept.slug,
        category,
        intent,
        similarity: meanSimilarity(corpus, g),
        action: 'REDIRECT',
        gate: 'Done in Phase 1: the copy 301s to the kept article.',
        reason: c.reasons.join('; '),
      });
      continue;
    }
    const reviewed = reviewedFor(articlePath(members[0]));
    const strongest = reviewed?.primary.startsWith('/blog/') ? bySlug.get(reviewed.primary.slice(6)) ?? pickStrongest(as) : pickStrongest(as);
    const decision: OwnershipDecision | undefined = reviewed?.decision;
    // Phase 3 decided every cluster it saw; only a cluster it did not see defaults to a merge candidate.
    const action: ClusterAction = !decision
      ? 'MERGE'
      : decision === 'MERGE' || decision === 'REDIRECT'
        ? 'MERGE'
        : decision === 'MANUAL REVIEW' || decision === 'NOINDEX'
          ? 'MANUAL REVIEW'
          : 'DEEP REWRITE'; // KEEP BOTH, REWRITE INTENT, CHANGE INTERNAL TARGETING: both stay, each needs its own angle
    out.push({
      id: nextId('T'),
      kind: 'same-topic',
      members: [strongest.slug, ...as.filter((a) => a !== strongest).map((a) => a.slug).sort()],
      strongest: strongest.slug,
      category,
      intent,
      similarity: meanSimilarity(corpus, g),
      action,
      gate:
        action === 'MERGE'
          ? 'Search Console: merge only if the weaker article earns no distinct queries (class C or D). Otherwise rewrite it to a distinct intent.'
          : reviewed
            ? `Phase 3 decision ${decision}: ${reviewed.note}`
            : 'Editor review.',
      reason: c.reasons.join('; '),
    });
  }

  // 3. Template families: different topics, one body. Grouped by category, so
  //    each family is a size a person can review.
  const family = components(n, (i, j) => corpus.posts[i].category_slug === corpus.posts[j].category_slug && similarity(corpus, i, j) >= TEMPLATE_FAMILY);
  for (const g of family) {
    const { as, category, intent } = describe(g);
    const strongest = pickStrongest(as);
    out.push({
      id: nextId('F'),
      kind: 'template-family',
      members: [strongest.slug, ...as.filter((a) => a !== strongest).map((a) => a.slug).sort()],
      strongest: strongest.slug,
      category,
      intent,
      similarity: meanSimilarity(corpus, g),
      action: 'DEEP REWRITE',
      gate: 'Rewrite in priority order (BLOG_REWRITE_QUEUE.csv). NOINDEX only for members Search Console shows earn nothing (class C) and that are not rewritten.',
      reason: `${as.length} articles on different topics share one body template (mean normalised similarity ${meanSimilarity(corpus, g).toFixed(2)}).`,
    });
  }
  return out;
}

/* ── Search Console ───────────────────────────────────────────────────────── */

export interface GscRow {
  path: string;
  clicks: number;
  impressions: number;
  position?: number;
}

/**
 * Parses a Search Console "Pages" export (Performance → Pages → Export → CSV).
 * Columns are matched by header name, so either export language layout works
 * as long as the English headers are present.
 */
export function parseGscCsv(csv: string): Map<string, GscRow> {
  const lines = csv.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const split = (l: string) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim());
  const head = split(lines[0]).map((h) => h.toLowerCase());
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const [page, clicks, impressions, position] = [col(/page|url/), col(/click/), col(/impression/), col(/position/)];
  if (page < 0 || clicks < 0 || impressions < 0) throw new Error('GSC CSV needs Page, Clicks and Impressions columns');
  const out = new Map<string, GscRow>();
  for (const line of lines.slice(1)) {
    const c = split(line);
    let path: string;
    try {
      path = new URL(c[page]).pathname.replace(/\/$/, '') || '/';
    } catch {
      continue;
    }
    out.set(path, {
      path,
      clicks: Number(c[clicks].replace(/,/g, '')) || 0,
      impressions: Number(c[impressions].replace(/,/g, '')) || 0,
      position: position >= 0 ? Number(c[position]) || undefined : undefined,
    });
  }
  return out;
}

export type GscClass = 'A' | 'B' | 'C' | 'D' | 'unknown';

/**
 * A — earns clicks: protect it; improve in place, never merge away.
 * B — impressions but few clicks: rewrite; it ranks but does not satisfy.
 * C — indexed, no impressions over the export window: merge or noindex candidate.
 * D — not in the export at all: check indexing before anything else.
 * unknown — no export supplied.
 */
export function gscClass(row: GscRow | undefined, supplied: boolean): GscClass {
  if (!supplied) return 'unknown';
  if (!row) return 'D';
  if (row.clicks >= 5) return 'A';
  if (row.impressions >= 50) return 'B';
  if (row.impressions === 0) return 'C';
  return 'B';
}

/* ── Classification ───────────────────────────────────────────────────────── */

export type ArticleAction = 'KEEP' | 'IMPROVE' | 'DEEP REWRITE' | 'MERGE' | 'REDIRECT' | 'NOINDEX' | 'MANUAL REVIEW';

export interface Classification {
  action: ArticleAction;
  /** A merge target, or the page that owns the intent. */
  target?: string;
  reason: string;
  /** Evidence still required before the action can be carried out. */
  gate: string;
}

/**
 * One action per article. The order matters: an existing redirect first, then
 * the Phase 3 ownership decisions, then duplication, then quality.
 * Similarity alone never produces NOINDEX, MERGE-away of a page with clicks,
 * or a deletion.
 */
export function classify(a: ArticleAudit, clusters: readonly Cluster[], gsc: GscClass = 'unknown'): Classification {
  const merged = MERGED_ARTICLES.find((m) => m.from === a.slug);
  if (merged) return { action: 'REDIRECT', target: merged.to, reason: merged.reason, gate: 'Done in Phase 1 (301).' };

  const reviewed = reviewedFor(a.path);
  if (reviewed && reviewed.primary !== a.path) {
    const d = reviewed.decision;
    if (d === 'MERGE' && gsc !== 'A') {
      return { action: 'MERGE', target: reviewed.primary, reason: `Phase 3: ${reviewed.note}`, gate: 'Search Console check, then 301 to the owner.' };
    }
    if (d === 'REWRITE INTENT') {
      return { action: 'DEEP REWRITE', target: reviewed.primary, reason: `Phase 3 REWRITE INTENT: ${reviewed.note}`, gate: 'Rewrite to a distinct intent; link to the owner.' };
    }
    if (d === 'MANUAL REVIEW') {
      return { action: 'MANUAL REVIEW', target: reviewed.primary, reason: `Phase 3 MANUAL REVIEW: ${reviewed.note}`, gate: 'Editor decision: merge, or rewrite to a distinct angle.' };
    }
  }

  const topic = clusters.find((c) => c.kind === 'same-topic' && c.members.includes(a.slug) && c.strongest !== a.slug && c.action === 'MERGE');
  if (topic && gsc !== 'A') {
    return {
      action: 'MERGE',
      target: articlePath(topic.strongest),
      reason: `Answers the same question as ${topic.strongest} (${topic.reason}).`,
      gate: gsc === 'unknown' ? topic.gate : 'Merge: Search Console shows no distinct demand.',
    };
  }

  if (a.commercialConflict) {
    return { action: 'MANUAL REVIEW', reason: `Commercial conflict: ${a.commercialConflict}. Decide whether the article or the course page owns the query.`, gate: 'Editor decision.' };
  }
  if (a.kind === 'salary') {
    return {
      action: 'MANUAL REVIEW',
      reason: 'Salary figures with no cited source. A rewrite needs a dated, citable salary dataset; without one the figures must go.',
      gate: 'Source a salary dataset, or rewrite without figures.',
    };
  }

  if (a.uniqueRatio >= 0.6 && a.templateRatio <= 0.2) {
    return { action: 'KEEP', reason: `Mostly original (${pct(a.uniqueRatio)} unique phrasing).`, gate: 'None. Add sources and links when next edited.' };
  }
  if (a.uniqueRatio >= 0.35) {
    return {
      action: 'IMPROVE',
      reason: `Partly original (${pct(a.uniqueRatio)} unique, ${pct(a.templateRatio)} boilerplate): remove the template sections, add sources and examples.`,
      gate: gsc === 'C' ? 'Search Console shows no impressions: improve or NOINDEX.' : 'None.',
    };
  }
  return {
    action: 'DEEP REWRITE',
    reason: `Template body: ${pct(a.templateRatio)} of its phrasing is shared with ${TEMPLATE_DF}+ articles; ${pct(a.uniqueRatio)} is its own.`,
    gate: gsc === 'C' ? 'Search Console shows no impressions: rewrite, or NOINDEX until rewritten.' : 'None. Queue order in BLOG_REWRITE_QUEUE.csv.',
  };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/* ── Rewrite priority ─────────────────────────────────────────────────────── */

/** Kinds whose articles are pillars or have a clear, differentiated query. */
const KIND_WEIGHT: Record<string, number> = { whatis: 5, roadmap: 5, projects: 4, certification: 3, interview: 3, comparison: 2, salary: 1, guide: 2 };

/** Articles the site links from every page (sidebars, homepage) carry the most internal equity. */
const PROMOTED_WEIGHT: Record<ArticleAudit['promoted'], number> = { featured: 3, trending: 2, popular: 1, '': 0 };

/** Course pages with no supporting articles (SEO_INTERNAL_LINK_GRAPH.md §6). */
const UNSUPPORTED_COURSE_TOPIC = /\bagent(ic|s)?\b|\bsql server\b|\bt-sql\b/i;

export function rewritePriority(a: ArticleAudit, c: Classification, gsc: GscClass = 'unknown'): number {
  if (c.action === 'REDIRECT' || c.action === 'MERGE' || c.action === 'KEEP') return 0;
  let p = KIND_WEIGHT[a.kind] ?? 1;
  p += PROMOTED_WEIGHT[a.promoted];
  // A rewrite can only be as good as its sources.
  if (a.sourceAvailability === 'official-docs') p += 1;
  if (UNSUPPORTED_COURSE_TOPIC.test(a.title)) p += 2;
  // Demand evidence outranks every editorial signal.
  if (gsc === 'A') p += 10;
  if (gsc === 'B') p += 6;
  if (gsc === 'C') p -= 3;
  return Math.round(p * 10) / 10;
}

export const priorityBand = (p: number): 'P1' | 'P2' | 'P3' | '—' => (p <= 0 ? '—' : p >= 7 ? 'P1' : p >= 5 ? 'P2' : 'P3');

/* ── Search intent, per article ───────────────────────────────────────────── */

const CATEGORY_AUDIENCE: Record<string, string> = {
  'data-science': 'learners and junior data scientists',
  mlops: 'data scientists and engineers moving models to production',
  'azure-data-factory': 'data engineers working on Azure',
  'generative-ai': 'developers building with LLMs',
  'power-bi': 'analysts building Power BI reports',
  'interview-questions': 'candidates preparing for data interviews',
  'data-engineering': 'aspiring and junior data engineers',
  aws: 'data engineers working on AWS',
  'career-guidance': 'freshers and career switchers into data roles',
  python: 'Python learners heading into data work',
  gcp: 'data engineers working on Google Cloud',
  'data-analytics': 'aspiring and junior data analysts',
};

/** The title's subject in its original casing, minus the year and the intent words: "AWS for Data Engineers". */
export function subjectPhrase(title: string): string {
  return (
    plain(title)
      .replace(/\s*\(?\b20\d\d\b\)?/g, '')
      .split(':')[0]
      .replace(/\b(roadmap|interview questions(?: and answers)?|salary(?: in \w+)?|certification(?: guide| path)?|projects?(?: ideas)?|a complete guide|explained|tutorial|top \d+)\b/gi, '')
      .replace(/\s+(for|in|with|and|to)\s*$/i, '')
      .replace(/^\s*(for|in|with|and)\s+/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim() || plain(title).split(':')[0].trim()
  );
}

export interface IntentProfile {
  primaryQuestion: string;
  intent: SearchIntent;
  audience: string;
  uniquePurpose: string;
  topic: string;
  supportingTopics: string;
  competingPages: string;
}

export function intentProfile(
  p: BackupPost,
  a: ArticleAudit,
  clusters: readonly Cluster[],
  categories: readonly BackupCategory[],
): IntentProfile {
  const t = plain(p.title).replace(/\s*\(?\b20\d\d\)?\s*/g, ' ').trim();
  const head = t.split(':')[0].trim();
  const aud = t.match(/\bfor ((?:data \w+s?)|beginners|freshers|analysts|engineers|scientists)\b/i)?.[1];
  const audience = aud ? aud.toLowerCase() : CATEGORY_AUDIENCE[p.category_slug] ?? 'learners';
  const cmp = comparisonKey({ title: p.title });
  const subject = subjectPhrase(p.title);
  let q: string;
  switch (a.intent) {
    case 'comparison':
      q = cmp ? `Should I use ${cmp.split(' || ').join(' or ')}, and in which situations does each one win?` : `How do the options in "${head}" compare?`;
      break;
    case 'interview':
      q = `What does an interviewer ask about ${subject}, and what does a strong answer contain?`;
      break;
    case 'career':
      q = /become/i.test(t) ? `${head.replace(/^how to/i, 'How do I')}?` : `What should I learn, and in what order, to become job-ready in ${subject}?`;
      break;
    case 'salary':
      q = `What does ${subject} work pay, and what moves the number?`;
      break;
    case 'certification':
      q = `Is ${head} worth it, and how do I prepare for it?`;
      break;
    case 'project':
      q = `Which ${subject} projects show employers real skill, and how do I build them?`;
      break;
    case 'informational':
      q = /^what (is|are)/i.test(head) ? `${head}?` : `What is ${head}, and where is it used?`;
      break;
    default:
      q = /^how to/i.test(head)
        ? `${head.replace(/^how to/i, 'How do I')}?`
        : /explained|what is|introduction|basics|fundamentals/i.test(t)
          ? `What is ${head.replace(/\s*(explained|basics|fundamentals).*$/i, '')}, and how does it work?`
          : /best practices/i.test(t)
            ? `What are the best practices for ${head.replace(/\s*best practices.*$/i, '') || a.topic}, and why?`
            : `How does ${head} work, and how do I apply it in practice?`;
  }
  const course = categories.find((c) => c.slug === p.category_slug)?.course_slug;
  const competing = new Set<string>();
  // Only pages answering the same question compete. Keyword-swapped and template
  // neighbours share text, not a query.
  for (const c of clusters)
    if ((c.kind === 'same-topic' || c.kind === 'exact-duplicate') && c.members.includes(p.slug))
      for (const m of c.members) if (m !== p.slug) competing.add(articlePath(m));
  const reviewed = reviewedFor(a.path);
  if (reviewed) for (const m of reviewed.members) if (m !== a.path) competing.add(m);
  const courseNote = course && a.commercialConflict ? `/courses/${course} (commercial)` : '';
  return {
    primaryQuestion: q,
    intent: a.intent,
    audience,
    uniquePurpose: `Answer "${q}" for ${audience}${course ? `, and hand readers who want structured training to /courses/${course}` : ''}.`,
    topic: a.topic || head.toLowerCase(),
    supportingTopics: (p.tags ?? []).filter((x) => x.toLowerCase() !== p.category.toLowerCase()).join('; '),
    competingPages: [...competing, courseNote].filter(Boolean).join(' '),
  };
}

/* ── Images ───────────────────────────────────────────────────────────────── */

export interface ImagePlan {
  needed: boolean;
  type: string;
  description: string;
}

/**
 * What image would genuinely help. Never a stock photo: a diagram of the
 * thing, a screenshot of the product doing it, or nothing.
 */
export function imagePlan(p: Pick<BackupPost, 'title' | 'kind' | 'category_slug'>, intent: SearchIntent): ImagePlan {
  const t = plain(p.title).toLowerCase();
  const head = plain(p.title).split(':')[0].trim();
  if (p.kind === 'salary') {
    return { needed: false, type: 'none', description: 'No image. A chart is only appropriate once the figures are sourced; then chart the cited data with the source in the caption.' };
  }
  if (intent === 'interview') {
    return { needed: false, type: 'none', description: 'No image needed; the value is in the questions and answers. Optional: one diagram for the hardest concept explained.' };
  }
  if (intent === 'comparison') {
    return { needed: true, type: 'comparison diagram', description: `Side-by-side diagram of where each option in "${head}" sits in a typical workflow, with the deciding differences labelled.` };
  }
  if (intent === 'career' || p.kind === 'roadmap') {
    return { needed: true, type: 'roadmap diagram', description: `Stage-by-stage diagram of the ${head} learning path: each stage, the skills in it, and the proof (project) that closes it.` };
  }
  if (intent === 'project') {
    return { needed: true, type: 'architecture diagram', description: `Architecture sketch of one project from "${head}": data source, processing steps, output.` };
  }
  if (/power bi|dax|power query|tableau|excel|looker/.test(t)) {
    return { needed: true, type: 'annotated screenshot', description: `Annotated screenshot of the feature in "${head}" in the product UI, taken from a demo file (no client data).` };
  }
  if (/pipeline|etl|elt|architecture|lakehouse|warehouse|streaming|kafka|orchestrat|data factory|adf|glue|dataflow|airflow|medallion|mlops|deploy|serving|rag|agent/.test(t)) {
    return { needed: true, type: 'architecture diagram', description: `Diagram of the components in "${head}" and how data or requests flow between them.` };
  }
  if (/sql|python|pandas|numpy|spark|scikit|sklearn|function|query|regex|code/.test(t)) {
    return { needed: true, type: 'code output screenshot or diagram', description: `Worked example for "${head}": the input, the code's key step, and the resulting output side by side.` };
  }
  return { needed: true, type: 'concept diagram', description: `One diagram that explains the central idea of "${head}" — the parts and how they relate.` };
}

/* ── Rewrite checks ───────────────────────────────────────────────────────── */

/** Limits a rewrite must meet before an editor sees it (docs/BLOG_REMEDIATION_PLAN.md). */
export const REWRITE_LIMITS = {
  /** Normalised similarity to the article it replaces: a rewrite, not a paraphrase. */
  maxSimilarityToOriginal: 0.2,
  /** Normalised similarity to any other article: not another template copy. */
  maxSimilarityToCorpus: 0.2,
  minWords: 900,
  minExternalSources: 2,
  internalLinks: [2, 8] as const,
};

export interface RewriteCheck {
  slug: string;
  wordsBefore: number;
  wordsAfter: number;
  headingsBefore: number;
  headingsAfter: number;
  codeBlocksAfter: number;
  tablesAfter: number;
  externalLinks: number;
  internalLinks: string[];
  brokenLinks: string[];
  similarityToOriginal: number;
  maxSimilarityToCorpus: number;
  nearestArticle: string | null;
  /** Rewrite sentences that match a sentence found in TEMPLATE_DF or more original articles. */
  templateSentences: number;
  failures: string[];
}

/**
 * Compare a rewrite with the article it replaces and with the rest of the
 * corpus, using the same normalisation as the audit (title and category
 * replaced by placeholders). `knownPaths` is every internal path a link may
 * point to (live articles that are not redirected, and course pages).
 */
export function checkRewrite(corpus: Corpus, original: BackupPost, blocks: readonly Block[], knownPaths: ReadonlySet<string>): RewriteCheck {
  const pr = proseOf(blocks);
  const units = [...pr.units, ...pr.headings];
  const shingles = shingleSet(units.map((u) => templateTokens(u, original)));
  let nearest: string | null = null;
  let maxSim = 0;
  for (const p of corpus.posts) {
    if (p.slug === original.slug) continue;
    const s = jaccardSorted(shingles, corpus.norm.get(p.slug)!);
    if (s > maxSim) [maxSim, nearest] = [s, p.slug];
  }
  const simOriginal = jaccardSorted(shingles, corpus.norm.get(original.slug) ?? new Uint32Array());

  // Sentences the audit found repeated across the template corpus.
  const sentenceCount = new Map<string, number>();
  for (const p of corpus.posts) {
    const seen = new Set(corpus.prose.get(p.slug)!.units.flatMap((u) => u.split(/(?<=[.!?])\s+/)).map((s) => templateTokens(s, p).join(' ')));
    for (const s of seen) if (s.split(' ').length >= 6) sentenceCount.set(s, (sentenceCount.get(s) ?? 0) + 1);
  }
  const templateSentences = pr.units
    .flatMap((u) => u.split(/(?<=[.!?])\s+/))
    .map((s) => templateTokens(s, original).join(' '))
    .filter((s) => (sentenceCount.get(s) ?? 0) >= TEMPLATE_DF).length;

  const internal = pr.links.filter((l) => isInternalUrl(l.url)).map((l) => l.url.replace(/^https?:\/\/(www\.)?glorytecks\.com/i, ''));
  const external = pr.links.filter((l) => !isInternalUrl(l.url));
  const broken = internal.filter((u) => !knownPaths.has(u.split(/[?#]/)[0]) || u === articlePath(original.slug));
  const before = corpus.prose.get(original.slug);
  const wordsBefore = before ? before.units.reduce((n, u) => n + wordCount(u), 0) : 0;
  const wordsAfter = pr.units.reduce((n, u) => n + wordCount(u), 0);

  const failures: string[] = [];
  const L = REWRITE_LIMITS;
  if (simOriginal >= L.maxSimilarityToOriginal) failures.push(`similarity to original ${simOriginal.toFixed(2)} ≥ ${L.maxSimilarityToOriginal}`);
  if (maxSim >= L.maxSimilarityToCorpus) failures.push(`similarity to ${nearest} ${maxSim.toFixed(2)} ≥ ${L.maxSimilarityToCorpus}`);
  if (templateSentences > 0) failures.push(`${templateSentences} template sentence(s)`);
  if (wordsAfter < L.minWords) failures.push(`${wordsAfter} words < ${L.minWords}`);
  if (new Set(external.map((l) => l.url)).size < L.minExternalSources) failures.push('fewer than 2 distinct external sources');
  if (internal.length < L.internalLinks[0] || internal.length > L.internalLinks[1]) failures.push(`${internal.length} internal links (want ${L.internalLinks.join('–')})`);
  if (broken.length) failures.push(`unresolved internal links: ${broken.join(' ')}`);

  return {
    slug: original.slug,
    wordsBefore,
    wordsAfter,
    headingsBefore: (original.content ?? []).filter((b) => b.type === 'heading' || b.type === 'subheading').length,
    headingsAfter: blocks.filter((b) => b.type === 'heading' || b.type === 'subheading').length,
    codeBlocksAfter: blocks.filter((b) => b.type === 'code').length,
    tablesAfter: blocks.filter((b) => b.type === 'table').length,
    externalLinks: external.length,
    internalLinks: internal,
    brokenLinks: broken,
    similarityToOriginal: simOriginal,
    maxSimilarityToCorpus: maxSim,
    nearestArticle: nearest,
    templateSentences,
    failures,
  };
}

/* ── CSV ──────────────────────────────────────────────────────────────────── */

export function toCsv(rows: readonly Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v === undefined || v === null ? '' : typeof v === 'number' ? String(Math.round(v * 1000) / 1000) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `${[cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')}\n`;
}
