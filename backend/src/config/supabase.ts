import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import { logger } from './logger';

/**
 * Supabase clients.
 *
 * Two clients with deliberately different privileges:
 *
 *  • supabaseAdmin — service-role key. Bypasses Row Level Security and is used
 *    for every database read/write and for Auth admin operations (create user,
 *    set password, delete user). SERVER-ONLY: this key must never reach a
 *    browser, an API response, or a log line.
 *
 *  • supabaseAuth  — anon key, no session persistence. Used exclusively to
 *    exchange an email/password for a Supabase session at login, and to verify
 *    a password during the change-password flow. It has no data privileges, so
 *    a bug here cannot leak rows.
 *
 * Neither client keeps a socket open, so there is nothing to connect or
 * disconnect: PostgREST is stateless HTTP. That is why the former
 * `connectDatabase()` / `ensureDbConnected` machinery is gone — on serverless
 * there is no connection to warm up and no cold-start handshake to pay for.
 */

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
} as const;

if (!env.supabase.configured && env.isProd) {
  // env.required() already throws in production, but keep an explicit signal.
  throw new Error('Supabase is not configured (SUPABASE_URL / keys missing)');
}

export const supabaseAdmin: SupabaseClient = createClient(
  env.supabase.url,
  env.supabase.serviceRoleKey,
  clientOptions,
);

export const supabaseAuth: SupabaseClient = createClient(
  env.supabase.url,
  env.supabase.anonKey,
  clientOptions,
);

if (env.supabase.configured) {
  logger.info(`Supabase configured (${env.supabase.url})`);
} else {
  logger.warn('Supabase is not fully configured — set SUPABASE_URL and the API keys');
}

/**
 * Lightweight readiness probe used by the health endpoint and by bootstrap.
 * Performs a HEAD count against a tiny table; any HTTP/permission failure is
 * reported as not-ready rather than thrown.
 */
export async function checkSupabaseConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('settings')
      .select('id', { head: true, count: 'exact' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
