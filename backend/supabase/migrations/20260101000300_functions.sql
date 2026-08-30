-- ============================================================================
-- Database functions
--
-- These replace Mongoose statics and one Mongo collection operator:
--   Settings.getSingleton()   -> public.get_or_create_settings()
--   AboutPage.getSingleton()  -> public.get_or_create_about_page()
--   Blog.distinct('tags')     -> public.distinct_blog_tags()
--
-- The two get-or-create functions exist so the "read the row, create it if it
-- is missing" sequence is a single atomic statement. Two concurrent first-boot
-- requests would otherwise race and one would fail on the singleton unique
-- index; ON CONFLICT DO NOTHING makes the loser fall through to the SELECT.
-- ============================================================================

-- ── Settings singleton ──────────────────────────────────────────────────────
create or replace function public.get_or_create_settings()
returns setof public.settings
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.settings default values on conflict do nothing;
  return query select * from public.settings limit 1;
end;
$$;

comment on function public.get_or_create_settings() is
  'Returns the single settings row, creating it with schema defaults if absent.';

-- ── About page singleton ────────────────────────────────────────────────────
create or replace function public.get_or_create_about_page()
returns setof public.about_page
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.about_page default values on conflict do nothing;
  return query select * from public.about_page limit 1;
end;
$$;

comment on function public.get_or_create_about_page() is
  'Returns the single about_page row, creating it with schema defaults if absent.';

-- ── Distinct blog tags ──────────────────────────────────────────────────────
-- Mirrors Blog.distinct('tags'): every distinct tag across ALL posts,
-- regardless of status. Deliberately UNSORTED — the controller applies
-- JavaScript's Array.prototype.sort() so ordering stays byte-for-byte
-- identical to the previous implementation rather than adopting the
-- database collation's ordering.
create or replace function public.distinct_blog_tags()
returns table (tag text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct unnest(tags) from public.blogs;
$$;

comment on function public.distinct_blog_tags() is
  'Distinct tag values across all blog posts (unsorted; caller sorts).';
