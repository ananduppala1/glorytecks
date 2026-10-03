import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import { validateBlocks } from '../src/validators/blocks.validator';
import { rewriteFileProblem, type RewriteFile } from '../src/scripts/lib/blogRewrite';
import { blocksToHtml, type Block } from '../src/utils/blocks';

/**
 * Every rewrite waiting for review (content/blog-rewrites/<batch>/<slug>.json)
 * must be something an editor could approve as-is: valid blocks, cited
 * sources, well-formed links, and none of the patterns the Phase 4 audit
 * found in the original template (docs/BLOG_CONTENT_QUALITY_REPORT.md).
 *
 * These are the automated half of the review. The human half — is it true,
 * does the code run — is the checklist inside each file.
 */

const ROOT = path.resolve(__dirname, '../content/blog-rewrites');

type Source = { title: string; url: string; supports: string };
type Doc = RewriteFile & {
  sources: Source[];
  title: string;
  intent: { primaryQuestion: string };
  /** Phase 11 files carry the content brief, keywords, SERP notes and the second review. */
  phase?: number;
  keywords?: { primary?: string; secondary?: string[] };
  brief?: { uniqueAngle?: string; keyQuestions?: string[] };
  serp?: { results?: unknown[] };
  image?: { needed?: boolean; type?: string; description?: string };
  codeVerification?: { block: string; status: string }[];
  review?: { independent?: { verdict?: string; ratings?: Record<string, number> }; blockers?: string[] };
};

const docs: { file: string; doc: Doc }[] = existsSync(ROOT)
  ? readdirSync(ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) =>
        readdirSync(path.join(ROOT, d.name))
          .filter((f) => f.endsWith('.json'))
          .map((f) => {
            const file = path.join(d.name, f);
            return { file, doc: JSON.parse(readFileSync(path.join(ROOT, file), 'utf8')) as Doc };
          }),
      )
  : [];

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
function texts(blocks: Block[]): string[] {
  return blocks.flatMap((b) => {
    switch (b.type) {
      case 'paragraph':
      case 'quote':
      case 'callout':
        return [b.text];
      case 'list':
        return b.items;
      case 'table':
        return b.rows.flat();
      case 'faq':
        return b.items.flatMap((i) => [i.q, i.a]);
      default:
        return [];
    }
  });
}

/** Sentences the audit found repeated across hundreds of the original articles. */
const TEMPLATE_PHRASES = [
  /is one of the topics learners ask about most/i,
  /in active demand across Hyderabad/i,
  /is very learnable with the right sequence/i,
  /The tools change; the fundamentals don't/i,
  /Most committed learners reach a job-ready level/i,
  /A degree helps but isn't mandatory/i,
];

/** Claims a rewrite may not make without a source: salaries, invented outcomes, first-hand experience. */
const UNSUPPORTED = [
  /₹\s?\d|\b\d+(\.\d+)?\s?(lpa|lakhs?)\b/i,
  /\bour (students|learners|graduates|trainees)\b/i,
  /\b(we['’]ve|we have) (seen|helped|trained|placed)\b/i,
  /\bin (our|my) experience\b/i,
];

test('rewrite files exist for review', () => {
  assert.ok(docs.length > 0, 'no rewrite files found');
});

for (const { file, doc } of docs) {
  test(`${file}: shape, blocks and status`, () => {
    assert.equal(rewriteFileProblem(doc), null);
    assert.equal(validateBlocks(doc.changes.content), null);
    assert.equal(path.basename(file, '.json'), doc.slug);
    // The tooling never approves; an editor does, by hand.
    assert.ok(['needs_review', 'approved', 'applied', 'rolled_back'].includes(doc.status));
  });

  test(`${file}: metadata`, () => {
    const meta = doc.changes.metaDescription ?? '';
    assert.ok(meta.length >= 70 && meta.length <= 160, `meta description is ${meta.length} characters`);
    const excerpt = doc.changes.excerpt ?? '';
    assert.ok(excerpt.length >= 70 && excerpt.length <= 320, `excerpt is ${excerpt.length} characters`);
    assert.ok(doc.intent?.primaryQuestion, 'intent.primaryQuestion is required');
  });

  test(`${file}: sources are cited and used`, () => {
    assert.ok(doc.sources.length >= 2, 'at least two sources');
    const body = texts(doc.changes.content).join('\n');
    const external = [...body.matchAll(LINK)].map((m) => m[2]).filter((u) => !u.startsWith('/'));
    for (const s of doc.sources) {
      assert.match(s.url, /^https:\/\//, `${s.url} is not https`);
      assert.ok(s.supports?.length > 10, `${s.url} does not say what it supports`);
    }
    for (const url of external) {
      assert.ok(doc.sources.some((s) => s.url === url), `${url} is linked but not listed in sources`);
    }
  });

  test(`${file}: internal links`, () => {
    const body = texts(doc.changes.content).join('\n');
    const internal = [...body.matchAll(LINK)].map((m) => m[2]).filter((u) => u.startsWith('/'));
    assert.ok(internal.length >= 2 && internal.length <= 8, `${internal.length} internal links (want 2–8)`);
    for (const href of internal) {
      assert.match(href, /^\/(blog\/[a-z0-9-]+|courses\/[a-z0-9-]+|compare\/[a-z0-9-]+|training-in-hyderabad)$/, `unexpected link ${href}`);
      assert.notEqual(href, `/blog/${doc.slug}`, 'links to itself');
    }
  });

  test(`${file}: none of the template or unsupported claims`, () => {
    const body = texts(doc.changes.content).join('\n');
    for (const re of [...TEMPLATE_PHRASES, ...UNSUPPORTED]) assert.doesNotMatch(body, re);
  });

  test(`${file}: renders to well-formed HTML with no leftover markup`, () => {
    const html = blocksToHtml(doc.changes.content);
    for (const tag of ['p', 'h2', 'h3', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'pre']) {
      const open = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length;
      const close = (html.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
      assert.equal(open, close, `<${tag}> opened ${open} times, closed ${close}`);
    }
    // The renderer supports **bold**, `code` and [links](...) only. Anything
    // else in prose (italics, stray link syntax) would show as raw characters.
    const prose = blocksToHtml(doc.changes.content.filter((b) => b.type !== 'code'));
    assert.doesNotMatch(prose, /\*\*|\]\(|```/, 'unrendered Markdown in prose');
    for (const text of texts(doc.changes.content)) {
      assert.doesNotMatch(text.replace(/`[^`]*`/g, ''), /(^|[^*\w])\*[^*\s][^*]*\*(?!\*)/, `single-asterisk italics: ${text.slice(0, 60)}`);
    }
    for (const b of doc.changes.content) {
      if (b.type === 'table') for (const row of b.rows) assert.equal(row.length, b.head.length, `table row width ${row.length} ≠ header ${b.head.length}`);
    }
  });

  if (doc.phase === 11) {
    test(`${file}: Phase 11 brief, keywords, review and sources are complete`, () => {
      assert.ok(doc.keywords?.primary, 'keywords.primary');
      assert.ok((doc.keywords?.secondary ?? []).length >= 2, 'at least two secondary keywords');
      assert.ok(doc.brief?.uniqueAngle, 'brief.uniqueAngle');
      assert.ok((doc.brief?.keyQuestions ?? []).length >= 3, 'brief.keyQuestions');
      assert.ok((doc.serp?.results ?? []).length >= 2, 'serp.results');
      assert.ok(doc.image && typeof doc.image.needed === 'boolean' && doc.image.type && doc.image.description, 'image plan');
      assert.ok(Array.isArray(doc.codeVerification), 'codeVerification');
      assert.ok(['pass', 'fail'].includes(String(doc.review?.independent?.verdict)), 'second review verdict');
      for (const [k, v] of Object.entries(doc.review?.independent?.ratings ?? {})) assert.ok(v >= 0 && v <= 5, `rating ${k}`);
      assert.ok(Array.isArray(doc.review?.blockers), 'review.blockers');
      const title = doc.changes.metaTitle ?? '';
      assert.ok(title.length >= 20 && title.length <= 65, `meta title is ${title.length} characters`);
      // Every listed source is actually cited in the body.
      const body = texts(doc.changes.content).join('\n');
      for (const s of doc.sources) assert.ok(body.includes(`](${s.url})`), `${s.url} is listed but never cited`);
      // Unexecuted code is never silently published.
      for (const cv of doc.codeVerification ?? []) {
        if (cv.status === 'not executed') assert.ok((doc.review?.blockers ?? []).some((b) => b.includes(cv.block)), `${cv.block} is not executed but not a blocker`);
      }
    });
  }
}
