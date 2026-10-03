// ─────────────────────────────────────────────────────────────────────────────
// NAP consistency — machine-readable model, extractors and comparison.
//
// `config/business.ts` is the one canonical source of structured-data business
// facts. Everything else that states a business fact — the CMS Settings row,
// backend seeds and migration defaults, hardcoded UI strings, map embeds, the
// Google Maps listing, the legacy site — is an OBSERVATION of that fact, and
// every observation is compared against the canonical value.
//
// A difference is only tolerated when it is recorded, with its exact value, in
// `NAP_OPEN_CONFLICTS` in config/business.ts: a conflict that needs a business
// decision (e.g. 603 vs 611). Anything else fails, and so does a recorded
// conflict that no longer exists — the ledger cannot go stale.
//
// Pure: strings in, findings out. The offline scan is in nap.test.ts; the live
// sources (CMS API, Google Maps, a deployed site) are in nap.live.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { BusinessEntity } from '@/config/business';

export type NapField =
  | 'name'
  | 'streetAddress'
  | 'postalCode'
  | 'telephone'
  | 'email'
  | 'geo'
  | 'openingHours'
  | 'mapsPlace'
  | 'gbpUrl'
  | 'socialProfile';

export interface NapObservation {
  /** Where the fact was read: a repo-relative file path, or a live source id. */
  source: string;
  field: NapField;
  /** Normalised, comparable value (see the normalisers below). */
  value: string;
  /** 1-based line, for file sources. */
  line?: number;
}

export interface NapConflict {
  field: NapField;
  source: string;
  /** The normalised value that source states. */
  value: string;
  /** Why it is tolerated and what resolves it. */
  note: string;
}

export interface NapFinding extends NapObservation {
  expected: string;
}

/* ── Normalisers ──────────────────────────────────────────────────────────── */

/** Case-, space- and punctuation-insensitive brand comparison. */
export const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** "603 , annapurna block,aditya enclave" → "603, annapurna block, aditya enclave". */
export const normStreet = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

/** Any Indian mobile format → "919908099980". */
export function normPhone(s: string): string {
  const digits = s.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

export const normEmail = (s: string) => s.trim().toLowerCase();

/** Coordinates as "lat,lng" at 7 decimals (~1 cm) — comparison uses a tolerance. */
export const normGeo = (lat: number, lng: number) => `${lat.toFixed(7)},${lng.toFixed(7)}`;

/** "0x651a…%3A0xcbca…" → "0x651a…:0xcbca…". */
export const normPlace = (s: string) => decodeURIComponent(s).toLowerCase();

export const normUrl = (s: string) => s.trim().replace(/\/+$/, '').toLowerCase();

/**
 * Two coordinates are "the same place" within ~22 m (0.0002°). Tighter than
 * that and rounding differences fail; looser and a pin on the wrong building
 * passes.
 */
export const GEO_TOLERANCE = 0.0002;

export function sameGeo(a: string, b: string): boolean {
  const [la, lo] = a.split(',').map(Number);
  const [lb, lob] = b.split(',').map(Number);
  return Math.abs(la - lb) <= GEO_TOLERANCE && Math.abs(lo - lob) <= GEO_TOLERANCE;
}

/** "8AM" / "9 pm" / "08:00" → "08:00" / "21:00". */
function to24h(hour: string, meridiem?: string): string {
  let h = Number(hour);
  const m = meridiem?.toLowerCase();
  if (m === 'pm' && h < 12) h += 12;
  if (m === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:00`;
}

const DAY = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayIndex = (s: string) => DAY.findIndex((d) => d.startsWith(s.toLowerCase().slice(0, 3)));

/** One opening-hours band as "mon-sat 08:00-21:00" / "sun 09:00-17:00". */
export function normHoursBand(days: string[], opens: string, closes: string): string {
  const idx = days.map(dayIndex).sort((a, b) => a - b);
  const span = idx.length === 1 ? DAY[idx[0]].slice(0, 3) : `${DAY[idx[0]].slice(0, 3)}-${DAY[idx[idx.length - 1]].slice(0, 3)}`;
  return `${span} ${opens}-${closes}`;
}

/* ── Canonical facts ──────────────────────────────────────────────────────── */

export interface CanonicalNap {
  name: string;
  streetAddress: string;
  postalCode: string;
  /** The telephone and the WhatsApp number, normalised (they may be the same). */
  phones: string[];
  email: string;
  geo: string;
  openingHours: string[];
  mapsPlace: string | null;
  gbpUrl: string | null;
  socialProfiles: string[];
}

/** Google's "feature id" for a place, as found in map URLs: 0x…:0x…. */
const PLACE_RE = /0x[0-9a-f]{6,}(?::|%3A)0x[0-9a-f]{1,}/i;

export function canonicalNap(b: BusinessEntity): CanonicalNap {
  const place = b.mapUrl.match(PLACE_RE)?.[0];
  return {
    name: normName(b.name),
    streetAddress: normStreet(b.address.streetAddress),
    postalCode: b.address.postalCode,
    phones: [...new Set([normPhone(b.telephone), normPhone(b.whatsapp)])],
    email: normEmail(b.email),
    geo: normGeo(b.geo.latitude, b.geo.longitude),
    openingHours: b.openingHours.map((h) => normHoursBand(h.days, h.opens, h.closes)),
    mapsPlace: place ? normPlace(place) : null,
    gbpUrl: b.googleBusinessProfile ? normUrl(b.googleBusinessProfile) : null,
    socialProfiles: b.socialProfiles.map(normUrl),
  };
}

/* ── Extraction from free text / source files ─────────────────────────────── */

/**
 * Strip comments so documentation that quotes the old values (config/business.ts
 * lists both 603 and 611 on purpose) is not read as a claim. Only whole-line and
 * block comments are removed — never `//` inside a string, which would eat URLs.
 */
export function stripComments(src: string, kind: 'ts' | 'sql' = 'ts'): string {
  // Preserve line numbers: replace comment text with blanks, keep newlines.
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  if (kind === 'sql') return src.replace(/^\s*--.*$/gm, blank);
  return src.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/^\s*\/\/.*$/gm, blank);
}

const lineOf = (src: string, index: number) => src.slice(0, index).split('\n').length;

const STREET_RE = /(\d{1,4})\s*,\s*Annapurna Block\s*,\s*Aditya Enclave/gi;
const POSTAL_RE = /Hyderabad\s*[–—-]\s*(\d{6})/g;
// A 10-digit Indian mobile, optionally +91/91-prefixed, not part of a longer
// number and not after a decimal point (map embeds are full of long decimals).
const PHONE_RE = /(?<![\d.])(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g;
const EMAIL_RE = /[\w.+-]+@glorytecks\.com|gloryteck[\w.+-]*@gmail\.com/gi;
const EMBED_RE = /maps\/embed\?pb=([^"'`\s]+)/g;
const PLACE_URL_RE = /place_id:(0x[0-9a-f]+:0x[0-9a-f]+)/gi;
const SHARE_RE = /https:\/\/maps\.app\.goo\.gl\/[A-Za-z0-9]+/g;
const HOURS_RE =
  /(Mon(?:day)?)\s*[–—-]\s*(Sat(?:urday)?)\s*:?\s*(\d{1,2})\s*(AM|PM)\s*[–—-]\s*(\d{1,2})\s*(AM|PM)|(Sun(?:day)?)\s*:?\s*(\d{1,2})\s*(AM|PM)\s*[–—-]\s*(\d{1,2})\s*(AM|PM)/gi;
/** `siteName: 'GloryTecks'` (seeds) and `site_name text … default 'GloryTecks'` (migrations). */
const SITE_NAME_RE = /\bsiteName\s*:\s*['"]([^'"\n]+)['"]|\bsite_name\b[^'\n]*\bdefault\s+'([^'\n]+)'/g;
const SOCIAL_RE =
  /https:\/\/(?:www\.)?(?:facebook|instagram|linkedin|youtube)\.com\/(?!sharer|sharing|jobs|embed|watch|shorts|intent)[^\s"'`)<>]+/gi;

/**
 * Every business fact stated in one source file, as observations.
 *
 * `path` is the repo-relative path used as the source id. The file's own
 * comments are ignored (see `stripComments`).
 */
export function extractFromSource(path: string, raw: string): NapObservation[] {
  const src = stripComments(raw, path.endsWith('.sql') ? 'sql' : 'ts');
  const out: NapObservation[] = [];
  const add = (field: NapField, value: string, index: number) =>
    out.push({ source: path, field, value, line: lineOf(src, index) });

  for (const m of src.matchAll(STREET_RE)) add('streetAddress', normStreet(`${m[1]}, Annapurna Block, Aditya Enclave`), m.index!);
  for (const m of src.matchAll(POSTAL_RE)) add('postalCode', m[1], m.index!);
  for (const m of src.matchAll(PHONE_RE)) add('telephone', normPhone(m[0]), m.index!);
  for (const m of src.matchAll(EMAIL_RE)) add('email', normEmail(m[0]), m.index!);

  for (const m of src.matchAll(EMBED_RE)) {
    const pb = decodeURIComponent(m[1]);
    const lng = pb.match(/!2d(-?\d+\.\d+)/)?.[1];
    const lat = pb.match(/!3d(-?\d+\.\d+)/)?.[1];
    if (lat && lng) add('geo', normGeo(Number(lat), Number(lng)), m.index!);
    const place = pb.match(PLACE_RE)?.[0];
    if (place) add('mapsPlace', normPlace(place), m.index!);
  }
  for (const m of src.matchAll(PLACE_URL_RE)) add('mapsPlace', normPlace(m[1]), m.index!);
  for (const m of src.matchAll(SHARE_RE)) add('gbpUrl', normUrl(m[0]), m.index!);

  for (const m of src.matchAll(HOURS_RE)) {
    const band = m[1]
      ? normHoursBand(DAY.slice(dayIndex(m[1]), dayIndex(m[2]) + 1), to24h(m[3], m[4]), to24h(m[5], m[6]))
      : normHoursBand([m[7]], to24h(m[8], m[9]), to24h(m[10], m[11]));
    add('openingHours', band, m.index!);
  }
  for (const m of src.matchAll(SOCIAL_RE)) add('socialProfile', normUrl(m[0]), m.index!);
  for (const m of src.matchAll(SITE_NAME_RE)) {
    const value = m[1] ?? m[2];
    // `siteName: 'site_name'` is an ORM column mapping, not a brand.
    if (!/^[a-z]+(?:_[a-z]+)+$/.test(value)) add('name', normName(value), m.index!);
  }

  return out;
}

/** "603, Annapurna Block, …, Hyderabad – 500038, …" → street + postal observations. */
export function extractFromAddressLine(source: string, address: string): NapObservation[] {
  return extractFromSource(source, address).filter((o) => o.field === 'streetAddress' || o.field === 'postalCode');
}

/** A Google Maps place URL (the resolved share link) → place id, pin, and listed name. */
export function extractFromMapsPlaceUrl(source: string, url: string): NapObservation[] {
  const u = decodeURIComponent(url);
  const out: NapObservation[] = [];
  const place = u.match(PLACE_RE)?.[0];
  if (place) out.push({ source, field: 'mapsPlace', value: normPlace(place) });
  // !3d/!4d is the place's own pin; @lat,lng is only the viewport centre.
  const pin = u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pin) out.push({ source, field: 'geo', value: normGeo(Number(pin[1]), Number(pin[2])) });
  const name = u.match(/\/maps\/place\/([^/@]+)/)?.[1];
  if (name) out.push({ source, field: 'name', value: normName(name.replace(/\+/g, ' ')) });
  return out;
}

/* ── Extraction from structured data ──────────────────────────────────────── */

type Node = Record<string, unknown>;
const typesOf = (n: Node) => ([] as unknown[]).concat(n['@type']).map(String);

/**
 * NAP stated by the organization and LocalBusiness nodes of a JSON-LD graph.
 * The LocalBusiness `name` is a node label ("GloryTecks — Ameerpet Centre"), so
 * only the organization's name is compared as the brand.
 */
export function extractFromSchema(source: string, nodes: readonly Node[]): NapObservation[] {
  const out: NapObservation[] = [];
  for (const n of nodes) {
    const t = typesOf(n);
    const isOrg = t.includes('EducationalOrganization') || t.includes('Organization');
    const isPlace = t.includes('LocalBusiness');
    if (!isOrg && !isPlace) continue;
    const at = `${source}#${isPlace ? 'LocalBusiness' : 'Organization'}`;

    if (isOrg && !isPlace && typeof n.name === 'string') out.push({ source: at, field: 'name', value: normName(n.name) });
    const addr = n.address as Node | undefined;
    if (addr?.streetAddress) out.push({ source: at, field: 'streetAddress', value: normStreet(String(addr.streetAddress)) });
    if (addr?.postalCode) out.push({ source: at, field: 'postalCode', value: String(addr.postalCode) });
    if (typeof n.telephone === 'string') out.push({ source: at, field: 'telephone', value: normPhone(n.telephone) });
    if (typeof n.email === 'string') out.push({ source: at, field: 'email', value: normEmail(n.email) });
    const geo = n.geo as Node | undefined;
    if (geo?.latitude !== undefined) {
      out.push({ source: at, field: 'geo', value: normGeo(Number(geo.latitude), Number(geo.longitude)) });
    }
    if (typeof n.hasMap === 'string') {
      const place = n.hasMap.match(PLACE_RE)?.[0];
      if (place) out.push({ source: at, field: 'mapsPlace', value: normPlace(place) });
    }
    for (const h of (n.openingHoursSpecification as Node[] | undefined) ?? []) {
      out.push({
        source: at,
        field: 'openingHours',
        value: normHoursBand(([] as string[]).concat(h.dayOfWeek as string[]), String(h.opens), String(h.closes)),
      });
    }
    for (const url of ([] as unknown[]).concat(n.sameAs ?? [])) {
      if (typeof url === 'string') {
        out.push({ source: at, field: /maps\.app\.goo\.gl|google\.com\/maps/.test(url) ? 'gbpUrl' : 'socialProfile', value: normUrl(url) });
      }
    }
  }
  return out;
}

/** NAP stated by the CMS Settings singleton (GET /public/settings). */
export function extractFromSettings(source: string, s: Node): NapObservation[] {
  const out: NapObservation[] = [];
  if (typeof s.siteName === 'string' && s.siteName) out.push({ source, field: 'name', value: normName(s.siteName) });
  if (typeof s.phone === 'string' && s.phone) out.push({ source, field: 'telephone', value: normPhone(s.phone) });
  if (typeof s.whatsapp === 'string' && s.whatsapp) out.push({ source, field: 'telephone', value: normPhone(s.whatsapp) });
  if (typeof s.email === 'string' && s.email) out.push({ source, field: 'email', value: normEmail(s.email) });
  if (typeof s.address === 'string') out.push(...extractFromAddressLine(source, s.address));
  if (typeof s.mapUrl === 'string' && s.mapUrl) out.push(...extractFromSource(source, s.mapUrl));
  for (const url of Object.values((s.social as Record<string, unknown>) ?? {})) {
    if (typeof url === 'string' && url) out.push({ source, field: 'socialProfile', value: normUrl(url) });
  }
  return out;
}

/* ── Comparison ───────────────────────────────────────────────────────────── */

/** The canonical value an observation must equal, rendered for a report. */
function expectedFor(o: NapObservation, c: CanonicalNap): { ok: boolean; expected: string } {
  switch (o.field) {
    case 'name':
      return { ok: o.value === c.name, expected: c.name };
    case 'streetAddress':
      return { ok: o.value === c.streetAddress, expected: c.streetAddress };
    case 'postalCode':
      return { ok: o.value === c.postalCode, expected: c.postalCode };
    case 'telephone':
      return { ok: c.phones.includes(o.value), expected: c.phones.join(' | ') };
    case 'email':
      return { ok: o.value === c.email, expected: c.email };
    case 'geo':
      return { ok: sameGeo(o.value, c.geo), expected: c.geo };
    case 'openingHours':
      return { ok: c.openingHours.includes(o.value), expected: c.openingHours.join(' | ') };
    case 'mapsPlace':
      return { ok: o.value === c.mapsPlace, expected: c.mapsPlace ?? '(none)' };
    case 'gbpUrl':
      return { ok: o.value === c.gbpUrl, expected: c.gbpUrl ?? '(no Google Business Profile URL configured)' };
    case 'socialProfile':
      return { ok: c.socialProfiles.includes(o.value), expected: c.socialProfiles.join(' | ') };
  }
}

export interface NapReport {
  observations: number;
  sources: string[];
  /** Differences with no ledger entry — these fail. */
  unexpected: NapFinding[];
  /** Differences recorded in NAP_OPEN_CONFLICTS — tolerated, reported. */
  acknowledged: (NapFinding & { note: string })[];
  /** Ledger entries for an observed source whose difference is gone — these fail. */
  stale: NapConflict[];
}

/** A ledger entry's source matches an observation's source by prefix (file or file#node). */
const sourceMatches = (ledger: string, observed: string) => observed === ledger || observed.startsWith(`${ledger}#`);

/**
 * Compare observations to the canonical facts and reconcile the differences
 * with the ledger of open conflicts.
 *
 * Only ledger entries whose source was actually observed can be stale, so the
 * offline scan does not report the live-only entries (CMS, Google, legacy site).
 */
export function reconcileNap(
  observations: readonly NapObservation[],
  canonical: CanonicalNap,
  ledger: readonly NapConflict[],
): NapReport {
  const unexpected: NapReport['unexpected'] = [];
  const acknowledged: NapReport['acknowledged'] = [];
  const matched = new Set<NapConflict>();

  for (const o of observations) {
    const { ok, expected } = expectedFor(o, canonical);
    if (ok) continue;
    const entry = ledger.find((e) => e.field === o.field && sourceMatches(e.source, o.source) && e.value === o.value);
    if (entry) {
      matched.add(entry);
      acknowledged.push({ ...o, expected, note: entry.note });
    } else {
      unexpected.push({ ...o, expected });
    }
  }

  const observedSources = new Set(observations.map((o) => o.source));
  const stale = ledger.filter(
    (e) => !matched.has(e) && [...observedSources].some((s) => sourceMatches(e.source, s)),
  );

  return {
    observations: observations.length,
    sources: [...observedSources].sort(),
    unexpected,
    acknowledged,
    stale,
  };
}

/** One line per finding, for assertion messages and console output. */
export const describeFinding = (f: NapFinding) =>
  `${f.source}${f.line ? `:${f.line}` : ''}  ${f.field} = "${f.value}"  (canonical: "${f.expected}")`;
