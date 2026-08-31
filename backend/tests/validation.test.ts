import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBlocks } from '../src/validators/blocks.validator';
import { parseListParams } from '../src/utils/queryFeatures';
import { escapeLikeTerm, quoteFilterValue } from '../src/repositories/BaseRepository';
import { apiToRow, resolveColumn } from '../src/db/mappers';
import { blogsTable, adminUsersTable, trainersTable } from '../src/db/schema';
import { LIMITS } from '../src/validators/common';

/**
 * Input validation, at the layers a request actually passes through.
 *
 * The route-level tests in validationRoutes.test.ts prove the schemas are
 * wired in; these cover the pieces that decide what a value MEANS once it is
 * past the schema — block shape, query parsing, column resolution and the
 * mapper — because those are where an unexpected value becomes a query or a
 * rendered page rather than an error.
 */

/* ── content blocks ─────────────────────────────────────────────────────── */

const heading = (over: Record<string, unknown> = {}) => ({
  type: 'heading',
  id: 'x',
  text: 'Title',
  ...over,
});

test('well-formed blocks of every supported type are accepted', () => {
  const blocks = [
    heading(),
    { type: 'subheading', id: 'y', text: 'Sub' },
    { type: 'paragraph', text: 'Body **text**' },
    { type: 'list', ordered: true, items: ['one', 'two'] },
    { type: 'table', head: ['A', 'B'], rows: [['1', '2']] },
    { type: 'code', lang: 'ts', code: 'const a = 1;' },
    { type: 'callout', variant: 'tip', title: 'Tip', text: 'Do this' },
    { type: 'quote', text: 'Quoted', cite: 'Someone' },
    { type: 'image', url: 'https://res.cloudinary.com/a.png', alt: 'a', caption: 'c' },
    { type: 'faq', items: [{ q: 'Q?', a: 'A.' }] },
  ];
  assert.equal(validateBlocks(blocks), null);
});

test('an unknown block type is rejected rather than silently dropped', () => {
  // Dropping would lose an author's work without telling them.
  assert.match(String(validateBlocks([{ type: 'script', src: 'evil.js' }])), /unsupported type/i);
  assert.match(String(validateBlocks([{ type: 'html', text: '<script>' }])), /unsupported type/i);
});

test('blocks that are not objects are rejected', () => {
  for (const bad of [['a string'], [42], [null], [['nested']]]) {
    assert.ok(validateBlocks(bad), `should reject ${JSON.stringify(bad)}`);
  }
  assert.match(String(validateBlocks('not an array')), /list of blocks/i);
});

test('every text field on a block is bounded', () => {
  const huge = 'x'.repeat(LIMITS.BLOCK_TEXT + 1);
  assert.ok(validateBlocks([{ type: 'paragraph', text: huge }]));
  assert.ok(validateBlocks([heading({ text: 'y'.repeat(LIMITS.TITLE + 1) })]));
  assert.ok(validateBlocks([heading({ id: 'z'.repeat(LIMITS.SLUG + 1) })]));
  assert.ok(validateBlocks([{ type: 'code', code: 'ok', lang: 'a'.repeat(100) }]));
});

test('block collections are bounded in count', () => {
  const many = Array.from({ length: LIMITS.BLOCKS + 1 }, () => heading());
  assert.match(String(validateBlocks(many)), /at most/i);

  const bigList = [{ type: 'list', items: Array.from({ length: LIMITS.LIST_ITEMS + 1 }, () => 'x') }];
  assert.match(String(validateBlocks(bigList)), /at most/i);

  const bigFaq = [
    { type: 'faq', items: Array.from({ length: LIMITS.FAQS + 1 }, () => ({ q: 'q', a: 'a' })) },
  ];
  assert.match(String(validateBlocks(bigFaq)), /at most/i);
});

test('a table cannot nest deeper than rows-of-cells', () => {
  // `rows` is string[][]; anything deeper reaches the renderer as an object.
  const nested = [{ type: 'table', head: ['A'], rows: [[['deep']]] }];
  assert.ok(validateBlocks(nested));
  const objectCell = [{ type: 'table', head: ['A'], rows: [[{ toString: 'x' }]] }];
  assert.ok(validateBlocks(objectCell));
  const tooManyRows = [
    { type: 'table', head: ['A'], rows: Array.from({ length: LIMITS.TABLE_ROWS + 1 }, () => ['x']) },
  ];
  assert.match(String(validateBlocks(tooManyRows)), /at most/i);
});

test('a block field of the wrong type is rejected, not coerced', () => {
  assert.ok(validateBlocks([{ type: 'paragraph', text: 42 }]));
  assert.ok(validateBlocks([{ type: 'list', items: 'not-a-list' }]));
  assert.ok(validateBlocks([{ type: 'list', items: ['a'], ordered: 'yes' }]));
  assert.ok(validateBlocks([{ type: 'faq', items: ['not-an-object'] }]));
  assert.ok(validateBlocks([{ type: 'callout', variant: 'evil', text: 'x' }]));
});

test('required block fields are enforced', () => {
  assert.ok(validateBlocks([{ type: 'paragraph' }]));
  assert.ok(validateBlocks([{ type: 'image', alt: 'no url' }]));
  assert.ok(validateBlocks([{ type: 'faq', items: [{ q: 'only a question' }] }]));
});

/* ── query parsing ──────────────────────────────────────────────────────── */

test('pagination is bounded at both ends', () => {
  assert.equal(parseListParams({ page: '0' }).page, 1);
  assert.equal(parseListParams({ page: '-5' }).page, 1);
  assert.equal(parseListParams({ limit: '99999' }).limit, 100);
  assert.equal(parseListParams({ limit: '0' }).limit, 1);
  // An unbounded page is an unbounded OFFSET, which Postgres reaches by
  // walking every row before it.
  assert.equal(parseListParams({ page: '99999999' }).page, 10_000);
  // Junk falls back rather than producing NaN.
  assert.equal(parseListParams({ page: 'abc' }).page, 1);
  assert.equal(parseListParams({ limit: {} as never }).limit, 20);
});

test('sort keys are shape-checked and count-limited', () => {
  const ok = parseListParams({ sort: '-createdAt,title' });
  assert.deepEqual(ok.sort, { createdAt: -1, title: 1 });

  // A hostile token never becomes part of a PostgREST request.
  const hostile = parseListParams({ sort: 'title;drop,a b,../x,name)' });
  assert.deepEqual(hostile.sort, { createdAt: -1 });

  // Thousands of keys would be thousands of ORDER BY clauses.
  const many = Array.from({ length: 500 }, (_, i) => `f${i}`).join(',');
  assert.ok(Object.keys(parseListParams({ sort: many }).sort).length <= 4);

  assert.deepEqual(parseListParams({ sort: {} as never }).sort, { createdAt: -1 });
});

test('search terms are bounded and non-strings are ignored', () => {
  const long = parseListParams({ q: 'x'.repeat(5000) });
  assert.ok((long.search ?? '').length <= 120);
  assert.equal(parseListParams({ q: ['a', 'b'] as never }).search, undefined);
  assert.equal(parseListParams({ q: '   ' }).search, undefined);
});

test('only scalar filter values are accepted', () => {
  // `?featured[]=1&featured[]=2` arrives as an array; coercing it would
  // silently become the filter "1,2".
  const arrayFilter = parseListParams({ featured: ['1', '2'] as never }, ['featured']);
  assert.deepEqual(arrayFilter.filters, {});

  const objectFilter = parseListParams({ featured: { op: 'neq' } as never }, ['featured']);
  assert.deepEqual(objectFilter.filters, {});

  // Booleans still work, because the admin UI sends them as strings.
  assert.deepEqual(parseListParams({ featured: 'true' }, ['featured']).filters, { featured: true });

  // A filter not on the allowlist is never read at all.
  assert.deepEqual(parseListParams({ role: 'admin' }, ['featured']).filters, {});
});

/* ── query construction ─────────────────────────────────────────────────── */

test('LIKE wildcards in a search term are escaped', () => {
  // Without this, `%` matches everything and turns a search into a full scan.
  assert.equal(escapeLikeTerm('100%_x'), '100\\%\\_x');
  assert.equal(escapeLikeTerm('a\\b'), 'a\\\\b');
});

test('PostgREST filter values are quoted so data cannot become syntax', () => {
  assert.equal(quoteFilterValue('a,b'), '"a,b"');
  assert.equal(quoteFilterValue('x")or(y'), '"x\\")or(y"');
  assert.ok(!quoteFilterValue('a"b').includes('a"b'));
});

test('only declared columns can be filtered or sorted on', () => {
  assert.equal(resolveColumn(blogsTable, 'title'), 'title');
  assert.equal(resolveColumn(blogsTable, 'createdAt'), 'created_at');
  // Anything else resolves to null and is dropped before the database.
  for (const field of ['password', 'role', '__proto__', 'x; drop table blogs', '*', '1=1']) {
    assert.equal(resolveColumn(blogsTable, field), null, `${field} must not resolve`);
  }
});

/* ── mass assignment ────────────────────────────────────────────────────── */

test('the mapper writes only declared columns, never identity or audit fields', () => {
  const row = apiToRow(trainersTable, {
    name: 'Real',
    id: 'attacker-chosen-id',
    createdAt: '1999-01-01',
    updatedAt: '1999-01-01',
    role: 'admin',
    isSuperUser: true,
    __proto__: { polluted: true },
  } as Record<string, unknown>);

  assert.equal(row.name, 'Real');
  assert.equal('id' in row, false);
  assert.equal('created_at' in row, false);
  assert.equal('updated_at' in row, false);
  assert.equal('role' in row, false);
  assert.equal('isSuperUser' in row, false);
});

test('prototype pollution through a request body does not reach Object.prototype', () => {
  const payload = JSON.parse('{"name":"x","__proto__":{"polluted":"yes"}}');
  apiToRow(trainersTable, payload);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted'), false);
});

test('an admin_users write can still set role — which is why the route is admin-only', () => {
  // `role` IS a declared column, so the mapper does not protect it. What
  // protects it is that the only route reaching this table is admin-gated and
  // the self-service profile route accepts just name and avatar. Asserting the
  // mapper's behaviour here keeps that reasoning honest: if someone later
  // exposes this table on a wider route, this test says what they inherit.
  const row = apiToRow(adminUsersTable, { name: 'x', role: 'admin' });
  assert.equal(row.role, 'admin');
});
