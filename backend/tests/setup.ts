/**
 * Test environment bootstrap.
 *
 * Imported as the FIRST import of any test that loads application modules.
 * Module requires are hoisted above ordinary statements, so setting these
 * variables inline in a test file would run too late — the Supabase client is
 * constructed at import time and would fail on a missing key.
 *
 * These are placeholders. No test makes a real network call: the repository
 * tests swap the client's `from()` for a recorder.
 */
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-service-role-key';
process.env.COOKIE_SECRET = process.env.COOKIE_SECRET ?? 'test-cookie-secret';
process.env.CACHE_ENABLED = 'false';

// A developer's local `.env` is loaded by config/env before the tests run. Blank
// the storage credentials so no test can reach the real Cloudinary account: the
// upload service then short-circuits to 503, which is the deterministic
// "everything upstream of storage passed" signal the route tests assert on.
// (Set to '' rather than deleted — dotenv only fills keys that are absent.)
process.env.CLOUDINARY_CLOUD_NAME = '';
process.env.CLOUDINARY_API_KEY = '';
process.env.CLOUDINARY_API_SECRET = '';

// Pin a production-shaped CORS policy. Without these the defaults are
// permissive (PUBLIC_CORS_ORIGINS falls back to '*'), so the rejection path
// would never run under test and a regression in it would go unnoticed.
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'https://admin.glorytecks.test';
process.env.PUBLIC_CORS_ORIGINS = process.env.PUBLIC_CORS_ORIGINS ?? 'https://glorytecks.test';
