// ─────────────────────────────────────────────────────────────────────────────
// Sitemap construction.
//
// Pure builders and validators — no fetch, no Next, no clock. The route
// handlers under app/sitemaps/ fetch data and hand it to these functions, which
// is what lets the automated SEO tests assert the output without a backend.
//
// Deliberately absent: <priority> and <changefreq>. Google has stated it
// ignores both; emitting them is noise that also invites the temptation to
// hand-tune signals that do not exist.
//
// Deliberately absent: any fallback that invents a date. `isoDate()` returns
// null for a missing or malformed value and the <lastmod> element is then
// omitted, because "we do not know" is a legitimate answer and "today" is a
// lie that tells Google the whole site changed an hour ago, every hour.
// ─────────────────────────────────────────────────────────────────────────────
import { isValidCanonical } from './canonical';

/** Escape the five XML entities — CMS titles routinely contain & and '. */
export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Normalise a content date to `YYYY-MM-DD`, or null when there isn't one.
 *
 * Never substitutes the current date. A value that is already a plain ISO date
 * is passed through without constructing a Date, so a timezone cannot shift it
 * by a day.
 */
export function isoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    // Confirm it is a real calendar date (rejects 2026-13-45).
    const d = new Date(`${trimmed}T00:00:00Z`);
    return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== trimmed ? null : trimmed;
  }

  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * Pick the honest content date for a piece of CMS content: the updated date
 * when the item was genuinely updated after publication, otherwise the
 * published date. An `updated` value that is missing, malformed or older than
 * `published` is not an update.
 */
export function contentLastModified(
  updated: string | null | undefined,
  published: string | null | undefined,
): string | null {
  const u = isoDate(updated);
  const p = isoDate(published);
  if (u && p) return u >= p ? u : p;
  return u ?? p;
}

/** The newest date in a set, or null when the set has none. */
export function newestDate(dates: readonly (string | null | undefined)[]): string | null {
  let best: string | null = null;
  for (const raw of dates) {
    const d = isoDate(raw);
    if (d && (!best || d > best)) best = d;
  }
  return best;
}

export interface SitemapEntry {
  /** Absolute canonical URL. */
  url: string;
  /** `YYYY-MM-DD`, or null/undefined to omit <lastmod>. */
  lastModified?: string | null;
}

export interface SitemapValidationIssue {
  url: string;
  problem: string;
}

/**
 * Reject anything that must never reach a sitemap: a non-canonical URL, a
 * relative URL, a URL carrying a query string or fragment, a malformed
 * `lastmod`, or a duplicate of another entry.
 *
 * Used both by the route handlers (which drop bad entries rather than publish
 * them) and by the SEO test suite (which fails the build on them).
 */
export function validateEntries(
  entries: readonly SitemapEntry[],
  origin?: string,
): SitemapValidationIssue[] {
  const issues: SitemapValidationIssue[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const problem = entryProblem(entry, origin, seen);
    if (problem) {
      issues.push({ url: entry.url, problem });
      continue;
    }
    seen.add(entry.url);
  }

  return issues;
}

/**
 * Why one entry cannot be published, or null when it can.
 *
 * `seen` carries the URLs already accepted in this document so duplicates are
 * caught — note that only the *second* occurrence is a problem, which is why
 * this is per-entry state rather than a set of bad URLs.
 */
function entryProblem(
  { url, lastModified }: SitemapEntry,
  origin: string | undefined,
  seen: ReadonlySet<string>,
): string | null {
  if (!isValidCanonical(url, origin)) return 'not a valid canonical URL for this origin';
  if (url.includes('?')) return 'carries a query string';
  if (seen.has(url)) return 'duplicate entry';
  if (lastModified != null && !/^\d{4}-\d{2}-\d{2}$/.test(lastModified)) {
    return `malformed lastmod: ${lastModified}`;
  }
  return null;
}

/** Drop invalid entries, keeping the first occurrence of each URL. */
export function sanitizeEntries(
  entries: readonly SitemapEntry[],
  origin?: string,
): SitemapEntry[] {
  const seen = new Set<string>();
  const out: SitemapEntry[] = [];

  for (const entry of entries) {
    if (entryProblem(entry, origin, seen)) continue;
    seen.add(entry.url);
    out.push(entry);
  }

  return out;
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
const URLSET_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

/** Render a `<urlset>` document. Entries are emitted in the order given. */
export function buildUrlset(entries: readonly SitemapEntry[]): string {
  const body = entries
    .map((e) => {
      const lastmod = e.lastModified ? `\n    <lastmod>${e.lastModified}</lastmod>` : '';
      return `  <url>\n    <loc>${xmlEscape(e.url)}</loc>${lastmod}\n  </url>`;
    })
    .join('\n');

  return `${XML_HEADER}\n<urlset xmlns="${URLSET_NS}">\n${body}\n</urlset>\n`;
}

/** Render a `<sitemapindex>` document. */
export function buildSitemapIndex(entries: readonly SitemapEntry[]): string {
  const body = entries
    .map((e) => {
      const lastmod = e.lastModified ? `\n    <lastmod>${e.lastModified}</lastmod>` : '';
      return `  <sitemap>\n    <loc>${xmlEscape(e.url)}</loc>${lastmod}\n  </sitemap>`;
    })
    .join('\n');

  return `${XML_HEADER}\n<sitemapindex xmlns="${URLSET_NS}">\n${body}\n</sitemapindex>\n`;
}
