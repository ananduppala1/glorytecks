import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, ERROR_CODE } from '../src/utils/ApiError';
import { redact, redactText, maskPii, safePath, safeHeaders } from '../src/utils/redact';
import { isConnectivityFailure } from '../src/utils/errorKind';
import { toApiError } from '../src/repositories/BaseRepository';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Error classification and redaction.
 *
 * These test the two halves of the same rule: what is allowed to leave the
 * process in a response, and what is allowed to be written to a log. The
 * route-level tests in errorResponses.test.ts prove the rule is actually
 * wired into the request path.
 */

/* ── classification ─────────────────────────────────────────────────────── */

test('every error class carries a stable code and the right status', () => {
  const cases: Array<[ApiError, number, string]> = [
    [ApiError.badRequest(), 400, ERROR_CODE.BAD_REQUEST],
    [ApiError.unauthorized(), 401, ERROR_CODE.AUTHENTICATION],
    [ApiError.forbidden(), 403, ERROR_CODE.AUTHORIZATION],
    [ApiError.notFound(), 404, ERROR_CODE.NOT_FOUND],
    [ApiError.conflict(), 409, ERROR_CODE.CONFLICT],
    [ApiError.payloadTooLarge(), 413, ERROR_CODE.PAYLOAD_TOO_LARGE],
    [ApiError.unsupportedMediaType(), 415, ERROR_CODE.UNSUPPORTED_MEDIA_TYPE],
    [ApiError.unprocessable(), 422, ERROR_CODE.VALIDATION],
    [ApiError.tooMany(), 429, ERROR_CODE.RATE_LIMITED],
    [ApiError.internal(), 500, ERROR_CODE.INTERNAL],
    [ApiError.serviceUnavailable(), 503, ERROR_CODE.SERVICE_UNAVAILABLE],
  ];
  for (const [err, status, code] of cases) {
    assert.equal(err.statusCode, status);
    assert.equal(err.code, code);
  }
});

test('only internal errors are marked non-operational', () => {
  // isOperational is what licenses a message to be returned. Getting this
  // wrong in either direction is the whole failure mode this phase is about.
  assert.equal(ApiError.internal().isOperational, false);
  for (const err of [
    ApiError.badRequest(),
    ApiError.unauthorized(),
    ApiError.forbidden(),
    ApiError.notFound(),
    ApiError.conflict(),
    ApiError.unprocessable(),
    ApiError.serviceUnavailable(),
  ]) {
    assert.equal(err.isOperational, true, `${err.code} should be operational`);
  }
});

test('withLogDetail keeps the public message and status unchanged', () => {
  const base = ApiError.serviceUnavailable('Temporarily unavailable');
  const withDetail = base.withLogDetail({ host: '10.0.0.5', port: 6379 });
  assert.equal(withDetail.message, 'Temporarily unavailable');
  assert.equal(withDetail.statusCode, 503);
  assert.equal(withDetail.code, base.code);
  assert.deepEqual(withDetail.logDetail, { host: '10.0.0.5', port: 6379 });
});

/* ── database error mapping ─────────────────────────────────────────────── */

const pgError = (code: string, extra: Partial<PostgrestError> = {}): PostgrestError =>
  ({
    code,
    message: 'duplicate key value violates unique constraint "blogs_slug_key"',
    details: 'Key (slug)=(my-post) already exists.',
    hint: 'Use a different slug',
    name: 'PostgrestError',
    ...extra,
  }) as PostgrestError;

test('known Postgres codes map to safe messages that never quote the database', () => {
  const cases: Array<[string, number]> = [
    ['23505', 409],
    ['23503', 400],
    ['23502', 422],
    ['23514', 422],
    ['22P02', 400],
  ];
  for (const [code, status] of cases) {
    const err = toApiError(pgError(code), 'Blog');
    assert.equal(err.statusCode, status, `${code} should map to ${status}`);
    // None of the constraint name, the column, or the conflicting value.
    for (const forbidden of ['blogs_slug_key', 'Key (slug)', 'my-post', 'constraint']) {
      assert.ok(
        !err.message.includes(forbidden),
        `${code} message must not contain "${forbidden}": ${err.message}`,
      );
    }
  }
});

test('an unknown Postgres code becomes a generic internal error, not a described one', () => {
  const err = toApiError(pgError('XX000', { message: 'internal error: cache lookup failed' }), 'Blog');
  assert.equal(err.statusCode, 500);
  assert.equal(err.isOperational, false);
  assert.equal(err.message, 'Internal server error');
  // The old wording was "Database error while handling Blog" — which told a
  // caller both which component failed and what the internal model is called.
  assert.ok(!err.message.includes('Blog'));
  assert.ok(!err.message.toLowerCase().includes('database'));
  // …but the detail is preserved for the log.
  assert.match(JSON.stringify(err.logDetail), /cache lookup failed/);
});

test('an unreachable database is a 503, not a 500', () => {
  // This is the shape supabase-js actually produces for a connection failure:
  // an empty code with the real cause buried in `details`.
  const outage = pgError('', {
    message: 'TypeError: fetch failed',
    details: 'Error: connect ECONNREFUSED 127.0.0.1:54321',
  });
  const err = toApiError(outage, 'Trainer');
  assert.equal(err.statusCode, 503);
  assert.ok(!err.message.includes('127.0.0.1'));
  assert.ok(!err.message.includes('ECONNREFUSED'));
});

/* ── connectivity detection ─────────────────────────────────────────────── */

test('connectivity failures are recognised through a cause chain', () => {
  const sys = Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:6379'), {
    code: 'ECONNREFUSED',
  });
  assert.equal(isConnectivityFailure(sys), true);

  // fetch() reports this shape: a bare TypeError with the errno on `cause`.
  const wrapped = Object.assign(new TypeError('fetch failed'), { cause: sys });
  assert.equal(isConnectivityFailure(wrapped), true);

  // A genuine bug must NOT be mistaken for an outage — that would answer 503
  // and tell an operator to wait for something that is never coming back.
  assert.equal(isConnectivityFailure(new TypeError("Cannot read properties of undefined")), false);
  assert.equal(isConnectivityFailure(ApiError.badRequest()), false);
});

/* ── redaction ──────────────────────────────────────────────────────────── */

test('secrets are redacted by key name wherever they appear', () => {
  const out = redact({
    authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature',
    cookie: 'gt_refresh_token=abc123',
    password: 'hunter2',
    newPassword: 'hunter3',
    apiKey: 'ck_live_123',
    api_key: 'x',
    SUPABASE_SERVICE_ROLE_KEY: 'srk_live',
    accessToken: 'ACCESSVALUE9',
    refresh_token: 'REFRESHVALUE9',
    jwtSecret: 'JWTSECRETVALUE9',
    nested: { deeper: { clientSecret: 'shh' } },
    title: 'A perfectly ordinary blog post',
  }) as Record<string, unknown>;

  const serialised = JSON.stringify(out);
  for (const secret of [
    'hunter2',
    'hunter3',
    'ck_live_123',
    'srk_live',
    'abc123',
    'shh',
    'ACCESSVALUE9',
    'REFRESHVALUE9',
    'JWTSECRETVALUE9',
  ]) {
    assert.ok(!serialised.includes(secret), `"${secret}" must not survive redaction`);
  }
  // Non-sensitive fields are untouched, or the log would be useless.
  assert.equal(out.title, 'A perfectly ordinary blog post');
});

test('personal data is masked rather than printed', () => {
  const out = redact({ email: 'alice@example.com', phone: '9876543210' }) as Record<string, string>;
  assert.ok(!out.email.includes('alice'));
  assert.ok(out.email.endsWith('@example.com'), 'the domain stays, for support');
  assert.ok(!out.phone.includes('98765'));
  assert.equal(maskPii('alice@example.com'), 'al***@example.com');
});

test('credentials embedded in a URL are redacted', () => {
  assert.equal(
    redactText('connect failed: redis://admin:s3cr3t@10.0.0.5:6379'),
    'connect failed: redis://[REDACTED]@10.0.0.5:6379',
  );
  assert.ok(!redactText('https://user:pw@db.internal/x').includes('pw'));
});

test('bearer tokens and JWTs are stripped from free text', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcdefghij';
  assert.ok(!redactText(`auth header was Bearer ${jwt}`).includes(jwt));
  assert.ok(!redactText(`token ${jwt} rejected`).includes(jwt));
});

test('redaction terminates on hostile input', () => {
  // A deeply nested or enormous body must not make logging the expensive part
  // of handling a hostile request.
  let deep: Record<string, unknown> = { end: 'value' };
  for (let i = 0; i < 200; i += 1) deep = { next: deep };
  assert.match(JSON.stringify(redact(deep)), /TRUNCATED/);

  const wide = Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`k${i}`, i]));
  assert.ok(JSON.stringify(redact(wide)).length < 2000);

  const long = redact({ note: 'x'.repeat(10_000) }) as Record<string, string>;
  assert.ok(long.note.length < 600);
});

test('a path is logged without its query VALUES', () => {
  assert.equal(safePath('/api/v1/blogs'), '/api/v1/blogs');
  const out = safePath('/api/v1/blogs?token=SECRET123&email=alice@example.com');
  assert.ok(!out.includes('SECRET123'));
  assert.ok(!out.includes('alice@example.com'));
  // The parameter names are kept — they are what makes the log useful.
  assert.match(out, /token/);
  assert.match(out, /email/);
});

test('only non-sensitive headers are logged', () => {
  const out = safeHeaders({
    authorization: 'Bearer secret-token',
    cookie: 'gt_refresh_token=abc',
    'x-api-key': 'k',
    'content-type': 'application/json',
    'user-agent': 'Mozilla/5.0',
  });
  assert.deepEqual(Object.keys(out).sort(), ['content-type', 'user-agent']);
  assert.ok(!JSON.stringify(out).includes('secret-token'));
});
