import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Block } from '../src/utils/blocks';
import { validateBlocks } from '../src/validators/blocks.validator';
import {
  buildUpdate,
  contentSha256,
  planRewrite,
  planRollback,
  rewriteFileProblem,
  rollbackUpdate,
  snapshotOf,
  stableStringify,
  type LiveRow,
  type RewriteFile,
} from '../src/scripts/lib/blogRewrite';

/**
 * The blog rewrite workflow's safety rules (src/scripts/lib/blogRewrite.ts).
 * These decide whether a script may write to a published post, so every
 * refusal path is pinned here.
 */

const original: Block[] = [
  { type: 'heading', id: 'intro', text: 'Intro' },
  { type: 'paragraph', text: 'Original body.' },
];
const rewritten: Block[] = [
  { type: 'heading', id: 'what-it-is', text: 'What it is' },
  { type: 'paragraph', text: 'A rewritten body with a [source](https://example.org/docs).' },
];

const live = (over: Partial<LiveRow> = {}): LiveRow => ({
  id: 'id-1',
  slug: 'post',
  content: original,
  excerpt: 'Old excerpt',
  updated: '2025-01-01',
  readTime: '4 min',
  seo: { metaTitle: 'Kept', metaDescription: 'Old description' },
  ...over,
});

const rewrite = (over: Partial<RewriteFile> = {}): RewriteFile => ({
  version: 1,
  id: 'id-1',
  slug: 'post',
  status: 'approved',
  baseline: { backup: 'backups/blog/x', contentSha256: contentSha256(original), updated: '2025-01-01' },
  changes: {
    content: rewritten,
    excerpt: 'New excerpt',
    metaDescription: 'A new meta description that is long enough to sit inside the recommended range.',
  },
  ...over,
});

test('content hashes ignore object key order', () => {
  assert.equal(stableStringify({ b: 1, a: [{ d: 2, c: 3 }] }), '{"a":[{"c":3,"d":2}],"b":1}');
  assert.equal(
    contentSha256([{ type: 'paragraph', text: 'x' }]),
    contentSha256([{ text: 'x', type: 'paragraph' }]),
  );
  assert.notEqual(contentSha256(original), contentSha256(rewritten));
});

test('an approved rewrite against unchanged content is allowed', () => {
  const result = planRewrite(rewrite(), live(), validateBlocks, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
});

test('only an approved rewrite can be applied; plan still reports drafts', () => {
  for (const status of ['needs_review', 'applied', 'rolled_back'] as const) {
    const applied = planRewrite(rewrite({ status }), live(), validateBlocks, true);
    assert.equal(applied.ok, false, status);
    assert.match(applied.errors.join(), /not "approved"/);
    assert.equal(planRewrite(rewrite({ status }), live(), validateBlocks, false).ok, true, status);
  }
});

test('an edit made after the backup blocks the write', () => {
  const edited = live({ content: [...original, { type: 'paragraph', text: 'Added in the admin panel.' }] });
  const result = planRewrite(rewrite(), edited, validateBlocks, true);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(), /changed since the backup/);
});

test('a rewrite that is already live is not applied twice', () => {
  const result = planRewrite(rewrite(), live({ content: rewritten }), validateBlocks, true);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(), /already applied/);
});

test('missing rows, id and slug mismatches block the write', () => {
  assert.match(planRewrite(rewrite(), null, validateBlocks, true).errors.join(), /no live row/);
  assert.match(planRewrite(rewrite(), live({ id: 'other' }), validateBlocks, true).errors.join(), /id mismatch/);
  assert.match(planRewrite(rewrite(), live({ slug: 'other' }), validateBlocks, true).errors.join(), /slug mismatch/);
});

test('content the backend validator rejects, or empty content, blocks the write', () => {
  const bad = rewrite({ changes: { content: [{ type: 'video', url: 'x' } as unknown as Block] } });
  assert.match(planRewrite(bad, live(), validateBlocks, true).errors.join(), /fails validation/);
  const empty = rewrite({ changes: { content: [] } });
  assert.match(planRewrite(empty, live(), validateBlocks, true).errors.join(), /no content/);
});

test('an out-of-range meta description is a note, not a block', () => {
  const short = rewrite({ changes: { content: rewritten, metaDescription: 'Too short.' } });
  const result = planRewrite(short, live(), validateBlocks, true);
  assert.equal(result.ok, true);
  assert.match(result.notes.join(), /meta description is 10 characters/);
});

test('the update never touches the publication date, slug, title or author', () => {
  const update = buildUpdate(rewrite(), live(), '2026-10-01');
  assert.deepEqual(Object.keys(update).sort(), ['content', 'excerpt', 'seo', 'updated']);
  assert.equal(update.updated, '2026-10-01');
  // Other SEO fields are carried over, not wiped.
  assert.deepEqual(update.seo, {
    metaTitle: 'Kept',
    metaDescription: 'A new meta description that is long enough to sit inside the recommended range.',
  });
  // Without an excerpt or description, only the body and `updated` change.
  const bodyOnly = buildUpdate(rewrite({ changes: { content: rewritten } }), live(), '2026-10-01');
  assert.deepEqual(Object.keys(bodyOnly).sort(), ['content', 'updated']);
});

test('SEO title and Open Graph fields merge into the seo block without wiping others', () => {
  const file = rewrite({
    changes: {
      content: rewritten,
      metaTitle: 'A focused search title',
      ogTitle: 'A focused search title',
      ogDescription: 'Shared description.',
    },
  });
  const update = buildUpdate(file, live({ seo: { metaTitle: 'Old', canonicalUrl: '/blog/post' } }), '2026-10-01');
  assert.deepEqual(update.seo, {
    metaTitle: 'A focused search title',
    canonicalUrl: '/blog/post',
    ogTitle: 'A focused search title',
    ogDescription: 'Shared description.',
  });
});

test('an out-of-range meta title is a note, not a block', () => {
  const long = rewrite({ changes: { content: rewritten, metaTitle: 'x'.repeat(80) } });
  const result = planRewrite(long, live(), validateBlocks, true);
  assert.equal(result.ok, true);
  assert.match(result.notes.join(), /meta title is 80 characters/);
});

test('a snapshot restores exactly what was there before', () => {
  const before = live();
  const snap = snapshotOf(before, rewrite(), '2026-10-01T00:00:00.000Z');
  assert.equal(snap.contentSha256, contentSha256(original));
  assert.equal(snap.appliedContentSha256, contentSha256(rewritten));
  assert.deepEqual(rollbackUpdate(snap), {
    content: original,
    excerpt: 'Old excerpt',
    seo: { metaTitle: 'Kept', metaDescription: 'Old description' },
    updated: '2025-01-01',
    readTime: '4 min',
  });
});

test('rollback runs only while the row still holds the rewrite', () => {
  const snap = snapshotOf(live(), rewrite(), '2026-10-01T00:00:00.000Z');
  assert.equal(planRollback(snap, live({ content: rewritten })).ok, true);
  assert.match(planRollback(snap, live()).errors.join(), /already rolled back/);
  const laterEdit = live({ content: [...rewritten, { type: 'paragraph', text: 'Later edit.' }] });
  assert.match(planRollback(snap, laterEdit).errors.join(), /edited after the rewrite/);
  assert.match(planRollback(snap, null).errors.join(), /no live row/);
});

test('malformed rewrite files are rejected before any lookup', () => {
  assert.equal(rewriteFileProblem(rewrite()), null);
  assert.match(String(rewriteFileProblem([])), /object/);
  assert.match(String(rewriteFileProblem({ ...rewrite(), version: 2 })), /version/);
  assert.match(String(rewriteFileProblem({ ...rewrite(), status: 'published' })), /status/);
  assert.match(
    String(rewriteFileProblem({ ...rewrite(), baseline: { backup: '', contentSha256: 'abc', updated: '' } })),
    /sha256/,
  );
  assert.match(String(rewriteFileProblem({ ...rewrite(), changes: {} })), /changes.content/);
});
