import { BlogKind, ContentStatus, LeadStatus, Role, BatchMode } from '../constants';
import { Block, TocItem, FaqItem } from '../utils/blocks';

export type { Block, TocItem, FaqItem };

/**
 * Domain interfaces.
 *
 * These previously extended Mongoose's `Document`. They are now plain types:
 * the shapes below are exactly what the API returns and what the admin/public
 * frontends already consume, so no response contract changed.
 *
 * `id` is now a UUID string instead of a 24-character ObjectId hex string.
 * `_id` is still emitted alongside it (same value) because list rows carried
 * both before — see db/mappers.ts.
 */

export interface IEntity {
  id: string;
  /** Mirror of `id`, preserved for backwards compatibility with older clients. */
  _id?: string;
}

export interface ITimestamps {
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** SEO metadata sub-document reused across content models. */
export interface ISeo {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  keywords?: string[];
  noindex?: boolean;
}

export interface ISalaryBand {
  fresher: string;
  mid: string;
  senior: string;
}

/* ── Admin user ─────────────────────────────────────────────────────────── */
/**
 * Application profile for an administrator. Credentials (password, refresh
 * tokens) live in Supabase Auth and are deliberately absent here — `id` is the
 * `auth.users` id, and this row is the source of truth for `role`/`isActive`.
 */
export interface IAdminUser extends IEntity, ITimestamps {
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: Date | string;
}

/* ── Blog ───────────────────────────────────────────────────────────────── */
export interface IAuthorRef {
  id: string;
  _id?: string;
  key?: string;
  name?: string;
  role?: string;
  initials?: string;
  avatar?: string;
  bio?: string;
}

export interface IBlog extends IEntity, ITimestamps {
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  kind: BlogKind;
  excerpt: string;
  status: ContentStatus;
  featured: boolean;
  trending: boolean;
  popular: boolean;
  tags: string[];
  /** Populated author object on read; accepts an id or author key on write. */
  author?: IAuthorRef | string | null;
  authorKey: string; // stable slug/id mirroring the site's author id
  featuredImage?: string;
  readTime: string;
  date: string; // ISO date (publish date, mirrors site `date`)
  updated: string; // ISO date (mirrors site `updated`)
  content: Block[]; // the canonical Block[] body
  html?: string; // derived, cached
  toc: TocItem[]; // derived
  faqs: FaqItem[]; // derived (FAQ blocks)
  seo: ISeo;
  publishedAt?: Date | string | null;
}

/* ── Blog category ──────────────────────────────────────────────────────── */
export interface IBlogCategory extends IEntity, ITimestamps {
  slug: string;
  name: string;
  short: string;
  description: string;
  color: string;
  icon: string;
  courseSlug: string;
  courseTitle: string;
  tools: string[];
  roles: string[];
  skills: string[];
  certifications: string[];
  prerequisites: string[];
  salary: ISalaryBand;
  blurb: string;
  order: number;
}

/* ── Author ─────────────────────────────────────────────────────────────── */
export interface IAuthor extends IEntity, ITimestamps {
  key: string; // mirrors site author id, e.g. "ravi-kumar"
  name: string;
  role: string;
  bio: string;
  initials: string;
  avatar?: string;
}

/* ── Course ─────────────────────────────────────────────────────────────── */
export interface ISyllabusSection {
  title: string;
  items: string[];
}

export interface ITrainerRef {
  id: string;
  _id?: string;
  name?: string;
  title?: string;
  company?: string;
  avatar?: string;
  bio?: string;
}

export interface ICourse extends IEntity, ITimestamps {
  slug: string;
  title: string;
  category: string;
  tagline: string;
  description: string;
  duration: string;
  modules: string[];
  tools: string[];
  projects: string[];
  placement: string;
  syllabus: ISyllabusSection[];
  // Extended, admin-manageable fields (optional → public site unaffected)
  fees?: string;
  skills: string[];
  bannerImage?: string;
  images: string[];
  brochureUrl?: string;
  trainer?: ITrainerRef | string | null;
  faqs: FaqItem[];
  status: ContentStatus;
  featured: boolean;
  order: number;
  seo: ISeo;
}

/* ── Trainer ────────────────────────────────────────────────────────────── */
export interface ITrainer extends IEntity, ITimestamps {
  name: string;
  title: string;
  experience: string; // "12 Years"
  company: string; // "Ex-Amazon"
  skills: string[];
  bio?: string;
  avatar?: string;
  linkedin?: string;
  featured: boolean;
  order: number;
  isActive: boolean;
}

/* ── Testimonial ────────────────────────────────────────────────────────── */
export interface ITestimonial extends IEntity, ITimestamps {
  name: string;
  role: string; // "Data Scientist @ Fintech MNC"
  salary?: string; // "₹18 LPA"
  stars: number;
  quote: string;
  course?: string;
  avatar?: string;
  featured: boolean;
  order: number;
  isActive: boolean;
}

/* ── Placement / Success story ──────────────────────────────────────────── */
export interface IPlacement extends IEntity, ITimestamps {
  name: string;
  role: string;
  company: string;
  packageLpa: string; // "18 LPA"
  previousPackage?: string; // "3.5 LPA"
  course: string;
  stars: number;
  avatar?: string;
  batch?: string;
  featured: boolean;
  order: number;
  isActive: boolean;
}

/* ── Company / hiring partner ───────────────────────────────────────────── */
export interface ICompany extends IEntity, ITimestamps {
  name: string;
  logo?: string;
  website?: string;
  order: number;
  isActive: boolean;
}

/* ── Roadmap ────────────────────────────────────────────────────────────── */
export interface IRoadmap extends IEntity, ITimestamps {
  course: string;
  steps: string[];
  color: string;
  icon?: string;
  order: number;
  isActive: boolean;
}

/* ── FAQ ────────────────────────────────────────────────────────────────── */
export interface IFaq extends IEntity, ITimestamps {
  question: string;
  answer: string;
  scope: string; // "general" | course slug | page key
  order: number;
  isActive: boolean;
}

/* ── Demo request ───────────────────────────────────────────────────────── */
export interface IDemoRequest extends IEntity, ITimestamps {
  name: string;
  phone: string;
  course?: string;
  source?: string; // "exit" | "popup" | "button"
  status: LeadStatus;
  notes?: string;
}

/* ── Contact enquiry ────────────────────────────────────────────────────── */
export interface IContactEnquiry extends IEntity, ITimestamps {
  name: string;
  email: string;
  phone: string;
  course?: string;
  message: string;
  subject?: string;
  status: LeadStatus;
  notes?: string;
}

/* ── Comparison ─────────────────────────────────────────────────────────── */
export interface IComparisonRow {
  factor: string;
  a: string;
  b: string;
}
export interface IComparison extends IEntity, ITimestamps {
  slug: string;
  title: string;
  metaTitle: string;
  itemA: string;
  itemB: string;
  intro: string;
  rows: IComparisonRow[];
  verdict: string;
  relatedCourses: { label: string; slug: string }[];
  faqs: FaqItem[];
  status: ContentStatus;
  order: number;
}

/* ── Locality (local SEO) ───────────────────────────────────────────────── */
export interface ILocality extends IEntity, ITimestamps {
  slug: string;
  name: string;
  intro: string;
  context: string;
  nearby: string;
  order: number;
  isActive: boolean;
}

/* ── Legal doc ──────────────────────────────────────────────────────────── */
export interface ILegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}
export interface ILegalDoc extends IEntity, ITimestamps {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  updated: string;
  intro: string;
  sections: ILegalSection[];
  status: ContentStatus;
}

/* ── Gallery ────────────────────────────────────────────────────────────── */
export interface IGalleryItem extends IEntity, ITimestamps {
  title: string;
  /** Cloudinary secure URL — the binary itself stays in Cloudinary. */
  imageUrl: string;
  category?: string;
  caption?: string;
  order: number;
  isActive: boolean;
}

/* ── Brochure ───────────────────────────────────────────────────────────── */
export interface IBrochure extends IEntity, ITimestamps {
  title: string;
  courseSlug?: string;
  /** Cloudinary URL of the PDF — the binary itself stays in Cloudinary. */
  fileUrl: string;
  fileSize?: number;
  isActive: boolean;
}

/* ── Batch ──────────────────────────────────────────────────────────────── */
export interface IBatch extends IEntity, ITimestamps {
  course: string;
  startDate: string; // "Jun 10, 2026"
  mode: BatchMode;
  seats: number;
  isActive: boolean;
  order: number;
}

/* ── Hero Section (part of Settings singleton) ──────────────────────────── */
export interface IHeroCta {
  text: string;
  link: string;
}

export interface IHeroOverlayCard {
  label: string;
  value: string;
  suffix: string;
}

export interface IHeroSection {
  badge: string;
  headingLine1: string;
  headingHighlight: string;
  headingLine2: string;
  description: string;
  badges: string[];
  primaryCta: IHeroCta;
  secondaryCta: IHeroCta;
  whatsappText: string;
  trustPoints: string[];
  heroImage: string;
  heroImageAlt: string;
  overlayCard: IHeroOverlayCard;
}

/* ── About page (singleton) ─────────────────────────────────────────────── */
export interface IAboutHero {
  badge: string;
  heading: string;
  description: string;
  image: string;
  imageAlt: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
}

export interface IAboutSection {
  heading: string;
  eyebrow: string; // small label above the heading (e.g. "Who We Are")
  body: string; // main paragraph
  bullets: string[]; // optional checklist items
  image: string;
  imageAlt: string;
  imageSide: 'left' | 'right'; // alternating layout control
}

export interface IAboutStat {
  value: string;
  label: string;
  icon?: string; // optional lucide icon name
}

export interface IAboutCta {
  heading: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}

export interface IAboutPage extends IEntity, ITimestamps {
  hero: IAboutHero;
  sections: IAboutSection[];
  stats: IAboutStat[];
  cta: IAboutCta;
  seo: ISeo;
}

/* ── Settings (singleton) ───────────────────────────────────────────────── */
export interface ISettings extends IEntity, ITimestamps {
  siteName: string;
  tagline?: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  mapUrl?: string;
  /** Homepage promo video (YouTube URL). Empty → website falls back to its default. */
  homepageVideoUrl?: string;
  /** Top announcement-bar text on the public site. Empty → website default. */
  announcementText?: string;
  social: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    twitter?: string;
  };
  stats: {
    studentsTrained: string;
    placementRate: string;
    hiringPartners: string;
    coursesOffered: string;
  };
  seo: ISeo;
  logo?: string;
  defaultOgImage?: string;
  heroSection?: IHeroSection;
}
