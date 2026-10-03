import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  auditArticles,
  buildCorpus,
  checkRewrite,
  classify,
  clusterArticles,
  imagePlan,
  intentProfile,
  jaccardSorted,
  proseOf,
  shingleSet,
  similarity,
  templateTokens,
  toCsv,
  inlineLinks,
  type BackupAuthor,
  type BackupCategory,
  type BackupPost,
} from '@/lib/blog/quality';
import {
  STUFFING_LIMIT,
  analyseArticle,
  editorialScore,
  intentGroups,
  keywordDensity,
  keywordProfile,
  parseCsvRows,
  phase11Classification,
  readability,
  repetitionCounts,
  titlePromise,
  type IntentGroup,
} from '@/lib/blog/editorial';
import { MERGED_ARTICLES } from '@/lib/blog/merged';
import { subjectTokens } from '@/lib/seo/intent';
import type { Block } from '@/types/content';

/**
 * Regenerates the Phase 11 blog documents from a CMS backup:
 *
 *   docs/BLOG_MASTER_INVENTORY.csv        every article's stored fields (one row each)
 *   docs/BLOG_ARTICLE_ANALYSIS.csv        the 30 questions, keywords and Phase 11 action per article
 *   docs/BLOG_DUPLICATION_CLUSTERS.csv    every cluster member, by cluster type, with its action
 *   docs/BLOG_REWRITE_PROGRESS.csv        every rewrite file: before/after, score, status
 *   docs/BLOG_MASTER_AUDIT.md             generated sections
 *   docs/BLOG_REWRITE_MASTER_REPORT.md    generated sections
 *
 * It also records each rewrite's automated checks and editorial score in the
 * rewrite file itself (review.automated, review.score), which is what the
 * processing ledger reads (backend/src/scripts/blog-status.ts sync-rewrites).
 *
 *   BLOG_AUDIT_BACKUP=../backend/backups/blog/<stamp>
 *   BLOG_AUDIT_REWRITES=../backend/content/blog-rewrites
 *   BLOG_AUDIT_LEDGER=../backend/content/blog-rewrites/ledger.json   (optional)
 *   npm run blog:audit
 *
 * Skipped unless BLOG_AUDIT_BACKUP is set. Read-only against the CMS: it reads
 * a backup on disk, never the database.
 */

const BACKUP = process.env.BLOG_AUDIT_BACKUP;
const REWRITES = process.env.BLOG_AUDIT_REWRITES;
const LEDGER = process.env.BLOG_AUDIT_LEDGER;
const DOCS = path.resolve(__dirname, '../../docs');

const read = <T,>(file: string): T => JSON.parse(readFileSync(path.join(BACKUP!, file), 'utf8')) as T;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const f2 = (x: number) => x.toFixed(2);
const md = (s: string) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map((c) => md(String(c))).join(' | ')} |`)].join('\n');

function writeGenerated(file: string, sections: Record<string, string>) {
  const full = path.join(DOCS, file);
  let text = existsSync(full) ? readFileSync(full, 'utf8').replace(/\r\n/g, '\n') : '';
  for (const [name, body] of Object.entries(sections)) {
    const open = `<!-- generated:${name} -->`;
    const close = `<!-- /generated:${name} -->`;
    const block = `${open}\n${body.trim()}\n${close}`;
    const re = new RegExp(`${open}[\\s\\S]*?${close}`);
    text = re.test(text) ? text.replace(re, block) : `${text}${text ? '\n\n' : ''}${block}\n`;
  }
  writeFileSync(full, text);
}

interface LedgerEntry {
  status: string;
  batch?: string;
  history: { at: string; to: string; note: string }[];
}

interface RewriteDoc {
  id: string;
  slug: string;
  status: string;
  batch?: string;
  pilot?: string;
  phase?: number;
  changes: { content: Block[]; excerpt?: string; metaDescription?: string; metaTitle?: string };
  keywords?: { primary?: string; secondary?: string[] };
  intent?: { searchIntent?: string };
  sources: { url: string }[];
  image?: { needed: boolean; type: string };
  codeVerification?: { block: string; status: string }[];
  review: {
    automated?: Record<string, unknown>;
    score?: Record<string, unknown>;
    independent?: { reviewedAt?: string; ratings?: Record<string, number>; verdict?: string };
    blockers?: string[];
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

describe.skipIf(!BACKUP)('blog editorial programme export (Phase 11)', () => {
  it('writes the inventory, analysis, clusters and progress documents', () => {
    const posts = read<BackupPost[]>('blogs.json');
    const categories = read<BackupCategory[]>('blog_categories.json');
    const authors = read<BackupAuthor[]>('authors.json');
    const manifest = read<{ createdAt: string; rows: { id: string; slug: string; contentSha256: string }[] }>('manifest.json');
    const sha = new Map(manifest.rows.map((r) => [r.slug, r.contentSha256]));
    const authorByKey = new Map(authors.map((a) => [a.key, a]));
    const authorId = new Map((authors as (BackupAuthor & { id?: string })[]).map((a) => [a.key, a.id ?? '']));
    const categoryName = new Map(categories.map((c) => [c.slug, c.name]));
    const ledger: Record<string, LedgerEntry> = LEDGER && existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')).articles : {};
    const status = (id: string) => ledger[id]?.status ?? 'not in ledger';

    const corpus = buildCorpus(posts);
    const audits = auditArticles(corpus, authors);
    const clusters = clusterArticles(corpus, audits);
    const bySlug = new Map(corpus.posts.map((p) => [p.slug, p]));
    const auditBy = new Map(audits.map((a) => [a.slug, a]));
    const idx = new Map(corpus.posts.map((p, i) => [p.slug, i]));
    const groups = intentGroups(corpus.posts, audits);
    const reps = repetitionCounts(audits);
    const merged = new Set(MERGED_ARTICLES.map((m) => m.from));

    /* ── Per-article analysis ─────────────────────────────────────────────── */
    const ownerOf = (slug: string) => groups.find((g) => (g.source === 'phase5-topical' || g.source === 'phase5-career') && g.members.includes(slug))?.owner ?? null;
    const rows = audits.map((a) => {
      const post = bySlug.get(a.slug)!;
      const phase4 = classify(a, clusters);
      const c = phase11Classification(a.slug, phase4, groups);
      const prof = intentProfile(post, a, clusters, categories);
      const kw = keywordProfile(post, a);
      const img = imagePlan(post, a.intent);
      const analysis = analyseArticle({ post, audit: a, classification: c, primaryQuestion: prof.primaryQuestion, keywords: kw, imageNeeded: img.needed, owner: ownerOf(a.slug), reps });
      return { a, post, c, phase4, prof, kw, img, analysis };
    });
    expect(rows).toHaveLength(posts.length);

    /* ── CSV: master inventory ────────────────────────────────────────────── */
    const linkList = (p: BackupPost, internal: boolean) =>
      proseOf(p.content ?? []).links
        .filter((l) => (l.url.startsWith('/') || /glorytecks\.com/i.test(l.url)) === internal)
        .map((l) => l.url);
    const p2 = (p: BackupPost) => p as BackupPost & Record<string, unknown>;
    writeFileSync(
      path.join(DOCS, 'BLOG_MASTER_INVENTORY.csv'),
      toCsv(
        [...corpus.posts].map((p) => {
          const raw = p2(p);
          const internal = linkList(p, true);
          const external = linkList(p, false);
          const a = auditBy.get(p.slug)!;
          return {
            id: p.id,
            slug: p.slug,
            url: `/blog/${p.slug}`,
            title: p.title,
            status: p.status,
            category: p.category_slug,
            category_name: categoryName.get(p.category_slug) ?? p.category,
            kind: p.kind,
            author: authorByKey.get(p.author_key ?? '')?.name ?? p.author_key ?? '',
            author_key: p.author_key ?? '',
            author_id: authorId.get(p.author_key ?? '') ?? String(raw.author_id ?? ''),
            published_date: p.date ?? '',
            published_at: String(raw.published_at ?? ''),
            updated_date: p.updated ?? '',
            updated_at: String(raw.updated_at ?? ''),
            created_at: String(raw.created_at ?? ''),
            words: a.words,
            content_blocks: (p.content ?? []).length,
            content_sha256: sha.get(p.slug) ?? '',
            content_location: `posts/${p.slug}.json in the backup`,
            excerpt: p.excerpt ?? '',
            excerpt_length: (p.excerpt ?? '').length,
            featured_image: p.featured_image ?? '',
            meta_title: p.seo_meta_title ?? '',
            meta_title_length: (p.seo_meta_title ?? '').length,
            meta_description: p.seo_meta_description ?? '',
            meta_description_length: (p.seo_meta_description ?? '').length,
            og_title: String(raw.seo_og_title ?? ''),
            og_description: String(raw.seo_og_description ?? ''),
            og_image: String(raw.seo_og_image ?? ''),
            canonical_url: String(raw.seo_canonical_url ?? ''),
            canonical_effective: `/blog/${p.slug} (set by the page template)`,
            noindex: Boolean(p.seo_noindex),
            seo_keywords: ((raw.seo_keywords as string[] | null) ?? []).join('; '),
            tags: (p.tags ?? []).join('; '),
            internal_links_count: internal.length,
            internal_links: internal.join(' '),
            external_links_count: external.length,
            external_links: external.join(' '),
            faq_items: a.faqItems,
            read_time: String(raw.read_time ?? ''),
            featured: Boolean(p.featured),
            trending: Boolean(p.trending),
            popular: Boolean(p.popular),
            redirected_to: MERGED_ARTICLES.find((m) => m.from === p.slug)?.to ?? '',
            views_or_traffic: 'not available: no views column in the CMS and no Search Console export',
            processing_status: status(p.id),
          };
        }),
      ),
    );

    /* ── CSV: per-article analysis ────────────────────────────────────────── */
    const ordered = [...rows].sort((x, y) => x.a.categorySlug.localeCompare(y.a.categorySlug) || x.a.slug.localeCompare(y.a.slug));
    writeFileSync(
      path.join(DOCS, 'BLOG_ARTICLE_ANALYSIS.csv'),
      toCsv(
        ordered.map(({ a, kw, img, analysis, phase4 }) => ({
          id: a.id,
          slug: a.slug,
          title: a.title,
          category: a.categorySlug,
          primary_keyword: kw.primary,
          secondary_keywords: kw.secondary.join('; '),
          related_terms: kw.related.join('; '),
          subtopics: kw.subtopics.join('; '),
          entities: kw.entities.join('; '),
          keyword_basis: 'derived from title and intent; no search-volume data',
          search_intent: a.intent,
          ...analysis,
          phase4_action: phase4.action,
          image_needed: img.needed,
          image_type: img.type,
          image_description: img.description,
          processing_status: status(a.id),
        })),
      ),
    );

    /* ── CSV: duplication clusters ────────────────────────────────────────── */
    const titleOf = (s: string) => bySlug.get(s)?.title ?? s;
    const idOf = (s: string) => bySlug.get(s)?.id ?? '';
    const clusterRows: Record<string, unknown>[] = [];
    const push = (r: Record<string, unknown>) => clusterRows.push(r);
    const kindLabel: Record<string, string> = {
      'exact-duplicate': 'exact duplicate',
      'keyword-swapped': 'keyword-swapped (same text, different topics)',
      'template-family': 'template family (shared outline and phrasing)',
      'same-topic': 'same topic (body similarity)',
    };
    for (const c of clusters) {
      for (const m of c.members) {
        const row = rows.find((r) => r.a.slug === m)!;
        push({
          cluster_id: c.id,
          cluster_type: kindLabel[c.kind] ?? c.kind,
          same_intent: c.kind === 'exact-duplicate' || c.kind === 'same-topic' ? 'yes' : 'no',
          cluster_size: c.members.length,
          cluster_similarity: c.similarity,
          owner_or_strongest: c.strongest,
          article_id: idOf(m),
          title: titleOf(m),
          url: `/blog/${m}`,
          similarity_to_owner: m === c.strongest ? 1 : similarity(corpus, idx.get(m)!, idx.get(c.strongest)!),
          recommended_action: c.kind === 'exact-duplicate' ? (m === c.strongest ? 'KEEP' : 'REDIRECT (done in Phase 1)') : c.kind === 'same-topic' ? row.c.action : 'DEEP REWRITE',
          gate: c.gate,
          reason: c.reason,
          evidence: 'body text (5-word shingles)',
        });
      }
    }
    const groupRows = (g: IntentGroup) => {
      const label = g.source === 'title-similarity' ? 'same intent (title similarity, unreviewed)' : `same intent (${g.source})`;
      const ownerIsBlog = bySlug.has(g.owner);
      const base = { cluster_id: g.id, cluster_type: label, same_intent: g.source === 'title-similarity' ? 'possibly' : 'yes', cluster_size: g.members.length + 1, cluster_similarity: g.similarity, owner_or_strongest: g.owner, gate: g.source === 'title-similarity' ? 'Editor review.' : 'Search Console: merge only if the member earns no distinct queries; otherwise rewrite it to a distinct angle.', reason: g.note, evidence: g.source === 'title-similarity' ? 'title subject terms + intent' : 'curated editorial decision' };
      push({ ...base, article_id: ownerIsBlog ? idOf(g.owner) : '', title: ownerIsBlog ? titleOf(g.owner) : g.owner, url: ownerIsBlog ? `/blog/${g.owner}` : g.owner, similarity_to_owner: 1, recommended_action: ownerIsBlog ? 'KEEP as owner (DEEP REWRITE first)' : 'owner page' });
      for (const m of g.members) {
        const decided = rows.find((r) => r.a.slug === m)?.c.action ?? '';
        const action = g.source === 'title-similarity' ? 'MANUAL REVIEW' : g.source === 'phase3-ownership' ? `${decided} (Phase 3 decision)` : 'MERGE (candidate)';
        push({ ...base, article_id: idOf(m), title: titleOf(m), url: `/blog/${m}`, similarity_to_owner: g.similarity, recommended_action: action });
      }
    };
    groups.forEach(groupRows);
    const LOCATION = /\b(hyderabad|ameerpet|kukatpally|madhapur|gachibowli|india|indian|bangalore|bengaluru|chennai|pune|mumbai|delhi)\b/i;
    const located = rows.filter((r) => LOCATION.test(r.a.title));
    // A city-swapped copy has the same subject once place names are removed.
    const placeless = (t: string) => subjectTokens(t.replace(new RegExp(LOCATION.source, 'gi'), ' ')).sort().join(' ');
    for (const r of located) {
      const twins = located.filter((o) => o !== r && placeless(o.a.title) === placeless(r.a.title)).map((o) => o.a.slug);
      push({ cluster_id: 'L1', cluster_type: 'location-based title', same_intent: twins.length ? 'yes' : 'no', cluster_size: located.length, cluster_similarity: '', owner_or_strongest: twins[0] ?? '', article_id: r.a.id, title: r.a.title, url: r.a.path, similarity_to_owner: '', recommended_action: twins.length ? 'MANUAL REVIEW' : r.c.action, gate: r.c.gate, reason: twins.length ? `Same subject in another place: ${twins.join(', ')}` : 'Title names a place; no other article has the same subject for a different place.', evidence: 'title with place names removed' });
    }
    const conflicts = rows.filter((r) => r.a.commercialConflict);
    for (const r of conflicts) push({ cluster_id: 'C1', cluster_type: 'competes with a course page', same_intent: 'yes', cluster_size: conflicts.length, cluster_similarity: '', owner_or_strongest: '/courses', article_id: r.a.id, title: r.a.title, url: r.a.path, similarity_to_owner: '', recommended_action: 'MANUAL REVIEW', gate: 'Editor decision', reason: r.a.commercialConflict, evidence: 'title wording' });
    writeFileSync(path.join(DOCS, 'BLOG_DUPLICATION_CLUSTERS.csv'), toCsv(clusterRows));

    /* ── Rewrites: checks, score, progress ────────────────────────────────── */
    const staticPaths = existsSync(path.join(DOCS, 'SEO_URL_INVENTORY.csv'))
      ? parseCsvRows(readFileSync(path.join(DOCS, 'SEO_URL_INVENTORY.csv'), 'utf8'))
          .map((r) => r.url.replace(/^https?:\/\/[^/]+/, '') || '/')
          .filter((p) => !p.startsWith('/blog/'))
      : [];
    const knownPaths = new Set([...posts.filter((p) => !merged.has(p.slug)).map((p) => `/blog/${p.slug}`), ...staticPaths]);
    type Loaded = { file: string; dir: string; doc: RewriteDoc };
    const loaded: Loaded[] = [];
    if (REWRITES && existsSync(REWRITES)) {
      for (const d of readdirSync(REWRITES, { withFileTypes: true }).filter((e) => e.isDirectory()).sort((x, y) => x.name.localeCompare(y.name))) {
        for (const f of readdirSync(path.join(REWRITES, d.name)).filter((n) => n.endsWith('.json')).sort()) {
          const file = path.join(REWRITES, d.name, f);
          loaded.push({ file, dir: d.name, doc: JSON.parse(readFileSync(file, 'utf8')) as RewriteDoc });
        }
      }
    }
    const rewriteShingles = new Map(
      loaded.map(({ doc }) => {
        const pr = proseOf(doc.changes.content);
        return [doc.slug, shingleSet([...pr.units, ...pr.headings].map((u) => templateTokens(u, bySlug.get(doc.slug)!)))];
      }),
    );
    const today = new Date().toISOString().slice(0, 10);
    const progress: Record<string, unknown>[] = [];
    const batchStats: { slug: string; dir: string; score: number | null; before: number; after: number; status: string }[] = [];
    for (const { file, dir, doc } of loaded) {
      const original = bySlug.get(doc.slug)!;
      const audit = auditBy.get(doc.slug)!;
      const check = checkRewrite(corpus, original, doc.changes.content, knownPaths);
      const others = loaded.filter((o) => o.doc.slug !== doc.slug).map((o) => jaccardSorted(rewriteShingles.get(doc.slug)!, rewriteShingles.get(o.doc.slug)!));
      const maxOther = others.length ? Math.max(...others) : 0;
      const failures = [...check.failures];
      if (maxOther >= 0.2) failures.push(`similarity to another rewrite ${maxOther.toFixed(2)}`);
      const primary = doc.keywords?.primary;
      const density = primary ? keywordDensity(doc.changes.content, primary) : null;
      if (density && density.per100 > STUFFING_LIMIT) failures.push(`keyword stuffing: "${primary}" ${density.per100} per 100 words`);
      const read = readability(doc.changes.content);
      const cited = doc.changes.content.flatMap((b) => {
        const t = b.type === 'paragraph' || b.type === 'callout' || b.type === 'quote' ? [b.text] : b.type === 'list' ? b.items : b.type === 'table' ? b.rows.flat() : b.type === 'faq' ? b.items.map((i) => i.a) : [];
        return t.flatMap((x) => inlineLinks(x).map((l) => l.url));
      });
      const score = editorialScore({
        check,
        blocks: doc.changes.content,
        maxSimilarityToOtherRewrites: maxOther,
        sources: doc.sources ?? [],
        citedUrls: cited,
        metaDescription: doc.changes.metaDescription,
        metaTitle: doc.changes.metaTitle,
        excerpt: doc.changes.excerpt,
        ratings: doc.review?.independent?.ratings,
      });
      const automated = {
        result: failures.length ? 'fail' : 'pass',
        failures,
        words: check.wordsAfter,
        similarityToOriginal: check.similarityToOriginal,
        maxSimilarityToCorpus: check.maxSimilarityToCorpus,
        nearestArticle: check.nearestArticle,
        maxSimilarityToOtherRewrites: Math.round(maxOther * 1000) / 1000,
        templateSentences: check.templateSentences,
        internalLinks: check.internalLinks.length,
        brokenLinks: check.brokenLinks,
        externalLinks: check.externalLinks,
        keywordDensityPer100Words: density?.per100 ?? null,
        meanSentenceWords: read.meanSentenceWords,
        checkedAt: today,
      };
      const scoreBlock = { ...score, scoredAt: today, note: 'Internal editorial score for quality control only; never shown to readers and not an approval.' };
      // Record the results in the file, but only when something other than the date changed.
      const strip = (o: unknown) => JSON.stringify(o, (k, v) => (k === 'checkedAt' || k === 'scoredAt' ? undefined : v));
      if (strip(doc.review.automated) !== strip(automated) || strip(doc.review.score) !== strip(scoreBlock)) {
        doc.review.automated = automated;
        doc.review.score = scoreBlock;
        writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
      }
      const phase11 = doc.phase === 11;
      const st = ledger[doc.id]?.status ?? doc.status;
      batchStats.push({ slug: doc.slug, dir, score: score.total, before: audit.simAny.max, after: check.maxSimilarityToCorpus, status: st });
      progress.push({
        article_id: doc.id,
        batch: doc.batch ?? doc.pilot ?? dir,
        old_title: original.title,
        new_title: original.title,
        seo_title: doc.changes.metaTitle ?? '',
        slug: doc.slug,
        category: original.category_slug,
        intent: doc.intent?.searchIntent ?? audit.intent,
        primary_keyword: primary ?? '',
        secondary_keywords: (doc.keywords?.secondary ?? []).join('; '),
        action: rows.find((r) => r.a.slug === doc.slug)!.c.action,
        similarity_before: audit.simAny.max,
        similarity_after: check.maxSimilarityToCorpus,
        similarity_to_original: check.similarityToOriginal,
        word_count_before: check.wordsBefore,
        word_count_after: check.wordsAfter,
        sources_added: (doc.sources ?? []).length,
        internal_links_added: check.internalLinks.length,
        image_needed: doc.image?.needed ?? '',
        image_type: doc.image?.type ?? '',
        quality_score: score.total ?? '',
        automated_score: score.automated,
        automated_checks: automated.result,
        check_failures: failures.join('; '),
        keyword_density_per_100_words: density?.per100 ?? '',
        code_not_executed: (doc.codeVerification ?? []).filter((c) => c.status === 'not executed').map((c) => c.block).join('; '),
        status: st,
        file_status: doc.status,
        reviewed_at: doc.review?.independent?.reviewedAt ?? (phase11 ? '' : 'Phase 4 (no second review recorded)'),
        notes: (doc.review?.blockers ?? []).map((b) => b.split('.')[0]).join(' | ') || (phase11 ? '' : 'Phase 4 pilot file: predates the Phase 11 review format; score withheld until a second review is recorded.'),
      });
    }
    if (progress.length) writeFileSync(path.join(DOCS, 'BLOG_REWRITE_PROGRESS.csv'), toCsv(progress));

    /* ── Markdown: master audit ───────────────────────────────────────────── */
    const N = audits.length;
    const count = <T,>(xs: T[], f: (x: T) => boolean) => xs.filter(f).length;
    const actions = ['KEEP', 'IMPROVE', 'DEEP REWRITE', 'MERGE', 'REDIRECT', 'NOINDEX', 'MANUAL REVIEW'];
    const byAction = (list: typeof rows, key: 'c' | 'phase4', act: string) => count(list, (r) => r[key].action === act);
    const promises = rows
      .map((r) => ({ r, p: titlePromise(r.post.title, r.post.content ?? []) }))
      .filter((x) => x.p && x.p.delivered < x.p.promised);
    const titleDefects = rows.filter((r) => /\s\d{1,3}$/.test(r.post.title.trim()) && !/\b(20\d\d|\d+ (days?|hours?|months?))$/i.test(r.post.title.trim()));
    const statusCounts = Object.entries(Object.values(ledger).reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.status]: (acc[e.status] ?? 0) + 1 }), {}));
    const curated = groups.filter((g) => g.source !== 'title-similarity');
    const titleSim = groups.filter((g) => g.source === 'title-similarity');
    const authorCounts = [...authors].map((au) => [au.name, count(audits, (a) => a.author === au.name)] as [string, number]).filter(([, n]) => n > 0);

    writeGenerated('BLOG_MASTER_AUDIT.md', {
      inputs: table(['Input', 'Value'], [
        ['Backup', `\`${path.relative(path.resolve(DOCS, '..', '..'), BACKUP!).replace(/\\/g, '/')}\` (taken ${manifest.createdAt})`],
        ['Articles', `${N} (statuses: ${[...new Set(posts.map((p) => p.status))].join(', ')})`],
        ['Search Console / traffic data', 'none available (see §7)'],
        ['Processing ledger', LEDGER && existsSync(LEDGER) ? `\`backend/content/blog-rewrites/ledger.json\` (${Object.keys(ledger).length} articles)` : 'not supplied'],
      ]),
      totals: table(['Measure', 'Articles'], [
        ['Articles audited', N],
        ['Body mostly shared template text (> 50% boilerplate)', count(audits, (a) => a.templateRatio > 0.5)],
        ['Near-duplicate of another article (body similarity ≥ 0.8)', count(audits, (a) => a.simAny.max >= 0.8)],
        ['Opening paragraph shared with 10 or more articles', count(audits, (a) => (reps.intro.get(a.introKey) ?? 0) >= 10)],
        ['Heading outline shared with 10 or more articles', count(audits, (a) => (reps.outline.get(a.outlineKey) ?? 0) >= 10)],
        ['No external source', count(audits, (a) => a.externalLinks === 0)],
        ['No in-body internal link', count(audits, (a) => a.internalLinks === 0)],
        ['Unsourced salary, percentage or demand claims', count(audits, (a) => a.unsourcedClaims > 0)],
        ['Title promises a number the body does not deliver', promises.length],
        ['Title uses course-purchase wording (competes with a course page)', conflicts.length],
        ['Title names a place (location-based)', located.length],
        ['Featured image set', count(posts, (p) => Boolean(p.featured_image))],
        ['Meta description outside 70–160 characters', count(audits, (a) => a.metaDescriptionLength < 70 || a.metaDescriptionLength > 160)],
        ['Meta title identical to the H1 title', count(posts, (p) => (p.seo_meta_title ?? '') === p.title)],
        ['Canonical URL set in the CMS', count(posts, (p) => Boolean(p2(p).seo_canonical_url))],
        ['noindex set in the CMS', count(posts, (p) => Boolean(p.seo_noindex))],
      ]),
      authors: table(['Byline', 'Articles'], authorCounts),
      actions: table(['Action', 'Phase 4 classification', 'Phase 11 classification'], actions.map((act) => [act, byAction(rows, 'phase4', act), byAction(rows, 'c', act)])),
      statuses: statusCounts.length ? table(['Processing status', 'Articles'], statusCounts.sort((x, y) => y[1] - x[1])) : '_No ledger supplied._',
      clusters: table(['Cluster type', 'Clusters', 'Articles', 'Same intent?'], [
        ['Exact duplicate', count(clusters, (c) => c.kind === 'exact-duplicate'), clusters.filter((c) => c.kind === 'exact-duplicate').reduce((n, c) => n + c.members.length, 0), 'yes'],
        ['Keyword-swapped (same text, different topics)', count(clusters, (c) => c.kind === 'keyword-swapped'), clusters.filter((c) => c.kind === 'keyword-swapped').reduce((n, c) => n + c.members.length, 0), 'no'],
        ['Template family', count(clusters, (c) => c.kind === 'template-family'), clusters.filter((c) => c.kind === 'template-family').reduce((n, c) => n + c.members.length, 0), 'no'],
        ['Same topic (body similarity)', count(clusters, (c) => c.kind === 'same-topic'), clusters.filter((c) => c.kind === 'same-topic').reduce((n, c) => n + c.members.length, 0), 'yes'],
        ['Same intent (curated, Phase 3 and 5)', curated.length, curated.reduce((n, g) => n + g.members.length + 1, 0), 'yes'],
        ['Same intent (title similarity, unreviewed)', titleSim.length, titleSim.reduce((n, g) => n + g.members.length + 1, 0), 'possibly'],
        ['Location-based titles', located.length ? 1 : 0, located.length, 'n/a'],
        ['Competes with a course page', conflicts.length ? 1 : 0, conflicts.length, 'yes'],
      ]),
      'intent-groups': table(['Group', 'Source', 'Owner', 'Competing articles', 'Note'], curated.map((g) => [g.id, g.source, g.owner, g.members.join(', '), g.note.slice(0, 160)])),
      'title-similarity': titleSim.length ? table(['Group', 'Article', 'Similar article', 'Similarity'], titleSim.map((g) => [g.id, g.owner, g.members.join(', '), f2(g.similarity)])) : '_None above the threshold._',
      'title-promises': promises.length ? table(['Article', 'Promised', 'Delivered (max items)'], promises.map((x) => [x.r.a.slug, x.p!.promised, x.p!.delivered])) : '_None._',
      'title-defects': titleDefects.length ? table(['Article', 'Stored title'], titleDefects.map((r) => [r.a.slug, r.post.title])) : '_None._',
    });

    /* ── Markdown: rewrite master report ──────────────────────────────────── */
    const batch = loaded.filter((l) => l.doc.phase === 11);
    const pilot = loaded.filter((l) => l.doc.phase !== 11);
    const statOf = (slug: string) => batchStats.find((s) => s.slug === slug)!;
    const progOf = (slug: string) => progress.find((p) => p.slug === slug)!;
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const scored = batch.map((l) => statOf(l.doc.slug).score).filter((s): s is number => s !== null);
    writeGenerated('BLOG_REWRITE_MASTER_REPORT.md', {
      'batch-table': table(
        ['Article', 'Intent', 'Words before → after', 'Sources', 'Internal links', 'Nearest-article similarity before → after', 'Score', 'Automated checks', 'Status'],
        batch.map(({ doc }) => {
          const p = progOf(doc.slug);
          return [doc.slug, String(p.intent), `${p.word_count_before} → ${p.word_count_after}`, String(p.sources_added), String(p.internal_links_added), `${f2(Number(p.similarity_before))} → ${f2(Number(p.similarity_after))}`, String(p.quality_score), String(p.automated_checks), String(p.status)];
        }),
      ),
      'batch-summary': table(['Measure', 'Batch 1'], [
        ['Articles rewritten', batch.length],
        ['Automated checks passed', count(batch, (l) => progOf(l.doc.slug).automated_checks === 'pass')],
        ['Average editorial score (internal)', scored.length ? mean(scored).toFixed(1) : 'n/a'],
        ['Mean nearest-article similarity before', f2(mean(batch.map((l) => statOf(l.doc.slug).before)))],
        ['Mean nearest-article similarity after', f2(mean(batch.map((l) => statOf(l.doc.slug).after)))],
        ['Total words before → after', `${batch.reduce((n, l) => n + Number(progOf(l.doc.slug).word_count_before), 0)} → ${batch.reduce((n, l) => n + Number(progOf(l.doc.slug).word_count_after), 0)}`],
        ['Sources cited', batch.reduce((n, l) => n + Number(progOf(l.doc.slug).sources_added), 0)],
        ['Needs review', count(batch, (l) => statOf(l.doc.slug).status === 'needs_review')],
        ['Quality checked (publishable once approved)', count(batch, (l) => statOf(l.doc.slug).status === 'quality_checked')],
      ]),
      'pilot-table': table(['Article', 'Words after', 'Automated checks', 'Score', 'Status'], pilot.map(({ doc }) => {
        const p = progOf(doc.slug);
        return [doc.slug, String(p.word_count_after), String(p.automated_checks), p.quality_score === '' ? 'withheld (no second review)' : String(p.quality_score), String(p.status)];
      })),
      'code-verification': table(['Article', 'Block', 'Status'], batch.flatMap(({ doc }) => (doc.codeVerification ?? []).map((c) => [doc.slug, c.block, c.status]))),
      blockers: table(['Article', 'Open blockers'], batch.map(({ doc }) => [doc.slug, (doc.review.blockers ?? []).map((b) => b.split('.')[0]).join(' · ')])),
    });

    // Sanity: every original article is in every per-article CSV once.
    expect(new Set(rows.map((r) => r.a.id)).size).toBe(N);
    console.log(JSON.stringify({ N, groups: { curated: curated.length, titleSimilarity: titleSim.length }, actions: Object.fromEntries(actions.map((a) => [a, byAction(rows, 'c', a)])), promises: promises.length, titleDefects: titleDefects.map((r) => r.a.slug), rewrites: loaded.length, batchScores: batch.map((l) => [l.doc.slug, statOf(l.doc.slug).score]) }, null, 2));
  }, 600_000);
});
