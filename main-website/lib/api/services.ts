// ─────────────────────────────────────────────────────────────────────────────
// API service layer.
//
// One typed method per backend resource. Raw API documents are normalised into
// the website's domain types here (see `@/types/content`) so the React layer
// never touches Mongo-shaped fields like `_id` or populated refs directly.
// ─────────────────────────────────────────────────────────────────────────────
import {
  request,
  requestWithMeta,
  PUBLIC_API_BASE_URL,
  REVALIDATE,
  type PaginationMeta,
  type QueryParams,
} from "./client";
import type {
  Author,
  Batch,
  BlogPost,
  CategoryKnowledge,
  Comparison,
  Company,
  Course,
  Faq,
  GalleryItem,
  LegalDoc,
  Locality,
  Placement,
  Roadmap,
  SiteSettings,
  Testimonial,
  Trainer,
  ContactPayload,
  DemoRequestPayload,
  AboutContent,
} from "@/types/content";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;

const idOf = (doc: Raw): string | undefined => doc?.id ?? doc?._id?.toString?.() ?? doc?._id;

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapAuthor(raw: Raw | string | null | undefined): Author | null {
  if (!raw || typeof raw === "string") return null;
  return {
    id: raw.key ?? idOf(raw) ?? "",
    key: raw.key,
    name: raw.name ?? "GloryTecks",
    role: raw.role ?? "",
    bio: raw.bio,
    initials: raw.initials ?? "GT",
    avatar: raw.avatar,
  };
}

function mapStandaloneAuthor(raw: Raw): Author {
  return {
    id: raw.key ?? idOf(raw) ?? "",
    key: raw.key,
    name: raw.name,
    role: raw.role ?? "",
    bio: raw.bio,
    initials: raw.initials ?? "",
    avatar: raw.avatar,
  };
}

function mapBlog(raw: Raw): BlogPost {
  return {
    id: idOf(raw),
    slug: raw.slug,
    title: raw.title,
    category: raw.category,
    categorySlug: raw.categorySlug,
    kind: raw.kind ?? "guide",
    excerpt: raw.excerpt ?? "",
    metaDescription: raw.metaDescription ?? raw.seo?.metaDescription ?? raw.excerpt ?? "",
    tags: raw.tags ?? [],
    readTime: raw.readTime ?? "5 min",
    date: raw.date ?? "",
    updated: raw.updated ?? raw.date ?? "",
    author: mapAuthor(raw.author),
    authorKey: raw.authorKey ?? (typeof raw.author === "object" ? raw.author?.key : undefined),
    featuredImage: raw.featuredImage,
    featured: !!raw.featured,
    trending: !!raw.trending,
    popular: !!raw.popular,
    content: raw.content,
    html: raw.html,
    toc: raw.toc,
    faqs: raw.faqs,
    seo: raw.seo,
  };
}

function mapCategory(raw: Raw): CategoryKnowledge {
  return {
    id: idOf(raw),
    slug: raw.slug,
    name: raw.name,
    short: raw.short ?? raw.name,
    description: raw.description ?? "",
    color: raw.color ?? "210 90% 60%",
    icon: raw.icon ?? "BookOpen",
    courseSlug: raw.courseSlug ?? "",
    courseTitle: raw.courseTitle ?? "",
    tools: raw.tools ?? [],
    roles: raw.roles ?? [],
    skills: raw.skills ?? [],
    certifications: raw.certifications ?? [],
    prerequisites: raw.prerequisites ?? [],
    salary: raw.salary ?? { fresher: "", mid: "", senior: "" },
    blurb: raw.blurb ?? "",
    order: raw.order,
  };
}

function mapCourse(raw: Raw): Course {
  const trainer = raw.trainer && typeof raw.trainer === "object"
    ? {
        id: idOf(raw.trainer),
        name: raw.trainer.name,
        title: raw.trainer.title,
        company: raw.trainer.company,
        avatar: raw.trainer.avatar,
        bio: raw.trainer.bio,
      }
    : null;
  return {
    id: idOf(raw),
    slug: raw.slug,
    title: raw.title,
    category: raw.category ?? "",
    tagline: raw.tagline ?? "",
    description: raw.description ?? "",
    duration: raw.duration ?? "",
    modules: raw.modules ?? [],
    tools: raw.tools ?? [],
    projects: raw.projects ?? [],
    placement: raw.placement ?? "",
    syllabus: raw.syllabus ?? [],
    fees: raw.fees,
    skills: raw.skills ?? [],
    bannerImage: raw.bannerImage,
    images: raw.images ?? [],
    brochureUrl: raw.brochureUrl,
    trainer,
    faqs: raw.faqs ?? [],
    featured: raw.featured,
    order: raw.order,
    seo: raw.seo,
  };
}

function mapTrainer(raw: Raw): Trainer {
  return {
    id: idOf(raw),
    name: raw.name,
    title: raw.title ?? "",
    experience: raw.experience ?? "",
    company: raw.company ?? "",
    skills: raw.skills ?? [],
    bio: raw.bio,
    avatar: raw.avatar,
    linkedin: raw.linkedin,
    featured: !!raw.featured,
    order: raw.order,
  };
}

function mapTestimonial(raw: Raw): Testimonial {
  return {
    id: idOf(raw),
    name: raw.name,
    role: raw.role ?? "",
    salary: raw.salary,
    stars: raw.stars ?? 5,
    quote: raw.quote ?? "",
    course: raw.course,
    avatar: raw.avatar,
    featured: !!raw.featured,
    order: raw.order,
  };
}

function mapPlacement(raw: Raw): Placement {
  return {
    id: idOf(raw),
    name: raw.name,
    role: raw.role ?? "",
    company: raw.company ?? "",
    packageLpa: raw.packageLpa ?? "",
    previousPackage: raw.previousPackage,
    course: raw.course ?? "",
    stars: raw.stars ?? 5,
    avatar: raw.avatar,
    batch: raw.batch,
    featured: !!raw.featured,
    order: raw.order,
  };
}

function mapCompany(raw: Raw): Company {
  return {
    id: idOf(raw),
    name: raw.name,
    logo: raw.logo,
    website: raw.website,
    order: raw.order,
  };
}

function mapRoadmap(raw: Raw): Roadmap {
  return {
    id: idOf(raw),
    course: raw.course,
    steps: raw.steps ?? [],
    color: raw.color ?? "from-blue-500/20 to-blue-600/5",
    icon: raw.icon,
    order: raw.order,
  };
}

function mapFaq(raw: Raw): Faq {
  return {
    id: idOf(raw),
    question: raw.question,
    answer: raw.answer,
    scope: raw.scope ?? "general",
    order: raw.order,
  };
}

function mapComparison(raw: Raw): Comparison {
  // Backend stores faqs as { q, a }[]; the comparison pages render `[q, a]` tuples.
  const faqs: [string, string][] = Array.isArray(raw.faqs)
    ? raw.faqs.map((f: Raw) =>
        Array.isArray(f) ? [f[0], f[1]] : [f?.q ?? "", f?.a ?? ""],
      )
    : [];
  return {
    id: idOf(raw),
    slug: raw.slug,
    title: raw.title,
    metaTitle: raw.metaTitle ?? raw.title,
    itemA: raw.itemA,
    itemB: raw.itemB,
    intro: raw.intro ?? "",
    rows: raw.rows ?? [],
    verdict: raw.verdict ?? "",
    relatedCourses: raw.relatedCourses ?? [],
    faqs,
    order: raw.order,
  };
}

function mapLocality(raw: Raw): Locality {
  return {
    id: idOf(raw),
    slug: raw.slug,
    name: raw.name,
    intro: raw.intro ?? "",
    context: raw.context ?? "",
    nearby: raw.nearby ?? "",
    order: raw.order,
  };
}

function mapGallery(raw: Raw): GalleryItem {
  return {
    id: idOf(raw),
    title: raw.title,
    imageUrl: raw.imageUrl,
    category: raw.category,
    caption: raw.caption,
    order: raw.order,
  };
}

function mapBatch(raw: Raw): Batch {
  return {
    id: idOf(raw),
    course: raw.course,
    startDate: raw.startDate,
    mode: raw.mode ?? "Online",
    seats: raw.seats ?? 0,
    order: raw.order,
  };
}

function mapLegal(raw: Raw): LegalDoc {
  return {
    id: idOf(raw),
    slug: raw.slug,
    title: raw.title,
    metaTitle: raw.metaTitle,
    metaDescription: raw.metaDescription,
    updated: raw.updated,
    intro: raw.intro,
    sections: raw.sections ?? [],
  };
}

function mapSettings(raw: Raw): SiteSettings {
  return {
    siteName: raw.siteName ?? "GloryTecks",
    tagline: raw.tagline,
    phone: raw.phone ?? "",
    whatsapp: raw.whatsapp ?? "",
    email: raw.email ?? "",
    address: raw.address ?? "",
    mapUrl: raw.mapUrl,
    homepageVideoUrl: raw.homepageVideoUrl,
    announcementText: raw.announcementText,
    social: raw.social ?? {},
    stats: raw.stats ?? {
      studentsTrained: "",
      placementRate: "",
      hiringPartners: "",
      coursesOffered: "",
    },
    seo: raw.seo,
    logo: raw.logo,
    defaultOgImage: raw.defaultOgImage,
    heroSection: raw.heroSection,
  };
}

// ── Blogs ────────────────────────────────────────────────────────────────────
export interface BlogListParams extends QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  categorySlug?: string;
  /** Exact-match filter against the tags array (case-insensitive). */
  tag?: string;
  /** Server-side text search over title / excerpt / category / tags. */
  q?: string;
  kind?: string;
  featured?: boolean;
  trending?: boolean;
  popular?: boolean;
  full?: boolean;
}

/**
 * Fetch ONE page of blogs. All filtering (category, tag, search), sorting and
 * pagination happen on the server — the client never downloads the archive.
 */
export async function fetchBlogs(
  params: BlogListParams = {},
): Promise<{ items: BlogPost[]; meta?: PaginationMeta }> {
  const { data, meta } = await requestWithMeta<Raw[]>("/public/blogs", {
    params,
    revalidate: REVALIDATE.CONTENT,
  });
  return { items: (data ?? []).map(mapBlog), meta };
}

/** Related posts + chronological prev/next for a post, computed server-side. */
export interface BlogContext {
  related: BlogPost[];
  prev?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
}

export async function fetchBlogContext(slug: string): Promise<BlogContext> {
  const data = await request<{ related?: Raw[]; prev?: Raw | null; next?: Raw | null }>(`/public/blogs/${encodeURIComponent(slug)}/context`, { revalidate: REVALIDATE.CONTENT });
  return {
    related: (data.related ?? []).map(mapBlog),
    prev: data.prev ? { slug: data.prev.slug, title: data.prev.title } : null,
    next: data.next ? { slug: data.next.slug, title: data.next.title } : null,
  };
}

export async function fetchBlog(slug: string): Promise<BlogPost> {
  const data = await request<Raw>(`/public/blogs/${encodeURIComponent(slug)}`, {
    params: { full: 1 },
    revalidate: REVALIDATE.CONTENT,
  });
  return mapBlog(data);
}

// ── Courses ──────────────────────────────────────────────────────────────────
export async function fetchCourses(): Promise<Course[]> {
  const data = await request<Raw[]>("/public/courses", { revalidate: REVALIDATE.CONTENT });
  return (data ?? []).map(mapCourse);
}

export async function fetchCourse(slug: string): Promise<Course> {
  const data = await request<Raw>(`/public/courses/${encodeURIComponent(slug)}`, { revalidate: REVALIDATE.CONTENT });
  return mapCourse(data);
}

// ── Simple collections ───────────────────────────────────────────────────────
export async function fetchCategories(): Promise<CategoryKnowledge[]> {
  const data = await request<Raw[]>("/public/categories", { revalidate: REVALIDATE.CONTENT });
  return (data ?? []).map(mapCategory);
}

export async function fetchAuthors(): Promise<Author[]> {
  const data = await request<Raw[]>("/public/authors", { revalidate: REVALIDATE.CONTENT });
  return (data ?? []).map(mapStandaloneAuthor);
}

export async function fetchTrainers(): Promise<Trainer[]> {
  const data = await request<Raw[]>("/public/trainers", { revalidate: REVALIDATE.FAST });
  return (data ?? []).map(mapTrainer);
}

export async function fetchTestimonials(): Promise<Testimonial[]> {
  const data = await request<Raw[]>("/public/testimonials", { revalidate: REVALIDATE.FAST });
  return (data ?? []).map(mapTestimonial);
}

export async function fetchPlacements(): Promise<Placement[]> {
  const data = await request<Raw[]>("/public/placements", { revalidate: REVALIDATE.FAST });
  return (data ?? []).map(mapPlacement);
}

export async function fetchCompanies(): Promise<Company[]> {
  const data = await request<Raw[]>("/public/companies", { revalidate: REVALIDATE.FAST });
  return (data ?? []).map(mapCompany);
}

export async function fetchRoadmaps(): Promise<Roadmap[]> {
  const data = await request<Raw[]>("/public/roadmaps", { revalidate: REVALIDATE.FAST });
  return (data ?? []).map(mapRoadmap);
}

export async function fetchFaqs(): Promise<Faq[]> {
  const data = await request<Raw[]>("/public/faqs", { revalidate: REVALIDATE.FAST });
  return (data ?? []).map(mapFaq);
}

export async function fetchComparisons(): Promise<Comparison[]> {
  const data = await request<Raw[]>("/public/comparisons", { revalidate: REVALIDATE.FAST });
  return (data ?? []).map(mapComparison);
}

export async function fetchComparison(slug: string): Promise<Comparison> {
  const data = await request<Raw>(`/public/comparisons/${encodeURIComponent(slug)}`, { revalidate: REVALIDATE.FAST });
  return mapComparison(data);
}

export async function fetchLocalities(): Promise<Locality[]> {
  const data = await request<Raw[]>("/public/localities", { revalidate: REVALIDATE.FAST });
  return (data ?? []).map(mapLocality);
}

export async function fetchLocality(slug: string): Promise<Locality> {
  const data = await request<Raw>(`/public/localities/${encodeURIComponent(slug)}`, { revalidate: REVALIDATE.FAST });
  return mapLocality(data);
}

export async function fetchGallery(): Promise<GalleryItem[]> {
  const data = await request<Raw[]>("/public/gallery", { revalidate: REVALIDATE.FAST });
  return (data ?? []).map(mapGallery);
}

export async function fetchBatches(): Promise<Batch[]> {
  const data = await request<Raw[]>("/public/batches", { revalidate: REVALIDATE.FAST });
  return (data ?? []).map(mapBatch);
}

export async function fetchLegalDocs(): Promise<LegalDoc[]> {
  const data = await request<Raw[]>("/public/legal", { revalidate: REVALIDATE.FAST });
  return (data ?? []).map(mapLegal);
}

export async function fetchLegalDoc(slug: string): Promise<LegalDoc> {
  const data = await request<Raw>(`/public/legal/${encodeURIComponent(slug)}`, { revalidate: REVALIDATE.FAST });
  return mapLegal(data);
}

export async function fetchSettings(): Promise<SiteSettings> {
  const data = await request<Raw>("/public/settings", { revalidate: REVALIDATE.FAST });
  return mapSettings(data);
}

// ── About page ───────────────────────────────────────────────────────────────
function mapAbout(raw: Raw): AboutContent {
  const hero = raw.hero ?? {};
  return {
    hero: {
      badge: hero.badge ?? "",
      heading: hero.heading ?? "",
      description: hero.description ?? "",
      image: hero.image ?? "",
      imageAlt: hero.imageAlt ?? "",
      primaryCtaText: hero.primaryCtaText ?? "",
      primaryCtaLink: hero.primaryCtaLink ?? "",
      secondaryCtaText: hero.secondaryCtaText ?? "",
      secondaryCtaLink: hero.secondaryCtaLink ?? "",
    },
    sections: Array.isArray(raw.sections)
      ? raw.sections.map((s: Raw) => ({
          heading: s.heading ?? "",
          eyebrow: s.eyebrow ?? "",
          body: s.body ?? "",
          bullets: s.bullets ?? [],
          image: s.image ?? "",
          imageAlt: s.imageAlt ?? "",
          imageSide: s.imageSide === "right" ? "right" : "left",
        }))
      : [],
    stats: Array.isArray(raw.stats)
      ? raw.stats.map((s: Raw) => ({
          value: s.value ?? "",
          label: s.label ?? "",
          icon: s.icon,
        }))
      : [],
    cta: {
      heading: raw.cta?.heading ?? "",
      description: raw.cta?.description ?? "",
      buttonText: raw.cta?.buttonText ?? "",
      buttonLink: raw.cta?.buttonLink ?? "",
    },
    seo: raw.seo,
  };
}

export async function fetchAbout(): Promise<AboutContent> {
  const data = await request<Raw>("/public/about", { revalidate: REVALIDATE.FAST });
  return mapAbout(data);
}

// ── Form submissions (website → CMS) ─────────────────────────────────────────
export async function submitContact(payload: ContactPayload): Promise<{ id: string }> {
  return request<{ id: string }>("/public/contact", { method: "POST", body: payload });
}

export async function submitDemoRequest(
  payload: DemoRequestPayload,
): Promise<{ id: string }> {
  return request<{ id: string }>("/public/demo-requests", { method: "POST", body: payload });
}
// ── Brochure proxy URL ───────────────────────────────────────────────────────
/**
 * Build a clean brochure download URL that proxies through our backend.
 * The PDF is streamed from Cloudinary server-side so the user never sees
 * the raw Cloudinary URL in their browser.
 *
 * Always built from the browser-visible base URL — this link is followed by
 * the visitor's browser, not by the Next.js server.
 */
export function brochureDownloadUrl(courseSlug: string): string {
  return `${PUBLIC_API_BASE_URL}/public/brochures/${encodeURIComponent(courseSlug)}/download`;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
