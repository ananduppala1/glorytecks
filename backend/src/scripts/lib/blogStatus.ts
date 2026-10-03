/**
 * The processing-status ledger for the blog quality programme
 * (docs/BLOG_REWRITE_MASTER_REPORT.md). Pure: no I/O. `blog-status.ts` reads
 * and writes the ledger file; `blog-rewrite.ts` consults it before applying.
 *
 * Every article has exactly one status, and every change is appended to its
 * history with who made it and why, so any article's path from audit to
 * publication can be traced. Transitions outside TRANSITIONS are refused.
 *
 *   pending ─► analyzed ─► approved_for_rewrite ─► rewritten ─► quality_checked ─► published
 *                  │                                   │               ▲
 *                  ├─► merge_candidate                 └─► needs_review ┘ (an editor resolves it)
 *                  ├─► noindex_candidate
 *                  ├─► needs_review
 *                  └─► redirected (already merged in Phase 1)
 *
 * `quality_checked` means the automated checks and the second review passed
 * and no blocker is open. It is the only status `blog-rewrite.ts apply` will
 * publish from, and only when the rewrite file itself is `approved`.
 */

export const PROCESSING_STATUSES = [
  'pending',
  'analyzed',
  'approved_for_rewrite',
  'rewritten',
  'quality_checked',
  'published',
  'needs_review',
  'merge_candidate',
  'noindex_candidate',
  'redirected',
] as const;

export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

export const TRANSITIONS: Readonly<Record<ProcessingStatus, readonly ProcessingStatus[]>> = {
  pending: ['analyzed'],
  analyzed: ['approved_for_rewrite', 'merge_candidate', 'noindex_candidate', 'needs_review', 'redirected'],
  approved_for_rewrite: ['rewritten', 'needs_review', 'analyzed'],
  rewritten: ['quality_checked', 'needs_review'],
  quality_checked: ['published', 'needs_review'],
  // A rollback, or a problem found after publication.
  published: ['needs_review'],
  needs_review: ['approved_for_rewrite', 'quality_checked', 'merge_candidate', 'noindex_candidate', 'analyzed'],
  merge_candidate: ['approved_for_rewrite', 'needs_review', 'redirected', 'analyzed'],
  noindex_candidate: ['approved_for_rewrite', 'needs_review', 'analyzed'],
  redirected: [],
};

export interface HistoryEvent {
  at: string;
  from: ProcessingStatus | null;
  to: ProcessingStatus;
  by: string;
  note: string;
}

export interface LedgerEntry {
  id: string;
  slug: string;
  status: ProcessingStatus;
  batch?: string;
  updatedAt: string;
  history: HistoryEvent[];
}

export interface Ledger {
  version: 1;
  articles: Record<string, LedgerEntry>;
}

export const isStatus = (value: unknown): value is ProcessingStatus =>
  typeof value === 'string' && (PROCESSING_STATUSES as readonly string[]).includes(value);

/** A new ledger with every article `pending`. */
export function seedLedger(rows: readonly { id: string; slug: string }[], at: string, by: string): Ledger {
  const articles: Record<string, LedgerEntry> = {};
  for (const { id, slug } of rows) {
    articles[id] = { id, slug, status: 'pending', updatedAt: at, history: [{ at, from: null, to: 'pending', by, note: 'Added to the ledger.' }] };
  }
  return { version: 1, articles };
}

export interface TransitionInput {
  to: ProcessingStatus;
  by: string;
  note: string;
  at: string;
  batch?: string;
}

/**
 * Move one article to a new status, recording why. Mutates the ledger only
 * when the move is allowed; returns the reason when it is not.
 */
export function transition(ledger: Ledger, id: string, input: TransitionInput): string | null {
  const entry = ledger.articles[id];
  if (!entry) return `no ledger entry for ${id}`;
  if (!input.by.trim()) return 'a transition must say who made it (--by)';
  if (!input.note.trim()) return 'a transition must say why (--note)';
  if (!TRANSITIONS[entry.status].includes(input.to)) {
    return `${entry.slug}: ${entry.status} → ${input.to} is not allowed (allowed: ${TRANSITIONS[entry.status].join(', ') || 'none'})`;
  }
  entry.history.push({ at: input.at, from: entry.status, to: input.to, by: input.by, note: input.note });
  entry.status = input.to;
  entry.updatedAt = input.at;
  if (input.batch) entry.batch = input.batch;
  return null;
}

/** Where the audit's recommended action leaves an analysed article. */
export function statusForAction(action: string): ProcessingStatus {
  switch (action.trim().toUpperCase()) {
    case 'MERGE':
      return 'merge_candidate';
    case 'NOINDEX':
      return 'noindex_candidate';
    case 'MANUAL REVIEW':
      return 'needs_review';
    case 'REDIRECT':
      return 'redirected';
    default:
      // KEEP, IMPROVE and DEEP REWRITE all wait for an editor to schedule them.
      return 'analyzed';
  }
}

/** The review block of a rewrite file, as far as the ledger needs it. */
export interface RewriteReviewSummary {
  automated?: { result?: string; failures?: string[] };
  independent?: { verdict?: string };
  blockers?: string[];
}

/**
 * After a rewrite: `quality_checked` only when the automated checks and the
 * second review both passed and no blocker is open; otherwise `needs_review`,
 * with every reason listed.
 */
export function statusAfterRewrite(review: RewriteReviewSummary | undefined): { to: ProcessingStatus; reasons: string[] } {
  const reasons: string[] = [];
  const automated = review?.automated;
  if (!automated?.result) reasons.push('automated checks have not been run');
  else if (automated.result !== 'pass') reasons.push(`automated checks failed: ${(automated.failures ?? []).join('; ') || 'see file'}`);
  if (!review?.independent?.verdict) reasons.push('no second (independent) review recorded');
  else if (review.independent.verdict !== 'pass') reasons.push(`second review verdict: ${review.independent.verdict}`);
  for (const blocker of review?.blockers ?? []) reasons.push(`blocker: ${blocker}`);
  return { to: reasons.length ? 'needs_review' : 'quality_checked', reasons };
}

/** Why an article may not be published, or null when it may. */
export function publishBlocker(entry: LedgerEntry | undefined): string | null {
  if (!entry) return 'article is not in the processing ledger';
  if (entry.status !== 'quality_checked') return `ledger status is "${entry.status}", not "quality_checked"`;
  return null;
}

export function countByStatus(ledger: Ledger): Record<ProcessingStatus, number> {
  const counts = Object.fromEntries(PROCESSING_STATUSES.map((s) => [s, 0])) as Record<ProcessingStatus, number>;
  for (const entry of Object.values(ledger.articles)) counts[entry.status] += 1;
  return counts;
}

/** Shape check for a ledger read from disk. */
export function ledgerProblem(value: unknown): string | null {
  const l = value as Partial<Ledger> | null;
  if (!l || typeof l !== 'object' || Array.isArray(l)) return 'not a JSON object';
  if (l.version !== 1) return 'version must be 1';
  if (!l.articles || typeof l.articles !== 'object') return 'articles is required';
  for (const [id, e] of Object.entries(l.articles)) {
    if (!e || e.id !== id) return `entry ${id} has a mismatched id`;
    if (!isStatus(e.status)) return `entry ${id} has an unknown status`;
    if (!Array.isArray(e.history) || e.history.length === 0) return `entry ${id} has no history`;
    if (e.history[e.history.length - 1].to !== e.status) return `entry ${id}: status does not match its last history event`;
  }
  return null;
}

/**
 * Minimal RFC 4180 CSV reader (quoted fields, doubled quotes, embedded commas
 * and newlines), enough for the audit CSVs the website package writes.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0] !== '');
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
