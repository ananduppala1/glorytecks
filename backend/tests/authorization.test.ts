import './setup';
import { PRINCIPALS, SENTINEL } from './authzTestEnv';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import jwt from 'jsonwebtoken';
import { AddressInfo } from 'net';
import app from '../src/app';

/**
 * Role-based access control, exercised through the real middleware stack.
 *
 * The per-module routers are easy to read and easy to verify. The case that is
 * neither — and the one that was actually wrong — is an endpoint that every
 * role may call but which AGGREGATES modules that not every role may read.
 * `/dashboard/stats` is that endpoint: it carries `requireAuth` and no
 * `authorize`, and it returned the five most recent enquiries and demo
 * requests, complete with names, emails and phone numbers, to any signed-in
 * account — including the roles that get a flat 403 from /enquiries itself.
 */

let server: http.Server;
let base: string;

test.before(async () => {
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.after(() => server.close());

const SUBJECT: Record<string, string> = {
  admin: '00000000-0000-4000-8000-000000000001',
  receptionist: '00000000-0000-4000-8000-000000000002',
  content_writer: '00000000-0000-4000-8000-000000000003',
  editor: '00000000-0000-4000-8000-000000000004',
  viewer: '00000000-0000-4000-8000-000000000005',
  deactivated: '00000000-0000-4000-8000-000000000006',
};

function tokenFor(who: keyof typeof SUBJECT, claims: Record<string, unknown> = {}): string {
  return jwt.sign(
    { sub: SUBJECT[who], aud: 'authenticated', ...claims },
    process.env.SUPABASE_JWT_SECRET as string,
    { expiresIn: '1h' },
  );
}

function call(
  path: string,
  opts: { method?: string; token?: string; body?: string } = {},
): Promise<{ status: number; raw: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(base + path);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: opts.method ?? 'GET',
        headers: {
          ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
          ...(opts.body
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(opts.body) }
            : {}),
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (raw += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, raw }));
      },
    );
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

/* ── the aggregate must obey the same rule as the modules it aggregates ──── */

test('the dashboard never hands lead PII to a role the lead routes refuse', async () => {
  for (const who of ['content_writer', 'editor', 'viewer'] as const) {
    // Established first: this role genuinely cannot read leads directly.
    const direct = await call('/api/v1/enquiries', { token: tokenFor(who) });
    assert.equal(direct.status, 403, `${who} must be refused by /enquiries`);
    const directDemo = await call('/api/v1/demo-requests', { token: tokenFor(who) });
    assert.equal(directDemo.status, 403, `${who} must be refused by /demo-requests`);

    // So the aggregate must not hand over the same data by another door.
    const dash = await call('/api/v1/dashboard/stats', { token: tokenFor(who) });
    assert.equal(dash.status, 200, `${who} still gets a dashboard`);
    for (const [label, value] of Object.entries({
      name: SENTINEL.leadName,
      email: SENTINEL.leadEmail,
      phone: SENTINEL.leadPhone,
    })) {
      assert.ok(
        !dash.raw.includes(value),
        `/dashboard/stats leaked a lead ${label} to ${who}`,
      );
    }

    const body = JSON.parse(dash.raw) as { data: { recent: Record<string, unknown[]> } };
    assert.deepEqual(body.data.recent.enquiries, [], 'the key must survive, emptied');
    assert.deepEqual(body.data.recent.demoRequests, []);
  }
});

test('the dashboard still shows leads to the roles that own them', async () => {
  for (const who of ['admin', 'receptionist'] as const) {
    const dash = await call('/api/v1/dashboard/stats', { token: tokenFor(who) });
    assert.equal(dash.status, 200);
    assert.ok(dash.raw.includes(SENTINEL.leadEmail), `${who} must still see enquiries`);
    assert.ok(dash.raw.includes(SENTINEL.leadPhone), `${who} must still see demo requests`);
  }
});

test('the dashboard scopes unpublished content to the roles that may read it', async () => {
  for (const who of ['admin', 'content_writer'] as const) {
    const dash = await call('/api/v1/dashboard/stats', { token: tokenFor(who) });
    assert.ok(dash.raw.includes(SENTINEL.draftTitle), `${who} must still see recent blogs`);
  }
  for (const who of ['receptionist', 'editor', 'viewer'] as const) {
    const dash = await call('/api/v1/dashboard/stats', { token: tokenFor(who) });
    assert.ok(
      !dash.raw.includes(SENTINEL.draftTitle),
      `/dashboard/stats leaked an unpublished blog title to ${who}`,
    );
  }
});

test('the aggregate counts stay visible to every role', async () => {
  // Deliberately NOT restricted. Counts are aggregates, not personal data, and
  // the dashboard's headline cards are the whole point of the screen for the
  // roles that have no module of their own.
  const dash = await call('/api/v1/dashboard/stats', { token: tokenFor('viewer') });
  const body = JSON.parse(dash.raw) as { data: { counts: Record<string, number> } };
  assert.equal(typeof body.data.counts.enquiries, 'number');
  assert.equal(typeof body.data.counts.blogs, 'number');
});

/* ── the guarantees the module routers already gave, pinned ─────────────── */

test('role boundaries hold on the module routes themselves', async () => {
  const matrix: Array<[string, string[], string[]]> = [
    // path, roles allowed, roles refused
    ['/api/v1/blogs', ['admin', 'content_writer'], ['receptionist', 'editor', 'viewer']],
    ['/api/v1/courses', ['admin', 'content_writer'], ['receptionist', 'editor', 'viewer']],
    ['/api/v1/enquiries', ['admin', 'receptionist'], ['content_writer', 'editor', 'viewer']],
    ['/api/v1/demo-requests', ['admin', 'receptionist'], ['content_writer', 'editor', 'viewer']],
    ['/api/v1/admins', ['admin'], ['receptionist', 'content_writer', 'editor', 'viewer']],
    ['/api/v1/legal', ['admin'], ['receptionist', 'content_writer', 'editor', 'viewer']],
  ];
  for (const [path, allowed, refused] of matrix) {
    for (const who of refused) {
      const res = await call(path, { token: tokenFor(who as keyof typeof SUBJECT) });
      assert.equal(res.status, 403, `${who} must be refused ${path}`);
    }
    for (const who of allowed) {
      const res = await call(path, { token: tokenFor(who as keyof typeof SUBJECT) });
      assert.notEqual(res.status, 403, `${who} must be allowed ${path}`);
      assert.notEqual(res.status, 401, `${who} must be authenticated for ${path}`);
    }
    const anon = await call(path);
    assert.equal(anon.status, 401, `${path} must refuse an anonymous caller`);
  }
});

test('authorization never comes from the token', async () => {
  // The role is read from admin_users on every request. A caller who controls
  // their own claims must not be able to promote themselves by asserting one.
  const forged = tokenFor('viewer', {
    role: 'admin',
    user_role: 'admin',
    app_metadata: { role: 'admin' },
    user_metadata: { role: 'admin' },
  });
  const res = await call('/api/v1/admins', { token: forged });
  assert.equal(res.status, 403, 'a role claim in the token must carry no weight');
});

test('a deactivated account is refused even with a perfectly valid token', async () => {
  assert.equal(PRINCIPALS[SUBJECT.deactivated].isActive, false);
  const res = await call('/api/v1/admins', { token: tokenFor('deactivated') });
  assert.equal(res.status, 401);
});

test('tampered, expired and mis-scoped tokens are all refused', async () => {
  const secret = process.env.SUPABASE_JWT_SECRET as string;
  const sub = SUBJECT.admin;
  const cases: Array<[string, string]> = [
    ['alg=none', jwt.sign({ sub, aud: 'authenticated' }, '', { algorithm: 'none' })],
    ['wrong secret', jwt.sign({ sub, aud: 'authenticated' }, 'attacker-secret', { expiresIn: '1h' })],
    ['expired', jwt.sign({ sub, aud: 'authenticated' }, secret, { expiresIn: -60 })],
    ['wrong audience', jwt.sign({ sub, aud: 'anon' }, secret, { expiresIn: '1h' })],
    ['no subject', jwt.sign({ aud: 'authenticated' }, secret, { expiresIn: '1h' })],
    ['valid signature, unknown subject', jwt.sign(
      { sub: '99999999-9999-4999-8999-999999999999', aud: 'authenticated' }, secret, { expiresIn: '1h' })],
  ];
  for (const [label, token] of cases) {
    const res = await call('/api/v1/admins', { token });
    assert.equal(res.status, 401, `${label} must be refused`);
  }
});

test('the profile endpoint refuses to write anything but the fields it names', async () => {
  // Mass assignment against one's own row: the fields that decide privilege.
  for (const body of [
    '{"name":"x","role":"admin"}',
    '{"name":"x","isActive":true}',
    '{"name":"x","is_active":true}',
    '{"name":"x","id":"00000000-0000-4000-8000-000000000001"}',
    '{"name":"x","email":"attacker@evil.invalid"}',
  ]) {
    const res = await call('/api/v1/auth/profile', {
      method: 'PATCH',
      token: tokenFor('viewer'),
      body,
    });
    assert.equal(res.status, 422, `must be refused: ${body}`);
    assert.match(res.raw, /Unexpected field/);
  }
});
