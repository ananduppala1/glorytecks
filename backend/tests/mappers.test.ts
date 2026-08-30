import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import { rowToApi, apiToRow, buildSelect, resolveColumn, toIsoString } from '../src/db/mappers';
import { blogsTable, blogCategoriesTable, settingsTable, adminUsersTable } from '../src/db/schema';
import { IBlog, IBlogCategory, ISettings } from '../src/interfaces/common';

/**
 * The mapping layer is where an API-contract regression would hide, so these
 * assertions pin the exact JSON shape the frontends already consume.
 */

test('rowToApi emits both id and _id, as list rows did before', () => {
  const doc = rowToApi<IBlog>(blogsTable, {
    id: 'b3c1f0a2-1111-2222-3333-444455556666',
    slug: 'hello',
    title: 'Hello',
    category: 'AI',
    category_slug: 'ai',
    tags: ['a'],
    created_at: '2024-01-01T00:00:00+00:00',
    updated_at: '2024-01-02T00:00:00+00:00',
  })!;

  assert.equal(doc.id, 'b3c1f0a2-1111-2222-3333-444455556666');
  assert.equal(doc._id, doc.id);
});

test('rowToApi omits null columns rather than emitting null', () => {
  const doc = rowToApi<IBlog>(blogsTable, {
    id: 'x',
    slug: 'hello',
    title: 'Hello',
    featured_image: null,
    published_at: null,
  })!;

  // Mongoose left unset paths off the document entirely; emitting null would
  // be a contract change.
  assert.equal('featuredImage' in doc, false);
  assert.equal('publishedAt' in doc, false);
  assert.equal(doc.slug, 'hello');
});

test('rowToApi omits columns that were never selected', () => {
  const doc = rowToApi<IBlog>(blogsTable, { id: 'x', slug: 'only-slug' })!;
  assert.deepEqual(Object.keys(doc).sort(), ['_id', 'id', 'slug']);
});

test('timestamps are normalised to the previous ISO-with-Z format', () => {
  assert.equal(toIsoString('2024-03-05T10:20:30+00:00'), '2024-03-05T10:20:30.000Z');
  const doc = rowToApi<IBlog>(blogsTable, {
    id: 'x',
    created_at: '2024-03-05T10:20:30+00:00',
    updated_at: '2024-03-05T10:20:30+00:00',
  })!;
  assert.equal(doc.createdAt, '2024-03-05T10:20:30.000Z');
});

test('seo sub-document is rebuilt from its flattened columns', () => {
  const doc = rowToApi<IBlog>(blogsTable, {
    id: 'x',
    seo_meta_title: 'Title',
    seo_meta_description: null,
    seo_keywords: ['a', 'b'],
    seo_noindex: false,
  })!;

  // keywords/noindex had Mongoose defaults so they were always serialised;
  // metaDescription had none, so it stays absent when unset.
  assert.deepEqual(doc.seo, { metaTitle: 'Title', keywords: ['a', 'b'], noindex: false });
});

test('salary band is rebuilt from its three columns', () => {
  const doc = rowToApi<IBlogCategory>(blogCategoriesTable, {
    id: 'x',
    salary_fresher: '4 LPA',
    salary_mid: '10 LPA',
    salary_senior: '20 LPA',
  })!;
  assert.deepEqual(doc.salary, { fresher: '4 LPA', mid: '10 LPA', senior: '20 LPA' });
});

test('order maps to order_index in both directions', () => {
  assert.equal(resolveColumn(blogCategoriesTable, 'order'), 'order_index');
  const row = apiToRow(blogCategoriesTable, { order: 7 });
  assert.deepEqual(row, { order_index: 7 });
});

test('apiToRow only writes keys present in the payload', () => {
  const row = apiToRow(blogsTable, { title: 'New title' });
  // A partial update must not blank out every other column.
  assert.deepEqual(row, { title: 'New title' });
});

test('apiToRow drops unknown keys so a client cannot write arbitrary columns', () => {
  const row = apiToRow(adminUsersTable, {
    name: 'Real',
    id: 'attacker-supplied',
    is_active: true,
    someInjectedColumn: 'nope',
  });
  assert.deepEqual(row, { name: 'Real' });
});

test('seo partial write touches only the named leaf', () => {
  const row = apiToRow(blogsTable, { seo: { metaTitle: 'Only this' } });
  assert.deepEqual(row, { seo_meta_title: 'Only this' });
});

test('settings heroSection round-trips through its nested shape', () => {
  const doc = rowToApi<ISettings>(settingsTable, {
    id: 'x',
    site_name: 'GloryTecks',
    hero_badge: 'Badge',
    hero_primary_cta_text: 'Book',
    hero_primary_cta_link: '/demo',
    hero_overlay_label: 'Hike',
    hero_overlay_value: '3x',
    hero_overlay_suffix: 'after',
    hero_badges: ['one'],
    hero_trust_points: [],
  })!;

  assert.equal(doc.heroSection?.badge, 'Badge');
  assert.deepEqual(doc.heroSection?.primaryCta, { text: 'Book', link: '/demo' });
  assert.equal(doc.heroSection?.overlayCard.value, '3x');
});

test('settings nested partial update writes one column only', () => {
  const row = apiToRow(settingsTable, { heroSection: { primaryCta: { text: 'Changed' } } });
  assert.deepEqual(row, { hero_primary_cta_text: 'Changed' });
});

test('social partial update leaves sibling networks alone', () => {
  const row = apiToRow(settingsTable, { social: { instagram: 'https://ig' } });
  assert.deepEqual(row, { social_instagram: 'https://ig' });
});

test('relations map to their foreign key column', () => {
  assert.deepEqual(apiToRow(blogsTable, { author: 'uuid-1' }), { author_id: 'uuid-1' });
  // A populated object sent back unchanged by the client still resolves.
  assert.deepEqual(apiToRow(blogsTable, { author: { id: 'uuid-2', name: 'A' } }), {
    author_id: 'uuid-2',
  });
  // Clearing the reference.
  assert.deepEqual(apiToRow(blogsTable, { author: null }), { author_id: null });
});

test('embedded author row becomes the populated author object', () => {
  const doc = rowToApi<IBlog>(blogsTable, {
    id: 'x',
    author: { id: 'a1', name: 'Ravi', key: 'ravi', avatar: null },
  })!;
  assert.deepEqual(doc.author, { id: 'a1', _id: 'a1', name: 'Ravi', key: 'ravi' });
});

test('buildSelect includes the relation embed and honours a field projection', () => {
  const full = buildSelect(blogsTable);
  assert.ok(full.includes('author:authors(id,name,key,role,initials,avatar)'));
  assert.ok(full.includes('created_at'));

  const detail = buildSelect(blogsTable, { detail: true });
  assert.ok(detail.includes('bio'), 'detail reads also select the author bio');

  const projected = buildSelect(blogsTable, { fields: ['slug', 'title'] });
  assert.equal(projected, 'id,slug,title');
  assert.ok(!projected.includes('content'), 'list projection excludes the heavy body');
});

test('resolveColumn refuses fields that are not on the table', () => {
  assert.equal(resolveColumn(blogsTable, 'title'), 'title');
  assert.equal(resolveColumn(blogsTable, 'createdAt'), 'created_at');
  assert.equal(resolveColumn(blogsTable, 'password'), null);
  assert.equal(resolveColumn(blogsTable, 'id); drop table blogs; --'), null);
});
