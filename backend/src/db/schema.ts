import {
  TableDef,
  seoCodec,
  salaryCodec,
  customCodec,
  Row,
} from './mappers';

/**
 * Table definitions — one per former Mongoose model.
 *
 * Each `columns` map is written out in full rather than derived by a
 * camelCase→snake_case rule. That is deliberate:
 *
 *  • it is the allow-list consulted by the sort/filter translators, so a
 *    client cannot name a column that is not listed here;
 *  • it makes the Mongo→Postgres field mapping reviewable at a glance;
 *  • it keeps the two genuinely irregular names (`order` → `order_index`,
 *    refs → `*_id`) explicit instead of hidden in a helper.
 */

/* ── admin_users (was AdminUser) ──────────────────────────────────────────── */
export const adminUsersTable: TableDef = {
  table: 'admin_users',
  columns: {
    id: 'id',
    name: 'name',
    email: 'email',
    role: 'role',
    avatar: 'avatar',
    isActive: 'is_active',
    lastLoginAt: 'last_login_at',
  },
};

/* ── authors ──────────────────────────────────────────────────────────────── */
export const authorsTable: TableDef = {
  table: 'authors',
  columns: {
    id: 'id',
    key: 'key',
    name: 'name',
    role: 'role',
    bio: 'bio',
    initials: 'initials',
    avatar: 'avatar',
  },
};

/* ── blog_categories ──────────────────────────────────────────────────────── */
export const blogCategoriesTable: TableDef = {
  table: 'blog_categories',
  columns: {
    id: 'id',
    slug: 'slug',
    name: 'name',
    short: 'short',
    description: 'description',
    color: 'color',
    icon: 'icon',
    courseSlug: 'course_slug',
    courseTitle: 'course_title',
    tools: 'tools',
    roles: 'roles',
    skills: 'skills',
    certifications: 'certifications',
    prerequisites: 'prerequisites',
    blurb: 'blurb',
    order: 'order_index',
  },
  codecs: [salaryCodec()],
};

/* ── trainers ─────────────────────────────────────────────────────────────── */
export const trainersTable: TableDef = {
  table: 'trainers',
  columns: {
    id: 'id',
    name: 'name',
    title: 'title',
    experience: 'experience',
    company: 'company',
    skills: 'skills',
    bio: 'bio',
    avatar: 'avatar',
    linkedin: 'linkedin',
    featured: 'featured',
    order: 'order_index',
    isActive: 'is_active',
  },
};

/* ── blogs ────────────────────────────────────────────────────────────────── */
export const blogsTable: TableDef = {
  table: 'blogs',
  columns: {
    id: 'id',
    slug: 'slug',
    title: 'title',
    category: 'category',
    categorySlug: 'category_slug',
    kind: 'kind',
    excerpt: 'excerpt',
    status: 'status',
    featured: 'featured',
    trending: 'trending',
    popular: 'popular',
    tags: 'tags',
    authorKey: 'author_key',
    featuredImage: 'featured_image',
    readTime: 'read_time',
    date: 'date',
    updated: 'updated',
    content: 'content',
    html: 'html',
    toc: 'toc',
    faqs: 'faqs',
    publishedAt: 'published_at',
  },
  codecs: [seoCodec()],
  relations: [
    {
      field: 'author',
      column: 'author_id',
      table: 'authors',
      // Mirrors the old populate('author', 'name key role initials avatar').
      select: ['name', 'key', 'role', 'initials', 'avatar'],
      // Single-post reads additionally populated `bio`.
      detailSelect: ['bio'],
    },
  ],
};

/* ── courses ──────────────────────────────────────────────────────────────── */
export const coursesTable: TableDef = {
  table: 'courses',
  columns: {
    id: 'id',
    slug: 'slug',
    title: 'title',
    category: 'category',
    tagline: 'tagline',
    description: 'description',
    duration: 'duration',
    modules: 'modules',
    tools: 'tools',
    projects: 'projects',
    placement: 'placement',
    syllabus: 'syllabus',
    fees: 'fees',
    skills: 'skills',
    bannerImage: 'banner_image',
    images: 'images',
    brochureUrl: 'brochure_url',
    faqs: 'faqs',
    status: 'status',
    featured: 'featured',
    order: 'order_index',
  },
  codecs: [seoCodec()],
  relations: [
    {
      field: 'trainer',
      column: 'trainer_id',
      table: 'trainers',
      // Mirrors populate('trainer', 'name title company avatar').
      select: ['name', 'title', 'company', 'avatar'],
      detailSelect: ['bio'],
    },
  ],
};

/* ── testimonials ─────────────────────────────────────────────────────────── */
export const testimonialsTable: TableDef = {
  table: 'testimonials',
  columns: {
    id: 'id',
    name: 'name',
    role: 'role',
    salary: 'salary',
    stars: 'stars',
    quote: 'quote',
    course: 'course',
    avatar: 'avatar',
    featured: 'featured',
    order: 'order_index',
    isActive: 'is_active',
  },
};

/* ── placements ───────────────────────────────────────────────────────────── */
export const placementsTable: TableDef = {
  table: 'placements',
  columns: {
    id: 'id',
    name: 'name',
    role: 'role',
    company: 'company',
    packageLpa: 'package_lpa',
    previousPackage: 'previous_package',
    course: 'course',
    stars: 'stars',
    avatar: 'avatar',
    batch: 'batch',
    featured: 'featured',
    order: 'order_index',
    isActive: 'is_active',
  },
};

/* ── companies ────────────────────────────────────────────────────────────── */
export const companiesTable: TableDef = {
  table: 'companies',
  columns: {
    id: 'id',
    name: 'name',
    logo: 'logo',
    website: 'website',
    order: 'order_index',
    isActive: 'is_active',
  },
};

/* ── roadmaps ─────────────────────────────────────────────────────────────── */
export const roadmapsTable: TableDef = {
  table: 'roadmaps',
  columns: {
    id: 'id',
    course: 'course',
    steps: 'steps',
    color: 'color',
    icon: 'icon',
    order: 'order_index',
    isActive: 'is_active',
  },
};

/* ── faqs ─────────────────────────────────────────────────────────────────── */
export const faqsTable: TableDef = {
  table: 'faqs',
  columns: {
    id: 'id',
    question: 'question',
    answer: 'answer',
    scope: 'scope',
    order: 'order_index',
    isActive: 'is_active',
  },
};

/* ── demo_requests ────────────────────────────────────────────────────────── */
export const demoRequestsTable: TableDef = {
  table: 'demo_requests',
  columns: {
    id: 'id',
    name: 'name',
    phone: 'phone',
    course: 'course',
    source: 'source',
    status: 'status',
    notes: 'notes',
  },
};

/* ── contact_enquiries ────────────────────────────────────────────────────── */
export const contactEnquiriesTable: TableDef = {
  table: 'contact_enquiries',
  columns: {
    id: 'id',
    name: 'name',
    email: 'email',
    phone: 'phone',
    course: 'course',
    message: 'message',
    subject: 'subject',
    status: 'status',
    notes: 'notes',
  },
};

/* ── comparisons ──────────────────────────────────────────────────────────── */
export const comparisonsTable: TableDef = {
  table: 'comparisons',
  columns: {
    id: 'id',
    slug: 'slug',
    title: 'title',
    metaTitle: 'meta_title',
    itemA: 'item_a',
    itemB: 'item_b',
    intro: 'intro',
    rows: 'rows',
    verdict: 'verdict',
    relatedCourses: 'related_courses',
    faqs: 'faqs',
    status: 'status',
    order: 'order_index',
  },
};

/* ── localities ───────────────────────────────────────────────────────────── */
export const localitiesTable: TableDef = {
  table: 'localities',
  columns: {
    id: 'id',
    slug: 'slug',
    name: 'name',
    intro: 'intro',
    context: 'context',
    nearby: 'nearby',
    order: 'order_index',
    isActive: 'is_active',
  },
};

/* ── legal_docs ───────────────────────────────────────────────────────────── */
export const legalDocsTable: TableDef = {
  table: 'legal_docs',
  columns: {
    id: 'id',
    slug: 'slug',
    title: 'title',
    metaTitle: 'meta_title',
    metaDescription: 'meta_description',
    updated: 'updated',
    intro: 'intro',
    sections: 'sections',
    status: 'status',
  },
};

/* ── gallery_items ────────────────────────────────────────────────────────── */
export const galleryTable: TableDef = {
  table: 'gallery_items',
  columns: {
    id: 'id',
    title: 'title',
    imageUrl: 'image_url',
    category: 'category',
    caption: 'caption',
    order: 'order_index',
    isActive: 'is_active',
  },
};

/* ── brochures ────────────────────────────────────────────────────────────── */
export const brochuresTable: TableDef = {
  table: 'brochures',
  columns: {
    id: 'id',
    title: 'title',
    courseSlug: 'course_slug',
    fileUrl: 'file_url',
    fileSize: 'file_size',
    isActive: 'is_active',
  },
};

/* ── batches ──────────────────────────────────────────────────────────────── */
export const batchesTable: TableDef = {
  table: 'batches',
  columns: {
    id: 'id',
    course: 'course',
    startDate: 'start_date',
    mode: 'mode',
    seats: 'seats',
    isActive: 'is_active',
    order: 'order_index',
  },
};

/* ── settings (singleton) ─────────────────────────────────────────────────── */

const socialCodec = customCodec(
  'social',
  [
    'social_facebook',
    'social_instagram',
    'social_linkedin',
    'social_youtube',
    'social_twitter',
  ],
  (row) => ({
    facebook: row.social_facebook ?? '',
    instagram: row.social_instagram ?? '',
    linkedin: row.social_linkedin ?? '',
    youtube: row.social_youtube ?? '',
    twitter: row.social_twitter ?? '',
  }),
  (value) => {
    const out: Row = {};
    const map: Record<string, string> = {
      facebook: 'social_facebook',
      instagram: 'social_instagram',
      linkedin: 'social_linkedin',
      youtube: 'social_youtube',
      twitter: 'social_twitter',
    };
    for (const [k, col] of Object.entries(map)) {
      if (Object.prototype.hasOwnProperty.call(value, k)) out[col] = value[k];
    }
    return out;
  },
);

const siteStatsCodec = customCodec(
  'stats',
  [
    'stats_students_trained',
    'stats_placement_rate',
    'stats_hiring_partners',
    'stats_courses_offered',
  ],
  (row) => ({
    studentsTrained: row.stats_students_trained ?? '',
    placementRate: row.stats_placement_rate ?? '',
    hiringPartners: row.stats_hiring_partners ?? '',
    coursesOffered: row.stats_courses_offered ?? '',
  }),
  (value) => {
    const out: Row = {};
    const map: Record<string, string> = {
      studentsTrained: 'stats_students_trained',
      placementRate: 'stats_placement_rate',
      hiringPartners: 'stats_hiring_partners',
      coursesOffered: 'stats_courses_offered',
    };
    for (const [k, col] of Object.entries(map)) {
      if (Object.prototype.hasOwnProperty.call(value, k)) out[col] = value[k];
    }
    return out;
  },
);

const HERO_COLUMNS = [
  'hero_badge',
  'hero_heading_line1',
  'hero_heading_highlight',
  'hero_heading_line2',
  'hero_description',
  'hero_badges',
  'hero_primary_cta_text',
  'hero_primary_cta_link',
  'hero_secondary_cta_text',
  'hero_secondary_cta_link',
  'hero_whatsapp_text',
  'hero_trust_points',
  'hero_image',
  'hero_image_alt',
  'hero_overlay_label',
  'hero_overlay_value',
  'hero_overlay_suffix',
];

/**
 * settings.heroSection — nested two levels deep (primaryCta.text,
 * overlayCard.label…). Written out explicitly so the leaf-merge behaviour of
 * the old `settings.set(req.body)` is preserved: sending only
 * `{ heroSection: { primaryCta: { text: 'X' } } }` updates that one column.
 */
const heroSectionCodec = customCodec(
  'heroSection',
  HERO_COLUMNS,
  (row) => ({
    badge: row.hero_badge ?? '',
    headingLine1: row.hero_heading_line1 ?? '',
    headingHighlight: row.hero_heading_highlight ?? '',
    headingLine2: row.hero_heading_line2 ?? '',
    description: row.hero_description ?? '',
    badges: row.hero_badges ?? [],
    primaryCta: {
      text: row.hero_primary_cta_text ?? '',
      link: row.hero_primary_cta_link ?? '',
    },
    secondaryCta: {
      text: row.hero_secondary_cta_text ?? '',
      link: row.hero_secondary_cta_link ?? '',
    },
    whatsappText: row.hero_whatsapp_text ?? '',
    trustPoints: row.hero_trust_points ?? [],
    heroImage: row.hero_image ?? '',
    heroImageAlt: row.hero_image_alt ?? '',
    overlayCard: {
      label: row.hero_overlay_label ?? '',
      value: row.hero_overlay_value ?? '',
      suffix: row.hero_overlay_suffix ?? '',
    },
  }),
  (value) => {
    const out: Row = {};
    const flat: Record<string, string> = {
      badge: 'hero_badge',
      headingLine1: 'hero_heading_line1',
      headingHighlight: 'hero_heading_highlight',
      headingLine2: 'hero_heading_line2',
      description: 'hero_description',
      badges: 'hero_badges',
      whatsappText: 'hero_whatsapp_text',
      trustPoints: 'hero_trust_points',
      heroImage: 'hero_image',
      heroImageAlt: 'hero_image_alt',
    };
    for (const [k, col] of Object.entries(flat)) {
      if (Object.prototype.hasOwnProperty.call(value, k)) out[col] = value[k];
    }
    const nested: Record<string, Record<string, string>> = {
      primaryCta: { text: 'hero_primary_cta_text', link: 'hero_primary_cta_link' },
      secondaryCta: { text: 'hero_secondary_cta_text', link: 'hero_secondary_cta_link' },
      overlayCard: {
        label: 'hero_overlay_label',
        value: 'hero_overlay_value',
        suffix: 'hero_overlay_suffix',
      },
    };
    for (const [group, map] of Object.entries(nested)) {
      const sub = value[group];
      if (!sub || typeof sub !== 'object') continue;
      for (const [k, col] of Object.entries(map)) {
        if (Object.prototype.hasOwnProperty.call(sub, k)) out[col] = (sub as Row)[k];
      }
    }
    return out;
  },
);

export const settingsTable: TableDef = {
  table: 'settings',
  columns: {
    id: 'id',
    siteName: 'site_name',
    tagline: 'tagline',
    phone: 'phone',
    whatsapp: 'whatsapp',
    email: 'email',
    address: 'address',
    mapUrl: 'map_url',
    homepageVideoUrl: 'homepage_video_url',
    announcementText: 'announcement_text',
    logo: 'logo',
    defaultOgImage: 'default_og_image',
  },
  codecs: [socialCodec, siteStatsCodec, seoCodec(), heroSectionCodec],
};

/* ── about_page (singleton) ───────────────────────────────────────────────── */

const ABOUT_HERO_COLUMNS = [
  'hero_badge',
  'hero_heading',
  'hero_description',
  'hero_image',
  'hero_image_alt',
  'hero_primary_cta_text',
  'hero_primary_cta_link',
  'hero_secondary_cta_text',
  'hero_secondary_cta_link',
];

const ABOUT_HERO_MAP: Record<string, string> = {
  badge: 'hero_badge',
  heading: 'hero_heading',
  description: 'hero_description',
  image: 'hero_image',
  imageAlt: 'hero_image_alt',
  primaryCtaText: 'hero_primary_cta_text',
  primaryCtaLink: 'hero_primary_cta_link',
  secondaryCtaText: 'hero_secondary_cta_text',
  secondaryCtaLink: 'hero_secondary_cta_link',
};

const aboutHeroCodec = customCodec(
  'hero',
  ABOUT_HERO_COLUMNS,
  (row) => {
    const out: Row = {};
    for (const [k, col] of Object.entries(ABOUT_HERO_MAP)) out[k] = row[col] ?? '';
    return out;
  },
  (value) => {
    const out: Row = {};
    for (const [k, col] of Object.entries(ABOUT_HERO_MAP)) {
      if (Object.prototype.hasOwnProperty.call(value, k)) out[col] = value[k];
    }
    return out;
  },
);

const ABOUT_CTA_MAP: Record<string, string> = {
  heading: 'cta_heading',
  description: 'cta_description',
  buttonText: 'cta_button_text',
  buttonLink: 'cta_button_link',
};

const aboutCtaCodec = customCodec(
  'cta',
  Object.values(ABOUT_CTA_MAP),
  (row) => {
    const out: Row = {};
    for (const [k, col] of Object.entries(ABOUT_CTA_MAP)) out[k] = row[col] ?? '';
    return out;
  },
  (value) => {
    const out: Row = {};
    for (const [k, col] of Object.entries(ABOUT_CTA_MAP)) {
      if (Object.prototype.hasOwnProperty.call(value, k)) out[col] = value[k];
    }
    return out;
  },
);

export const aboutPageTable: TableDef = {
  table: 'about_page',
  columns: {
    id: 'id',
    sections: 'sections',
    stats: 'stats',
  },
  codecs: [aboutHeroCodec, aboutCtaCodec, seoCodec()],
};
