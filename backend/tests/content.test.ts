import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import { PostgrestError } from '@supabase/supabase-js';
import {
  blocksToHtml,
  tableOfContents,
  collectFaq,
  normalizeBlocks,
  estimateReadTime,
  Block,
} from '../src/utils/blocks';
import { deriveContentFields } from '../src/services/blog.service';
import { uniqueSlug, toSlug } from '../src/utils/slug';
import { toApiError } from '../src/repositories/BaseRepository';
import { objectIdToUuid } from '../src/scripts/migrate-mongodb-to-supabase';

/**
 * The block renderer must keep producing byte-identical output: the public
 * website relies on the stored `html`, `toc` and `faqs`, and the migration
 * recomputes them. A change here would silently rewrite every post.
 */

const sample: Block[] = [
  { type: 'heading', id: '', text: 'Getting Started' },
  { type: 'paragraph', text: 'Learn **Python** and `pandas` today.' },
  { type: 'list', items: ['One', 'Two'] },
  { type: 'faq', items: [{ q: 'Is it hard?', a: 'No.' }] },
];

test('heading ids are backfilled from the heading text', () => {
  const [heading] = normalizeBlocks(sample) as Array<{ id: string }>;
  assert.equal(heading.id, 'getting-started');
});

test('block renderer output is unchanged', () => {
  const html = blocksToHtml(normalizeBlocks(sample));
  assert.ok(html.includes('<h2 id="getting-started">Getting Started</h2>'));
  assert.ok(html.includes('<strong>Python</strong>'));
  assert.ok(html.includes('<code>pandas</code>'));
  assert.ok(html.includes('<ul><li>One</li><li>Two</li></ul>'));
});

test('html escaping still prevents injection through block content', () => {
  const html = blocksToHtml([{ type: 'heading', id: 'x', text: '<script>alert(1)</script>' }]);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('deriveContentFields reproduces the old pre-save hook', () => {
  // The hook set content/html/toc/faqs together; the service must do the same.
  const derived = deriveContentFields(sample);
  const blocks = normalizeBlocks(sample);

  assert.deepEqual(derived.content, blocks);
  assert.equal(derived.html, blocksToHtml(blocks));
  assert.deepEqual(derived.toc, tableOfContents(blocks));
  assert.deepEqual(derived.faqs, collectFaq(blocks));
  assert.deepEqual(derived.toc, [{ id: 'getting-started', text: 'Getting Started' }]);
  assert.deepEqual(derived.faqs, [{ q: 'Is it hard?', a: 'No.' }]);
});

test('read time keeps its three-minute floor', () => {
  assert.equal(estimateReadTime([{ type: 'paragraph', text: 'short' }]), '3 min');
});

/* ── Slugs ────────────────────────────────────────────────────────────────── */

test('unique slug appends a counter until the candidate is free', async () => {
  const taken = new Set(['python-guide', 'python-guide-2']);
  const slug = await uniqueSlug('Python Guide', async (c) => taken.has(c));
  assert.equal(slug, 'python-guide-3');
});

test('slug generation is unchanged', () => {
  assert.equal(toSlug('Data Science & AI!'), 'data-science-and-ai');
});

/* ── ObjectId → UUID mapping ──────────────────────────────────────────────── */

test('ObjectIds map to deterministic, reversible UUIDs', () => {
  const uuid = objectIdToUuid('507f1f77bcf86cd799439011');
  assert.equal(uuid, '00000000-507f-1f77-bcf8-6cd799439011');

  // Deterministic: re-running the import maps each document to the same row.
  assert.equal(objectIdToUuid('507f1f77bcf86cd799439011'), uuid);

  // Distinct ObjectIds cannot collide — the hex is preserved verbatim.
  assert.notEqual(objectIdToUuid('507f1f77bcf86cd799439012'), uuid);

  // The original ObjectId is recoverable by stripping the pad.
  assert.equal(uuid!.replace(/-/g, '').slice(8), '507f1f77bcf86cd799439011');
});

test('non-ObjectId values are rejected rather than silently mangled', () => {
  assert.equal(objectIdToUuid('not-an-object-id'), null);
  assert.equal(objectIdToUuid(''), null);
  assert.equal(objectIdToUuid(null), null);
});

/* ── Error translation ────────────────────────────────────────────────────── */

const pgError = (code: string): PostgrestError =>
  ({ code, message: 'relation "blogs" violates constraint blogs_slug_key', details: '', hint: '', name: 'PostgrestError' }) as PostgrestError;

test('database errors keep the status codes the API returned before', () => {
  // Duplicate key was Mongo 11000 -> 409.
  assert.equal(toApiError(pgError('23505'), 'Blog').statusCode, 409);
  // Malformed id was a Mongoose CastError -> 400.
  assert.equal(toApiError(pgError('22P02'), 'Blog').statusCode, 400);
  // Constraint failures were ValidationError -> 422.
  assert.equal(toApiError(pgError('23514'), 'Blog').statusCode, 422);
  assert.equal(toApiError(pgError('23502'), 'Blog').statusCode, 422);
  assert.equal(toApiError(pgError('23503'), 'Blog').statusCode, 400);
});

test('database internals never leak into the client-facing message', () => {
  const err = toApiError(pgError('42P01'), 'Blog');
  assert.equal(err.statusCode, 500);
  assert.ok(!err.message.includes('relation'));
  assert.ok(!err.message.includes('blogs_slug_key'));
});
