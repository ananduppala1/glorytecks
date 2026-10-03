/**
 * Applies reviewed blog rewrites, one post at a time, reversibly
 * (docs/BLOG_REMEDIATION_PLAN.md, "How a rewrite reaches the site").
 *
 * A rewrite is a JSON file (see `RewriteFile` in ./lib/blogRewrite) written
 * against a backup made by `blog-backup.ts`. This script never writes a file
 * whose status is anything but `approved`, and only an editor sets that. It
 * also requires the article's processing status (content/blog-rewrites/
 * ledger.json, see ./lib/blogStatus) to be `quality_checked`, and records the
 * outcome there: `published` after a write, `needs_review` after a rollback.
 *
 * Commands:
 *   plan <dir>                    Read-only. Checks every rewrite in <dir> against
 *                                 the live rows and prints what apply would do.
 *   apply <dir> --confirm         Writes the `approved` rewrites that pass every
 *                                 check. Without --confirm it reports what it
 *                                 would write, including the approval check, and
 *                                 writes nothing.
 *   rollback <snapshotDir> --confirm
 *                                 Restores the rows an apply run changed, from
 *                                 the snapshots that run took.
 *   Options: --only <slug>        Limit any command to one post.
 *            --ledger <path>      Processing ledger (default content/blog-rewrites/ledger.json).
 *
 * What apply does, per post:
 *   1. Re-reads the live row and re-runs every check (planRewrite).
 *   2. Writes the full current row to backups/blog-rewrites/<stamp>/<slug>.before.json.
 *   3. Saves through BlogService.updateBlog, the service the admin panel uses,
 *      so html, toc, faqs and read time are derived exactly as for a manual save.
 *   4. Appends the outcome to backups/blog-rewrites/<stamp>/apply-log.json.
 * Then it clears the backend's blog cache, as the admin panel does after a
 * save. The website picks the change up when its own cache window expires.
 *
 * It never deletes a post, never changes a slug, title, category, author or
 * publication `date`, and never touches a post that has no approved rewrite.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { blogRepo } from '../repositories';
import { blogService } from '../services/blog.service';
import { invalidateResource } from '../lib/cacheInvalidation';
import { validateBlocks } from '../validators/blocks.validator';
import type { IBlog } from '../interfaces/common';
import { ledgerProblem, publishBlocker, transition, type Ledger } from './lib/blogStatus';
import {
  buildUpdate,
  planRewrite,
  planRollback,
  rewriteFileProblem,
  rollbackUpdate,
  snapshotOf,
  type LiveRow,
  type PlanResult,
  type RewriteFile,
  type Snapshot,
} from './lib/blogRewrite';

/** What BlogService.updateBlog accepts. The helpers build only content, excerpt, seo, updated and readTime. */
type UpdatePayload = Parameters<typeof blogService.updateBlog>[1];

const args = process.argv.slice(2);
const [command, target] = args;
const confirmed = args.includes('--confirm');
const onlyIndex = args.indexOf('--only');
const only = onlyIndex > -1 ? args[onlyIndex + 1] : undefined;
const ledgerIndex = args.indexOf('--ledger');
const ledgerPath = path.resolve(ledgerIndex > -1 ? args[ledgerIndex + 1] : path.join('content', 'blog-rewrites', 'ledger.json'));

function loadLedger(): Ledger | null {
  if (!existsSync(ledgerPath)) return null;
  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) as Ledger;
  const problem = ledgerProblem(ledger);
  if (problem) throw new Error(`Ledger ${ledgerPath} is invalid: ${problem}`);
  return ledger;
}

function saveLedger(ledger: Ledger): void {
  writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
}

function usage(): never {
  console.error('Usage: tsx src/scripts/blog-rewrite.ts <plan|apply|rollback> <dir> [--confirm] [--only <slug>]');
  process.exit(2);
}

function readJsonFiles<T>(dir: string, suffix: string): Array<{ file: string; value: T }> {
  if (!existsSync(dir)) throw new Error(`No such directory: ${dir}`);
  return readdirSync(dir)
    .filter((name) => name.endsWith(suffix))
    .sort()
    .map((name) => {
      const file = path.join(dir, name);
      return { file, value: JSON.parse(readFileSync(file, 'utf8')) as T };
    });
}

async function liveRow(slug: string): Promise<LiveRow | null> {
  const doc = (await blogRepo.findOne({ slug }, { detail: true })) as (IBlog & { id?: string }) | null;
  if (!doc) return null;
  return {
    id: String(doc.id),
    slug: doc.slug,
    content: doc.content,
    excerpt: doc.excerpt,
    updated: doc.updated,
    readTime: doc.readTime,
    seo: doc.seo ?? null,
  };
}

function report(result: PlanResult): void {
  console.log(`${result.ok ? 'OK     ' : 'BLOCKED'} ${result.slug}`);
  for (const e of result.errors) console.log(`          ✗ ${e}`);
  for (const n of result.notes) console.log(`          · ${n}`);
}

async function planOrApply(dir: string, requireApproved: boolean, write: boolean): Promise<number> {
  const files = readJsonFiles<RewriteFile>(dir, '.json').filter(({ value }) => !only || value?.slug === only);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapDir = path.resolve('backups', 'blog-rewrites', stamp);
  const today = new Date().toISOString().slice(0, 10);
  const log: unknown[] = [];
  const ledger = loadLedger();
  let blocked = 0;
  let written = 0;

  for (const { file, value } of files) {
    const shape = rewriteFileProblem(value);
    if (shape) {
      console.log(`SKIPPED ${path.basename(file)} — ${shape}`);
      blocked += 1;
      continue;
    }
    const current = await liveRow(value.slug);
    const result = planRewrite(value, current, validateBlocks, requireApproved);
    const entry = ledger?.articles[value.id];
    const ledgerBlock = publishBlocker(entry);
    if (requireApproved && ledgerBlock) {
      result.errors.push(ledgerBlock);
      result.ok = false;
    } else if (!requireApproved) {
      result.notes.push(entry ? `ledger status: ${entry.status}` : 'not in the processing ledger');
    }
    report(result);
    if (!result.ok || !current) {
      blocked += 1;
      continue;
    }
    if (!write) continue;

    mkdirSync(snapDir, { recursive: true });
    const snapshot = snapshotOf(current, value, new Date().toISOString());
    writeFileSync(path.join(snapDir, `${value.slug}.before.json`), `${JSON.stringify(snapshot, null, 2)}\n`);
    await blogService.updateBlog(current.id, buildUpdate(value, current, today) as UpdatePayload);
    written += 1;
    log.push({ slug: value.slug, id: current.id, appliedAt: new Date().toISOString(), rewrite: file });
    writeFileSync(path.join(snapDir, 'apply-log.json'), `${JSON.stringify(log, null, 2)}\n`);
    console.log(`          → written; snapshot ${path.join(snapDir, `${value.slug}.before.json`)}`);
    if (ledger) {
      const err = transition(ledger, value.id, {
        to: 'published',
        by: 'blog-rewrite apply',
        note: `Applied ${path.basename(file)}; snapshot ${path.join(snapDir, `${value.slug}.before.json`)}`,
        at: new Date().toISOString(),
      });
      if (err) console.log(`          ! ledger not updated: ${err}`);
      else saveLedger(ledger);
    }
  }

  if (written > 0) await invalidateResource('blogs');
  console.log(
    write
      ? `\n${written} written, ${blocked} blocked.${written ? ` Roll back with: rollback ${snapDir} --confirm` : ''}`
      : `\nPlan only — nothing written. ${files.length - blocked} would pass, ${blocked} blocked.`,
  );
  return blocked;
}

async function rollback(dir: string, execute: boolean): Promise<number> {
  const snaps = readJsonFiles<Snapshot>(dir, '.before.json').filter(({ value }) => !only || value.slug === only);
  const ledger = loadLedger();
  let blocked = 0;
  let restored = 0;
  for (const { value } of snaps) {
    const current = await liveRow(value.slug);
    const result = planRollback(value, current);
    report(result);
    if (!result.ok || !current) {
      blocked += 1;
      continue;
    }
    if (!execute) continue;
    await blogService.updateBlog(current.id, rollbackUpdate(value) as UpdatePayload);
    restored += 1;
    console.log('          → restored');
    if (ledger?.articles[value.id]?.status === 'published') {
      const err = transition(ledger, value.id, {
        to: 'needs_review',
        by: 'blog-rewrite rollback',
        note: `Rolled back from ${path.basename(dir)}/${value.slug}.before.json`,
        at: new Date().toISOString(),
      });
      if (err) console.log(`          ! ledger not updated: ${err}`);
      else saveLedger(ledger);
    }
  }
  if (restored > 0) await invalidateResource('blogs');
  console.log(execute ? `\n${restored} restored, ${blocked} blocked.` : `\nPlan only — nothing restored. Add --confirm to restore.`);
  return blocked;
}

async function main() {
  if (!target || !['plan', 'apply', 'rollback'].includes(command)) usage();
  const dir = path.resolve(target);
  const isApply = command === 'apply';
  const blocked = command === 'rollback' ? await rollback(dir, confirmed) : await planOrApply(dir, isApply, isApply && confirmed);
  process.exit(blocked > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
