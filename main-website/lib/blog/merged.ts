// ─────────────────────────────────────────────────────────────────────────────
// Merged and retired blog URLs.
//
// One place that records which article URLs have been consolidated into
// another, and which are deliberately kept out of the index. Everything that
// needs to know — the redirect table, the sitemap, the article metadata and
// the SEO tests — reads from here, so a merge cannot be half-applied.
//
// Adding an entry is a data change, not a code change. See
// docs/BLOG_CONTENT_ACTION_PLAN.md §3 for the tranche programme this supports.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Article slugs that have been merged into another article.
 *
 * `from` 308-redirects to `to`. Both rows still exist in the CMS — a merge is
 * a routing decision, not a deletion, so nothing is lost if it is reversed.
 *
 * These five pairs were cross-posted into two categories each, with identical
 * titles AND identical excerpts (see docs/BLOG_CONTENT_AUDIT.md §3). The copy
 * kept is the one in the topic category rather than the generic
 * `interview-questions` bucket, because a reader arriving from an AWS query is
 * better served by the AWS archive.
 */
export const MERGED_ARTICLES: readonly { from: string; to: string; reason: string }[] = [
  {
    from: 'aws-interview-questions-for-data-engineers-2',
    to: 'aws-interview-questions-for-data-engineers',
    reason: 'Identical title and excerpt; duplicate of the interview-questions copy.',
  },
  {
    from: 'data-engineering-interview-questions-and-answers-2',
    to: 'data-engineering-interview-questions-and-answers',
    reason: 'Identical title and excerpt; duplicate of the interview-questions copy.',
  },
  {
    from: 'data-analyst-interview-questions-and-answers-2',
    to: 'data-analyst-interview-questions-and-answers',
    reason: 'Identical title and excerpt; duplicate of the interview-questions copy.',
  },
  {
    from: 'gcp-interview-questions-for-data-engineers-2',
    to: 'gcp-interview-questions-for-data-engineers',
    reason: 'Identical title and excerpt; duplicate of the interview-questions copy.',
  },
  {
    from: 'mlops-interview-questions-and-answers-2',
    to: 'mlops-interview-questions-and-answers',
    reason: 'Identical title and excerpt; duplicate of the interview-questions copy.',
  },
] as const;

/**
 * Article slugs kept published and crawlable but held out of the index.
 *
 * Empty by design. The 417 near-duplicate `guide` articles are the obvious
 * candidates, but de-indexing a page that is earning impressions is
 * destructive — that decision is gated on Search Console data, not on a
 * similarity score. See docs/BLOG_CONTENT_ACTION_PLAN.md §3, tranche B.
 *
 * When the data is in hand, adding slugs here is enough: the article renders
 * `noindex, follow` and drops out of the sitemap automatically.
 */
export const NOINDEX_ARTICLES: readonly string[] = [] as const;

const MERGED_FROM = new Set(MERGED_ARTICLES.map((m) => m.from));
const MERGE_TARGET = new Map(MERGED_ARTICLES.map((m) => [m.from, m.to]));
const NOINDEX = new Set(NOINDEX_ARTICLES);

/** True when this slug now redirects elsewhere and must never be listed. */
export const isMergedArticle = (slug: string): boolean => MERGED_FROM.has(slug);

/**
 * Site path for an article, following a merge.
 *
 * Both rows of a merged pair are still published, so the backend's related,
 * prev/next and archive lists keep returning the duplicate. Linking through
 * this sends every internal link straight to the kept article instead of
 * through a 308 hop. The two share a title, so nothing visible changes.
 */
export const blogPath = (slug: string): string => `/blog/${MERGE_TARGET.get(slug) ?? slug}`;

/** True when this slug should render `noindex, follow`. */
export const isNoindexArticle = (slug: string): boolean => NOINDEX.has(slug);

/**
 * True when an article may appear in the sitemap: not merged away, not
 * noindexed. The sitemap must never advertise a URL that redirects or that
 * asks not to be indexed.
 */
export const isSitemapEligible = (slug: string): boolean =>
  !MERGED_FROM.has(slug) && !NOINDEX.has(slug);

/** The redirect table, in the shape `next.config.mjs` expects. */
export const mergedRedirects = () =>
  MERGED_ARTICLES.map((m) => ({
    source: `/blog/${m.from}`,
    destination: `/blog/${m.to}`,
    permanent: true,
  }));
