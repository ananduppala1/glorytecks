import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  EXACT_DUPLICATE,
  NEAR_DUPLICATE,
  SHINGLE_SIZE,
  TEMPLATE_DF,
  TEMPLATE_FAMILY,
  auditArticles,
  buildCorpus,
  classify,
  clusterArticles,
  gscClass,
  jaccardSorted,
  imagePlan,
  intentProfile,
  parseGscCsv,
  priorityBand,
  repetitionReport,
  rewritePriority,
  similarity,
  toCsv,
  type ArticleAudit,
  type BackupAuthor,
  type BackupCategory,
  type BackupPost,
  type Classification,
  type Cluster,
  type GscClass,
  type Repetition,
} from '@/lib/blog/quality';

/**
 * Regenerates the Phase 4 blog audit from a CMS backup:
 *
 *   docs/BLOG_REWRITE_QUEUE.csv          every article: metrics, intent, image plan, action, priority
 *   docs/BLOG_SIMILARITY_CLUSTERS.csv    every cluster member
 *   docs/BLOG_CONTENT_QUALITY_REPORT.md  generated sections (between the markers)
 *   docs/BLOG_REMEDIATION_PLAN.md        generated sections (between the markers)
 *
 *   BLOG_AUDIT_BACKUP=../backend/backups/blog/<stamp> npm run blog:audit
 *   BLOG_AUDIT_GSC=path/to/pages.csv      optional Search Console "Pages" export
 *   (Rewrite checks and BLOG_REWRITE_PROGRESS.csv: see editorial.export.test.ts.)
 *
 * Skipped unless BLOG_AUDIT_BACKUP is set. Hand-written text outside the
 * `<!-- generated:… -->` markers is left alone.
 */

const BACKUP = process.env.BLOG_AUDIT_BACKUP;
const GSC = process.env.BLOG_AUDIT_GSC;
const DOCS = path.resolve(__dirname, '../../docs');

const read = <T,>(file: string): T => JSON.parse(readFileSync(path.join(BACKUP!, file), 'utf8')) as T;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const f2 = (x: number) => x.toFixed(2);
const md = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** Replace one `<!-- generated:name -->…<!-- /generated:name -->` region, creating the file if needed. */
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

const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(' | ')} |`, `| ${head.map((h) => (/^[#≥<0-9]|count|words|ratio|sim|articles|share|median|mean|p\d/i.test(h) ? '---:' : '---')).join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] : 0;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const repRow = (label: string, r: Repetition, total: number) => [label, r.repeated, `${r.articles} (${pct(r.articles / total)})`, r.top[0] ? `${r.top[0].count}× "${md(r.top[0].value.slice(0, 90))}${r.top[0].value.length > 90 ? '…' : ''}"` : '—'];

describe.skipIf(!BACKUP)('blog quality audit export', () => {
  it('audits every article in the backup and writes the reports', () => {
    const posts = read<BackupPost[]>('blogs.json');
    const categories = read<BackupCategory[]>('blog_categories.json');
    const authors = read<BackupAuthor[]>('authors.json');
    const manifest = read<{ createdAt: string; counts: { blogs: number } }>('manifest.json');
    expect(posts.length).toBe(manifest.counts.blogs);

    const gscRows = GSC ? parseGscCsv(readFileSync(GSC, 'utf8')) : null;
    const corpus = buildCorpus(posts);
    const audits = auditArticles(corpus, authors);
    const clusters = clusterArticles(corpus, audits);
    const reps = repetitionReport(corpus, audits);
    const bySlug = new Map(corpus.posts.map((p) => [p.slug, p]));

    const rows = audits.map((a) => {
      const g: GscClass = gscClass(gscRows?.get(a.path), Boolean(gscRows));
      const c = classify(a, clusters, g);
      const prof = intentProfile(bySlug.get(a.slug)!, a, clusters, categories);
      const img = imagePlan(bySlug.get(a.slug)!, a.intent);
      const priority = rewritePriority(a, c, g);
      return { a, c, g, prof, img, priority };
    });
    expect(rows).toHaveLength(posts.length);

    /* ── CSV: the queue ─────────────────────────────────────────────────── */
    const ordered = [...rows].sort((x, y) => y.priority - x.priority || x.a.slug.localeCompare(y.a.slug));
    writeFileSync(
      path.join(DOCS, 'BLOG_REWRITE_QUEUE.csv'),
      toCsv(
        ordered.map(({ a, c, g, prof, img, priority }, i) => ({
          queue_rank: priority > 0 ? i + 1 : '',
          priority_band: priorityBand(priority),
          priority_score: priority,
          action: c.action,
          action_target: c.target ?? '',
          action_reason: c.reason,
          action_gate: c.gate,
          gsc_class: g,
          id: a.id,
          url: a.path,
          slug: a.slug,
          title: a.title,
          category: a.categorySlug,
          kind: a.kind,
          intent: a.intent,
          topic: prof.topic,
          primary_question: prof.primaryQuestion,
          audience: prof.audience,
          unique_purpose: prof.uniquePurpose,
          supporting_topics: prof.supportingTopics,
          competing_pages: prof.competingPages,
          words: a.words,
          headings: a.headings,
          paragraphs: a.paragraphs,
          lists: a.lists,
          tables: a.tables,
          code_blocks: a.codeBlocks,
          faq_items: a.faqItems,
          examples: a.examples,
          practical: a.practical,
          first_hand_evidence: a.firstHandEvidence,
          first_person_claims: a.firstPersonClaims,
          unsourced_claims: a.unsourcedClaims,
          unique_ratio: a.uniqueRatio,
          template_ratio: a.templateRatio,
          sim_same_category_max: a.simSameCategory.max,
          sim_same_category_mean: a.simSameCategory.mean,
          sim_same_category_nearest: a.simSameCategory.nearest,
          sim_same_intent_max: a.simSameIntent.max,
          sim_same_intent_nearest: a.simSameIntent.nearest,
          raw_max: a.rawMax,
          internal_links: a.internalLinks,
          external_links: a.externalLinks,
          authoritative_links: a.authoritativeLinks,
          images: a.images,
          featured_image: a.featuredImage,
          author: a.author,
          author_is_team: a.authorIsTeam,
          author_url: a.authorUrl ?? '',
          date: a.date,
          updated: a.updated,
          commercial_conflict: a.commercialConflict,
          source_availability: a.sourceAvailability,
          official_source: a.officialSource,
          meta_description_length: a.metaDescriptionLength,
          image_needed: img.needed,
          image_type: img.type,
          image_description: img.description,
        })),
      ),
    );

    /* ── CSV: clusters ──────────────────────────────────────────────────── */
    const auditBySlug = new Map(audits.map((a) => [a.slug, a]));
    const idx = new Map(corpus.posts.map((p, i) => [p.slug, i]));
    writeFileSync(
      path.join(DOCS, 'BLOG_SIMILARITY_CLUSTERS.csv'),
      toCsv(
        clusters.flatMap((c) =>
          c.members.map((m) => {
            const a = auditBySlug.get(m)!;
            return {
              cluster: c.id,
              cluster_kind: c.kind,
              cluster_size: c.members.length,
              cluster_similarity: c.similarity,
              cluster_action: c.action,
              is_strongest: m === c.strongest,
              similarity_to_strongest: similarity(corpus, idx.get(m)!, idx.get(c.strongest)!),
              id: a.id,
              url: a.path,
              title: a.title,
              category: a.categorySlug,
              kind: a.kind,
              intent: a.intent,
              unique_ratio: a.uniqueRatio,
              words: a.words,
              gate: c.gate,
            };
          }),
        ),
      ),
    );

    /* ── Numbers for the markdown ───────────────────────────────────────── */
    const N = audits.length;
    const kinds = [...new Set(audits.map((a) => a.kind))].sort((x, y) => audits.filter((a) => a.kind === y).length - audits.filter((a) => a.kind === x).length);
    const cats = [...new Set(audits.map((a) => a.categorySlug))].sort();
    const count = <T,>(xs: T[], f: (x: T) => boolean) => xs.filter(f).length;
    const actions = ['KEEP', 'IMPROVE', 'DEEP REWRITE', 'MERGE', 'REDIRECT', 'NOINDEX', 'MANUAL REVIEW'] as const;
    const byAction = (act: string) => rows.filter((r) => r.c.action === act);

    let nearPairs = 0;
    let identicalPairs = 0;
    let familyPairs = 0;
    const rawMeans: number[] = [];
    for (let i = 0; i < N; i++)
      for (let j = i + 1; j < N; j++) {
        const s = similarity(corpus, i, j);
        if (s >= TEMPLATE_FAMILY) {
          familyPairs++;
          if (corpus.posts[i].category_slug === corpus.posts[j].category_slug) {
            const r = jaccardSorted(corpus.raw.get(corpus.posts[i].slug)!, corpus.raw.get(corpus.posts[j].slug)!);
            rawMeans.push(r);
            if (r >= EXACT_DUPLICATE && corpus.posts[i].title !== corpus.posts[j].title) identicalPairs++;
          }
        }
        if (s >= NEAR_DUPLICATE) nearPairs++;
      }
    const inAnyNear = count(audits, (a) => a.simAny.max >= NEAR_DUPLICATE);
    const unique = count(audits, (a) => a.uniqueRatio >= 0.6 && a.templateRatio <= 0.2);

    const byKindRows = kinds.map((k) => {
      const as = audits.filter((a) => a.kind === k);
      return [k, as.length, Math.round(mean(as.map((a) => a.words))), pct(mean(as.map((a) => a.uniqueRatio))), pct(mean(as.map((a) => a.templateRatio))), f2(mean(as.map((a) => a.simSameCategory.max))), f2(mean(as.map((a) => a.simSameIntent.max)))];
    });
    const byCatRows = cats.map((k) => {
      const as = audits.filter((a) => a.categorySlug === k);
      return [k, as.length, Math.round(mean(as.map((a) => a.words))), pct(mean(as.map((a) => a.uniqueRatio))), f2(mean(as.map((a) => a.simSameCategory.mean))), f2(mean(as.map((a) => a.simSameCategory.max)))];
    });
    const dist = (f: (a: ArticleAudit) => number, bands: [number, number][]) =>
      bands.map(([lo, hi]) => [`${pct(lo)}–${pct(hi)}`, count(audits, (a) => f(a) >= lo && (hi >= 1 ? f(a) <= hi : f(a) < hi))]);

    const strong = [...audits].sort((x, y) => y.uniqueRatio - x.uniqueRatio || y.words - x.words).slice(0, 15);
    const templateClusters = clusters.filter((c) => c.kind === 'template-family');
    const topicClusters = clusters.filter((c) => c.kind === 'same-topic');
    const exactClusters = clusters.filter((c) => c.kind === 'exact-duplicate');
    const swappedClusters = clusters.filter((c) => c.kind === 'keyword-swapped');

    const clusterTable = (cs: Cluster[], listAll: boolean) =>
      table(
        ['Cluster', 'Kind', 'Articles', 'Category', 'Intent', 'Mean sim', 'Strongest', 'Action', 'Members'],
        cs.map((c) => [
          c.id,
          c.kind,
          c.members.length,
          c.category,
          c.intent,
          f2(c.similarity),
          `[${c.strongest}](/blog/${c.strongest})`,
          c.action,
          listAll ? c.members.filter((m) => m !== c.strongest).map((m) => `\`${m}\``).join('<br>') : `see BLOG_SIMILARITY_CLUSTERS.csv`,
        ]),
      );

    writeGenerated('BLOG_CONTENT_QUALITY_REPORT.md', {
      inputs: [
        table(
          ['Input', 'Value'],
          [
            ['Backup', `\`${path.relative(path.resolve(DOCS, '..', '..'), BACKUP!).replace(/\\/g, '/')}\` (taken ${manifest.createdAt})`],
            ['Articles', `${N} (all \`published\`)`],
            ['Search Console export', gscRows ? `${gscRows.size} pages` : '**none supplied** — see §7'],
            ['Shingle size', `${SHINGLE_SIZE} words`],
            ['Boilerplate threshold', `a phrase in ${TEMPLATE_DF}+ articles`],
            ['Template-family threshold', `normalised similarity ≥ ${TEMPLATE_FAMILY}`],
            ['Near-duplicate threshold', `normalised similarity ≥ ${NEAR_DUPLICATE}`],
            ['Exact-duplicate threshold', `raw similarity ≥ ${EXACT_DUPLICATE}`],
          ],
        ),
      ].join('\n'),
      summary: table(
        ['Measure', 'Value'],
        [
          ['Articles audited', N],
          ['Mostly original (≥ 60% unique phrasing, ≤ 20% boilerplate)', unique],
          ['Mean unique phrasing per article', pct(mean(audits.map((a) => a.uniqueRatio)))],
          ['Median unique phrasing per article', pct(quantile(audits.map((a) => a.uniqueRatio), 0.5))],
          ['Mean boilerplate per article', pct(mean(audits.map((a) => a.templateRatio)))],
          ['Mean similarity to same-category articles', f2(mean(audits.map((a) => a.simSameCategory.mean)))],
          ['Mean similarity to nearest same-category article', f2(mean(audits.map((a) => a.simSameCategory.max)))],
          ['Mean similarity to nearest same-intent article', f2(mean(audits.map((a) => a.simSameIntent.max)))],
          ['Articles with a near-duplicate (≥ ' + NEAR_DUPLICATE + ')', `${inAnyNear} (${pct(inAnyNear / N)})`],
          ['Near-duplicate pairs', nearPairs],
          ['Same-category pairs with different titles and ≥ ' + EXACT_DUPLICATE + ' raw (word-for-word) similarity', identicalPairs],
          ['Mean raw similarity of same-category template pairs', f2(mean(rawMeans))],
          ['Template-sharing pairs (≥ ' + TEMPLATE_FAMILY + ')', familyPairs],
          ['Exact-duplicate clusters', exactClusters.length],
          ['Keyword-swapped groups', `${swappedClusters.length} (${swappedClusters.reduce((n, c) => n + c.members.length, 0)} articles)`],
          ['Same-topic clusters', topicClusters.length],
          ['Template families', `${templateClusters.length} (${templateClusters.reduce((n, c) => n + c.members.length, 0)} articles)`],
          ['Articles with an external link', count(audits, (a) => a.externalLinks > 0)],
          ['Articles with an authoritative (official docs) link', count(audits, (a) => a.authoritativeLinks > 0)],
          ['Articles with an in-body internal link', count(audits, (a) => a.internalLinks > 0)],
          ['Articles with an image (body or featured)', count(audits, (a) => a.images > 0 || a.featuredImage)],
          ['Articles with unsourced market claims (salary, %, "in demand")', count(audits, (a) => a.unsourcedClaims > 0)],
          ['Articles with first-hand evidence (screenshot, repo, output)', count(audits, (a) => a.firstHandEvidence > 0)],
          ['Articles by the generic "GloryTecks Team" author', count(audits, (a) => a.authorIsTeam)],
          ['Articles whose author has a profile URL', count(audits, (a) => Boolean(a.authorUrl))],
          ['Articles never updated (updated = date)', count(audits, (a) => a.updated === a.date)],
          ['Titles using course wording (commercial conflict)', count(audits, (a) => Boolean(a.commercialConflict))],
          ['Topics with official documentation available', count(audits, (a) => a.sourceAvailability === 'official-docs')],
        ],
      ),
      kinds: table(['Kind', 'Articles', 'Mean words', 'Mean unique', 'Mean boilerplate', 'Mean max sim (category)', 'Mean max sim (intent)'], byKindRows),
      categories: table(['Category', 'Articles', 'Mean words', 'Mean unique', 'Mean sim (category)', 'Mean max sim (category)'], byCatRows),
      distribution: [
        '**Unique phrasing per article**',
        '',
        table(['Unique share', 'Articles'], dist((a) => a.uniqueRatio, [[0, 0.1], [0.1, 0.2], [0.2, 0.35], [0.35, 0.6], [0.6, 1]])),
        '',
        '**Similarity to the nearest same-category article**',
        '',
        table(['Similarity', 'Articles'], dist((a) => a.simSameCategory.max, [[0, 0.2], [0.2, 0.5], [0.5, 0.8], [0.8, 1]])),
      ].join('\n'),
      structure: table(
        ['Measure', 'Min', 'Median', 'Max', 'Articles with none'],
        (
          [
            ['Words', (a: ArticleAudit) => a.words],
            ['Headings', (a: ArticleAudit) => a.headings],
            ['Paragraphs', (a: ArticleAudit) => a.paragraphs],
            ['Tables', (a: ArticleAudit) => a.tables],
            ['Code blocks', (a: ArticleAudit) => a.codeBlocks],
            ['Examples', (a: ArticleAudit) => a.examples],
            ['FAQ items', (a: ArticleAudit) => a.faqItems],
            ['In-body internal links', (a: ArticleAudit) => a.internalLinks],
            ['External links', (a: ArticleAudit) => a.externalLinks],
            ['Unsourced market claims', (a: ArticleAudit) => a.unsourcedClaims],
            ['First-person experience claims', (a: ArticleAudit) => a.firstPersonClaims],
          ] as [string, (a: ArticleAudit) => number][]
        ).map(([label, f]) => {
          const xs = audits.map(f);
          return [label, quantile(xs, 0), quantile(xs, 0.5), quantile(xs, 1), count(xs, (x) => x === 0)];
        }),
      ),
      repetition: table(
        ['Repeated element', 'Distinct repeated values', 'Articles affected', 'Most repeated (normalised: TTL = the article title, CAT = its category)'],
        [
          repRow('Opening paragraph', reps.intros, N),
          repRow('Conclusion paragraph', reps.conclusions, N),
          repRow('Whole outline (heading sequence)', reps.outlines, N),
          repRow('Headings', reps.headings, N),
          repRow('FAQ questions', reps.faqQuestions, N),
          repRow('FAQ answers', reps.faqAnswers, N),
          repRow('Code examples', reps.codeExamples, N),
          repRow(`Sentences (in ${TEMPLATE_DF}+ articles)`, reps.sentences, N),
        ],
      ),
      'top-sentences': reps.sentences.top.map((t) => `- ${t.count}× “${md(t.value)}”`).join('\n'),
      'exact-clusters': exactClusters.length ? clusterTable(exactClusters, true) : '_None beyond the five merged in Phase 1._',
      'swapped-clusters': swappedClusters.length ? clusterTable(swappedClusters, false) : '_None._',
      'topic-clusters': topicClusters.length ? clusterTable(topicClusters, true) : '_None._',
      'template-clusters': clusterTable(templateClusters, false),
      strong: table(
        ['Article', 'Kind', 'Words', 'Unique', 'Boilerplate', 'Nearest (sim)'],
        strong.map((a) => [`[${a.slug}](/blog/${a.slug})`, a.kind, a.words, pct(a.uniqueRatio), pct(a.templateRatio), `${a.simAny.nearest} (${f2(a.simAny.max)})`]),
      ),
      weaknesses: table(
        ['Weakness', 'Articles'],
        [
          ['Body mostly boilerplate (> 50% of phrasing shared with 10+ articles)', count(audits, (a) => a.templateRatio > 0.5)],
          ['No external source at all', count(audits, (a) => a.externalLinks === 0)],
          ['Unsourced salary / percentage / demand claims', count(audits, (a) => a.unsourcedClaims > 0)],
          ['No in-body internal link', count(audits, (a) => a.internalLinks === 0)],
          ['No image, diagram or screenshot', count(audits, (a) => a.images === 0 && !a.featuredImage)],
          ['No worked example (code or "for example")', count(audits, (a) => a.examples === 0)],
          ['Under 600 words of prose', count(audits, (a) => a.words < 600)],
          ['Generic team byline', count(audits, (a) => a.authorIsTeam)],
          ['Author without a profile page', count(audits, (a) => !a.authorUrl)],
          ['Meta description outside 70–160 characters', count(audits, (a) => a.metaDescriptionLength < 70 || a.metaDescriptionLength > 160)],
        ],
      ),
      gsc: gscRows
        ? table(['GSC class', 'Articles'], (['A', 'B', 'C', 'D'] as const).map((k) => [k, count(rows, (r) => r.g === k)]))
        : '_No Search Console export was supplied, so every article is `gsc_class = unknown`._',
    });

    /* ── Remediation plan ───────────────────────────────────────────────── */
    const actionRows = actions.map((act) => {
      const rs = byAction(act);
      return [act, rs.length, pct(rs.length / N)];
    });
    const bandRows = (['P1', 'P2', 'P3'] as const).map((b) => [b, count(rows, (r) => priorityBand(r.priority) === b)]);
    const byCatAction = cats.map((k) => [k, ...actions.map((act) => count(rows, (r) => r.a.categorySlug === k && r.c.action === act))]);
    const list = (act: string) => {
      const rs = byAction(act).sort((x, y) => y.priority - x.priority || x.a.slug.localeCompare(y.a.slug));
      if (!rs.length) return '_None._';
      return table(
        ['Article', 'Category', 'Kind', 'Unique', act === 'MERGE' || act === 'REDIRECT' ? 'Into' : 'Priority', 'Why'],
        rs.map(({ a, c, priority }) => [
          `[${a.slug}](/blog/${a.slug})`,
          a.categorySlug,
          a.kind,
          pct(a.uniqueRatio),
          act === 'MERGE' || act === 'REDIRECT' ? `\`${c.target ?? ''}\`` : `${priorityBand(priority)} (${priority})`,
          md(c.reason),
        ]),
      );
    };
    writeGenerated('BLOG_REMEDIATION_PLAN.md', {
      'plan-summary': table(['Action', 'Articles', 'Share'], actionRows),
      'plan-bands': table(['Band', 'Articles'], bandRows),
      'plan-by-category': table(['Category', ...actions], byCatAction),
      ...Object.fromEntries(actions.map((act) => [`plan-${act.toLowerCase().replace(/\s+/g, '-')}`, list(act)])),
    });

    // Rewrite checks and docs/BLOG_REWRITE_PROGRESS.csv moved to editorial.export.test.ts (Phase 11).

    const summary = { N, unique, nearPairs, identicalPairs, familyPairs, inAnyNear, meanRaw: mean(rawMeans), clusters: { exact: exactClusters.length, swapped: swappedClusters.length, topic: topicClusters.length, template: templateClusters.length }, actions: Object.fromEntries(actionRows.map((r) => [r[0], r[1]])), bands: Object.fromEntries(bandRows) };
    console.log(JSON.stringify(summary, null, 2));
    expect(rows.every((r: { c: Classification }) => actions.includes(r.c.action as (typeof actions)[number]))).toBe(true);
  }, 300_000);
});
