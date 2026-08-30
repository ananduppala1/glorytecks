// ─────────────────────────────────────────────────────────────────────────────
// Content types — the single source of truth for the shapes the website renders.
//
// These mirror the documents returned by the GloryTecks backend public API
// (admin-backend `/api/v1/public/*`). The data itself lives only in MongoDB and
// is fetched at runtime; nothing here is hardcoded content.
// ─────────────────────────────────────────────────────────────────────────────

/** SEO metadata embedded on most content documents. */
export interface Seo {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  keywords?: string[];
  noindex?: boolean;
}

export interface SalaryBand {
  fresher: string;
  mid: string;
  senior: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

// ── Blog content blocks (discriminated union, identical to the CMS) ──────────
export type Block =
  | { type: "heading"; id: string; text: string }
  | { type: "subheading"; id: string; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "code"; lang: string; code: string }
  | { type: "callout"; variant: "info" | "tip" | "warning" | "success"; title?: string; text: string }
  | { type: "quote"; text: string; cite?: string }
  | { type: "image"; url: string; alt?: string; caption?: string }
  | { type: "faq"; items: FaqItem[] };

export type TocItem = { id: string; text: string };

export type BlogKind =
  | "comparison"
  | "roadmap"
  | "salary"
  | "interview"
  | "projects"
  | "certification"
  | "whatis"
  | "guide";

// ── Author ───────────────────────────────────────────────────────────────────
export interface Author {
  id: string; // mirrors the backend `key`
  key?: string;
  name: string;
  role: string;
  bio?: string;
  initials: string;
  avatar?: string;
}

// ── Blog post (list + detail) ────────────────────────────────────────────────
export interface BlogPost {
  id?: string;
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  kind: BlogKind;
  excerpt: string;
  metaDescription: string;
  tags: string[];
  readTime: string;
  date: string;
  updated: string;
  /** Resolved author object (populated from the backend ref). */
  author?: Author | null;
  authorKey?: string;
  featuredImage?: string;
  featured: boolean;
  trending: boolean;
  popular: boolean;
  // Present only on the detail endpoint (`?full=1`):
  content?: Block[];
  html?: string;
  toc?: TocItem[];
  faqs?: FaqItem[];
  seo?: Seo;
}

// ── Blog category (knowledge base) ───────────────────────────────────────────
export interface CategoryKnowledge {
  id?: string;
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
  salary: SalaryBand;
  blurb: string;
  order?: number;
}

// ── Course ───────────────────────────────────────────────────────────────────
export interface SyllabusSection {
  title: string;
  items: string[];
}

export interface CourseTrainerRef {
  id?: string;
  name: string;
  title?: string;
  company?: string;
  avatar?: string;
  bio?: string;
}

export interface Course {
  id?: string;
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
  syllabus: SyllabusSection[];
  fees?: string;
  skills?: string[];
  bannerImage?: string;
  images?: string[];
  brochureUrl?: string;
  trainer?: CourseTrainerRef | null;
  faqs?: FaqItem[];
  featured?: boolean;
  order?: number;
  seo?: Seo;
}

// ── Trainer ──────────────────────────────────────────────────────────────────
export interface Trainer {
  id?: string;
  name: string;
  title: string;
  experience: string;
  company: string;
  skills: string[];
  bio?: string;
  avatar?: string;
  linkedin?: string;
  featured: boolean;
  order?: number;
}

// ── Testimonial ──────────────────────────────────────────────────────────────
export interface Testimonial {
  id?: string;
  name: string;
  role: string;
  salary?: string;
  stars: number;
  quote: string;
  course?: string;
  avatar?: string;
  featured: boolean;
  order?: number;
}

// ── Placement / success story ────────────────────────────────────────────────
export interface Placement {
  id?: string;
  name: string;
  role: string;
  company: string;
  packageLpa: string;
  previousPackage?: string;
  course: string;
  stars: number;
  avatar?: string;
  batch?: string;
  featured: boolean;
  order?: number;
}

// ── Company / hiring partner ─────────────────────────────────────────────────
export interface Company {
  id?: string;
  name: string;
  logo?: string;
  website?: string;
  order?: number;
}

// ── Roadmap ──────────────────────────────────────────────────────────────────
export interface Roadmap {
  id?: string;
  course: string;
  steps: string[];
  color: string;
  icon?: string;
  order?: number;
}

// ── FAQ ──────────────────────────────────────────────────────────────────────
export interface Faq {
  id?: string;
  question: string;
  answer: string;
  scope: string;
  order?: number;
}

// ── Comparison ───────────────────────────────────────────────────────────────
export interface ComparisonRow {
  factor: string;
  a: string;
  b: string;
}

export interface Comparison {
  id?: string;
  slug: string;
  title: string;
  metaTitle: string;
  itemA: string;
  itemB: string;
  intro: string;
  rows: ComparisonRow[];
  verdict: string;
  relatedCourses: { label: string; slug: string }[];
  /** Tuple form `[question, answer]` used by the comparison pages. */
  faqs: [string, string][];
  order?: number;
}

// ── Locality ─────────────────────────────────────────────────────────────────
export interface Locality {
  id?: string;
  slug: string;
  name: string;
  intro: string;
  context: string;
  nearby: string;
  order?: number;
}

// ── Gallery ──────────────────────────────────────────────────────────────────
export interface GalleryItem {
  id?: string;
  title: string;
  imageUrl: string;
  category?: string;
  caption?: string;
  order?: number;
}

// ── Batch ────────────────────────────────────────────────────────────────────
export interface Batch {
  id?: string;
  course: string;
  startDate: string;
  mode: "Online" | "Offline" | "Hybrid";
  seats: number;
  order?: number;
}

// ── Legal document ───────────────────────────────────────────────────────────
export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDoc {
  id?: string;
  slug: string;
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  updated?: string;
  intro?: string;
  sections: LegalSection[];
}

// ── Hero Section (part of Settings) ──────────────────────────────────────
export interface HeroCta {
  text: string;
  link: string;
}

export interface HeroOverlayCard {
  label: string;
  value: string;
  suffix: string;
}

export interface HeroSection {
  badge: string;
  headingLine1: string;
  headingHighlight: string;
  headingLine2: string;
  description: string;
  badges: string[];
  primaryCta: HeroCta;
  secondaryCta: HeroCta;
  whatsappText: string;
  trustPoints: string[];
  heroImage: string;
  heroImageAlt: string;
  overlayCard: HeroOverlayCard;
}

// ── Settings (singleton) ─────────────────────────────────────────────────────
export interface SiteSettings {
  siteName: string;
  tagline?: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  mapUrl?: string;
  /** Homepage promo video (YouTube URL). Empty → website uses its default. */
  homepageVideoUrl?: string;
  /** Top announcement-bar text. Empty → website uses its default. */
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
  seo?: Seo;
  logo?: string;
  defaultOgImage?: string;
  heroSection?: HeroSection;
}

// ── Form submission payloads ─────────────────────────────────────────────────
export interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  course?: string;
  message: string;
  subject?: string;
}

export interface DemoRequestPayload {
  name: string;
  phone: string;
  course?: string;
  source?: string;
}

// ── About page (singleton, managed from the CMS) ─────────────────────────────
export interface AboutHero {
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

export interface AboutSection {
  heading: string;
  eyebrow: string;
  body: string;
  bullets: string[];
  image: string;
  imageAlt: string;
  imageSide: "left" | "right";
}

export interface AboutStat {
  value: string;
  label: string;
  icon?: string;
}

export interface AboutCta {
  heading: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}

export interface AboutContent {
  hero: AboutHero;
  sections: AboutSection[];
  stats: AboutStat[];
  cta: AboutCta;
  seo?: Seo;
}
