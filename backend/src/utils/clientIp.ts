import { Request } from 'express';

/**
 * Deriving a rate-limit subject from the network address.
 *
 * Everything here exists because `X-Forwarded-For` is a header, and headers
 * come from the client. Express only returns a trustworthy `req.ip` if
 * `trust proxy` is set to exactly the number of proxies actually in front of
 * the app:
 *
 *  • Set too LOW and the app rate-limits the load balancer instead of the
 *    visitor, so one abusive client exhausts everyone's budget.
 *  • Set too HIGH — and `trust proxy: true` is infinitely too high — and the
 *    app believes whatever `X-Forwarded-For` the client sent, so an attacker
 *    gets a fresh budget per forged address. That is a complete bypass, and it
 *    is the more common misconfiguration because it looks like it works.
 *
 * The hop count is therefore a deployment fact, not a code constant, and lives
 * in `TRUST_PROXY_HOPS`. The default of 1 matches a single platform proxy
 * (Vercel, Render, Railway, a lone nginx). A deployment behind Cloudflare *and*
 * a platform proxy needs 2.
 */

/**
 * Normalise an address into a rate-limit subject.
 *
 * IPv6 is truncated to its /64 prefix. A residential IPv6 allocation is
 * routinely a /64 or larger, so limiting a single 128-bit address means an
 * attacker with one ordinary connection can rotate through billions of
 * addresses for free. The /64 is the smallest unit that corresponds to "one
 * subscriber" rather than "one arbitrary choice".
 *
 * IPv4-mapped IPv6 (`::ffff:1.2.3.4`) is unwrapped first — otherwise the same
 * client counts as two different subjects depending on how it connected.
 */
export function normaliseIp(raw: string | undefined): string {
  if (!raw) return 'unknown';

  let ip = raw.trim().toLowerCase();

  // Strip an IPv6 zone index (`fe80::1%eth0`) and any surrounding brackets.
  ip = ip.replace(/^\[|\]$/g, '').split('%')[0];

  // IPv4-mapped IPv6.
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip);
  if (mapped) ip = mapped[1];

  // Plain IPv4 — already the right granularity.
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) return ip;

  // IPv6: keep the first four groups (/64).
  if (ip.includes(':')) {
    const expanded = expandIpv6(ip);
    if (expanded) return `${expanded.slice(0, 4).join(':')}::/64`;
    return ip.slice(0, 64);
  }

  // Anything unrecognised is still bounded before it becomes a key component.
  return ip.slice(0, 64);
}

/** Expand `::` shorthand so the first four groups can be read positionally. */
function expandIpv6(ip: string): string[] | null {
  if (!/^[0-9a-f:]+$/.test(ip)) return null;
  const halves = ip.split('::');
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(':').filter(Boolean) : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':').filter(Boolean) : [];
  if (head.length + tail.length > 8) return null;

  const middle =
    halves.length === 2 ? new Array(8 - head.length - tail.length).fill('0') : [];
  const groups = [...head, ...middle, ...tail];
  if (groups.length !== 8) return null;
  return groups.map((g) => g.padStart(4, '0'));
}

/**
 * The address to rate-limit this request against.
 *
 * Reads `req.ip`, which Express has already resolved against the configured
 * `trust proxy` setting. The raw `X-Forwarded-For` header is deliberately never
 * read here: doing so would reintroduce exactly the trust decision that
 * setting exists to make once, correctly, at the application level.
 */
export function clientIp(req: Request): string {
  return normaliseIp(req.ip ?? req.socket?.remoteAddress ?? undefined);
}
