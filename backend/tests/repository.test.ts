import './setup';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { supabaseAdmin } from '../src/config/supabase';
import { BaseRepository, escapeLikeTerm, quoteFilterValue } from '../src/repositories/BaseRepository';
import { blogsTable } from '../src/db/schema';
import { parseListParams, buildPaginationMeta, toSortSpecs } from '../src/utils/queryFeatures';
import { IBlog } from '../src/interfaces/common';

/**
 * These tests record the calls the repository makes against a stand-in for the
 * PostgREST client. That is what proves the Mongo→SQL translation is right —
 * a typecheck alone would not catch a filter going to the wrong column or a
 * sort direction being inverted.
 */

interface Call {
  method: string;
  args: unknown[];
}

function fakeQuery(result: { data: unknown; error: null; count?: number }) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  const chain = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args });
    return builder;
  };

  for (const m of [
    'select', 'eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in', 'is', 'ilike',
    'contains', 'overlaps', 'or', 'order', 'range', 'limit', 'insert',
    'update', 'delete', 'upsert',
  ]) {
    builder[m] = chain(m);
  }
  builder.maybeSingle = () => {
    calls.push({ method: 'maybeSingle', args: [] });
    return Promise.resolve(result);
  };
  builder.single = () => {
    calls.push({ method: 'single', args: [] });
    return Promise.resolve(result);
  };
  // Awaiting the builder itself resolves the query (PostgREST is thenable).
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);

  return { builder, calls };
}

function withFakeTable(result: { data: unknown; error: null; count?: number }) {
  const { builder, calls } = fakeQuery(result);
  mock.method(supabaseAdmin, 'from', () => builder as never);
  return calls;
}

const find = (calls: Call[], method: string) => calls.filter((c) => c.method === method);

test('list translates filters, sort, search and paging', async () => {
  const calls = withFakeTable({ data: [], error: null, count: 42 });
  const repo = new BaseRepository<IBlog>(blogsTable, 'Blog');

  await repo.list({
    filter: { status: 'published', categorySlug: 'ai' },
    search: 'python',
    searchableFields: ['title', 'excerpt', 'tags'],
    sort: [{ field: 'date', direction: -1 }],
    page: 3,
    limit: 10,
  });

  // Exact-match filters land on the right columns.
  assert.deepEqual(find(calls, 'eq').map((c) => c.args), [
    ['status', 'published'],
    ['category_slug', 'ai'],
  ]);

  // Search becomes an OR of ILIKEs; `tags` is redirected to its companion.
  const or = find(calls, 'or')[0].args[0] as string;
  assert.ok(or.includes('title.ilike.'));
  assert.ok(or.includes('excerpt.ilike.'));
  assert.ok(or.includes('tags_text.ilike.'), 'text[] search uses the tags_text column');
  assert.ok(!or.includes('tags.ilike.'));

  // Descending sort with Mongo's null ordering.
  assert.deepEqual(find(calls, 'order')[0].args, ['date', { ascending: false, nullsFirst: false }]);

  // page 3, limit 10 -> rows 20..29, the equivalent of skip(20).limit(10).
  assert.deepEqual(find(calls, 'range')[0].args, [20, 29]);
});

test('ascending sort puts nulls first, matching MongoDB ordering', async () => {
  const calls = withFakeTable({ data: [], error: null, count: 0 });
  const repo = new BaseRepository<IBlog>(blogsTable, 'Blog');
  await repo.list({ sort: [{ field: 'title', direction: 1 }] });
  assert.deepEqual(find(calls, 'order')[0].args, ['title', { ascending: true, nullsFirst: true }]);
});

test('unknown filter and sort keys never reach the database', async () => {
  const calls = withFakeTable({ data: [], error: null, count: 0 });
  const repo = new BaseRepository<IBlog>(blogsTable, 'Blog');

  await repo.list({
    filter: { status: 'published', notAColumn: 'x', 'id=1 or 1=1': 'y' },
    sort: [{ field: 'nonexistent', direction: -1 }],
  });

  assert.deepEqual(find(calls, 'eq').map((c) => c.args), [['status', 'published']]);
  assert.equal(find(calls, 'order').length, 0);
});

test('comparison operators map to their PostgREST equivalents', async () => {
  const calls = withFakeTable({ data: null, error: null });
  const repo = new BaseRepository<IBlog>(blogsTable, 'Blog');

  await repo.findOne({
    slug: { op: 'neq', value: 'current' },
    date: { op: 'lt', value: '2024-01-01' },
  });

  assert.deepEqual(find(calls, 'neq')[0].args, ['slug', 'current']);
  assert.deepEqual(find(calls, 'lt')[0].args, ['date', '2024-01-01']);
});

test('case-insensitive tag match uses delimiter-bracketed ILIKE', async () => {
  const calls = withFakeTable({ data: [], error: null, count: 0 });
  const repo = new BaseRepository<IBlog>(blogsTable, 'Blog');

  await repo.list({ filter: { tags: { op: 'arrayIncludesInsensitive', value: 'Machine Learning' } } });

  // '%|Machine Learning|%' matches the element exactly, ignoring case, and
  // cannot match a longer tag that merely contains the term.
  assert.deepEqual(find(calls, 'ilike')[0].args, ['tags_text', '%|Machine Learning|%']);
});

test('search terms are escaped so LIKE wildcards are matched literally', () => {
  // The old implementation escaped RegExp metacharacters; the LIKE equivalent
  // is escaping the LIKE wildcards, so "50%" still means a literal "50%".
  assert.equal(escapeLikeTerm('50%'), '50\\%');
  assert.equal(escapeLikeTerm('a_b'), 'a\\_b');
  assert.equal(escapeLikeTerm('back\\slash'), 'back\\\\slash');
});

test('filter values are quoted so punctuation cannot break out of the syntax', () => {
  // A comma or parenthesis would otherwise be parsed as PostgREST filter syntax.
  assert.equal(quoteFilterValue('a,b'), '"a,b"');
  assert.equal(quoteFilterValue('say "hi"'), '"say \\"hi\\""');
  assert.equal(quoteFilterValue('a)or(b'), '"a)or(b"');
});

test('search injection attempt stays inside a quoted value', async () => {
  const calls = withFakeTable({ data: [], error: null, count: 0 });
  const repo = new BaseRepository<IBlog>(blogsTable, 'Blog');

  await repo.list({ search: 'x,status.eq.draft', searchableFields: ['title'] });

  const or = find(calls, 'or')[0].args[0] as string;
  assert.equal(or, 'title.ilike."%x,status.eq.draft%"');
});

test('deleteById reports whether a row actually matched', async () => {
  withFakeTable({ data: null, error: null });
  const repo = new BaseRepository<IBlog>(blogsTable, 'Blog');
  assert.equal(await repo.deleteById('missing'), false);

  withFakeTable({ data: { id: 'abc' }, error: null });
  const repo2 = new BaseRepository<IBlog>(blogsTable, 'Blog');
  assert.equal(await repo2.deleteById('abc'), true);
});

/* ── Request parsing / pagination contract ────────────────────────────────── */

test('parseListParams keeps the documented query contract', () => {
  const params = parseListParams(
    { page: '2', limit: '5', sort: '-date,title', q: ' python ', status: 'published', junk: 'x' },
    ['status'],
  );

  assert.equal(params.page, 2);
  assert.equal(params.limit, 5);
  assert.deepEqual(params.sort, { date: -1, title: 1 });
  assert.equal(params.search, 'python');
  assert.deepEqual(params.filters, { status: 'published' });
});

test('limit is capped and "all" filters are ignored', () => {
  assert.equal(parseListParams({ limit: '9999' }).limit, 100);
  assert.deepEqual(parseListParams({ status: 'all' }, ['status']).filters, {});
  assert.deepEqual(parseListParams({ featured: 'true' }, ['featured']).filters, { featured: true });
});

test('sort precedence survives the conversion to sort specs', () => {
  assert.deepEqual(toSortSpecs({ order: 1, createdAt: -1 }), [
    { field: 'order', direction: 1 },
    { field: 'createdAt', direction: -1 },
  ]);
});

test('pagination meta keeps both naming conventions the frontend reads', () => {
  const meta = buildPaginationMeta(42, 2, 10);
  assert.deepEqual(meta, {
    total: 42,
    page: 2,
    limit: 10,
    totalPages: 5,
    hasNextPage: true,
    hasPrevPage: true,
    hasNext: true,
    hasPrev: true,
  });
  assert.equal(buildPaginationMeta(0, 1, 10).totalPages, 1);
});
