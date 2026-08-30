import { env } from '../config/env';
import { ROLES, CONTENT_STATUS, BatchMode } from '../constants';
import { authService } from '../services/auth.service';
import {
  adminUserRepo,
  blogRepo,
  blogCategoryRepo,
  authorRepo,
  courseRepo,
  trainerRepo,
  testimonialRepo,
  placementRepo,
  companyRepo,
  roadmapRepo,
  faqRepo,
  comparisonRepo,
  localityRepo,
  legalDocRepo,
  batchRepo,
  settingsRepo,
} from '../repositories';
import { BaseRepository } from '../repositories/BaseRepository';
import { deriveContentFields } from '../services/blog.service';
import { estimateReadTime, Block } from '../utils/blocks';

// ── Migration sources (copied verbatim from the website) ──────────────────
import { categories as siteCategories } from './sitedata/meta';
import { authors as siteAuthors } from './sitedata/authors';
import { topics as siteTopics } from './sitedata/topics';
import { getPostContent } from './sitedata/content';
import { courses as siteCourses, syllabusBySlug } from './sitedata/courses';
import { comparisons as siteComparisons } from './sitedata/comparisons';
import { localities as siteLocalities } from './sitedata/locations';
import { legalDocs as siteLegalDocs } from './sitedata/legal';
import {
  trainersData,
  testimonialsData,
  companiesData,
  placementStoriesData,
  roadmapsData,
  faqsData,
  batchesData,
  settingsData,
} from './sitedata/homedata';

const arg = (name: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

// Limit blog import for fast local seeding; pass --blogs=all for the full set.
const blogLimitArg = arg('blogs') ?? process.env.SEED_BLOG_LIMIT ?? '80';
const BLOG_LIMIT = blogLimitArg === 'all' ? Number.MAX_SAFE_INTEGER : Number(blogLimitArg) || 80;
const WIPE = process.argv.includes('--fresh');

/**
 * Seed helper replacing `Model.findOneAndUpdate(filter, doc, { upsert: true })`.
 *
 * PostgREST's upsert needs a unique constraint to resolve conflicts on, and
 * several of these collections were matched on non-unique combinations
 * (trainer name, testimonial name+quote). So the lookup is explicit: find by
 * the natural key, then update or insert. Idempotent, and re-running the seed
 * never duplicates rows.
 */
async function upsertBy<T>(
  repo: BaseRepository<T>,
  match: Record<string, unknown>,
  payload: Record<string, unknown>,
): Promise<void> {
  const existingId = await repo.exists(match);
  if (existingId) await repo.updateById(existingId, payload);
  else await repo.insert(payload);
}

async function seedAdmin(): Promise<void> {
  const { name, email, password } = env.seedAdmin;
  const existing = await adminUserRepo.exists({ email: email.toLowerCase() });
  if (!existing) {
    await authService.createAdminUser({ name, email, password, role: ROLES.ADMIN });
    console.log(`  ✓ admin: ${email}`);
  } else {
    console.log(`  • admin already exists: ${email}`);
  }
}

async function seedCategories(): Promise<void> {
  let i = 0;
  for (const c of siteCategories) {
    await upsertBy(blogCategoryRepo, { slug: c.slug }, { ...c, order: i++ });
  }
  console.log(`  ✓ categories: ${siteCategories.length}`);
}

async function seedAuthors(): Promise<void> {
  for (const a of siteAuthors) {
    await upsertBy(
      authorRepo,
      { key: a.id },
      { key: a.id, name: a.name, role: a.role, bio: a.bio, initials: a.initials },
    );
  }
  console.log(`  ✓ authors: ${siteAuthors.length}`);
}

async function seedCourses(): Promise<void> {
  let i = 0;
  for (const c of siteCourses) {
    const syllabus = syllabusBySlug[c.slug] ?? [];
    await upsertBy(
      courseRepo,
      { slug: c.slug },
      {
        slug: c.slug,
        title: c.title,
        category: c.category,
        tagline: c.tagline,
        description: c.description,
        duration: c.duration,
        modules: c.modules,
        tools: c.tools,
        projects: c.projects,
        placement: c.placement,
        syllabus,
        status: CONTENT_STATUS.PUBLISHED,
        order: i++,
      },
    );
  }
  console.log(`  ✓ courses: ${siteCourses.length}`);
}

async function seedBlogs(): Promise<void> {
  const authors = await authorRepo.findMany({ fields: ['key'] });
  const authorMap = new Map(authors.map((a) => [a.key, a.id]));
  const selected = siteTopics.slice(0, BLOG_LIMIT);
  let created = 0;

  for (const t of selected) {
    const exists = await blogRepo.exists({ slug: t.slug });
    if (exists) continue;

    const content = getPostContent(t) as Block[];
    // Derived html/toc/faqs — the work the pre-save hook used to do.
    const derived = deriveContentFields(content);

    await blogRepo.insert({
      slug: t.slug,
      title: t.title,
      category: t.category,
      categorySlug: t.categorySlug,
      kind: t.kind,
      excerpt: t.excerpt,
      status: CONTENT_STATUS.PUBLISHED,
      featured: t.featured,
      trending: t.trending,
      popular: t.popular,
      tags: t.tags,
      author: authorMap.get(t.author) ?? null,
      authorKey: t.author,
      readTime: t.readTime || estimateReadTime(derived.content),
      date: t.date,
      updated: t.updated || t.date,
      ...derived,
      publishedAt: new Date(t.date).toISOString(),
      seo: {
        metaTitle: t.title,
        metaDescription: t.metaDescription,
        keywords: t.tags,
        ogTitle: t.title,
        ogDescription: t.metaDescription,
      },
    });
    created += 1;
  }
  console.log(`  ✓ blogs: ${created} created (of ${selected.length} selected, limit=${BLOG_LIMIT})`);
}

async function seedTrainers(): Promise<void> {
  let i = 0;
  for (const t of trainersData) {
    await upsertBy(trainerRepo, { name: t.name }, { ...t, order: i++, featured: true, isActive: true });
  }
  console.log(`  ✓ trainers: ${trainersData.length}`);
}

async function seedTestimonials(): Promise<void> {
  let i = 0;
  for (const t of testimonialsData) {
    i += 1;
    await upsertBy(
      testimonialRepo,
      { name: t.name, quote: t.quote },
      { ...t, order: i - 1, featured: i <= 3, isActive: true },
    );
  }
  console.log(`  ✓ testimonials: ${testimonialsData.length}`);
}

async function seedPlacements(): Promise<void> {
  let i = 0;
  for (const p of placementStoriesData) {
    await upsertBy(
      placementRepo,
      { name: p.name, company: p.company },
      { ...p, order: i++, featured: true, isActive: true },
    );
  }
  console.log(`  ✓ placements: ${placementStoriesData.length}`);
}

async function seedCompanies(): Promise<void> {
  let i = 0;
  for (const name of companiesData) {
    await upsertBy(companyRepo, { name }, { name, order: i++, isActive: true });
  }
  console.log(`  ✓ companies: ${companiesData.length}`);
}

async function seedRoadmaps(): Promise<void> {
  let i = 0;
  for (const r of roadmapsData) {
    await upsertBy(roadmapRepo, { course: r.course }, { ...r, order: i++, isActive: true });
  }
  console.log(`  ✓ roadmaps: ${roadmapsData.length}`);
}

async function seedFaqs(): Promise<void> {
  let i = 0;
  for (const f of faqsData) {
    await upsertBy(
      faqRepo,
      { question: f.question },
      { ...f, scope: 'general', order: i++, isActive: true },
    );
  }
  console.log(`  ✓ faqs: ${faqsData.length}`);
}

async function seedComparisons(): Promise<void> {
  let i = 0;
  for (const c of siteComparisons) {
    await upsertBy(
      comparisonRepo,
      { slug: c.slug },
      {
        slug: c.slug,
        title: c.title,
        metaTitle: c.metaTitle,
        itemA: c.itemA,
        itemB: c.itemB,
        intro: c.intro,
        rows: c.rows,
        verdict: c.verdict,
        relatedCourses: c.relatedCourses,
        faqs: c.faqs.map(([q, a]) => ({ q, a })),
        status: CONTENT_STATUS.PUBLISHED,
        order: i++,
      },
    );
  }
  console.log(`  ✓ comparisons: ${siteComparisons.length}`);
}

async function seedLocalities(): Promise<void> {
  const list = Object.values(siteLocalities);
  let i = 0;
  for (const l of list) {
    await upsertBy(localityRepo, { slug: l.slug }, { ...l, order: i++, isActive: true });
  }
  console.log(`  ✓ localities: ${list.length}`);
}

async function seedLegal(): Promise<void> {
  for (const d of siteLegalDocs) {
    await upsertBy(legalDocRepo, { slug: d.slug }, { ...d, status: CONTENT_STATUS.PUBLISHED });
  }
  console.log(`  ✓ legal docs: ${siteLegalDocs.length}`);
}

async function seedBatches(): Promise<void> {
  let i = 0;
  for (const b of batchesData) {
    await upsertBy(
      batchRepo,
      { course: b.course, startDate: b.startDate },
      { ...b, mode: b.mode as BatchMode, order: i++, isActive: true },
    );
  }
  console.log(`  ✓ batches: ${batchesData.length}`);
}

async function seedSettings(): Promise<void> {
  await settingsRepo.update(settingsData as unknown as Record<string, unknown>);
  console.log('  ✓ settings');
}

/**
 * `--fresh` clears content rows (admins preserved), matching the old behaviour.
 * Deleting blogs before authors matters: blogs.author_id is a foreign key.
 */
async function wipe(): Promise<void> {
  console.log('  ! --fresh: clearing content tables (admins preserved)');
  const ordered: BaseRepository<unknown>[] = [
    blogRepo as unknown as BaseRepository<unknown>,
    courseRepo as unknown as BaseRepository<unknown>,
    authorRepo as unknown as BaseRepository<unknown>,
    trainerRepo as unknown as BaseRepository<unknown>,
    blogCategoryRepo as unknown as BaseRepository<unknown>,
    testimonialRepo as unknown as BaseRepository<unknown>,
    placementRepo as unknown as BaseRepository<unknown>,
    companyRepo as unknown as BaseRepository<unknown>,
    roadmapRepo as unknown as BaseRepository<unknown>,
    faqRepo as unknown as BaseRepository<unknown>,
    comparisonRepo as unknown as BaseRepository<unknown>,
    localityRepo as unknown as BaseRepository<unknown>,
    legalDocRepo as unknown as BaseRepository<unknown>,
    batchRepo as unknown as BaseRepository<unknown>,
  ];
  for (const repo of ordered) {
    const rows = await repo.findMany({ fields: ['id'] });
    for (const row of rows as Array<{ id: string }>) {
      await repo.deleteById(row.id);
    }
  }
}

async function run(): Promise<void> {
  console.log('▶ Seeding GloryTecks CMS database (Supabase PostgreSQL)…');
  if (WIPE) await wipe();

  await seedAdmin();
  await seedCategories();
  await seedAuthors();
  await seedCourses();
  await seedBlogs();
  await seedTrainers();
  await seedTestimonials();
  await seedPlacements();
  await seedCompanies();
  await seedRoadmaps();
  await seedFaqs();
  await seedComparisons();
  await seedLocalities();
  await seedLegal();
  await seedBatches();
  await seedSettings();

  console.log('✅ Seed complete.');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
