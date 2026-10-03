/**
 * Maintains the blog processing-status ledger (./lib/blogStatus.ts): one
 * status per article, with an append-only history of who changed it and why.
 * Local file only; this script never touches the database.
 *
 * Commands (default ledger: content/blog-rewrites/ledger.json):
 *   init --backup <dir> --by <who>
 *       Create the ledger from a blog-backup.ts export, every article `pending`.
 *       Refuses to overwrite an existing ledger.
 *   sync-audit <analysis.csv> --by <who>
 *       Move `pending` articles to `analyzed`, then to the status the audit's
 *       recommended_action implies (merge_candidate, noindex_candidate,
 *       needs_review, redirected). Reads docs/BLOG_ARTICLE_ANALYSIS.csv.
 *   set <slug|id> [...] <status> --by <who> --note <why> [--batch <name>]
 *       One manual transition per article, e.g. approved_for_rewrite.
 *   sync-rewrites <dir> --by <who>
 *       For every rewrite file in <dir>: approved_for_rewrite → rewritten, then
 *       quality_checked or needs_review from the file's review block.
 *   summary
 *       Counts per status.
 *   Option: --ledger <path>
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import {
  countByStatus,
  isStatus,
  ledgerProblem,
  parseCsv,
  seedLedger,
  statusAfterRewrite,
  statusForAction,
  transition,
  type Ledger,
  type RewriteReviewSummary,
} from './lib/blogStatus';

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 ? argv[i + 1] : undefined;
};
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const [command, ...rest] = positional;
const ledgerPath = path.resolve(flag('ledger') ?? path.join('content', 'blog-rewrites', 'ledger.json'));
const by = flag('by') ?? '';
const now = new Date().toISOString();

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function load(): Ledger {
  if (!existsSync(ledgerPath)) fail(`No ledger at ${ledgerPath}. Run: blog-status.ts init --backup <dir> --by <who>`);
  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) as Ledger;
  const problem = ledgerProblem(ledger);
  if (problem) fail(`Ledger is invalid: ${problem}`);
  return ledger;
}

function save(ledger: Ledger): void {
  writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
}

const findId = (ledger: Ledger, key: string) =>
  ledger.articles[key] ? key : Object.values(ledger.articles).find((e) => e.slug === key)?.id;

function requireBy(): void {
  if (!by.trim()) fail('Say who is making the change: --by <name>');
}

function init(): void {
  requireBy();
  const backup = flag('backup');
  if (!backup) fail('init needs --backup <dir>');
  if (existsSync(ledgerPath)) fail(`${ledgerPath} already exists; it is never overwritten.`);
  const rows = JSON.parse(readFileSync(path.join(backup, 'blogs.json'), 'utf8')) as { id: string; slug: string }[];
  save(seedLedger(rows, now, by));
  console.log(`Ledger created with ${rows.length} articles, all pending → ${ledgerPath}`);
}

function syncAudit(csvFile: string): void {
  requireBy();
  const ledger = load();
  const rows = parseCsv(readFileSync(csvFile, 'utf8'));
  let moved = 0;
  for (const row of rows) {
    const entry = ledger.articles[row.id];
    if (!entry || entry.status !== 'pending') continue;
    const action = row.recommended_action ?? '';
    const note = `Phase 11 audit: ${action}${row.action_reason ? ` (${row.action_reason})` : ''}`;
    const errA = transition(ledger, row.id, { to: 'analyzed', by, note: 'Measured and classified by the Phase 11 audit.', at: now });
    if (errA) fail(errA);
    const target = statusForAction(action);
    if (target !== 'analyzed') {
      const errB = transition(ledger, row.id, { to: target, by, note, at: now });
      if (errB) fail(errB);
    }
    moved++;
  }
  save(ledger);
  console.log(`${moved} articles analysed.`, countByStatus(ledger));
}

function set(): void {
  requireBy();
  const note = flag('note') ?? '';
  const status = rest[rest.length - 1];
  const keys = rest.slice(0, -1);
  if (!isStatus(status) || keys.length === 0) fail('Usage: set <slug|id> [...] <status> --by <who> --note <why>');
  const ledger = load();
  for (const key of keys) {
    const id = findId(ledger, key);
    if (!id) fail(`Unknown article: ${key}`);
    const err = transition(ledger, id, { to: status, by, note, at: now, batch: flag('batch') });
    if (err) fail(err);
  }
  save(ledger);
  console.log(`${keys.length} article(s) → ${status}`);
}

function syncRewrites(dir: string): void {
  requireBy();
  const ledger = load();
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  for (const file of files) {
    const doc = JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as { id: string; slug: string; batch?: string; pilot?: string; review?: RewriteReviewSummary };
    const entry = ledger.articles[doc.id];
    if (!entry) fail(`${file}: id ${doc.id} is not in the ledger`);
    const batch = doc.batch ?? doc.pilot ?? path.basename(dir);
    if (entry.status === 'approved_for_rewrite') {
      const err = transition(ledger, doc.id, { to: 'rewritten', by, note: `Rewrite saved as ${path.basename(dir)}/${file} (not published).`, at: now, batch });
      if (err) fail(err);
    }
    if (entry.status !== 'rewritten') {
      console.log(`SKIP ${doc.slug}: status is ${entry.status}`);
      continue;
    }
    const { to, reasons } = statusAfterRewrite(doc.review);
    const note = to === 'quality_checked' ? 'Automated checks and second review passed; no open blockers.' : reasons.join(' | ');
    const err = transition(ledger, doc.id, { to, by, note, at: now });
    if (err) fail(err);
    console.log(`${to.padEnd(15)} ${doc.slug}${reasons.length ? ` (${reasons.length} reason${reasons.length > 1 ? 's' : ''})` : ''}`);
  }
  save(ledger);
}

function summary(): void {
  const ledger = load();
  console.log(countByStatus(ledger));
}

switch (command) {
  case 'init':
    init();
    break;
  case 'sync-audit':
    if (!rest[0]) fail('sync-audit needs the analysis CSV path');
    syncAudit(rest[0]);
    break;
  case 'set':
    set();
    break;
  case 'sync-rewrites':
    if (!rest[0]) fail('sync-rewrites needs a rewrite directory');
    syncRewrites(path.resolve(rest[0]));
    break;
  case 'summary':
    summary();
    break;
  default:
    fail('Usage: blog-status.ts <init|sync-audit|set|sync-rewrites|summary> … (see the header of this file)');
}
