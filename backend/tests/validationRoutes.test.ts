import './setup';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { AddressInfo } from 'net';
import app from '../src/app';
import { supabaseAdmin } from '../src/config/supabase';
import { adminUserRepo } from '../src/repositories';
import { Role } from '../src/constants';
import { LIMITS } from '../src/validators/common';

/**
 * Validation as the request actually meets it.
 *
 * The unit tests prove each rule works; these prove the rules are mounted, on
 * the right routes, in front of the right handlers. A schema that exists but
 * is not wired in is the failure mode that matters, and it is invisible to a
 * unit test.
 *
 * Supabase is unreachable under test, so a request that PASSES validation
 * reaches the repository and fails there with 503. That makes 503 the signal
 * for "accepted", and any 4xx the signal for "rejected" — which is exactly the
 * distinction each case below needs.
 */

let server: http.Server;
let base: string;

test.before(async () => {
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

test.after(() => server.close());

interface Reply {
  status: number;
  raw: string;
  body: { message?: string; code?: string; errors?: { field?: string; message: string }[] };
}

function call(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<Reply> {
  const payload = opts.body === undefined ? undefined : JSON.stringify(opts.body);
  return new Promise((resolve, reject) => {
    const url = new URL(base + path);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: opts.method ?? 'GET',
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(opts.auth === false ? {} : { Authorization: 'Bearer t' }),
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let body = {};
          try {
            body = JSON.parse(raw);
          } catch {
            /* asserted via raw */
          }
          resolve({ status: res.statusCode ?? 0, raw, body });
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function actingAs(role: Role) {
  mock.method(supabaseAdmin.auth, 'getUser', async () => ({
    data: { user: { id: `user-${role}` } },
    error: null,
  }));
  mock.method(adminUserRepo, 'findById', async () => ({
    id: `user-${role}`,
    name: role,
    email: `${role}@test.local`,
    role,
    isActive: true,
  }));
}

const UUID = '11111111-2222-4333-8444-555555555555';

/** Validation rejected it. */
const rejected = (res: Reply) => res.status === 400 || res.status === 422;
/** Validation accepted it; it failed later, at the unreachable database. */
const accepted = (res: Reply) => res.status === 503;

/* ── generic CRUD now has schemas ───────────────────────────────────────── */

test('a generic resource rejects a body of the wrong types', async () => {
  actingAs('admin');
  const res = await call('/trainers', {
    method: 'POST',
    body: { name: { $ne: null }, order: 'not-a-number', featured: 'yes', skills: 'not-a-list' },
  });
  assert.ok(rejected(res), `expected rejection, got ${res.status}`);
  const fields = (res.body.errors ?? []).map((e) => e.field);
  for (const expected of ['name', 'order', 'featured', 'skills']) {
    assert.ok(fields.includes(expected), `${expected} should have been reported`);
  }
});

test('a generic resource rejects unexpected fields', async () => {
  actingAs('admin');
  const res = await call('/trainers', {
    method: 'POST',
    body: { name: 'Real Trainer', role: 'admin', isSuperUser: true },
  });
  assert.ok(rejected(res), `expected rejection, got ${res.status}`);
  assert.match(res.raw, /Unexpected field/i);
});

test('a valid generic resource body is accepted', async () => {
  actingAs('admin');
  const res = await call('/trainers', {
    method: 'POST',
    body: { name: 'Real Trainer', title: 'Lead', skills: ['python'], featured: true, order: 3 },
  });
  assert.ok(accepted(res), `a valid body must pass validation, got ${res.status}: ${res.raw}`);
});

test('every generic resource enforces its required fields', async () => {
  actingAs('admin');
  for (const path of ['/trainers', '/authors', '/companies', '/faqs', '/gallery']) {
    const res = await call(path, { method: 'POST', body: {} });
    assert.ok(rejected(res), `${path} must require its mandatory fields, got ${res.status}`);
  }
});

test('string and array limits are enforced on a generic resource', async () => {
  actingAs('admin');
  const huge = await call('/trainers', {
    method: 'POST',
    body: { name: 'x'.repeat(LIMITS.NAME + 1) },
  });
  assert.ok(rejected(huge));

  const manySkills = await call('/trainers', {
    method: 'POST',
    body: { name: 'Ok', skills: Array.from({ length: LIMITS.ARRAY + 1 }, () => 'x') },
  });
  assert.ok(rejected(manySkills));
});

/* ── identifiers ────────────────────────────────────────────────────────── */

test('a non-UUID identifier is refused before any database call', async () => {
  actingAs('admin');
  for (const id of ['not-a-uuid', '../../etc/passwd', '1 OR 1=1', '%00', 'null']) {
    const res = await call(`/trainers/${encodeURIComponent(id)}`);
    assert.ok(rejected(res), `"${id}" must be refused, got ${res.status}`);
  }
  // A well-formed one gets through to the database.
  assert.ok(accepted(await call(`/trainers/${UUID}`)));
});

test('DELETE validates its identifier too', async () => {
  actingAs('admin');
  const res = await call('/trainers/not-a-uuid', { method: 'DELETE' });
  assert.ok(rejected(res), `expected rejection, got ${res.status}`);
});

test('a malformed public slug is refused', async () => {
  for (const slug of ['Not A Slug', '../secrets', 'a'.repeat(200), '-leading', 'has_underscore']) {
    const res = await call(`/public/courses/${encodeURIComponent(slug)}`, { auth: false });
    assert.ok(rejected(res) || res.status === 404, `"${slug}" must be refused, got ${res.status}`);
  }
});

/* ── list query surface ─────────────────────────────────────────────────── */

test('out-of-range pagination is reported rather than silently clamped', async () => {
  actingAs('admin');
  assert.ok(rejected(await call('/trainers?page=99999999')));
  assert.ok(rejected(await call('/trainers?limit=100000')));
  assert.ok(rejected(await call('/trainers?page=0')));
  assert.ok(accepted(await call('/trainers?page=2&limit=50')));
});

test('a pathological search term is refused', async () => {
  actingAs('admin');
  assert.ok(rejected(await call(`/trainers?q=${'x'.repeat(5000)}`)));
  assert.ok(accepted(await call('/trainers?q=python')));
});

test('a malformed sort parameter is refused', async () => {
  actingAs('admin');
  for (const sort of ['title;drop table', 'a b', '../x', 'x'.repeat(400)]) {
    const res = await call(`/trainers?sort=${encodeURIComponent(sort)}`);
    assert.ok(rejected(res), `sort="${sort}" must be refused, got ${res.status}`);
  }
  assert.ok(accepted(await call('/trainers?sort=-createdAt,name')));
});

/* ── payload shape ──────────────────────────────────────────────────────── */

test('a deeply nested body is refused', async () => {
  actingAs('admin');
  let deep: Record<string, unknown> = { name: 'x' };
  for (let i = 0; i < 40; i += 1) deep = { nested: deep };
  const res = await call('/trainers', { method: 'POST', body: deep });
  assert.ok(rejected(res), `expected rejection, got ${res.status}`);
  assert.match(res.raw, /deeply|too many/i);
});

test('a body with a prototype-polluting key is refused', async () => {
  actingAs('admin');
  const res = await call('/trainers', {
    method: 'POST',
    // JSON.parse produces a real own-property `__proto__`, unlike a literal.
    body: JSON.parse('{"name":"x","__proto__":{"polluted":true}}'),
  });
  assert.ok(rejected(res), `expected rejection, got ${res.status}`);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test('an oversized array in the body is refused', async () => {
  actingAs('admin');
  const res = await call('/trainers', {
    method: 'POST',
    body: { name: 'x', skills: Array.from({ length: 5000 }, (_, i) => `s${i}`) },
  });
  assert.ok(rejected(res), `expected rejection, got ${res.status}`);
});

/* ── blog content ───────────────────────────────────────────────────────── */

test('a blog with a hostile content block is refused', async () => {
  actingAs('admin');
  const res = await call('/blogs', {
    method: 'POST',
    body: {
      title: 'A post',
      categorySlug: 'data-science',
      content: [{ type: 'html', text: '<script>alert(1)</script>' }],
    },
  });
  assert.ok(rejected(res), `expected rejection, got ${res.status}`);
});

test('client-supplied rendered HTML never reaches the blog service', async () => {
  actingAs('admin');
  // `html` is derived from `content` by the server. Accepting it would let an
  // author store markup that never passed through the escaping renderer.
  const res = await call('/blogs', {
    method: 'POST',
    body: {
      title: 'A post',
      categorySlug: 'data-science',
      html: '<script>alert(document.cookie)</script>',
      content: [{ type: 'paragraph', text: 'safe' }],
    },
  });
  // Stripped, not rejected — the admin editor PUTs back the record it fetched.
  assert.ok(accepted(res), `expected the field to be stripped, got ${res.status}: ${res.raw}`);
});

test('a blog rejects an invalid status or kind', async () => {
  actingAs('admin');
  for (const body of [
    { title: 'x', categorySlug: 'c', status: 'live' },
    { title: 'x', categorySlug: 'c', kind: 'not-a-kind' },
  ]) {
    assert.ok(rejected(await call('/blogs', { method: 'POST', body })));
  }
});

/* ── leads: the only unauthenticated writes ─────────────────────────────── */

test('a public enquiry is bounded in every field', async () => {
  const base = { name: 'Real Person', email: 'a@b.co', phone: '9876543210', message: 'Hello there' };
  assert.ok(rejected(await call('/public/contact', { method: 'POST', auth: false, body: { ...base, message: 'x'.repeat(LIMITS.TEXT + 1) } })));
  assert.ok(rejected(await call('/public/contact', { method: 'POST', auth: false, body: { ...base, name: 'x'.repeat(LIMITS.NAME + 1) } })));
  assert.ok(rejected(await call('/public/contact', { method: 'POST', auth: false, body: { ...base, email: 'not-an-email' } })));
  assert.ok(rejected(await call('/public/contact', { method: 'POST', auth: false, body: { ...base, phone: 'call-me' } })));
});

test('a public submitter cannot set staff-only lead fields', async () => {
  const res = await call('/public/contact', {
    method: 'POST',
    auth: false,
    body: {
      name: 'Real Person',
      email: 'a@b.co',
      phone: '9876543210',
      message: 'Hello there',
      status: 'converted',
      notes: 'internal note',
    },
  });
  assert.ok(rejected(res), `status/notes must be refused, got ${res.status}`);
  assert.match(res.raw, /Unexpected field/i);
});

test('a lead status must be one of the known states', async () => {
  actingAs('admin');
  assert.ok(
    rejected(await call(`/enquiries/${UUID}/status`, { method: 'PATCH', body: { status: 'vip' } })),
  );
  assert.ok(
    accepted(await call(`/enquiries/${UUID}/status`, { method: 'PATCH', body: { status: 'contacted' } })),
  );
});

/* ── privilege escalation ───────────────────────────────────────────────── */

test('an unknown role cannot be assigned when creating an administrator', async () => {
  actingAs('admin');
  const res = await call('/admins', {
    method: 'POST',
    body: { name: 'New Admin', email: 'new@test.local', password: 'longenoughpw', role: 'superadmin' },
  });
  assert.ok(rejected(res), `an invented role must be refused, got ${res.status}`);
  assert.match(res.raw, /Role must be one of/i);
});

test('a viewer cannot grant itself a role through the profile route', async () => {
  actingAs('viewer');
  const res = await call('/auth/profile', {
    method: 'PATCH',
    body: { name: 'Viewer', role: 'admin', isActive: true },
  });
  assert.ok(rejected(res), `role must be refused on the profile route, got ${res.status}`);
  assert.match(res.raw, /Unexpected field/i);
});

test('the profile route still accepts what it is meant to', async () => {
  actingAs('viewer');
  const res = await call('/auth/profile', { method: 'PATCH', body: { name: 'New Name' } });
  assert.ok(accepted(res) || res.status === 404, `a legitimate update must pass, got ${res.status}`);
});

test('a lower-privileged role cannot reach admin management by guessing an id', async () => {
  // Vertical escalation: the route, not the payload, is the boundary.
  for (const role of ['viewer', 'receptionist', 'content_writer', 'editor'] as Role[]) {
    actingAs(role);
    const res = await call(`/admins/${UUID}`, { method: 'PUT', body: { name: 'Renamed' } });
    assert.equal(res.status, 403, `${role} must not reach admin management`);
  }
});

test('a content_writer cannot reach the lead queue, and a receptionist cannot reach blogs', async () => {
  // Horizontal separation between the two non-admin working roles.
  actingAs('content_writer');
  assert.equal((await call('/enquiries')).status, 403);
  assert.equal((await call(`/enquiries/${UUID}`)).status, 403);

  actingAs('receptionist');
  assert.equal((await call('/blogs')).status, 403);
  assert.equal((await call('/trainers', { method: 'POST', body: { name: 'x' } })).status, 403);
});

test('authorization is checked before validation, so a bad body cannot probe a route', async () => {
  // A 422 here instead of a 403 would tell an unauthorised caller that their
  // payload was at least being read — a small oracle, but a free one to close.
  actingAs('viewer');
  const res = await call('/trainers', { method: 'POST', body: { totally: 'invalid' } });
  assert.equal(res.status, 403);
});

/* ── regression: the payloads the admin UI actually sends ───────────────── */

/**
 * The admin app PUTs the record it just GET'd, so its payloads carry
 * server-owned fields and, in several places, fields the database has no
 * column for. Strict schemas that had not accounted for those would have
 * rejected every save from a working UI — a far worse outcome than the
 * unvalidated state they replaced. Each case below is the real shape from the
 * corresponding page.
 */

test('the blog editor payload (a full fetched record) is still accepted', async () => {
  actingAs('admin');
  const res = await call(`/blogs/${UUID}`, {
    method: 'PUT',
    body: {
      id: UUID,
      slug: 'a-post',
      title: 'A post',
      category: 'Data Science',
      categorySlug: 'data-science',
      kind: 'guide',
      excerpt: 'Short',
      status: 'draft',
      featured: false,
      trending: false,
      popular: false,
      tags: ['python'],
      author: { id: UUID, name: 'A', key: 'a' },
      authorKey: 'a',
      featuredImage: 'https://res.cloudinary.com/x.png',
      readTime: '5 min',
      date: '2026-01-01',
      updated: '2026-01-02',
      content: [{ type: 'paragraph', text: 'Body' }],
      // Server-derived, echoed back by the editor:
      html: '<p>Body</p>',
      toc: [],
      faqs: [],
      seo: { metaTitle: 'T', metaDescription: 'D' },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      publishedAt: null,
    },
  });
  assert.ok(accepted(res), `the blog editor payload must pass, got ${res.status}: ${res.raw}`);
});

test('the course form payload is still accepted', async () => {
  actingAs('admin');
  const res = await call(`/courses/${UUID}`, {
    method: 'PUT',
    body: {
      id: UUID,
      slug: 'data-science',
      title: 'Data Science',
      category: 'Analytics',
      tagline: 'Learn it',
      description: 'Long text',
      duration: '6 months',
      modules: ['One', 'Two'],
      tools: ['python'],
      projects: ['A project'],
      placement: 'Assistance provided',
      syllabus: [{ title: 'Module 1', items: ['Topic A', 'Topic B'] }],
      fees: '50000',
      skills: ['pandas'],
      bannerImage: 'https://res.cloudinary.com/b.png',
      images: ['https://res.cloudinary.com/c.png'],
      brochureUrl: 'https://res.cloudinary.com/d.pdf',
      faqs: [{ q: 'Q?', a: 'A.' }],
      status: 'published',
      featured: true,
      order: 1,
      trainer: UUID,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
  });
  assert.ok(accepted(res), `the course form payload must pass, got ${res.status}: ${res.raw}`);
});

test('the settings page payload, including its unmapped groups, is accepted', async () => {
  actingAs('admin');
  const res = await call('/settings', {
    method: 'PUT',
    body: {
      id: UUID,
      siteName: 'GloryTecks',
      tagline: 'Learn',
      phone: '+91 99999 99999',
      whatsapp: '+91 99999 99999',
      email: 'hello@glorytecks.com',
      address: 'Hyderabad',
      mapUrl: 'https://maps.google.com/x',
      homepageVideoUrl: 'https://www.youtube.com/watch?v=abc',
      announcementText: 'Enrolling now',
      logo: 'https://res.cloudinary.com/logo.png',
      defaultOgImage: 'https://res.cloudinary.com/og.png',
      social: { facebook: 'https://facebook.com/x', twitter: '' },
      stats: { studentsTrained: '5000', placementRate: '90%' },
      seo: { metaTitle: 'T', metaDescription: 'D' },
    },
  });
  assert.ok(accepted(res), `the settings payload must pass, got ${res.status}: ${res.raw}`);
});

test('the about page payload is accepted', async () => {
  actingAs('admin');
  const res = await call('/about', {
    method: 'PUT',
    body: {
      id: UUID,
      hero: { badge: 'About', heading: 'Who we are', description: 'Text', image: '/x.png' },
      sections: [
        { heading: 'H', eyebrow: 'E', body: 'B', bullets: ['one'], image: '/i.png', imageSide: 'left' },
      ],
      stats: [{ label: 'Students', value: '5000' }],
      cta: { heading: 'Join', buttonLink: '/contact' },
      seo: { metaTitle: 'T' },
    },
  });
  assert.ok(accepted(res), `the about payload must pass, got ${res.status}: ${res.raw}`);
});

test('generic resource forms that submit unmapped legacy fields still save', async () => {
  actingAs('admin');
  // `timing` on a batch and `salary` on a category are admin form fields with
  // no matching column. They are discarded today; they must not now 422.
  const batch = await call('/batches', {
    method: 'POST',
    body: { course: 'Data Science', mode: 'Online', startDate: '2026-03-01', timing: '10am', seats: 30 },
  });
  assert.ok(accepted(batch), `batch payload must pass, got ${batch.status}: ${batch.raw}`);

  const category = await call('/categories', {
    method: 'POST',
    body: { slug: 'data-science', name: 'Data Science', salary: '12 LPA', order: 1 },
  });
  assert.ok(accepted(category), `category payload must pass, got ${category.status}: ${category.raw}`);

  const locality = await call('/localities', {
    method: 'POST',
    body: { slug: 'madhapur', name: 'Madhapur', region: 'West', landmarks: ['Hitech City'] },
  });
  assert.ok(accepted(locality), `locality payload must pass, got ${locality.status}: ${locality.raw}`);
});
