/* Domain types shared across the admin app — mirror the backend interfaces. */

export type Role = 'admin' | 'editor' | 'viewer' | 'receptionist' | 'content_writer';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type LeadStatus = 'new' | 'contacted' | 'converted' | 'closed';
export type BlogKind =
  | 'comparison'
  | 'roadmap'
  | 'salary'
  | 'interview'
  | 'projects'
  | 'certification'
  | 'whatis'
  | 'guide';

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

export interface BaseDoc {
  id: string;
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
}

/* ── Content blocks (blog body) ────────────────────────────────────────── */
export type Block =
  | { type: 'heading'; id?: string; text: string }
  | { type: 'subheading'; id?: string; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'code'; lang?: string; code: string }
  | { type: 'callout'; variant: 'info' | 'tip' | 'warning' | 'success'; title?: string; text: string }
  | { type: 'quote'; text: string; cite?: string }
  | { type: 'image'; url: string; alt?: string; caption?: string }
  | { type: 'faq'; items: { q: string; a: string }[] };

export type BlockType = Block['type'];

export interface TocItem {
  id: string;
  text: string;
}
export interface FaqItem {
  q: string;
  a: string;
}

export interface AdminUser extends BaseDoc {
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface Author extends BaseDoc {
  key: string;
  name: string;
  role: string;
  bio?: string;
  initials?: string;
  avatar?: string;
}

export interface BlogCategory extends BaseDoc {
  slug: string;
  name: string;
  short?: string;
  description?: string;
  color?: string;
  icon?: string;
  courseSlug?: string;
  courseTitle?: string;
  tools?: string[];
  roles?: string[];
  skills?: string[];
  certifications?: string[];
  prerequisites?: string[];
  salary?: { fresher?: string; mid?: string; senior?: string };
  blurb?: string;
  order?: number;
}

export interface Blog extends BaseDoc {
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  kind: BlogKind;
  excerpt?: string;
  status: ContentStatus;
  featured?: boolean;
  trending?: boolean;
  popular?: boolean;
  tags?: string[];
  author?: Author | string;
  authorKey?: string;
  readTime?: string;
  date?: string;
  updated?: string;
  content?: Block[];
  html?: string;
  toc?: TocItem[];
  faqs?: FaqItem[];
  featuredImage?: string;
  publishedAt?: string;
  seo?: Seo;
}

export interface SyllabusSection {
  title: string;
  items: string[];
}

export interface Course extends BaseDoc {
  slug: string;
  title: string;
  category?: string;
  tagline?: string;
  description?: string;
  duration?: string;
  fees?: string;
  modules?: string[];
  tools?: string[];
  projects?: string[];
  skills?: string[];
  placement?: string;
  syllabus?: SyllabusSection[];
  bannerImage?: string;
  images?: string[];
  brochureUrl?: string;
  trainer?: Trainer | string;
  faqs?: FaqItem[];
  status: ContentStatus;
  featured?: boolean;
  order?: number;
  seo?: Seo;
}

export interface Trainer extends BaseDoc {
  name: string;
  title?: string;
  company?: string;
  experience?: string;
  bio?: string;
  avatar?: string;
  skills?: string[];
  linkedin?: string;
  featured?: boolean;
  isActive: boolean;
  order?: number;
}

export interface Testimonial extends BaseDoc {
  name: string;
  role?: string;
  course?: string;
  salary?: string;
  stars?: number;
  quote: string;
  avatar?: string;
  featured?: boolean;
  isActive: boolean;
  order?: number;
}

export interface Placement extends BaseDoc {
  name: string;
  role?: string;
  company?: string;
  packageLpa?: string;
  previousPackage?: string;
  course?: string;
  avatar?: string;
  stars?: number;
  featured?: boolean;
  isActive: boolean;
  order?: number;
}

export interface Company extends BaseDoc {
  name: string;
  logo?: string;
  website?: string;
  isActive: boolean;
  order?: number;
}

export interface Roadmap extends BaseDoc {
  course: string;
  steps: string[];
  color?: string;
  isActive: boolean;
  order?: number;
}

export interface Faq extends BaseDoc {
  question: string;
  answer: string;
  scope?: string;
  isActive: boolean;
  order?: number;
}

export interface Comparison extends BaseDoc {
  slug: string;
  title: string;
  metaTitle?: string;
  itemA?: string;
  itemB?: string;
  intro?: string;
  rows?: { factor: string; a: string; b: string }[];
  verdict?: string;
  relatedCourses?: string[];
  faqs?: FaqItem[];
  status: ContentStatus;
  order?: number;
}

export interface Locality extends BaseDoc {
  slug: string;
  name: string;
  region?: string;
  intro?: string;
  landmarks?: string[];
  isActive: boolean;
  order?: number;
}

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDoc extends BaseDoc {
  slug: string;
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  updated?: string;
  intro?: string;
  sections: LegalSection[];
  status: ContentStatus;

  // Admin-only compatibility fields.
  // These are converted before saving and are NOT stored in Supabase.
  body?: string;
}

export interface GalleryItem extends BaseDoc {
  title?: string;
  imageUrl: string;
  category?: string;
  isActive: boolean;
  order?: number;
}

export interface Brochure extends BaseDoc {
  title: string;
  courseSlug?: string;
  fileUrl: string;
  isActive: boolean;
}

export type BatchMode = 'Online' | 'Offline' | 'Hybrid';
export interface Batch extends BaseDoc {
  course: string;
  startDate?: string;
  mode: BatchMode;
  seats?: number;
  timing?: string;
  isActive: boolean;
  order?: number;
}

export interface DemoRequest extends BaseDoc {
  name: string;
  phone: string;
  course?: string;
  source?: string;
  status: LeadStatus;
  notes?: string;
}

export interface ContactEnquiry extends BaseDoc {
  name: string;
  email: string;
  phone?: string;
  course?: string;
  subject?: string;
  message: string;
  status: LeadStatus;
  notes?: string;
}

export interface HeroCta {
  text?: string;
  link?: string;
}

export interface HeroOverlayCard {
  label?: string;
  value?: string;
  suffix?: string;
}

export interface HeroSection {
  badge?: string;
  headingLine1?: string;
  headingHighlight?: string;
  headingLine2?: string;
  description?: string;
  badges?: string[];
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  whatsappText?: string;
  trustPoints?: string[];
  heroImage?: string;
  heroImageAlt?: string;
  overlayCard?: HeroOverlayCard;
}

export interface Settings {
  id?: string;
  siteName: string;
  tagline?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  mapUrl?: string;
  homepageVideoUrl?: string;
  announcementText?: string;
  social?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    twitter?: string;
  };
  stats?: {
    studentsTrained?: string;
    placementRate?: string;
    hiringPartners?: string;
    coursesOffered?: string;
  };
  seo?: Seo;
  logo?: string;
  defaultOgImage?: string;
  heroSection?: HeroSection;
}

export interface DashboardStats {
  counts: {
    blogs: number;
    publishedBlogs: number;
    draftBlogs: number;
    courses: number;
    trainers: number;
    testimonials: number;
    placements: number;
    companies: number;
    categories: number;
    enquiries: number;
    newEnquiries: number;
    demoRequests: number;
    newDemoRequests: number;
    gallery: number;
    brochures: number;
    mediaAssets: number;
  };
  recent: {
    blogs: Blog[];
    enquiries: ContactEnquiry[];
    demoRequests: DemoRequest[];
  };
}

/* ── About page (singleton, editable from the dashboard) ────────────────── */
export interface AboutHero {
  badge?: string;
  heading?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
}

export interface AboutSection {
  heading?: string;
  eyebrow?: string;
  body?: string;
  bullets?: string[];
  image?: string;
  imageAlt?: string;
  imageSide?: 'left' | 'right';
}

export interface AboutStat {
  value?: string;
  label?: string;
  icon?: string;
}

export interface AboutCta {
  heading?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
}

export interface AboutPage {
  id?: string;
  hero?: AboutHero;
  sections?: AboutSection[];
  stats?: AboutStat[];
  cta?: AboutCta;
  seo?: Seo;
}
