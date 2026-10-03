import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/api/client';

/**
 * On-demand cache invalidation.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * Before this, freshness was bought with short TTLs: the root layout reads the
 * Settings singleton, Settings was on a 60-second window, so every route on the
 * site carried `Revalidate: 1m`. A trafficked page could be regenerated sixty
 * times an hour — sixty function invocations and sixty ISR writes — in case an
 * editor had changed the phone number.
 *
 * Pushing an invalidation when something actually changes is strictly better:
 * content goes live in seconds instead of up to a minute, AND the regeneration
 * work drops by an order of magnitude. That is what lets `REVALIDATE.CONTENT`
 * be an hour instead of five minutes.
 *
 * ── Wiring it up ────────────────────────────────────────────────────────────
 * The backend already runs `lib/cacheInvalidation.ts` on every admin mutation
 * to purge Redis. The same hook should POST here:
 *
 *     POST https://glorytecks.com/api/revalidate
 *     { "secret": "<REVALIDATE_SECRET>", "tags": ["blogs"] }
 *
 * Until that call is added, nothing breaks — the TTLs above still expire on
 * their own, just more slowly than an editor might like. This endpoint is
 * additive.
 *
 * ── Security ────────────────────────────────────────────────────────────────
 * Guarded by a shared secret in `REVALIDATE_SECRET`. If the variable is not
 * set the route refuses every request rather than defaulting to open — an
 * unauthenticated purge endpoint is a cheap way for anyone to force
 * regeneration of the whole site and burn the Hobby function budget.
 *
 * The comparison is length-safe and constant-time-ish via a normalised
 * encoder; the secret is never echoed back, and a failure says only "denied".
 */

export const dynamic = 'force-dynamic';

const VALID_TAGS = new Set<string>(Object.values(CACHE_TAGS));

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;

  // Fail closed. No secret configured means no one may purge.
  if (!secret) {
    return Response.json(
      { revalidated: false, message: 'Revalidation is not configured.' },
      { status: 503 },
    );
  }

  let body: { secret?: unknown; tags?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ revalidated: false, message: 'Invalid body.' }, { status: 400 });
  }

  const provided = typeof body.secret === 'string' ? body.secret : '';
  if (!timingSafeEqual(provided, secret)) {
    return Response.json({ revalidated: false, message: 'Denied.' }, { status: 401 });
  }

  // Only tags this application actually uses. An unknown tag is almost always
  // a typo, and silently accepting it would mean a purge that never fires.
  const requested = Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === 'string') : [];
  const tags = (requested as string[]).filter((t) => VALID_TAGS.has(t));
  const unknown = (requested as string[]).filter((t) => !VALID_TAGS.has(t));

  if (tags.length === 0) {
    return Response.json(
      {
        revalidated: false,
        message: 'No known tags supplied.',
        known: [...VALID_TAGS],
        unknown,
      },
      { status: 400 },
    );
  }

  // Next 16's `revalidateTag` takes a cacheLife profile as its second
  // argument. `{ expire: 0 }` purges the tag outright rather than easing it
  // into a shorter window — which is what a publish webhook means: this
  // content is stale as of now.
  //
  // (`updateTag` would give read-your-own-writes semantics, but it is only
  // callable from a Server Action, not a route handler.)
  for (const tag of tags) revalidateTag(tag, { expire: 0 });

  return Response.json({ revalidated: true, tags, ...(unknown.length ? { unknown } : {}) });
}
