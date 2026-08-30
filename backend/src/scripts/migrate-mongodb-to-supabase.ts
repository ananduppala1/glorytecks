/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ONE-TIME MongoDB → Supabase PostgreSQL import.
 *
 * This is the ONLY file in the project that touches MongoDB, and `mongodb` is a
 * devDependency — it is never loaded by the running API. Delete this script
 * once the cutover is done if you want the dependency gone entirely.
 *
 * Properties:
 *   • Non-destructive. Nothing is ever deleted from MongoDB.
 *   • Re-runnable. Rows are upserted on their deterministic primary key, so a
 *     second run updates rather than duplicates. Use --dry-run first.
 *   • Order-aware. Authors and trainers are imported before the blogs and
 *     courses that reference them, so foreign keys always resolve.
 *   • Cloudinary-safe. Image and file fields are copied as-is. No asset is
 *     uploaded, moved, re-hosted or deleted — Cloudinary remains the store and
 *     every existing URL and public ID keeps working.
 *
 * IDs
 *   A Mongo ObjectId is 12 bytes; a UUID is 16. Left-padding the ObjectId hex
 *   with eight zeros produces a deterministic, collision-free, reversible UUID:
 *       507f1f77bcf86cd799439011 → 00000000-507f-1f77-bcf8-6cd799439011
 *   Every reference between documents therefore survives the import, and
 *   re-running the script maps each document to the same row.
 *
 * PASSWORDS
 *   Mongo stored bcrypt hashes. Supabase Auth (GoTrue) verifies bcrypt, so the
 *   hashes are handed over via the admin API's `password_hash` field and every
 *   administrator keeps their existing password. If your Supabase version
 *   rejects it, the script reports the account and you can fall back to
 *   `npm run seed:admin` (resets passwords) or an emailed reset link.
 *
 * Usage:
 *   MONGODB_URI=mongodb://127.0.0.1:27017/glorytecks npm run migrate:mongo -- --dry-run
 *   MONGODB_URI=mongodb://127.0.0.1:27017/glorytecks npm run migrate:mongo
 */
import { MongoClient, Db, ObjectId } from 'mongodb';
import { supabaseAdmin } from '../config/supabase';
import { deriveContentFields } from '../services/blog.service';
import { Block } from '../utils/blocks';
import * as schema from '../db/schema';
import { apiToRow, TableDef } from '../db/mappers';

const MONGO_URI = process.env.MONGODB_URI ?? process.env.MONGO_URI ?? '';
const DRY_RUN = process.argv.includes('--dry-run');
const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];

/* ── ID mapping ───────────────────────────────────────────────────────────── */

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

/** Deterministically widen a 12-byte ObjectId into a 16-byte UUID. */
export function objectIdToUuid(id: unknown): string | null {
  if (!id) return null;
  const hex = String(id instanceof ObjectId ? id.toHexString() : id);
  if (!OBJECT_ID_RE.test(hex)) return null;
  const padded = `00000000${hex.toLowerCase()}`;
  return [
    padded.slice(0, 8),
    padded.slice(8, 12),
    padded.slice(12, 16),
    padded.slice(16, 20),
    padded.slice(20, 32),
  ].join('-');
}

/* ── Reporting ────────────────────────────────────────────────────────────── */

interface Report {
  collection: string;
  read: number;
  written: number;
  skipped: number;
  failures: Array<{ id: string; reason: string }>;
}

const reports: Report[] = [];

function newReport(collection: string): Report {
  const r: Report = { collection, read: 0, written: 0, skipped: 0, failures: [] };
  reports.push(r);
  return r;
}

/* ── Write helper ─────────────────────────────────────────────────────────── */

/**
 * Upsert a batch of rows on the primary key. Batched to keep request sizes
 * sane; a failed batch is retried row-by-row so one bad document cannot hide
 * the other 499 that were fine.
 */
async function upsertRows(table: string, rows: Record<string, unknown>[], report: Report) {
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    if (DRY_RUN) {
      report.written += chunk.length;
      continue;
    }
    const { error } = await supabaseAdmin.from(table).upsert(chunk, { onConflict: 'id' });
    if (!error) {
      report.written += chunk.length;
      continue;
    }
    // Retry individually to isolate the offending rows.
    for (const row of chunk) {
      const { error: rowError } = await supabaseAdmin
        .from(table)
        .upsert(row, { onConflict: 'id' });
      if (rowError) {
        report.failures.push({ id: String(row.id), reason: rowError.message });
      } else {
        report.written += 1;
      }
    }
  }
}

/**
 * Convert a Mongo document to a database row using the same table definition
 * the API uses, then attach the deterministic id and original timestamps.
 */
function toRow(
  def: TableDef,
  doc: any,
  transform?: (doc: any) => Record<string, unknown>,
): Record<string, unknown> | null {
  const id = objectIdToUuid(doc._id);
  if (!id) return null;

  const api = transform ? transform(doc) : { ...doc };
  const row = apiToRow(def, api);

  row.id = id;
  // Preserve the original audit timestamps rather than stamping "now".
  if (doc.createdAt) row.created_at = new Date(doc.createdAt).toISOString();
  if (doc.updatedAt) row.updated_at = new Date(doc.updatedAt).toISOString();
  return row;
}

/** Generic collection importer for the tables that need no special handling. */
async function migrateCollection(
  db: Db,
  collection: string,
  def: TableDef,
  transform?: (doc: any) => Record<string, unknown>,
): Promise<void> {
  if (only && only !== collection) return;
  const report = newReport(collection);
  const docs = await db.collection(collection).find({}).toArray();
  report.read = docs.length;

  const rows: Record<string, unknown>[] = [];
  for (const doc of docs) {
    const row = toRow(def, doc, transform);
    if (!row) {
      report.skipped += 1;
      report.failures.push({ id: String(doc._id), reason: 'Unmappable _id (not an ObjectId)' });
      continue;
    }
    rows.push(row);
  }

  await upsertRows(def.table, rows, report);
  console.log(
    `  ${collection.padEnd(18)} read ${String(report.read).padStart(5)}  ` +
      `written ${String(report.written).padStart(5)}  failed ${report.failures.length}`,
  );
}

/* ── Administrators (identity + profile) ──────────────────────────────────── */

/**
 * Administrators are the only collection that spans two systems: the identity
 * goes to Supabase Auth, the profile to public.admin_users. The auth user is
 * created with the ORIGINAL ObjectId-derived UUID so the profile's foreign key
 * to auth.users resolves and every historical reference stays valid.
 */
async function migrateAdminUsers(db: Db): Promise<void> {
  if (only && only !== 'adminusers') return;
  const report = newReport('adminusers');
  const docs = await db.collection('adminusers').find({}).toArray();
  report.read = docs.length;

  for (const doc of docs) {
    const id = objectIdToUuid(doc._id);
    const email = String(doc.email ?? '').toLowerCase().trim();

    if (!id || !email) {
      report.skipped += 1;
      report.failures.push({ id: String(doc._id), reason: 'Missing id or email' });
      continue;
    }

    if (DRY_RUN) {
      report.written += 1;
      continue;
    }

    // 1. Identity. Existing bcrypt hash is handed straight to Supabase Auth so
    //    the administrator's current password keeps working.
    const { data: existing } = await supabaseAdmin.auth.admin.getUserById(id);

    if (!existing?.user) {
      const { error } = await supabaseAdmin.auth.admin.createUser({
        // `id` is accepted by the admin API so imported users keep their key.
        id,
        email,
        email_confirm: true,
        password_hash: typeof doc.password === 'string' ? doc.password : undefined,
        user_metadata: { name: doc.name ?? '' },
      } as any);

      if (error) {
        report.failures.push({
          id: email,
          reason:
            `Auth identity not created: ${error.message}. ` +
            'Re-run `npm run seed:admin` for this account, or send a password reset.',
        });
        continue;
      }
    }

    // 2. Application profile — the source of truth for role and isActive.
    const row: Record<string, unknown> = {
      id,
      name: doc.name ?? email,
      email,
      role: doc.role ?? 'admin',
      avatar: doc.avatar ?? null,
      is_active: doc.isActive !== false,
      last_login_at: doc.lastLoginAt ? new Date(doc.lastLoginAt).toISOString() : null,
    };
    if (doc.createdAt) row.created_at = new Date(doc.createdAt).toISOString();
    if (doc.updatedAt) row.updated_at = new Date(doc.updatedAt).toISOString();

    const { error: profileError } = await supabaseAdmin
      .from('admin_users')
      .upsert(row, { onConflict: 'id' });

    if (profileError) {
      report.failures.push({ id: email, reason: `Profile: ${profileError.message}` });
    } else {
      report.written += 1;
    }
  }

  console.log(
    `  ${'adminusers'.padEnd(18)} read ${String(report.read).padStart(5)}  ` +
      `written ${String(report.written).padStart(5)}  failed ${report.failures.length}`,
  );
  if (!DRY_RUN) {
    console.log(
      '     ↳ passwords carried over as bcrypt hashes; note any failures listed below.',
    );
  }
}

/* ── Singletons ───────────────────────────────────────────────────────────── */

async function migrateSingleton(
  db: Db,
  collection: string,
  rpc: string,
  table: string,
  def: TableDef,
): Promise<void> {
  if (only && only !== collection) return;
  const report = newReport(collection);
  const doc = await db.collection(collection).findOne({});
  if (!doc) {
    console.log(`  ${collection.padEnd(18)} no document — leaving schema defaults in place`);
    return;
  }
  report.read = 1;

  if (DRY_RUN) {
    report.written = 1;
    console.log(`  ${collection.padEnd(18)} read 1  written 1 (dry run)`);
    return;
  }

  // Ensure the singleton row exists, then update it in place — its id is
  // generated by the database, not derived from the Mongo _id.
  const { data: current, error: rpcError } = await supabaseAdmin.rpc(rpc).single();
  if (rpcError || !current) {
    report.failures.push({ id: collection, reason: rpcError?.message ?? 'Could not initialise' });
    return;
  }

  const row = apiToRow(def, doc as Record<string, unknown>);
  delete row.id;
  const { error } = await supabaseAdmin
    .from(table)
    .update(row)
    .eq('id', (current as { id: string }).id);

  if (error) report.failures.push({ id: collection, reason: error.message });
  else report.written = 1;

  console.log(`  ${collection.padEnd(18)} read 1  written ${report.written}`);
}

/* ── Main ─────────────────────────────────────────────────────────────────── */

async function run(): Promise<void> {
  if (!MONGO_URI) {
    console.error('MONGODB_URI is required, e.g.');
    console.error('  MONGODB_URI=mongodb://127.0.0.1:27017/glorytecks npm run migrate:mongo');
    process.exit(1);
  }

  console.log(`▶ MongoDB → Supabase import${DRY_RUN ? ' (DRY RUN — nothing is written)' : ''}`);
  console.log('  Cloudinary assets are NOT touched: only URLs and public IDs are copied.\n');

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();

  // Administrators first, then referenced tables, then their dependants.
  await migrateAdminUsers(db);
  await migrateCollection(db, 'authors', schema.authorsTable);
  await migrateCollection(db, 'trainers', schema.trainersTable);
  await migrateCollection(db, 'blogcategories', schema.blogCategoriesTable);

  // Blogs: rebuild derived fields so html/toc/faqs match the current renderer,
  // and remap the author reference onto the new UUID.
  await migrateCollection(db, 'blogs', schema.blogsTable, (doc) => {
    const derived = deriveContentFields((doc.content ?? []) as Block[]);
    return {
      ...doc,
      ...derived,
      author: objectIdToUuid(doc.author),
    };
  });

  await migrateCollection(db, 'courses', schema.coursesTable, (doc) => ({
    ...doc,
    trainer: objectIdToUuid(doc.trainer),
  }));

  await migrateCollection(db, 'testimonials', schema.testimonialsTable);
  await migrateCollection(db, 'placements', schema.placementsTable);
  await migrateCollection(db, 'companies', schema.companiesTable);
  await migrateCollection(db, 'roadmaps', schema.roadmapsTable);
  await migrateCollection(db, 'faqs', schema.faqsTable);
  await migrateCollection(db, 'demorequests', schema.demoRequestsTable);
  await migrateCollection(db, 'contactenquiries', schema.contactEnquiriesTable);
  await migrateCollection(db, 'comparisons', schema.comparisonsTable);
  await migrateCollection(db, 'localities', schema.localitiesTable);
  await migrateCollection(db, 'legaldocs', schema.legalDocsTable);
  await migrateCollection(db, 'galleries', schema.galleryTable);
  await migrateCollection(db, 'brochures', schema.brochuresTable);
  await migrateCollection(db, 'batches', schema.batchesTable);

  await migrateSingleton(db, 'settings', 'get_or_create_settings', 'settings', schema.settingsTable);
  await migrateSingleton(
    db,
    'aboutpages',
    'get_or_create_about_page',
    'about_page',
    schema.aboutPageTable,
  );

  await client.close();

  /* ── Summary ───────────────────────────────────────────────────────────── */
  const totalRead = reports.reduce((a, r) => a + r.read, 0);
  const totalWritten = reports.reduce((a, r) => a + r.written, 0);
  const failures = reports.flatMap((r) => r.failures.map((f) => ({ ...f, c: r.collection })));

  console.log(`\n  Documents read:    ${totalRead}`);
  console.log(`  Rows written:      ${totalWritten}`);
  console.log(`  Failures:          ${failures.length}`);

  if (failures.length) {
    console.log('\n  Failures in detail:');
    for (const f of failures.slice(0, 50)) {
      console.log(`   • [${f.c}] ${f.id}: ${f.reason}`);
    }
    if (failures.length > 50) console.log(`   … and ${failures.length - 50} more`);
  }

  console.log(
    failures.length
      ? '\n⚠️  Import finished with errors. MongoDB is untouched — fix and re-run safely.'
      : `\n✅ Import complete${DRY_RUN ? ' (dry run)' : ''}. MongoDB was not modified.`,
  );

  process.exit(failures.length ? 1 : 0);
}

// Only run when invoked directly (`npm run migrate:mongo`), so the helpers
// above can be imported by tests without connecting to anything.
if (require.main === module) {
  run().catch((err) => {
    console.error('❌ Import failed:', err);
    process.exit(1);
  });
}
