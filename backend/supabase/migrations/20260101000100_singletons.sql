-- ============================================================================
-- Singleton content tables: settings + about_page
--
-- Both were Mongoose singletons accessed through a `getSingleton()` static that
-- did "findOne, else create({})". The column DEFAULTS below reproduce the
-- Mongoose schema defaults verbatim so that an unseeded install renders exactly
-- the same public pages it did before the migration.
--
-- "Exactly one row" is enforced by a unique index on a constant expression, so
-- a second INSERT fails at the database level rather than relying on app code.
-- ============================================================================

-- ============================================================================
-- settings  (was: Settings)
-- Embedded sub-documents flattened: social.* , stats.* , seo.* , heroSection.*
-- ============================================================================
create table if not exists public.settings (
  id                        uuid primary key default gen_random_uuid(),

  site_name                 text not null default 'GloryTecks',
  tagline                   text not null default '',
  phone                     text not null default '+91 9908099980',
  whatsapp                  text not null default '919908099980',
  email                     text not null default 'gloryteckss@gmail.com',
  address                   text not null default $def$603, Annapurna Block, Aditya Enclave, Ameerpet, Hyderabad – 500038, Telangana, India$def$,
  map_url                   text not null default '',

  -- Homepage promo video (YouTube URL). Empty -> website uses its built-in default.
  homepage_video_url        text not null default '',
  -- Top announcement-bar text on the public site. Empty -> website default.
  announcement_text         text not null default '',

  social_facebook           text not null default '',
  social_instagram          text not null default '',
  social_linkedin           text not null default '',
  social_youtube            text not null default '',
  social_twitter            text not null default '',

  stats_students_trained    text not null default '3000+',
  stats_placement_rate      text not null default '95%',
  stats_hiring_partners     text not null default '500+',
  stats_courses_offered     text not null default '12+',

  seo_meta_title            text,
  seo_meta_description      text,
  seo_canonical_url         text,
  seo_og_title              text,
  seo_og_description        text,
  seo_og_image              text,
  seo_keywords              text[] not null default '{}',
  seo_noindex               boolean not null default false,

  logo                      text not null default '',
  default_og_image          text not null default '',

  hero_badge                text not null default $def$Hyderabad's #1 IT Training Institute$def$,
  hero_heading_line1        text not null default 'Launch Your',
  hero_heading_highlight    text not null default 'Tech Career',
  hero_heading_line2        text not null default $def$with Hyderabad's Best Training$def$,
  hero_description          text not null default $def$Industry-aligned courses in Data Science, Gen AI, Python & Analytics — built for the Hyderabad job market. Expert mentors, real projects, 100% placement.$def$,
  hero_badges               text[] not null default array[
                              '✅ 3000+ Students Placed',
                              '⭐ 4.9/5 Google Rating',
                              '🎓 100% Placement Support'
                            ]::text[],
  hero_primary_cta_text     text not null default 'Book Free Demo',
  hero_primary_cta_link     text not null default '',
  hero_secondary_cta_text   text not null default 'Explore Courses',
  hero_secondary_cta_link   text not null default '/courses',
  hero_whatsapp_text        text not null default 'WhatsApp Us',
  hero_trust_points         text[] not null default array[
                              'No prior experience needed',
                              'EMI available'
                            ]::text[],
  hero_image                text not null default '',
  hero_image_alt            text not null default $def$GloryTecks IT training institute classroom at Ameerpet Hyderabad — Data Science, AI and Python courses$def$,
  hero_overlay_label        text not null default 'Average Salary Hike',
  hero_overlay_value        text not null default '3x — 5x',
  hero_overlay_suffix       text not null default 'after course',

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Exactly one settings row, enforced by the database.
create unique index if not exists settings_singleton_idx on public.settings ((true));

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- about_page  (was: AboutPage)
-- hero.* / cta.* / seo.* flattened; `sections` and `stats` are ordered arrays
-- of uniform objects rendered as a list -> jsonb (written whole with the page).
-- ============================================================================
create table if not exists public.about_page (
  id                        uuid primary key default gen_random_uuid(),

  hero_badge                text not null default 'About GloryTecks',
  hero_heading              text not null default 'Shaping Careers. Building Futures.',
  hero_description          text not null default $def$At GloryTecks, we don’t just teach technology — we build careers. We help students and working professionals become industry-ready with real-time training, projects, mentorship, and placement support.$def$,
  hero_image                text not null default '',
  hero_image_alt            text not null default $def$GloryTecks IT training institute Hyderabad — expert-led classroom training for Data Science and AI courses$def$,
  hero_primary_cta_text     text not null default 'Explore Courses',
  hero_primary_cta_link     text not null default '/courses',
  hero_secondary_cta_text   text not null default 'Talk to Counselor',
  hero_secondary_cta_link   text not null default '/contact',

  sections                  jsonb not null default $def$[
    {
      "eyebrow": "Who We Are",
      "heading": "Learn From Industry Experts",
      "body": "GloryTecks was founded with one mission — bridging the gap between academic learning and real-world industry requirements.",
      "bullets": [
        "Real-time industry projects",
        "Hands-on practical training",
        "Placement assistance",
        "Experienced mentors",
        "Industry-recognized certifications"
      ],
      "image": "",
      "imageAlt": "GloryTecks expert trainers and mentors — industry professionals teaching Data Science, AI, Python in Hyderabad",
      "imageSide": "left"
    }
  ]$def$::jsonb check (jsonb_typeof(sections) = 'array'),

  stats                     jsonb not null default $def$[
    { "value": "3000+", "label": "Students Trained",   "icon": "Users" },
    { "value": "10+",   "label": "Courses",            "icon": "GraduationCap" },
    { "value": "95%",   "label": "Placement Support",  "icon": "Briefcase" },
    { "value": "100%",  "label": "Practical Learning", "icon": "Award" }
  ]$def$::jsonb check (jsonb_typeof(stats) = 'array'),

  cta_heading               text not null default 'Start Your Tech Career Today',
  cta_description           text not null default $def$Join GloryTecks and become industry-ready with real-world skills and placement-focused learning.$def$,
  cta_button_text           text not null default 'Get Started',
  cta_button_link           text not null default '/contact',

  seo_meta_title            text,
  seo_meta_description      text,
  seo_canonical_url         text,
  seo_og_title              text,
  seo_og_description        text,
  seo_og_image              text,
  seo_keywords              text[] not null default '{}',
  seo_noindex               boolean not null default false,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Exactly one about_page row, enforced by the database.
create unique index if not exists about_page_singleton_idx on public.about_page ((true));

create trigger about_page_set_updated_at
  before update on public.about_page
  for each row execute function public.set_updated_at();
