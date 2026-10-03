// ─────────────────────────────────────────────────────────────────────────────
// Blog editorial programme, Phase 11 (docs/BLOG_MASTER_AUDIT.md and
// docs/BLOG_REWRITE_MASTER_REPORT.md).
//
// Builds on the Phase 4 audit in ./quality.ts, which measures every article.
// This module adds what Phase 11 asks for on top of those measurements:
//
//   • keywordProfile   primary / secondary / related terms, subtopics and
//                      entities for every article. Derived from the title,
//                      intent and a technology dictionary: there is no search
//                      volume data, and the output says so (`basis`).
//   • analyseArticle   the 30 per-article questions, answered from measurements.
//   • intentGroups     same-intent clusters: the curated Phase 3 / Phase 5
//                      decisions plus title-similarity candidates for review.
//   • editorialScore   the internal 0–100 quality score for a rewrite.
//   • keywordDensity   the keyword-stuffing check.
//
// Nothing here publishes, merges, redirects or de-indexes anything. Actions are
// recommendations with the evidence they still need (`gate`).
// ─────────────────────────────────────────────────────────────────────────────

import type { Block } from '@/types/content';
import { REVIEWED_OVERLAPS } from '@/lib/seo/ownership';
import { CAREER_DUPLICATE_GROUPS, COURSE_CLUSTERS } from '@/lib/seo/topical';
import { MERGED_ARTICLES } from '@/lib/blog/merged';
import { jaccard, subjectTokens } from '@/lib/seo/intent';
import { plain, proseOf, subjectPhrase, wordCount, type ArticleAudit, type BackupPost, type Classification, type RewriteCheck } from './quality';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const round2 = (x: number) => Math.round(x * 100) / 100;

/* ── Keywords ─────────────────────────────────────────────────────────────── */

/** Technologies, products and concepts the corpus writes about. Longest names first so "Power BI" wins over "BI". */
const ENTITIES: readonly string[] = [
  'Azure Data Factory', 'Amazon Redshift', 'Amazon Athena', 'Amazon Kinesis', 'Amazon S3', 'Amazon EMR', 'AWS Glue', 'AWS Lambda',
  'Step Functions', 'Lake Formation', 'Google Cloud', 'BigQuery', 'Dataflow', 'Pub/Sub', 'Cloud Storage', 'Vertex AI', 'Synapse',
  'Databricks', 'Snowflake', 'Apache Spark', 'PySpark', 'Spark', 'Hadoop', 'Kafka', 'Airflow', 'dbt', 'Delta Lake', 'Iceberg',
  'Power BI', 'Power Query', 'Power Pivot', 'DAX', 'Tableau', 'Looker Studio', 'Excel', 'SQL Server', 'T-SQL', 'PostgreSQL', 'MySQL',
  'SQL', 'NoSQL', 'MongoDB', 'Python', 'pandas', 'NumPy', 'scikit-learn', 'TensorFlow', 'PyTorch', 'Keras', 'FastAPI', 'Flask',
  'Django', 'pytest', 'Docker', 'Kubernetes', 'MLflow', 'Kubeflow', 'GitHub Actions', 'Git', 'Linux', 'LangGraph', 'LangChain',
  'LlamaIndex', 'Hugging Face', 'OpenAI', 'ChatGPT', 'Ollama', 'vLLM', 'RAG', 'LLM', 'Transformers', 'Embeddings', 'MCP',
  'Generative AI', 'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Statistics', 'AWS', 'Azure', 'GCP',
];

const ENTITY_PATTERNS = [...ENTITIES]
  .sort((a, b) => b.length - a.length)
  .map((name) => ({ name, re: new RegExp(`(^|[^A-Za-z0-9])${name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}([^A-Za-z0-9]|$)`, 'i') }));

/** Entities named in a text, longest match first, without nested duplicates ("Power BI" hides "BI"). */
export function entitiesIn(text: string): string[] {
  const found: string[] = [];
  let rest = ` ${text} `;
  for (const { name, re } of ENTITY_PATTERNS) {
    if (re.test(rest)) {
      found.push(name);
      rest = rest.replace(re, '$1 $2');
    }
  }
  return found;
}

export interface KeywordProfile {
  primary: string;
  secondary: string[];
  related: string[];
  subtopics: string[];
  entities: string[];
  /** 'derived' = from the title and intent; 'researched' = set by an editor from a SERP review. No volume data either way. */
  basis: 'derived' | 'researched';
}

const INTENT_VARIANTS: Record<string, (s: string) => string[]> = {
  tutorial: (s) => [`${s} tutorial`, `${s} explained`, `how to use ${s}`],
  comparison: (s) => [`${s} comparison`, `${s} differences`, `${s} which is better`],
  interview: (s) => [`${s} interview questions and answers`, `${s} interview questions for freshers`, `${s} scenario based questions`],
  career: (s) => [`${s} learning path`, `how to become ${s}`, `${s} skills`],
  project: (s) => [`${s} project ideas`, `${s} projects for beginners`, `${s} portfolio`],
  salary: (s) => [`${s} salary`, `${s} salary for freshers`, `${s} pay by experience`],
  certification: (s) => [`${s} exam`, `${s} preparation`, `${s} worth it`],
  informational: (s) => [`${s} meaning`, `${s} examples`, `${s} for beginners`],
};

const INTENT_SUBTOPICS: Record<string, string[]> = {
  tutorial: ['concept and mental model', 'worked example', 'common mistakes', 'when not to use it'],
  comparison: ['decision criteria', 'where each wins', 'migration or learning cost'],
  interview: ['core concepts', 'scenario questions', 'follow-up questions', 'common wrong answers'],
  career: ['prerequisites', 'stages and order', 'projects', 'what to skip', 'pacing'],
  project: ['project list by skill', 'datasets', 'deliverables', 'how to present'],
  salary: ['sourced pay data', 'what moves pay', 'role differences'],
  certification: ['exam scope', 'prerequisites', 'preparation plan', 'value'],
  informational: ['definition', 'how it works', 'uses', 'limitations'],
};

/** Keyword profile derived from the title and search intent. Editors replace it for rewritten articles. */
export function keywordProfile(post: Pick<BackupPost, 'title' | 'tags' | 'category'>, audit: Pick<ArticleAudit, 'intent'>): KeywordProfile {
  const head = plain(post.title).replace(/\s*\(?\b20\d\d\b\)?/g, '').split(/[:?]/)[0].trim();
  const subject = subjectPhrase(post.title).toLowerCase() || head.toLowerCase();
  const primary = head.toLowerCase().replace(/\s+/g, ' ');
  const variants = (INTENT_VARIANTS[audit.intent] ?? INTENT_VARIANTS.informational)(subject).filter((v) => v !== primary);
  const entities = entitiesIn(`${post.title} ${(post.tags ?? []).join(' ')}`);
  const related = entities.filter((e) => !primary.includes(e.toLowerCase())).map((e) => e.toLowerCase());
  return {
    primary,
    secondary: variants.slice(0, 3),
    related: related.slice(0, 5),
    subtopics: INTENT_SUBTOPICS[audit.intent] ?? INTENT_SUBTOPICS.informational,
    entities,
    basis: 'derived',
  };
}

/* ── Same-intent groups ───────────────────────────────────────────────────── */

export type IntentGroupSource = 'phase3-ownership' | 'phase5-topical' | 'phase5-career' | 'title-similarity';

export interface IntentGroup {
  id: string;
  source: IntentGroupSource;
  topic: string;
  /** The article (or /compare page) that should own the query. */
  owner: string;
  /** Blog slugs competing with the owner (owner excluded). */
  members: string[];
  /** Title-level similarity of the members to the owner (mean). */
  similarity: number;
  note: string;
}

const blogSlug = (path: string) => (path.startsWith('/blog/') ? path.slice(6) : null);

/**
 * Articles that answer the same question as another page. Curated decisions
 * first (Phase 3 ownership ledger, Phase 5 topical map and career groups), then
 * pairs whose titles share most subject terms and the same intent, which no
 * curated group covers yet: those are candidates for an editor, never actions.
 */
export function intentGroups(
  posts: readonly Pick<BackupPost, 'slug' | 'title'>[],
  audits: readonly Pick<ArticleAudit, 'slug' | 'intent'>[],
  titleThreshold = 0.6,
): IntentGroup[] {
  const live = new Set(posts.map((p) => p.slug));
  const merged = new Set(MERGED_ARTICLES.map((m) => m.from));
  const titleOf = new Map(posts.map((p) => [p.slug, p.title]));
  const titleSim = (a: string, b: string) => {
    const [x, y] = [titleOf.get(a), titleOf.get(b)];
    return x && y ? jaccard(subjectTokens(x), subjectTokens(y)) : 0;
  };
  const meanSim = (owner: string, members: string[]) =>
    members.length ? round2(members.reduce((n, m) => n + titleSim(owner, m), 0) / members.length) : 0;
  const out: IntentGroup[] = [];
  const counter = { n: 0 };
  const add = (source: IntentGroupSource, topic: string, owner: string, members: string[], note: string) => {
    const kept = members.filter((m) => m !== owner && live.has(m) && !merged.has(m));
    if (!kept.length) return;
    out.push({ id: `I${++counter.n}`, source, topic, owner, members: kept, similarity: meanSim(owner, kept), note });
  };

  for (const o of REVIEWED_OVERLAPS) {
    const blogs = o.members.map(blogSlug).filter((s): s is string => Boolean(s));
    const owner = blogSlug(o.primary) ?? o.primary;
    if (blogs.filter((b) => b !== owner).length) add('phase3-ownership', o.note.split('.')[0], owner, blogs, `Phase 3 ${o.decision}: ${o.note}`);
  }
  for (const cluster of COURSE_CLUSTERS) {
    for (const t of cluster.topics) {
      if (t.duplicates?.length) add('phase5-topical', t.topic, t.owner ?? t.compare ?? '', [...t.duplicates], t.note ?? 'Phase 5: competes for the owner’s query.');
    }
  }
  for (const g of CAREER_DUPLICATE_GROUPS) add('phase5-career', g.topic, g.owner, [...g.duplicates], g.note);

  // Title-similarity candidates not already grouped together.
  const inAnyGroup = (a: string, b: string) =>
    out.some((g) => {
      const all = new Set([g.owner, ...g.members]);
      return all.has(a) && all.has(b);
    });
  const intentOf = new Map(audits.map((a) => [a.slug, a.intent]));
  const candidates = posts.filter((p) => !merged.has(p.slug));
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const [a, b] = [candidates[i].slug, candidates[j].slug];
      if (intentOf.get(a) !== intentOf.get(b) || inAnyGroup(a, b)) continue;
      const s = titleSim(a, b);
      if (s >= titleThreshold) {
        out.push({ id: `I${++counter.n}`, source: 'title-similarity', topic: `${intentOf.get(a)}: ${subjectTokens(candidates[i].title).join(' ')}`, owner: a, members: [b], similarity: round2(s), note: `${pct(s)} of title subject terms shared, same intent. Unreviewed candidate.` });
      }
    }
  }
  return out;
}

/* ── CSV ──────────────────────────────────────────────────────────────────── */

/** RFC 4180 reader (quoted fields, doubled quotes, embedded commas and newlines) for the docs CSVs. */
export function parseCsvRows(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0] !== '');
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

/* ── Title promises ───────────────────────────────────────────────────────── */

const PROMISE = /\b(?:top\s+)?(\d{1,3})\s+(ideas|questions|projects|scripts|functions|algorithms|tips|tools|mistakes|examples)\b|\btop\s+(\d{1,3})\s+with answers\b/i;

/** What a numbered title promises, and how many matching items the body has. */
export function titlePromise(title: string, blocks: readonly Block[]): { promised: number; delivered: number } | null {
  const m = plain(title).match(PROMISE);
  if (!m) return null;
  const promised = Number(m[1] ?? m[3]);
  const faq = blocks.filter((b) => b.type === 'faq').reduce((n, b) => n + (b.type === 'faq' ? b.items.length : 0), 0);
  const subheads = blocks.filter((b) => b.type === 'subheading').length;
  const longestList = Math.max(0, ...blocks.map((b) => (b.type === 'list' ? b.items.length : 0)));
  const tableRows = Math.max(0, ...blocks.map((b) => (b.type === 'table' ? b.rows.length : 0)));
  return { promised, delivered: Math.max(faq, subheads, longestList, tableRows) };
}

/* ── The 30 questions ─────────────────────────────────────────────────────── */

const INTENT_CLASS: Record<string, string> = {
  tutorial: 'educational / tutorial',
  comparison: 'comparison (commercial investigation)',
  interview: 'interview preparation',
  career: 'career / roadmap',
  project: 'project',
  salary: 'salary',
  certification: 'certification',
  informational: 'informational',
};

const PROBLEM: Record<string, (s: string) => string> = {
  tutorial: (s) => `Needs to understand and use ${s}`,
  comparison: (s) => `Needs to choose between the options in "${s}"`,
  interview: (s) => `Needs to prepare for interview questions on ${s}`,
  career: (s) => `Needs a learning or career path for ${s}`,
  project: (s) => `Needs portfolio projects that prove ${s} skill`,
  salary: (s) => `Needs realistic, sourced pay expectations for ${s}`,
  certification: (s) => `Needs to decide on, and prepare for, ${s}`,
  informational: (s) => `Needs a clear explanation of ${s}`,
};

/** Topics where a correct article needs code or queries. */
const TECHNICAL = /python|sql|pandas|numpy|spark|pyspark|dax|power query|\bm\b|api|docker|kubernetes|airflow|glue|lambda|athena|bigquery|redshift|snowflake|databricks|kafka|langchain|langgraph|llm|rag|scikit|tensorflow|pytorch|regex|git|linux|etl|pipeline|query|function|script|automation/i;
/** Topics that change fast enough that facts must be re-verified on every rewrite. */
const FAST_MOVING = /generative|llm|agent|gpt|rag|langchain|langgraph|ai tools|certification|exam|pricing|free tier|20\d\d/i;

export interface RepetitionCounts {
  intro: Map<string, number>;
  outline: Map<string, number>;
  conclusion: Map<string, number>;
}

export function repetitionCounts(audits: readonly Pick<ArticleAudit, 'introKey' | 'outlineKey' | 'conclusionKey'>[]): RepetitionCounts {
  const count = (key: 'introKey' | 'outlineKey' | 'conclusionKey') => {
    const m = new Map<string, number>();
    for (const a of audits) if (a[key]) m.set(a[key], (m.get(a[key]) ?? 0) + 1);
    return m;
  };
  return { intro: count('introKey'), outline: count('outlineKey'), conclusion: count('conclusionKey') };
}

export type ArticleAnalysis = Record<string, string>;

/**
 * The 30 questions of the Phase 11 brief, answered from measurements for one
 * article as it is live today. Judgement questions are answered from the
 * evidence that decides them (template share, similarity, sources) and say so.
 */
export function analyseArticle(input: {
  post: BackupPost;
  audit: ArticleAudit;
  classification: Classification;
  primaryQuestion: string;
  keywords: KeywordProfile;
  imageNeeded: boolean;
  owner: string | null;
  reps: RepetitionCounts;
}): ArticleAnalysis {
  const { post, audit: a, classification: c, keywords: k, reps } = input;
  const subject = subjectPhrase(post.title) || post.title;
  const template = a.templateRatio > 0.5;
  const technical = TECHNICAL.test(`${post.title} ${post.category}`);
  const introShared = reps.intro.get(a.introKey) ?? 1;
  const outlineShared = reps.outline.get(a.outlineKey) ?? 1;
  const promise = titlePromise(post.title, post.content ?? []);
  const titleMatch = promise && promise.delivered < promise.promised
    ? `no: title promises ${promise.promised}, body has at most ${promise.delivered}`
    : template
      ? 'partly: the body is template text with the title substituted'
      : 'yes';
  return {
    q01_question_answered: input.primaryQuestion,
    q02_primary_intent: a.intent,
    q03_intent_class: INTENT_CLASS[a.intent] ?? a.intent,
    q04_primary_topic: k.primary,
    q05_secondary_topics: k.subtopics.join('; '),
    q06_user_problem: (PROBLEM[a.intent] ?? PROBLEM.informational)(subject),
    q07_currently_useful: template ? `no: ${pct(a.templateRatio)} of its phrasing is shared template text` : a.uniqueRatio >= 0.35 ? 'partly' : 'weak',
    q08_factually_complete: template ? `no: ${a.words} words, ${pct(a.uniqueRatio)} specific to the topic` : 'editor to check',
    q09_repetitive: `${pct(a.templateRatio)} boilerplate`,
    q10_too_generic: a.uniqueRatio < 0.1 ? `yes: ${pct(a.uniqueRatio)} unique phrasing` : 'no',
    q11_too_similar_to_another: a.simAny.max >= 0.8 ? `yes: ${a.simAny.nearest} (${a.simAny.max.toFixed(2)})` : a.simAny.nearest ? `no: nearest ${a.simAny.nearest} (${a.simAny.max.toFixed(2)})` : 'no',
    q12_better_article_same_intent: input.owner && input.owner !== post.slug ? input.owner : '',
    q13_competes_with_course_page: a.commercialConflict ? `yes: ${a.commercialConflict}` : 'no: informational title',
    q14_has_unique_information: a.uniqueRatio >= 0.35 ? 'yes' : `no: ${pct(a.uniqueRatio)} unique phrasing`,
    q15_needs_examples: a.examples === 0 || template ? 'yes' : 'has some',
    q16_needs_table: ['comparison', 'career', 'certification', 'interview', 'project'].includes(a.intent) ? (a.tables ? `has ${a.tables}; check it is topic-specific` : 'yes') : 'optional',
    q17_needs_code: technical ? (a.codeBlocks && !template ? 'has code; verify it runs' : 'yes: runnable, verified code') : 'no',
    q18_needs_workflow: ['tutorial', 'project'].includes(a.intent) ? 'yes: step-by-step' : 'no',
    q19_needs_diagram: input.imageNeeded ? 'yes' : 'no',
    q20_needs_references: a.externalLinks === 0 ? 'yes: no external source' : a.authoritativeLinks === 0 ? 'yes: no authoritative source' : 'has sources',
    q21_needs_real_world_context: !a.practical || a.firstHandEvidence === 0 ? 'yes' : 'has some',
    q22_needs_updated_information: FAST_MOVING.test(`${post.title} ${post.category}`) ? 'yes: fast-moving topic or dated title' : 'verify on rewrite',
    q23_unsupported_claims: a.unsourcedClaims ? `yes: ${a.unsourcedClaims} unsourced salary, percentage or demand claims` : 'none detected',
    q24_outdated_information: FAST_MOVING.test(post.title) ? 'likely: dated or fast-moving; not verified automatically' : 'not verified automatically',
    q25_generic_ai_intro: introShared >= 10 ? `yes: opening shared with ${introShared - 1} other articles` : 'no',
    q26_repetitive_sections: outlineShared >= 10 ? `yes: heading outline shared with ${outlineShared - 1} other articles` : 'no',
    q27_useful_internal_links: a.internalLinks === 0 ? 'no: none in the body' : `${a.internalLinks} in the body`,
    q28_authoritative_external_links: a.authoritativeLinks ? `${a.authoritativeLinks}` : 'none',
    q29_title_matches_body: titleMatch,
    q30_expert_would_find_useful: template ? 'no' : 'editor to judge',
    recommended_action: c.action,
    action_reason: c.reason,
    action_gate: c.gate,
  };
}

/* ── Phase 11 classification ──────────────────────────────────────────────── */

/**
 * The Phase 4 classification, updated with the Phase 5 duplicate groups
 * (topical map and career groups), which the Phase 4 run predates. A Phase 5
 * duplicate becomes a MERGE candidate; the gate keeps Search Console as the
 * deciding evidence. Phase 3 decisions are already applied by `classify`
 * (KEEP BOTH, REWRITE INTENT and CHANGE INTERNAL TARGETING keep the article),
 * and title-similarity candidates never change an action.
 */
export function phase11Classification(slug: string, phase4: Classification, groups: readonly IntentGroup[]): Classification {
  if (phase4.action === 'REDIRECT' || phase4.action === 'MANUAL REVIEW' || phase4.action === 'MERGE') return phase4;
  const curated = groups.find((g) => (g.source === 'phase5-topical' || g.source === 'phase5-career') && g.members.includes(slug));
  if (curated) {
    return {
      action: 'MERGE',
      target: curated.owner.startsWith('/') ? curated.owner : `/blog/${curated.owner}`,
      reason: `Same intent as ${curated.owner} (${curated.source}): ${curated.note}`,
      gate: 'Search Console: merge only if this article earns no distinct queries; otherwise rewrite it to the distinct angle in the note.',
    };
  }
  return phase4;
}

/* ── Keyword stuffing ─────────────────────────────────────────────────────── */

/** Uses of the primary keyword phrase per 100 words of prose. */
export const STUFFING_LIMIT = 1.0;

export function keywordDensity(blocks: readonly Block[], phrase: string): { occurrences: number; words: number; per100: number } {
  const pr = proseOf(blocks);
  const text = [...pr.units, ...pr.headings].join(' ').toLowerCase();
  const words = pr.units.reduce((n, u) => n + wordCount(u), 0);
  const needle = phrase.toLowerCase().trim();
  const occurrences = needle ? text.split(needle).length - 1 : 0;
  return { occurrences, words, per100: words ? round2((occurrences * 100) / words) : 0 };
}

/* ── Readability ──────────────────────────────────────────────────────────── */

export function readability(blocks: readonly Block[]): { meanSentenceWords: number; longParagraphs: number } {
  const paragraphs = blocks.filter((b) => b.type === 'paragraph').map((b) => (b.type === 'paragraph' ? plain(b.text) : ''));
  const sentences = paragraphs.flatMap((p) => p.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(`])/)).filter((s) => wordCount(s) > 0);
  const total = sentences.reduce((n, s) => n + wordCount(s), 0);
  return {
    meanSentenceWords: sentences.length ? round2(total / sentences.length) : 0,
    longParagraphs: paragraphs.filter((p) => wordCount(p) > 150).length,
  };
}

/* ── Editorial score ──────────────────────────────────────────────────────── */

/** Documentation of the technology, standards and government bodies, research papers and dataset publishers. */
export const PRIMARY_SOURCE =
  /(^|\.)(aws\.amazon\.com|docs\.aws\.amazon\.com|learn\.microsoft\.com|support\.microsoft\.com|github\.com\/microsoft|docs\.python\.org|python\.org|peps\.python\.org|packaging\.python\.org|postgresql\.org|dev\.mysql\.com|docs\.langchain\.com|scikit-learn\.org|pandas\.pydata\.org|numpy\.org|spark\.apache\.org|cloud\.google\.com|docs\.cloud\.google\.com|arxiv\.org|doi\.org|nist\.gov|nyc\.gov|worldbank\.org|statlearning\.com|open-meteo\.com|docs\.docker\.com|kubernetes\.io|pytorch\.org|huggingface\.co|platform\.openai\.com|docs\.anthropic\.com)$/i;

export const isPrimarySource = (url: string): boolean => {
  try {
    const u = new URL(url);
    return PRIMARY_SOURCE.test(u.hostname) || PRIMARY_SOURCE.test(`${u.hostname}${u.pathname.split('/').slice(0, 2).join('/')}`);
  } catch {
    return false;
  }
};

/** Weights sum to 100. `reviewer` parts come from the second review's 0–5 ratings. */
export const SCORE_WEIGHTS = {
  intentAlignment: { max: 12, basis: 'reviewer' },
  originality: { max: 10, basis: 'automated' },
  accuracy: { max: 12, basis: 'reviewer' },
  completeness: { max: 8, basis: 'reviewer' },
  usefulness: { max: 10, basis: 'reviewer' },
  depth: { max: 8, basis: 'automated' },
  readability: { max: 6, basis: 'automated' },
  coverage: { max: 8, basis: 'reviewer' },
  internalLinking: { max: 6, basis: 'automated' },
  sourceQuality: { max: 8, basis: 'automated' },
  metadataQuality: { max: 6, basis: 'automated' },
  uniqueness: { max: 6, basis: 'automated' },
} as const;

export type ScorePart = keyof typeof SCORE_WEIGHTS;

export interface ScoreInput {
  check: Pick<RewriteCheck, 'wordsAfter' | 'headingsAfter' | 'codeBlocksAfter' | 'tablesAfter' | 'internalLinks' | 'brokenLinks' | 'similarityToOriginal' | 'maxSimilarityToCorpus'>;
  blocks: readonly Block[];
  maxSimilarityToOtherRewrites: number;
  sources: readonly { url: string }[];
  citedUrls: readonly string[];
  metaDescription?: string;
  metaTitle?: string;
  excerpt?: string;
  /** The second review's 0–5 ratings; absent for files that predate Phase 11. */
  ratings?: Partial<Record<'intentAlignment' | 'accuracy' | 'completeness' | 'usefulness' | 'coverage', number>>;
}

export interface EditorialScore {
  /** null when the reviewer half is missing: an automated-only number would overstate what was checked. */
  total: number | null;
  automated: number;
  parts: Record<ScorePart, number | null>;
  notes: string[];
}

const BANNED_CLAIM = /\b(best|#1|number one|guaranteed?|100% placement|job guarantee)\b/i;

/**
 * Internal editorial score, 0–100. For quality control only: it is never shown
 * to readers, and a high score does not approve anything on its own.
 */
export function editorialScore(input: ScoreInput): EditorialScore {
  const notes: string[] = [];
  const c = input.check;
  const orig = c.similarityToOriginal < 0.02 ? 10 : c.similarityToOriginal < 0.1 ? 7 : c.similarityToOriginal < 0.2 ? 4 : 0;
  const nearest = Math.max(c.maxSimilarityToCorpus, input.maxSimilarityToOtherRewrites);
  const uniq = nearest < 0.02 ? 6 : nearest < 0.05 ? 5 : nearest < 0.1 ? 3 : nearest < 0.2 ? 1 : 0;
  const practical = c.codeBlocksAfter > 0 || c.tablesAfter > 0 || input.blocks.some((b) => b.type === 'list' && b.ordered);
  const depth = (c.wordsAfter >= 1200 ? 4 : c.wordsAfter >= 900 ? 3 : 1) + (c.headingsAfter >= 4 ? 2 : c.headingsAfter >= 2 ? 1 : 0) + (practical ? 2 : 0);
  const r = readability(input.blocks);
  const read = (r.meanSentenceWords <= 22 ? 3 : r.meanSentenceWords <= 26 ? 2 : 1) + (r.longParagraphs === 0 ? 3 : r.longParagraphs <= 2 ? 2 : 1);
  if (r.meanSentenceWords > 22) notes.push(`mean sentence length ${r.meanSentenceWords} words`);
  const n = c.internalLinks.length;
  const links = (n >= 3 && n <= 8 ? 4 : n === 2 ? 2 : 0) + (c.brokenLinks.length === 0 ? 2 : 0);
  const distinct = new Set(input.sources.map((s) => s.url));
  const primaryShare = distinct.size ? [...distinct].filter(isPrimarySource).length / distinct.size : 0;
  const allCited = [...distinct].every((u) => input.citedUrls.includes(u));
  const sourceScore = (distinct.size >= 4 ? 3 : distinct.size >= 2 ? 2 : 0) + (primaryShare >= 0.8 ? 3 : primaryShare >= 0.5 ? 2 : 0) + (allCited ? 2 : 0);
  if (primaryShare < 0.8) notes.push(`${pct(primaryShare)} of sources are primary documentation`);
  const md = input.metaDescription ?? '';
  const mt = input.metaTitle ?? '';
  const ex = input.excerpt ?? '';
  const banned = BANNED_CLAIM.test(`${mt} ${md}`);
  if (banned) notes.push('title or description uses a promotional claim');
  const meta = (md.length >= 70 && md.length <= 160 ? 2 : 0) + (mt.length >= 20 && mt.length <= 65 ? 2 : 0) + (ex.length >= 70 && ex.length <= 320 ? 1 : 0) + (banned ? 0 : 1);

  const auto: Partial<Record<ScorePart, number>> = { originality: orig, uniqueness: uniq, depth, readability: read, internalLinking: links, sourceQuality: sourceScore, metadataQuality: meta };
  const parts = {} as Record<ScorePart, number | null>;
  let total = 0;
  let automated = 0;
  let complete = true;
  for (const [key, w] of Object.entries(SCORE_WEIGHTS) as [ScorePart, (typeof SCORE_WEIGHTS)[ScorePart]][]) {
    if (w.basis === 'automated') {
      const v = Math.min(w.max, auto[key] ?? 0);
      parts[key] = v;
      total += v;
      automated += v;
    } else {
      const rating = input.ratings?.[key as keyof NonNullable<ScoreInput['ratings']>];
      if (rating === undefined) {
        parts[key] = null;
        complete = false;
      } else {
        const v = round2((Math.max(0, Math.min(5, rating)) / 5) * w.max);
        parts[key] = v;
        total += v;
      }
    }
  }
  if (!complete) notes.push('no second-review ratings: total withheld');
  return { total: complete ? Math.round(total) : null, automated: Math.round(automated), parts, notes };
}
