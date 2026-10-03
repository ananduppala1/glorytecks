/**
 * Pure helpers for the blog rewrite workflow (docs/BLOG_REMEDIATION_PLAN.md).
 *
 * Nothing here touches the database. `blog-backup.ts` and `blog-rewrite.ts`
 * do the I/O; this module decides what is safe, so the decisions are unit
 * tested (tests/blogRewrite.test.ts).
 *
 * The safety model:
 *   1. Every rewrite file records the content checksum of the row it was
 *      written against (from the backup manifest).
 *   2. A rewrite is applied only when its status is `approved` (set by a human
 *      editor, never by the tooling) AND the live row still has that exact
 *      content. An edit made in the admin panel after the backup blocks the
 *      write instead of being overwritten.
 *   3. Before writing, the full current row is snapshotted to disk.
 *   4. Rollback restores the snapshot, and only if the row still holds the
 *      content the rewrite wrote — so it cannot clobber a later edit either.
 *   5. `date` (the publication date) is never touched. `updated` is set to the
 *      apply date, because the content genuinely changed on that day.
 */
import { createHash } from 'crypto';
import type { Block } from '../../utils/blocks';

/* ── Hashing ──────────────────────────────────────────────────────────────── */

/** JSON with object keys sorted at every level, so key order cannot change a hash. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

/** Fingerprint of a post body, independent of JSON key order. */
export const contentSha256 = (content: unknown): string => sha256(stableStringify(content ?? []));

/* ── Rewrite files ────────────────────────────────────────────────────────── */

export type RewriteStatus =
  | 'needs_review' // awaiting an editor; automated check results are recorded in the file
  | 'approved' // an editor signed it off — the only status that can be applied
  | 'applied'
  | 'rolled_back';

export interface RewriteSeo {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  keywords?: string[];
  noindex?: boolean;
}

export interface RewriteFile {
  version: 1;
  id: string;
  slug: string;
  status: RewriteStatus;
  baseline: {
    /** Backup file this rewrite was written against. */
    backup: string;
    contentSha256: string;
    updated: string;
  };
  changes: {
    content: Block[];
    excerpt?: string;
    metaDescription?: string;
    /** Written to seo.metaTitle. The blog page renders `${title} | GloryTecks Blog` today and ignores it until that template is changed. */
    metaTitle?: string;
    ogTitle?: string;
    ogDescription?: string;
  };
  [extra: string]: unknown;
}

/** The `changes` fields that land in the row's `seo` block, and the key each one uses there. */
const SEO_CHANGES = ['metaDescription', 'metaTitle', 'ogTitle', 'ogDescription'] as const;

const STATUSES: readonly RewriteStatus[] = ['needs_review', 'approved', 'applied', 'rolled_back'];

/** Shape check for a rewrite file read from disk. Returns the problem, or null. */
export function rewriteFileProblem(value: unknown): string | null {
  const f = value as Partial<RewriteFile> | null;
  if (!f || typeof f !== 'object' || Array.isArray(f)) return 'not a JSON object';
  if (f.version !== 1) return 'version must be 1';
  if (typeof f.id !== 'string' || !f.id) return 'id is required';
  if (typeof f.slug !== 'string' || !f.slug) return 'slug is required';
  if (!STATUSES.includes(f.status as RewriteStatus)) return `status must be one of ${STATUSES.join(', ')}`;
  const b = f.baseline;
  if (!b || typeof b.contentSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(b.contentSha256)) {
    return 'baseline.contentSha256 must be a sha256 hex digest';
  }
  if (!f.changes || !Array.isArray(f.changes.content)) return 'changes.content must be a list of blocks';
  return null;
}

/** The subset of a live row the workflow reads. */
export interface LiveRow {
  id: string;
  slug: string;
  content: unknown;
  excerpt?: string;
  updated?: string;
  readTime?: string;
  seo?: RewriteSeo | null;
}

export interface PlanResult {
  slug: string;
  ok: boolean;
  /** Blocking problems — the rewrite must not be applied. */
  errors: string[];
  /** Worth a look, not blocking. */
  notes: string[];
}

/**
 * Decide whether a rewrite may be applied to the row as it is now.
 *
 * `validate` is the backend's own block validator, passed in so this module
 * stays pure. `requireApproved` is true for `apply` and false for `plan`,
 * which reports on drafts too.
 */
export function planRewrite(
  file: RewriteFile,
  current: LiveRow | null,
  validate: (blocks: unknown) => string | null,
  requireApproved: boolean,
): PlanResult {
  const errors: string[] = [];
  const notes: string[] = [];

  if (file.version !== 1) errors.push(`unsupported rewrite file version ${String(file.version)}`);
  if (!current) {
    errors.push('no live row with this slug');
  } else {
    if (current.id !== file.id) errors.push(`id mismatch: file ${file.id}, live ${current.id}`);
    if (current.slug !== file.slug) errors.push(`slug mismatch: file ${file.slug}, live ${current.slug}`);
    const live = contentSha256(current.content);
    // Blocking, not a note: re-applying would snapshot the rewrite as the
    // "before" state and bump `updated` for no change.
    if (live === contentSha256(file.changes.content)) errors.push('live content already equals the rewrite (already applied)');
    else if (live !== file.baseline.contentSha256) {
      errors.push('live content changed since the backup — re-baseline against a fresh backup before applying');
    }
  }

  if (requireApproved && file.status !== 'approved') errors.push(`status is "${file.status}", not "approved"`);

  const problem = validate(file.changes.content);
  if (problem) errors.push(`content fails validation: ${problem}`);
  if (!Array.isArray(file.changes.content) || file.changes.content.length === 0) errors.push('rewrite has no content');

  const meta = file.changes.metaDescription;
  if (meta !== undefined && (meta.length < 70 || meta.length > 160)) {
    notes.push(`meta description is ${meta.length} characters (aim for 70–160)`);
  }
  const title = file.changes.metaTitle;
  if (title !== undefined && (title.length < 20 || title.length > 65)) {
    notes.push(`meta title is ${title.length} characters (aim for 20–65)`);
  }

  return { slug: file.slug, ok: errors.length === 0, errors, notes };
}

/**
 * The payload handed to BlogService.updateBlog — the same service the admin
 * panel uses, so html/toc/faqs are re-derived exactly as for a manual save.
 * `date` is deliberately absent: the publication date never changes.
 */
export function buildUpdate(file: RewriteFile, current: LiveRow, today: string): Record<string, unknown> {
  const update: Record<string, unknown> = { content: file.changes.content, updated: today };
  if (file.changes.excerpt !== undefined) update.excerpt = file.changes.excerpt;
  const seo: RewriteSeo = {};
  for (const key of SEO_CHANGES) if (file.changes[key] !== undefined) seo[key] = file.changes[key];
  if (Object.keys(seo).length) update.seo = { ...(current.seo ?? {}), ...seo };
  return update;
}

export interface Snapshot {
  takenAt: string;
  id: string;
  slug: string;
  contentSha256: string;
  /** What the rewrite wrote — rollback checks the row still holds this. */
  appliedContentSha256: string;
  row: {
    content: unknown;
    excerpt?: string;
    seo?: RewriteSeo | null;
    updated?: string;
    readTime?: string;
  };
}

export function snapshotOf(current: LiveRow, file: RewriteFile, takenAt: string): Snapshot {
  return {
    takenAt,
    id: current.id,
    slug: current.slug,
    contentSha256: contentSha256(current.content),
    appliedContentSha256: contentSha256(file.changes.content),
    row: {
      content: current.content,
      excerpt: current.excerpt,
      seo: current.seo ?? null,
      updated: current.updated,
      readTime: current.readTime,
    },
  };
}

/** Rollback is only safe while the row still holds exactly what the rewrite wrote. */
export function planRollback(snapshot: Snapshot, current: LiveRow | null): PlanResult {
  const errors: string[] = [];
  if (!current) errors.push('no live row with this slug');
  else {
    if (current.id !== snapshot.id) errors.push(`id mismatch: snapshot ${snapshot.id}, live ${current.id}`);
    const live = contentSha256(current.content);
    if (live === snapshot.contentSha256) errors.push('live content already equals the snapshot (already rolled back?)');
    else if (live !== snapshot.appliedContentSha256) errors.push('live content was edited after the rewrite — restore by hand');
  }
  return { slug: snapshot.slug, ok: errors.length === 0, errors, notes: [] };
}

/** Restores the pre-rewrite body, excerpt, SEO block, `updated` and read time. */
export function rollbackUpdate(snapshot: Snapshot): Record<string, unknown> {
  const update: Record<string, unknown> = { content: snapshot.row.content };
  if (snapshot.row.excerpt !== undefined) update.excerpt = snapshot.row.excerpt;
  if (snapshot.row.seo) update.seo = snapshot.row.seo;
  if (snapshot.row.updated !== undefined) update.updated = snapshot.row.updated;
  if (snapshot.row.readTime !== undefined) update.readTime = snapshot.row.readTime;
  return update;
}
