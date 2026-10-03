import test from 'node:test';
import assert from 'node:assert/strict';

import { hashQuery } from '../src/lib/cache';

/**
 * Regression tests for the public-list cache key.
 *
 * `hashQuery` previously used `JSON.stringify(params, Object.keys(params).sort())`.
 * An array as the second argument to JSON.stringify is a property allow-list
 * applied at every level of nesting, so the keys inside `params.filters` were
 * stripped and `filters` serialised as `{}`. Every filtered public blog query
 * collided onto one cache key.
 *
 * Live consequence before the fix: `/public/blogs?categorySlug=aws` returned
 * 50 Python articles, because a Python request had populated the shared key
 * first. All twelve blog category archives served identical content.
 */

/** The exact shape `parseListParams` produces for the public blog list. */
const listParams = (filters: Record<string, unknown>) => ({
  page: 1,
  limit: 6,
  sort: [{ field: 'date', direction: -1 }],
  search: '',
  filters: { status: 'published', ...filters },
  tag: '',
  full: '',
});

test('different category filters produce different cache keys', () => {
  const python = hashQuery(listParams({ categorySlug: 'python' }));
  const aws = hashQuery(listParams({ categorySlug: 'aws' }));
  const mlops = hashQuery(listParams({ categorySlug: 'mlops' }));

  assert.notEqual(python, aws);
  assert.notEqual(aws, mlops);
  assert.notEqual(python, mlops);
});

test('a different filter dimension does not collide with a category', () => {
  assert.notEqual(
    hashQuery(listParams({ categorySlug: 'python' })),
    hashQuery(listParams({ kind: 'salary' })),
  );
  assert.notEqual(
    hashQuery(listParams({ featured: true })),
    hashQuery(listParams({ trending: true })),
  );
});

test('every distinct filter set in the public API gets its own key', () => {
  const variants = [
    {},
    { categorySlug: 'python' },
    { categorySlug: 'aws' },
    { categorySlug: 'data-science' },
    { kind: 'salary' },
    { kind: 'roadmap' },
    { featured: true },
    { trending: true },
    { popular: true },
    { categorySlug: 'python', kind: 'interview' },
  ];
  const keys = variants.map((v) => hashQuery(listParams(v)));
  assert.equal(new Set(keys).size, variants.length, 'cache keys collided across filter sets');
});

test('key order still does not affect the hash', () => {
  // The original intent of sorting keys — two objects that differ only in
  // property order must share a key — is preserved.
  const a = { page: 1, limit: 6, filters: { status: 'published', categorySlug: 'python' } };
  const b = { limit: 6, filters: { categorySlug: 'python', status: 'published' }, page: 1 };
  assert.equal(hashQuery(a), hashQuery(b));
});

test('nested ordering differences do not affect the hash', () => {
  const a = { filters: { a: 1, b: { x: 1, y: 2 } } };
  const b = { filters: { b: { y: 2, x: 1 }, a: 1 } };
  assert.equal(hashQuery(a), hashQuery(b));
});

test('array order is significant, because sort order is', () => {
  assert.notEqual(
    hashQuery({ sort: [{ field: 'date' }, { field: 'title' }] }),
    hashQuery({ sort: [{ field: 'title' }, { field: 'date' }] }),
  );
});

test('pagination and search remain part of the key', () => {
  assert.notEqual(hashQuery(listParams({})), hashQuery({ ...listParams({}), page: 2 }));
  assert.notEqual(hashQuery(listParams({})), hashQuery({ ...listParams({}), search: 'python' }));
  assert.notEqual(hashQuery(listParams({})), hashQuery({ ...listParams({}), limit: 24 }));
});

test('undefined values do not change the key', () => {
  assert.equal(hashQuery({ a: 1 }), hashQuery({ a: 1, b: undefined }));
});
