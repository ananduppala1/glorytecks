-- ============================================================================
-- Indexes
--
-- Every index below is justified by a query the application actually issues.
-- Unique constraints declared inline in 20260101000000 already provide the
-- slug / key / email / name lookups, so they are NOT repeated here.
--
-- Substring search (the former Mongo `$or` + case-insensitive RegExp) becomes
-- ILIKE '%term%'. Only the two high-volume searched tables get trigram indexes;
-- the remaining registry tables hold tens to hundreds of rows where a scan is
-- cheaper than maintaining an index, so none is created for them.
-- ============================================================================

-- ── blogs ───────────────────────────────────────────────────────────────────
-- Public list: WHERE status = 'published' ORDER BY date DESC  (+ paging)
create index if not exists blogs_status_date_idx
  on public.blogs (status, date desc);

-- Public list filtered by category, and the /blogs/:slug/context prev/next
-- lookups (same category, date < / > the current post).
create index if not exists blogs_status_category_date_idx
  on public.blogs (status, category_slug, date desc);

-- ?tag=… membership test and the DISTINCT tag list endpoint.
create index if not exists blogs_tags_gin_idx
  on public.blogs using gin (tags);

-- ?featured= / ?trending= / ?popular= — partial, so each index only holds the
-- handful of flagged rows instead of the whole table.
create index if not exists blogs_featured_date_idx
  on public.blogs (status, date desc) where featured;
create index if not exists blogs_trending_date_idx
  on public.blogs (status, date desc) where trending;
create index if not exists blogs_popular_date_idx
  on public.blogs (status, date desc) where popular;

-- ?author=<uuid> filter and the authors join used by list/detail reads.
create index if not exists blogs_author_id_idx
  on public.blogs (author_id);

-- Dashboard "recently edited" list: ORDER BY updated_at DESC LIMIT 5.
create index if not exists blogs_updated_at_idx
  on public.blogs (updated_at desc);

-- Admin search across title / excerpt (ILIKE '%term%').
create index if not exists blogs_title_trgm_idx
  on public.blogs using gin (title extensions.gin_trgm_ops);
create index if not exists blogs_excerpt_trgm_idx
  on public.blogs using gin (excerpt extensions.gin_trgm_ops);

-- Tag substring search and the case-insensitive ?tag= exact-element match both
-- run as ILIKE against the pipe-delimited companion column.
create index if not exists blogs_tags_text_trgm_idx
  on public.blogs using gin (tags_text extensions.gin_trgm_ops);

-- ── courses ─────────────────────────────────────────────────────────────────
-- Public list: WHERE status = 'published' ORDER BY order_index, title
create index if not exists courses_status_order_idx
  on public.courses (status, order_index, title);

-- Trainer join / FK integrity checks.
create index if not exists courses_trainer_id_idx
  on public.courses (trainer_id);

-- Admin search across title (ILIKE '%term%').
create index if not exists courses_title_trgm_idx
  on public.courses using gin (title extensions.gin_trgm_ops);

-- ── blog_categories ─────────────────────────────────────────────────────────
create index if not exists blog_categories_order_name_idx
  on public.blog_categories (order_index, name);

-- ── people & proof collections (public reads are "active, ordered") ─────────
create index if not exists trainers_active_order_idx
  on public.trainers (is_active, order_index);
create index if not exists testimonials_active_order_idx
  on public.testimonials (is_active, order_index);
create index if not exists placements_active_order_idx
  on public.placements (is_active, order_index);
create index if not exists companies_active_order_name_idx
  on public.companies (is_active, order_index, name);
create index if not exists roadmaps_active_order_idx
  on public.roadmaps (is_active, order_index);
create index if not exists gallery_items_active_order_idx
  on public.gallery_items (is_active, order_index);
create index if not exists batches_active_order_idx
  on public.batches (is_active, order_index);

-- FAQs: public read is WHERE is_active ORDER BY scope, order_index;
-- admin also filters by scope.
create index if not exists faqs_active_scope_order_idx
  on public.faqs (is_active, scope, order_index);

-- ── status-gated content ────────────────────────────────────────────────────
create index if not exists comparisons_status_order_idx
  on public.comparisons (status, order_index);
create index if not exists legal_docs_status_title_idx
  on public.legal_docs (status, title);
create index if not exists localities_active_order_name_idx
  on public.localities (is_active, order_index, name);

-- ── brochures ───────────────────────────────────────────────────────────────
-- Public list: WHERE is_active ORDER BY created_at DESC
create index if not exists brochures_active_created_idx
  on public.brochures (is_active, created_at desc);
-- Brochure download proxy: WHERE course_slug = $1 AND is_active
create index if not exists brochures_course_slug_idx
  on public.brochures (course_slug) where is_active;

-- ── leads (admin list + dashboard counters) ─────────────────────────────────
create index if not exists demo_requests_status_created_idx
  on public.demo_requests (status, created_at desc);
create index if not exists demo_requests_created_idx
  on public.demo_requests (created_at desc);
create index if not exists contact_enquiries_status_created_idx
  on public.contact_enquiries (status, created_at desc);
create index if not exists contact_enquiries_created_idx
  on public.contact_enquiries (created_at desc);

-- ── admin users (list filters: role, isActive) ─────────────────────────────
create index if not exists admin_users_role_idx
  on public.admin_users (role);
create index if not exists admin_users_active_idx
  on public.admin_users (is_active);
