/**
 * Redaction for anything that goes into a log line.
 *
 * Logs are not a private space. On this deployment they go to the platform's
 * console sink, which is readable by anyone with dashboard access — a wider
 * audience than the people entitled to see a user's password reset, an admin's
 * bearer token, or a lead's phone number. So the rule is the same as for
 * responses: log what is needed to debug, and nothing that would be damaging
 * if the log itself leaked.
 *
 * Matching is by key NAME rather than by value shape. A value-based scanner
 * has to recognise every credential format that will ever exist; a key-based
 * one only has to recognise the words developers actually use, and errs toward
 * redacting an innocent field rather than printing a secret.
 */

/** Substrings that make a key sensitive. Matched case-insensitively. */
const SENSITIVE_KEY_PATTERNS = [
  'authorization',
  'auth',
  'cookie',
  'token',
  'password',
  'passwd',
  'secret',
  'apikey',
  'api_key',
  'accesskey',
  'access_key',
  'privatekey',
  'private_key',
  'credential',
  'session',
  'signature',
  'jwt',
  'bearer',
  'otp',
  'pin',
  'salt',
  'hash',
  'connectionstring',
  'connection_string',
  'dsn',
  'servicerole',
  'service_role',
  'anonkey',
  'anon_key',
];

/**
 * Personal data that is rarely needed to debug and is damaging in aggregate.
 * Partially masked rather than removed, so a support engineer can still match
 * a log line to the record a user is asking about.
 */
const PII_KEY_PATTERNS = ['email', 'phone', 'mobile', 'whatsapp', 'address'];

const REDACTED = '[REDACTED]';

const isSensitiveKey = (key: string): boolean => {
  const k = key.toLowerCase().replace(/[-_\s]/g, '');
  return SENSITIVE_KEY_PATTERNS.some((p) => k.includes(p.replace(/[-_]/g, '')));
};

const isPiiKey = (key: string): boolean => {
  const k = key.toLowerCase();
  return PII_KEY_PATTERNS.some((p) => k.includes(p));
};

/**
 * Mask a value so a human can still correlate it without it being usable or
 * personally identifying: `alice@example.com` → `al***@example.com`.
 */
export function maskPii(value: string): string {
  if (value.includes('@')) {
    const [local, domain] = value.split('@');
    const head = local.slice(0, 2);
    return `${head}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
  }
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}

/**
 * A credential embedded in a URL (`redis://user:pass@host`, `https://k:s@host`)
 * is not caught by key matching, because the key is just "url".
 */
export function redactUrlCredentials(value: string): string {
  return value.replace(/([a-z][a-z0-9+.-]*:\/\/)[^/@\s]+@/gi, '$1[REDACTED]@');
}

/**
 * Free-text sanitiser for a message that may have been built by string
 * concatenation somewhere upstream (a driver error, a third-party message).
 * Catches the shapes that appear in practice: bearer tokens, JWTs, and
 * credentials in a connection URL.
 */
export function redactText(value: string): string {
  return redactUrlCredentials(value)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    // A JWT is three base64url segments separated by dots.
    .replace(/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g, '[REDACTED_JWT]');
}

/**
 * Deep-copy a value with every sensitive field replaced and every PII field
 * masked. Safe to hand straight to a logger.
 *
 * Bounded on purpose: a hostile request body can be deeply nested or enormous,
 * and redaction must not become the expensive part of handling it.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return redactText(value.length > 512 ? `${value.slice(0, 512)}…` : value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    const capped = value.slice(0, 20).map((v) => redact(v, depth + 1));
    return value.length > 20 ? [...capped, `…${value.length - 20} more`] : capped;
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    let count = 0;
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (count >= 40) {
        out['…'] = 'truncated';
        break;
      }
      count += 1;
      if (isSensitiveKey(key)) {
        out[key] = REDACTED;
      } else if (isPiiKey(key) && typeof val === 'string') {
        out[key] = maskPii(val);
      } else {
        out[key] = redact(val, depth + 1);
      }
    }
    return out;
  }

  return '[UNSERIALISABLE]';
}

/** Redact a header bag, keeping only headers that help debugging. */
const LOGGED_HEADERS = ['content-type', 'content-length', 'user-agent', 'referer', 'origin'];

export function safeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const name of LOGGED_HEADERS) {
    const value = headers[name];
    if (value !== undefined) out[name] = redact(value);
  }
  return out;
}

/**
 * A request path with its query string reduced to parameter NAMES.
 *
 * The path is useful in a log; the values are not worth the risk. A token,
 * an email or a one-time code pasted into a query string would otherwise be
 * written to the log verbatim — and, before this, echoed back in the 404 body.
 */
export function safePath(originalUrl: string): string {
  const [path, query] = originalUrl.split('?');
  const cleanPath = path.length > 256 ? `${path.slice(0, 256)}…` : path;
  if (!query) return cleanPath;
  const names = new Set<string>();
  for (const pair of query.split('&').slice(0, 20)) {
    const name = pair.split('=')[0];
    if (name) names.add(name.slice(0, 40));
  }
  return names.size ? `${cleanPath}?${[...names].join('&')}=…` : cleanPath;
}
