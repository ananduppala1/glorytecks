/**
 * Bootstrap for the role-scoping tests. Import AFTER `./setup`.
 *
 * Two things have to be true before `src/app` is loaded, and neither can be
 * arranged from inside a test body — module imports are hoisted above ordinary
 * statements, so by the time a test runs, `config/env` has already been read.
 *
 *  1. SUPABASE_JWT_SECRET must be set, so `requireAuth` takes the LOCAL
 *     verification path and a test can mint a token for a chosen subject
 *     instead of calling out to an auth server.
 *  2. `fetch` must answer PostgREST, because these tests are about what a
 *     handler RETURNS, not about how it fails. `setup.ts` deliberately refuses
 *     every database call so route tests can assert "got as far as the DB";
 *     here the database has to actually reply.
 */
process.env.SUPABASE_JWT_SECRET =
  process.env.SUPABASE_JWT_SECRET ?? 'authz-test-hs256-secret-not-a-real-credential';

/** Subject id -> the `admin_users` row `requireAuth` will read for it. */
export const PRINCIPALS: Record<string, { role: string; isActive: boolean }> = {
  '00000000-0000-4000-8000-000000000001': { role: 'admin', isActive: true },
  '00000000-0000-4000-8000-000000000002': { role: 'receptionist', isActive: true },
  '00000000-0000-4000-8000-000000000003': { role: 'content_writer', isActive: true },
  '00000000-0000-4000-8000-000000000004': { role: 'editor', isActive: true },
  '00000000-0000-4000-8000-000000000005': { role: 'viewer', isActive: true },
  '00000000-0000-4000-8000-000000000006': { role: 'admin', isActive: false },
};

/**
 * Sentinels. Each is unique, so a test can assert on the RAW response body:
 * if the string is absent, that field did not reach the client, whatever shape
 * the payload happens to have.
 */
export const SENTINEL = {
  leadEmail: 'lead-pii-email@sentinel.invalid',
  leadName: 'LeadPiiSentinelName',
  leadPhone: '+10000000042',
  draftTitle: 'UnpublishedDraftSentinelTitle',
};

const ROWS: Record<string, Array<Record<string, unknown>>> = {
  contact_enquiries: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: SENTINEL.leadName,
      email: SENTINEL.leadEmail,
      course: 'Course',
      status: 'new',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ],
  demo_requests: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: SENTINEL.leadName,
      phone: SENTINEL.leadPhone,
      course: 'Course',
      status: 'new',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ],
  blogs: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      title: SENTINEL.draftTitle,
      slug: 'unpublished-draft-sentinel',
      status: 'draft',
      category: 'Cat',
      updated_at: '2026-01-01T00:00:00.000Z',
      date: '2026-01-01T00:00:00.000Z',
    },
  ],
};

const realFetch = globalThis.fetch;
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(
    typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url,
  );
  if (!url.includes('127.0.0.1:54321')) return realFetch(input, init);

  const headers = (init?.headers ?? {}) as Record<string, string>;
  const accept = String(headers.Accept ?? headers.accept ?? '');
  const prefer = String(headers.Prefer ?? headers.prefer ?? '');
  const table = url.split('/rest/v1/')[1]?.split('?')[0] ?? '';
  const json = { 'Content-Type': 'application/json' };

  // The identity lookup behind requireAuth.
  if (table === 'admin_users' && url.includes('id=eq.')) {
    const sub = url.match(/id=eq\.([0-9a-f-]+)/i)?.[1] ?? '';
    const p = PRINCIPALS[sub];
    const rows = p
      ? [{ id: sub, name: 'Test User', email: `${p.role}@test.invalid`, role: p.role, is_active: p.isActive }]
      : [];
    if (accept.includes('pgrst.object')) {
      return Promise.resolve(
        rows.length
          ? new Response(JSON.stringify(rows[0]), { status: 200, headers: json })
          : new Response(null, { status: 204, headers: json }),
      );
    }
    return Promise.resolve(new Response(JSON.stringify(rows), { status: 200, headers: json }));
  }

  // `count()` is a head request that reads the row total off Content-Range.
  if (prefer.includes('count=')) {
    return Promise.resolve(
      new Response(null, { status: 200, headers: { ...json, 'Content-Range': '0-0/7' } }),
    );
  }

  const rows = ROWS[table] ?? [];
  if (accept.includes('pgrst.object')) {
    return Promise.resolve(
      rows.length
        ? new Response(JSON.stringify(rows[0]), { status: 200, headers: json })
        : new Response(null, { status: 204, headers: json }),
    );
  }
  return Promise.resolve(new Response(JSON.stringify(rows), { status: 200, headers: json }));
}) as typeof fetch;
