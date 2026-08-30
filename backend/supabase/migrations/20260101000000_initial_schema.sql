-- ============================================================================
-- GloryTecks CMS — initial PostgreSQL schema
--
-- Migrated from the previous MongoDB/Mongoose data model. Every table below
-- maps 1:1 to a former Mongoose collection; every column maps to a schema path.
--
-- Modelling rules applied consistently:
--   * Mongoose ObjectId            -> uuid primary key (gen_random_uuid())
--   * Mongoose ref                 -> foreign key
--   * Mongoose [String]            -> text[]
--   * Fixed-shape sub-documents    -> flattened columns (seo_*, salary_*, hero_*)
--   * Variable-length ordered lists of heterogeneous objects (content blocks,
--     syllabus sections, comparison rows, legal sections) -> jsonb + a
--     jsonb_typeof = 'array' CHECK. These were `Mixed`/loosely-typed in Mongo,
--     are always read and written whole with their parent row, and are ordered,
--     so a child table would add joins and write amplification for no gain.
--   * Mongoose enum                -> CHECK constraint
--   * Mongoose `timestamps: true`  -> created_at / updated_at + trigger
--   * Mongoose `order`             -> order_index (`order` is a SQL keyword)
--
-- Date-like fields the application stored as STRINGS in Mongo (blogs.date,
-- blogs.updated, batches.start_date, legal_docs.updated) stay `text` on
-- purpose: the application compares and sorts them as strings ("YYYY-MM-DD"
-- sorts chronologically) and some hold free-form values such as "Jun 10, 2026".
-- Changing the type would change behaviour.
-- ============================================================================

create extension if not exists pg_trgm with schema extensions;

-- ── updated_at maintenance (replaces Mongoose `timestamps: true`) ───────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- admin_users  (was: AdminUser)
--
-- AUTHENTICATION NOTE
-- Credentials now live in Supabase Auth (auth.users). This table is the
-- APPLICATION PROFILE and is the single source of truth for authorization.
-- `id` IS the auth.users id, so there is exactly one profile per identity and
-- no way to hold a role without an admin having provisioned a row here.
-- The former `password` and `refresh_token_hash` columns are intentionally
-- absent: passwords and refresh tokens are managed by Supabase Auth.
-- ============================================================================
create table if not exists public.admin_users (
  id            uuid primary key references auth.users (id) on delete cascade,
  name          text        not null check (length(btrim(name)) > 0),
  email         text        not null unique check (email = lower(email)),
  role          text        not null default 'admin'
                            check (role in ('admin', 'editor', 'viewer', 'receptionist', 'content_writer')),
  avatar        text,
  is_active     boolean     not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

-- ============================================================================
-- authors  (was: Author)
-- ============================================================================
create table if not exists public.authors (
  id         uuid primary key default gen_random_uuid(),
  key        text        not null unique check (key = lower(key) and length(btrim(key)) > 0),
  name       text        not null check (length(btrim(name)) > 0),
  role       text        not null default '',
  bio        text        not null default '',
  initials   text        not null default '',
  avatar     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger authors_set_updated_at
  before update on public.authors
  for each row execute function public.set_updated_at();

-- ============================================================================
-- blog_categories  (was: BlogCategory)
-- `salary` sub-document -> salary_fresher / salary_mid / salary_senior
-- ============================================================================
create table if not exists public.blog_categories (
  id             uuid primary key default gen_random_uuid(),
  slug           text        not null unique check (slug = lower(slug) and length(btrim(slug)) > 0),
  name           text        not null check (length(btrim(name)) > 0),
  short          text        not null default '',
  description    text        not null default '',
  color          text        not null default '210 90% 60%',
  icon           text        not null default 'BookOpen',
  course_slug    text        not null default '',
  course_title   text        not null default '',
  tools          text[]      not null default '{}',
  roles          text[]      not null default '{}',
  skills         text[]      not null default '{}',
  certifications text[]      not null default '{}',
  prerequisites  text[]      not null default '{}',
  salary_fresher text        not null default '',
  salary_mid     text        not null default '',
  salary_senior  text        not null default '',
  blurb          text        not null default '',
  order_index    integer     not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger blog_categories_set_updated_at
  before update on public.blog_categories
  for each row execute function public.set_updated_at();

-- ============================================================================
-- trainers  (was: Trainer)  — declared before courses (FK target)
-- ============================================================================
create table if not exists public.trainers (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null check (length(btrim(name)) > 0),
  title       text        not null default '',
  experience  text        not null default '',
  company     text        not null default '',
  skills      text[]      not null default '{}',
  bio         text        not null default '',
  avatar      text,
  linkedin    text,
  featured    boolean     not null default false,
  order_index integer     not null default 0,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trainers_set_updated_at
  before update on public.trainers
  for each row execute function public.set_updated_at();

-- ============================================================================
-- blogs  (was: Blog)
--
-- author_id  <- was `author: ObjectId ref Author` (populate() -> FK + join)
-- content    <- Block[] discriminated union, stored as Mixed in Mongo
-- toc/faqs   <- derived from content by the service layer on write
-- seo_*      <- was the embedded `seo` sub-document
-- ============================================================================
create table if not exists public.blogs (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text        not null unique check (slug = lower(slug) and length(btrim(slug)) > 0),
  title                text        not null check (length(btrim(title)) > 0),
  category             text        not null,
  category_slug        text        not null check (category_slug = lower(category_slug)),
  kind                 text        not null default 'guide'
                                   check (kind in ('comparison', 'roadmap', 'salary', 'interview',
                                                   'projects', 'certification', 'whatis', 'guide')),
  excerpt              text        not null default '',
  status               text        not null default 'draft'
                                   check (status in ('draft', 'published', 'archived')),
  featured             boolean     not null default false,
  trending             boolean     not null default false,
  popular              boolean     not null default false,
  tags                 text[]      not null default '{}',
  author_id            uuid references public.authors (id) on delete set null,
  author_key           text        not null default '',
  featured_image       text,
  read_time            text        not null default '5 min',
  date                 text        not null,
  updated              text        not null default '',
  content              jsonb       not null default '[]'::jsonb
                                   check (jsonb_typeof(content) = 'array'),
  html                 text        not null default '',
  toc                  jsonb       not null default '[]'::jsonb
                                   check (jsonb_typeof(toc) = 'array'),
  faqs                 jsonb       not null default '[]'::jsonb
                                   check (jsonb_typeof(faqs) = 'array'),
  seo_meta_title       text,
  seo_meta_description text,
  seo_canonical_url    text,
  seo_og_title         text,
  seo_og_description   text,
  seo_og_image         text,
  seo_keywords         text[]      not null default '{}',
  seo_noindex          boolean     not null default false,
  published_at         timestamptz,
  -- Search/match companion for `tags`, maintained by the trigger below.
  -- Mongo matched a RegExp against every element of the array; Postgres has no
  -- ILIKE over text[], so the elements are joined pipe-delimited:
  --     substring search        -> tags_text ILIKE '%term%'
  --     exact element, any case -> tags_text ILIKE '%|term|%'
  -- A trigger (rather than a GENERATED column) is used because array_to_string
  -- is only STABLE, and generated columns require an IMMUTABLE expression.
  tags_text            text        not null default '||',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create or replace function public.sync_blog_tags_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.tags_text = '|' || coalesce(array_to_string(new.tags, '|'), '') || '|';
  return new;
end;
$$;

create trigger blogs_sync_tags_text
  before insert or update of tags on public.blogs
  for each row execute function public.sync_blog_tags_text();

create trigger blogs_set_updated_at
  before update on public.blogs
  for each row execute function public.set_updated_at();

-- ============================================================================
-- courses  (was: Course)
-- trainer_id <- was `trainer: ObjectId ref Trainer, default null`
--               ON DELETE SET NULL mirrors Mongo: deleting a trainer left the
--               course in place with a dangling/empty reference.
-- ============================================================================
create table if not exists public.courses (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text        not null unique check (slug = lower(slug) and length(btrim(slug)) > 0),
  title                text        not null check (length(btrim(title)) > 0),
  category             text        not null default '',
  tagline              text        not null default '',
  description          text        not null default '',
  duration             text        not null default '',
  modules              text[]      not null default '{}',
  tools                text[]      not null default '{}',
  projects             text[]      not null default '{}',
  placement            text        not null default '',
  syllabus             jsonb       not null default '[]'::jsonb
                                   check (jsonb_typeof(syllabus) = 'array'),
  fees                 text,
  skills               text[]      not null default '{}',
  banner_image         text,
  images               text[]      not null default '{}',
  brochure_url         text,
  trainer_id           uuid references public.trainers (id) on delete set null,
  faqs                 jsonb       not null default '[]'::jsonb
                                   check (jsonb_typeof(faqs) = 'array'),
  status               text        not null default 'published'
                                   check (status in ('draft', 'published', 'archived')),
  featured             boolean     not null default false,
  order_index          integer     not null default 0,
  seo_meta_title       text,
  seo_meta_description text,
  seo_canonical_url    text,
  seo_og_title         text,
  seo_og_description   text,
  seo_og_image         text,
  seo_keywords         text[]      not null default '{}',
  seo_noindex          boolean     not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

-- ============================================================================
-- testimonials  (was: Testimonial)
-- ============================================================================
create table if not exists public.testimonials (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null check (length(btrim(name)) > 0),
  role        text        not null default '',
  salary      text,
  stars       integer     not null default 5 check (stars between 1 and 5),
  quote       text        not null check (length(btrim(quote)) > 0),
  course      text,
  avatar      text,
  featured    boolean     not null default false,
  order_index integer     not null default 0,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger testimonials_set_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

-- ============================================================================
-- placements  (was: Placement)
-- ============================================================================
create table if not exists public.placements (
  id               uuid primary key default gen_random_uuid(),
  name             text        not null check (length(btrim(name)) > 0),
  role             text        not null default '',
  company          text        not null default '',
  package_lpa      text        not null default '',
  previous_package text,
  course           text        not null default '',
  stars            integer     not null default 5 check (stars between 1 and 5),
  avatar           text,
  batch            text,
  featured         boolean     not null default false,
  order_index      integer     not null default 0,
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger placements_set_updated_at
  before update on public.placements
  for each row execute function public.set_updated_at();

-- ============================================================================
-- companies  (was: Company)  — `name` is the registry's uniqueField
-- ============================================================================
create table if not exists public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null unique check (length(btrim(name)) > 0),
  logo        text,
  website     text,
  order_index integer     not null default 0,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- ============================================================================
-- roadmaps  (was: Roadmap)
-- ============================================================================
create table if not exists public.roadmaps (
  id          uuid primary key default gen_random_uuid(),
  course      text        not null check (length(btrim(course)) > 0),
  steps       text[]      not null default '{}',
  color       text        not null default 'from-blue-500/20 to-blue-600/5',
  icon        text,
  order_index integer     not null default 0,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger roadmaps_set_updated_at
  before update on public.roadmaps
  for each row execute function public.set_updated_at();

-- ============================================================================
-- faqs  (was: Faq)
-- ============================================================================
create table if not exists public.faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text        not null check (length(btrim(question)) > 0),
  answer      text        not null check (length(btrim(answer)) > 0),
  scope       text        not null default 'general' check (scope = lower(scope)),
  order_index integer     not null default 0,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger faqs_set_updated_at
  before update on public.faqs
  for each row execute function public.set_updated_at();

-- ============================================================================
-- demo_requests  (was: DemoRequest)
-- ============================================================================
create table if not exists public.demo_requests (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null check (length(btrim(name)) > 0),
  phone      text        not null check (length(btrim(phone)) > 0),
  course     text,
  source     text,
  status     text        not null default 'new'
                         check (status in ('new', 'contacted', 'converted', 'closed')),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger demo_requests_set_updated_at
  before update on public.demo_requests
  for each row execute function public.set_updated_at();

-- ============================================================================
-- contact_enquiries  (was: ContactEnquiry)
-- ============================================================================
create table if not exists public.contact_enquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null check (length(btrim(name)) > 0),
  email      text        not null check (email = lower(email)),
  phone      text        not null check (length(btrim(phone)) > 0),
  course     text,
  message    text        not null check (length(btrim(message)) > 0),
  subject    text,
  status     text        not null default 'new'
                         check (status in ('new', 'contacted', 'converted', 'closed')),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger contact_enquiries_set_updated_at
  before update on public.contact_enquiries
  for each row execute function public.set_updated_at();

-- ============================================================================
-- comparisons  (was: Comparison)
-- rows / related_courses / faqs were embedded arrays -> jsonb
-- ============================================================================
create table if not exists public.comparisons (
  id              uuid primary key default gen_random_uuid(),
  slug            text        not null unique check (slug = lower(slug) and length(btrim(slug)) > 0),
  title           text        not null check (length(btrim(title)) > 0),
  meta_title      text        not null default '',
  item_a          text        not null check (length(btrim(item_a)) > 0),
  item_b          text        not null check (length(btrim(item_b)) > 0),
  intro           text        not null default '',
  rows            jsonb       not null default '[]'::jsonb
                              check (jsonb_typeof(rows) = 'array'),
  verdict         text        not null default '',
  related_courses jsonb       not null default '[]'::jsonb
                              check (jsonb_typeof(related_courses) = 'array'),
  faqs            jsonb       not null default '[]'::jsonb
                              check (jsonb_typeof(faqs) = 'array'),
  status          text        not null default 'published'
                              check (status in ('draft', 'published', 'archived')),
  order_index     integer     not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger comparisons_set_updated_at
  before update on public.comparisons
  for each row execute function public.set_updated_at();

-- ============================================================================
-- localities  (was: Locality)
-- ============================================================================
create table if not exists public.localities (
  id          uuid primary key default gen_random_uuid(),
  slug        text        not null unique check (slug = lower(slug) and length(btrim(slug)) > 0),
  name        text        not null check (length(btrim(name)) > 0),
  intro       text        not null default '',
  context     text        not null default '',
  nearby      text        not null default '',
  order_index integer     not null default 0,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger localities_set_updated_at
  before update on public.localities
  for each row execute function public.set_updated_at();

-- ============================================================================
-- legal_docs  (was: LegalDoc)
-- ============================================================================
create table if not exists public.legal_docs (
  id               uuid primary key default gen_random_uuid(),
  slug             text        not null unique check (slug = lower(slug) and length(btrim(slug)) > 0),
  title            text        not null check (length(btrim(title)) > 0),
  meta_title       text        not null default '',
  meta_description text        not null default '',
  updated          text        not null default '',
  intro            text        not null default '',
  sections         jsonb       not null default '[]'::jsonb
                               check (jsonb_typeof(sections) = 'array'),
  status           text        not null default 'published'
                               check (status in ('draft', 'published', 'archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger legal_docs_set_updated_at
  before update on public.legal_docs
  for each row execute function public.set_updated_at();

-- ============================================================================
-- gallery_items  (was: Gallery)
-- image_url holds the Cloudinary secure URL — Cloudinary remains the store.
-- ============================================================================
create table if not exists public.gallery_items (
  id          uuid primary key default gen_random_uuid(),
  title       text        not null check (length(btrim(title)) > 0),
  image_url   text        not null check (length(btrim(image_url)) > 0),
  category    text,
  caption     text,
  order_index integer     not null default 0,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger gallery_items_set_updated_at
  before update on public.gallery_items
  for each row execute function public.set_updated_at();

-- ============================================================================
-- brochures  (was: Brochure)
-- file_url holds the Cloudinary URL of the PDF.
-- ============================================================================
create table if not exists public.brochures (
  id          uuid primary key default gen_random_uuid(),
  title       text        not null check (length(btrim(title)) > 0),
  course_slug text        check (course_slug is null or course_slug = lower(course_slug)),
  file_url    text        not null check (length(btrim(file_url)) > 0),
  file_size   bigint      check (file_size is null or file_size >= 0),
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger brochures_set_updated_at
  before update on public.brochures
  for each row execute function public.set_updated_at();

-- ============================================================================
-- batches  (was: Batch)
-- ============================================================================
create table if not exists public.batches (
  id          uuid primary key default gen_random_uuid(),
  course      text        not null check (length(btrim(course)) > 0),
  start_date  text        not null check (length(btrim(start_date)) > 0),
  mode        text        not null default 'Online'
                          check (mode in ('Online', 'Offline', 'Hybrid')),
  seats       integer     not null default 10 check (seats >= 0),
  is_active   boolean     not null default true,
  order_index integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger batches_set_updated_at
  before update on public.batches
  for each row execute function public.set_updated_at();
