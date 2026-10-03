import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROCESSING_STATUSES,
  TRANSITIONS,
  countByStatus,
  ledgerProblem,
  parseCsv,
  publishBlocker,
  seedLedger,
  statusAfterRewrite,
  statusForAction,
  transition,
} from '../src/scripts/lib/blogStatus';

/**
 * The processing ledger decides whether an article may be published, so the
 * transition rules and the publish gate are pinned here.
 */

const at = '2026-09-24T00:00:00.000Z';
const fresh = () => seedLedger([{ id: 'a', slug: 'alpha' }, { id: 'b', slug: 'beta' }], at, 'test');
const move = (l: ReturnType<typeof fresh>, id: string, to: (typeof PROCESSING_STATUSES)[number]) =>
  transition(l, id, { to, by: 'editor', note: 'because', at });

test('a new ledger starts every article as pending, with a history', () => {
  const l = fresh();
  assert.equal(l.articles.a.status, 'pending');
  assert.equal(l.articles.a.history.length, 1);
  assert.equal(ledgerProblem(l), null);
  assert.equal(countByStatus(l).pending, 2);
});

test('the happy path to publication is allowed step by step, and recorded', () => {
  const l = fresh();
  for (const to of ['analyzed', 'approved_for_rewrite', 'rewritten', 'quality_checked', 'published'] as const) {
    assert.equal(move(l, 'a', to), null, to);
  }
  assert.equal(l.articles.a.history.length, 6);
  assert.deepEqual(l.articles.a.history.map((h) => h.to), ['pending', 'analyzed', 'approved_for_rewrite', 'rewritten', 'quality_checked', 'published']);
  assert.equal(ledgerProblem(l), null);
});

test('skipping a stage is refused and changes nothing', () => {
  const l = fresh();
  assert.match(String(move(l, 'a', 'published')), /not allowed/);
  assert.match(String(move(l, 'a', 'rewritten')), /not allowed/);
  assert.equal(l.articles.a.status, 'pending');
  assert.equal(l.articles.a.history.length, 1);
});

test('every transition needs a who and a why', () => {
  const l = fresh();
  assert.match(String(transition(l, 'a', { to: 'analyzed', by: '', note: 'x', at })), /who/);
  assert.match(String(transition(l, 'a', { to: 'analyzed', by: 'x', note: ' ', at })), /why/);
  assert.match(String(transition(l, 'zzz', { to: 'analyzed', by: 'x', note: 'x', at })), /no ledger entry/);
});

test('redirected is terminal, and every status has a defined set of next steps', () => {
  assert.deepEqual(TRANSITIONS.redirected, []);
  for (const s of PROCESSING_STATUSES) assert.ok(Array.isArray(TRANSITIONS[s]), s);
});

test('audit actions map to the right waiting status', () => {
  assert.equal(statusForAction('DEEP REWRITE'), 'analyzed');
  assert.equal(statusForAction('KEEP'), 'analyzed');
  assert.equal(statusForAction('MERGE'), 'merge_candidate');
  assert.equal(statusForAction('NOINDEX'), 'noindex_candidate');
  assert.equal(statusForAction('MANUAL REVIEW'), 'needs_review');
  assert.equal(statusForAction('REDIRECT'), 'redirected');
});

test('a rewrite is quality_checked only with passing checks, a passing review and no blockers', () => {
  assert.deepEqual(statusAfterRewrite({ automated: { result: 'pass' }, independent: { verdict: 'pass' }, blockers: [] }), { to: 'quality_checked', reasons: [] });
  const blocked = statusAfterRewrite({ automated: { result: 'pass' }, independent: { verdict: 'pass' }, blockers: ['author unverified'] });
  assert.equal(blocked.to, 'needs_review');
  assert.match(blocked.reasons.join(), /author unverified/);
  assert.match(statusAfterRewrite({ automated: { result: 'fail', failures: ['too short'] }, independent: { verdict: 'pass' } }).reasons.join(), /too short/);
  assert.match(statusAfterRewrite({ automated: { result: 'pass' } }).reasons.join(), /second \(independent\) review/);
  assert.match(statusAfterRewrite(undefined).reasons.join(), /not been run/);
});

test('only a quality_checked article may be published', () => {
  const l = fresh();
  assert.match(String(publishBlocker(undefined)), /not in the processing ledger/);
  assert.match(String(publishBlocker(l.articles.a)), /"pending"/);
  for (const to of ['analyzed', 'approved_for_rewrite', 'rewritten', 'quality_checked'] as const) move(l, 'a', to);
  assert.equal(publishBlocker(l.articles.a), null);
});

test('a ledger whose status disagrees with its history is rejected', () => {
  const l = fresh();
  l.articles.a.status = 'published';
  assert.match(String(ledgerProblem(l)), /does not match/);
  assert.match(String(ledgerProblem({ version: 2 })), /version/);
});

test('the CSV reader handles quotes, commas and newlines inside fields', () => {
  const rows = parseCsv('id,recommended_action,action_reason\r\na,DEEP REWRITE,"Template body, 99% shared"\nb,MERGE,"Line one\nline ""two"""\n');
  assert.deepEqual(rows, [
    { id: 'a', recommended_action: 'DEEP REWRITE', action_reason: 'Template body, 99% shared' },
    { id: 'b', recommended_action: 'MERGE', action_reason: 'Line one\nline "two"' },
  ]);
});
