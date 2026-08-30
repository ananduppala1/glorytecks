-- ============================================================================
-- Row Level Security
--
-- STRATEGY (see docs/MIGRATION.md § RLS for the full rationale)
--
-- Nothing except the Express backend talks to this database. Neither frontend
-- holds a Supabase database key: the admin panel and the marketing site both
-- call the Express API, which authorizes every request itself (Supabase Auth
-- token verification + a role check against public.admin_users) and then
-- queries Postgres with the service-role key.
--
-- So RLS is enabled on every table with NO policies attached. That is the
-- deny-by-default position:
--
--   * anon / authenticated  -> zero rows, zero writes, even if a project
--     URL and anon key ever leak. A leaked anon key becomes useless rather
--     than a full read of the leads table.
--   * service_role          -> bypasses RLS by design, so the backend is
--     unaffected and no existing endpoint changes behaviour.
--
-- Enabling RLS without policies is deliberate, not an oversight. If direct
-- client access is ever wanted (for example a future Next.js app reading
-- published content straight from Supabase), add narrow SELECT policies here —
-- e.g. `using (status = 'published')` on blogs/courses — without touching the
-- backend.
--
-- The lead tables (contact_enquiries, demo_requests) and admin_users hold
-- personal data and must never receive a public policy.
-- ============================================================================

alter table public.admin_users       enable row level security;
alter table public.authors           enable row level security;
alter table public.blog_categories   enable row level security;
alter table public.blogs             enable row level security;
alter table public.courses           enable row level security;
alter table public.trainers          enable row level security;
alter table public.testimonials      enable row level security;
alter table public.placements        enable row level security;
alter table public.companies         enable row level security;
alter table public.roadmaps          enable row level security;
alter table public.faqs              enable row level security;
alter table public.demo_requests     enable row level security;
alter table public.contact_enquiries enable row level security;
alter table public.comparisons       enable row level security;
alter table public.localities        enable row level security;
alter table public.legal_docs        enable row level security;
alter table public.gallery_items     enable row level security;
alter table public.brochures         enable row level security;
alter table public.batches           enable row level security;
alter table public.settings          enable row level security;
alter table public.about_page        enable row level security;

-- Belt and braces: revoke the default grants PostgREST relies on for the
-- anonymous and logged-in roles. RLS alone would already return no rows, but
-- removing the privilege means the request fails at the permission layer.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- Future tables created by later migrations inherit the same posture.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
