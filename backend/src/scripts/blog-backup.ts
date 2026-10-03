/**
 * READ-ONLY export of the complete blog dataset — the prerequisite for any
 * content change (docs/BLOG_REMEDIATION_PLAN.md, step 1).
 *
 * Exports every row of `blogs`, `blog_categories` and `authors` exactly as the
 * database holds them — all statuses (draft, published, archived), all columns,
 * original ids, slugs, content blocks, derived html/toc/faqs, author and
 * category relationships, and dates — plus one file per post for easy diffing
 * and a manifest with per-row content checksums.
 *
 * The checksums are what makes rewrites safe: `blog-rewrite.ts` refuses to
 * apply a rewrite to a row whose current content no longer matches the
 * checksum recorded here, so an edit made in the admin panel after the backup
 * can never be silently overwritten.
 *
 * Properties:
 *   • Read-only. The script issues SELECTs only — there is no insert, update,
 *     upsert or delete anywhere in this file.
 *   • Complete. Pages through each table until it is exhausted.
 *   • Deterministic. Rows are sorted by primary key / slug before writing.
 *
 * Usage:
 *   npx tsx src/scripts/blog-backup.ts                  → backups/blog/<timestamp>/
 *   npx tsx src/scripts/blog-backup.ts --out some/dir
 */
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { supabaseAdmin } from '../config/supabase';
import { contentSha256, sha256 } from './lib/blogRewrite';

const PAGE = 1000;

type Row = Record<string, unknown>;

async function selectAll(table: string, orderBy: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('*')
      .order(orderBy, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE) return rows;
  }
}

async function main() {
  const outFlag = process.argv.indexOf('--out');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.resolve(outFlag > -1 ? process.argv[outFlag + 1] : path.join('backups', 'blog', stamp));
  mkdirSync(path.join(dir, 'posts'), { recursive: true });

  const blogs = await selectAll('blogs', 'slug');
  const categories = await selectAll('blog_categories', 'slug');
  const authors = await selectAll('authors', 'key');

  const write = (file: string, value: unknown) => {
    const body = `${JSON.stringify(value, null, 2)}\n`;
    writeFileSync(path.join(dir, file), body);
    return sha256(body);
  };

  const files = {
    'blogs.json': write('blogs.json', blogs),
    'blog_categories.json': write('blog_categories.json', categories),
    'authors.json': write('authors.json', authors),
  };
  for (const row of blogs) write(path.join('posts', `${row.slug}.json`), row);

  const byStatus: Record<string, number> = {};
  for (const row of blogs) byStatus[String(row.status)] = (byStatus[String(row.status)] ?? 0) + 1;

  write('manifest.json', {
    createdAt: new Date().toISOString(),
    source: new URL(process.env.SUPABASE_URL ?? 'http://unknown').host,
    readOnly: true,
    counts: { blogs: blogs.length, blog_categories: categories.length, authors: authors.length, byStatus },
    files,
    // Per-row fingerprints: blog-rewrite.ts compares these before any write.
    rows: blogs.map((row) => ({
      id: row.id,
      slug: row.slug,
      status: row.status,
      updated: row.updated,
      updatedAt: row.updated_at,
      contentSha256: contentSha256(row.content),
    })),
  });

  console.log(`Backed up ${blogs.length} blogs (${JSON.stringify(byStatus)}), ${categories.length} categories, ${authors.length} authors → ${dir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
