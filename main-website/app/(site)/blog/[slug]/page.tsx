import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  Clock,
  Calendar,
  Tag,
  GraduationCap,
  Download,
  MessageCircle,
  CalendarCheck,
  ChevronRight,
  Flame,
  Sparkles,
} from 'lucide-react';

import { BlogContent } from '@/components/blog/BlogContent';
import { BlogCover } from '@/components/blog/BlogCover';
import { AuthorAvatar } from '@/components/blog/AuthorAvatar';
import { BlogCard } from '@/components/blog/BlogCard';
import {
  ReadingProgress,
  TableOfContents,
  ShareButtons,
  MobileShareRow,
} from '@/components/blog/BlogPostIslands';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMetadata, notFoundMetadata, breadcrumbSchema, SITE_URL } from '@/lib/seo';
import { SCHEMA_ID, ref } from '@/lib/schema';
import { blogPath, isNoindexArticle } from '@/lib/blog/merged';
import { SalaryDisclosure, hasSalaryContent } from '@/components/blog/SalaryDisclosure';
import { safeUrl } from '@/lib/safeUrl';
import { tableOfContents, estimateReadTime, collectFaq } from '@/lib/blog/blocks';
import { whatsappLink } from '@/lib/contact';
import { safe } from '@/lib/site-data';
import * as api from '@/lib/api/services';
import { ApiError } from '@/lib/api/client';
import type { Block, BlogPost } from '@/types/content';

type Params = Promise<{ slug: string }>;

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    return await api.fetchBlog(slug);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) return null;
    throw err;
  }
}

/**
 * Pre-render the most recent posts at build time and let the rest render on
 * first request, then cache.
 *
 * Deliberately capped: the archive runs to hundreds of posts and the backend
 * caps a page at 24 items, so enumerating everything here would mean dozens of
 * build-time requests for pages that mostly get little traffic. `dynamicParams`
 * (on by default) means any post outside this set still renders and is cached
 * on demand — no 404s, no full-archive fetch.
 */
export async function generateStaticParams() {
  const posts = await safe(
    async () => (await api.fetchBlogs({ limit: 24, sort: '-date' })).items,
    [],
    'blogPost:staticParams',
  );
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  // No canonical on a 404 — see the note in /courses/[slug].
  if (!post) {
    return notFoundMetadata('Blog Post Not Found | GloryTecks', 'This article does not exist.');
  }

  // Articles on the noindex list stay published and crawlable but are held
  // out of the index — the tranche mechanism in docs/BLOG_CONTENT_ACTION_PLAN.md
  // §3. `follow` is kept so their links still flow to the cluster hub.
  const heldBack = isNoindexArticle(post.slug);

  return buildMetadata({
    ...(heldBack ? { index: false, follow: true } : {}),
    title: `${post.title} | GloryTecks Blog`,
    description: post.metaDescription || post.excerpt || 'GloryTecks blog.',
    canonical: `/blog/${post.slug}`,
    ogType: 'article',
    // The post's own featured image when the CMS has one, otherwise the site
    // default. It previously pointed at /blog-assets/{category}-cover.svg,
    // which is wrong twice over: BlogCover renders an inline <svg> and never
    // loads that file, and Facebook, X and LinkedIn all refuse to render an
    // SVG og:image — so every shared article showed no preview at all.
    ogImage: safeUrl(post.featuredImage),
  });
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;

  // Everything the page needs, in parallel. `context` (related + prev/next) is
  // the backend's own endpoint — three indexed queries over ≤14 rows — instead
  // of downloading the archive to compute it in the browser.
  const [post, context, categories, courses, settings, popularData, latestData] = await Promise.all([
    getPost(slug),
    safe(() => api.fetchBlogContext(slug), { related: [], prev: null, next: null }, 'post:context'),
    safe(() => api.fetchCategories(), [], 'post:categories'),
    safe(() => api.fetchCourses(), [], 'post:courses'),
    safe(() => api.fetchSettings(), null, 'post:settings'),
    safe(
      async () => (await api.fetchBlogs({ popular: true, limit: 6, sort: '-date' })).items,
      [],
      'post:popular',
    ),
    safe(async () => (await api.fetchBlogs({ limit: 6, sort: '-date' })).items, [], 'post:latest'),
  ]);

  if (!post) notFound();

  const blocks: Block[] = post.content ?? [];
  const toc = post.toc?.length ? post.toc : tableOfContents(blocks);
  const faqs = post.faqs?.length ? post.faqs : collectFaq(blocks);
  const readTime = post.readTime || (blocks.length ? estimateReadTime(blocks) : '');

  const author = post.author;
  const related = context.related ?? [];
  const prev = context.prev ?? undefined;
  const next = context.next ?? undefined;

  const category = categories.find((c) => c.slug === post.categorySlug);
  const course = category ? courses.find((c) => c.slug === category.courseSlug) : undefined;

  const popular = popularData.filter((b) => b.slug !== slug).slice(0, 5);
  const latest = latestData.filter((b) => b.slug !== slug).slice(0, 5);

  const url = `${SITE_URL}/blog/${post.slug}`;
  const whatsappHref = whatsappLink(settings?.whatsapp ?? '');

  const crumbs = [
    { name: 'Blog', url: '/blog' },
    { name: post.category, url: `/blog/category/${post.categorySlug}` },
    { name: post.title, url: `/blog/${post.slug}` },
  ];

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#blogposting`,
    headline: post.title,
    description: post.metaDescription || post.excerpt,
    image: post.featuredImage ? [post.featuredImage] : undefined,
    url,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    keywords: post.tags.join(', '),
    articleSection: post.category,
    wordCount: blocks
      .map((b) =>
        b.type === 'paragraph'
          ? b.text.split(/\s+/).length
          : b.type === 'list'
            ? b.items.join(' ').split(/\s+/).length
            : 0,
      )
      .reduce((a, c) => a + c, 0),
    inLanguage: 'en-IN',
    // With no named author the post is authored by the organization itself —
    // referenced by @id, not re-described as a second, unlinked Organization.
    author: author
      ? { '@type': 'Person', name: author.name, description: author.role }
      : ref(SCHEMA_ID.organization),
    // One organization node for the whole site; the logo it carries is the
    // real 256x244 logo, not the favicon this used to point at.
    publisher: ref(SCHEMA_ID.organization),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    isPartOf: { '@id': `${SITE_URL}/blog#webpage` },
  };

  const faqSchema = faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

  return (
    <>
      <JsonLd
        schema={[articleSchema, ...(faqSchema ? [faqSchema] : []), breadcrumbSchema(crumbs)]}
      />

      {/* Reading progress — a client island over the server-rendered article. */}
      <ReadingProgress targetId="article-body" />

      {/* Breadcrumb */}
      <div className="border-b border-border bg-background/60">
        <nav className="container-px mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto py-3 text-sm text-muted-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/blog" className="hover:text-primary">
            Blog
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link
            href={`/blog/category/${post.categorySlug}`}
            className="whitespace-nowrap hover:text-primary"
          >
            {post.category}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate text-foreground">{post.title}</span>
        </nav>
      </div>

      <div className="container-px mx-auto max-w-7xl py-8 md:py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
          {/* ── LEFT: TOC + share (sticky) ─────────────────────────────────── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <TableOfContents toc={toc} />
              <ShareButtons title={post.title} url={url} />
            </div>
          </aside>

          {/* ── CENTER: article ────────────────────────────────────────────── */}
          <article id="article-body" className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Link
                href={`/blog/category/${post.categorySlug}`}
                className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {post.category}
              </Link>
              {post.trending && (
                <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <Flame className="h-3 w-3" /> Trending
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>

            {/* Author + meta */}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-border py-4">
              <div className="flex items-center gap-3">
                <AuthorAvatar author={author} size={44} />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {author?.name ?? 'GloryTecks'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {author?.role ?? 'GloryTecks Faculty'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> {fmtDate(post.date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {readTime} read
                </span>
              </div>
            </div>

            {/* Hero cover */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-border">
              <BlogCover
                slug={post.slug}
                categorySlug={post.categorySlug}
                title={post.title}
                featuredImage={post.featuredImage}
                rounded={false}
                priority
                className="aspect-[16/8] w-full"
                categoryColor={category?.color}
                categoryName={category?.name}
              />
            </div>

            {/* Updated note */}
            {post.updated && post.updated !== post.date && (
              <p className="mt-4 text-xs text-muted-foreground">
                Last updated: {fmtDate(post.updated)}
              </p>
            )}

            <MobileShareRow title={post.title} url={url} />

            {/* Body */}
            <div className="mt-8">
              <BlogContent blocks={blocks} />
              {/* Salary figures need a stated year and provenance — see
                  components/blog/SalaryDisclosure.tsx. */}
              {hasSalaryContent(blocks) && <SalaryDisclosure />}
            </div>

            {/* Tags */}
            <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border pt-6">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" /> Tags:
              </span>
              {post.tags.map((t) => (
                <Link
                  key={t}
                  href={`/blog?tag=${encodeURIComponent(t)}`}
                  className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  #{t}
                </Link>
              ))}
            </div>

            {/* Author bio */}
            {author && (
              <div className="mt-8 flex gap-4 rounded-2xl border border-border bg-card/40 p-5">
                <AuthorAvatar author={author} size={52} />
                <div>
                  <p className="font-semibold text-foreground">{author.name}</p>
                  <p className="mb-1 text-xs text-primary">{author.role}</p>
                  {author.bio && <p className="text-sm text-muted-foreground">{author.bio}</p>}
                </div>
              </div>
            )}

            {/* Inline course CTA */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-deep/30 to-primary/10 p-6">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold">Want to master {post.category}?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Join GloryTecks&rsquo; expert-led {course?.title ?? post.category} training in
                    Hyderabad with real-time projects and 100% placement support.
                  </p>
                </div>
                <Button variant="hero" asChild className="shrink-0">
                  <Link href={course ? `/courses/${course.slug}` : '/courses'}>
                    Explore course <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Prev / Next */}
            {(prev || next) && (
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {prev ? (
                  <Link
                    href={blogPath(prev.slug)}
                    className="group rounded-xl border border-border bg-card/40 p-4 transition-all hover:border-primary/40"
                  >
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ArrowLeft className="h-3 w-3" /> Previous
                    </span>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold transition-colors group-hover:text-primary">
                      {prev.title}
                    </p>
                  </Link>
                ) : (
                  <span />
                )}
                {next ? (
                  <Link
                    href={blogPath(next.slug)}
                    className="group rounded-xl border border-border bg-card/40 p-4 text-right transition-all hover:border-primary/40"
                  >
                    <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      Next <ArrowRight className="h-3 w-3" />
                    </span>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold transition-colors group-hover:text-primary">
                      {next.title}
                    </p>
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            )}

            {/* Related */}
            {related.length > 0 && (
              <div className="mt-12">
                <h2 className="mb-5 text-xl font-bold">Related articles</h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((r) => (
                    <BlogCard key={r.slug} post={r} />
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* ── RIGHT: sidebar (sticky) ────────────────────────────────────── */}
          <aside className="lg:block">
            <div className="sticky top-24 space-y-6">
              {/* Recommended course */}
              {course && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                  <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <GraduationCap className="h-4 w-4" /> Recommended course
                  </p>
                  <h3 className="font-bold leading-snug">{course.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{course.tagline}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {course.tools.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="rounded border border-border bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <Button variant="hero" size="sm" asChild className="mt-4 w-full">
                    <Link href={`/courses/${course.slug}`}>
                      View curriculum <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              )}

              {/* CTAs */}
              <div className="space-y-2 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                <p className="mb-1 text-sm font-semibold">Get started with GloryTecks</p>
                <Button variant="hero" size="sm" asChild className="w-full justify-start">
                  <Link href="/contact">
                    <CalendarCheck className="mr-2 h-4 w-4" /> Book a free demo
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="w-full justify-start">
                  <Link href="/contact">
                    <Download className="mr-2 h-4 w-4" /> Download brochure
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="w-full justify-start">
                  <a href={whatsappHref} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" /> Chat on WhatsApp
                  </a>
                </Button>
              </div>

              {/* Popular */}
              {popular.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                  <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Flame className="h-4 w-4" /> Popular posts
                  </p>
                  <ul className="space-y-3">
                    {popular.map((p, i) => (
                      <li key={p.slug}>
                        <Link href={blogPath(p.slug)} className="group flex gap-3">
                          <span className="text-sm font-bold text-primary/70">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="line-clamp-2 text-sm text-muted-foreground transition-colors group-hover:text-primary">
                            {p.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Latest */}
              {latest.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                  <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Sparkles className="h-4 w-4" /> Latest posts
                  </p>
                  <ul className="space-y-3">
                    {latest.map((p) => (
                      <li key={p.slug}>
                        <Link href={blogPath(p.slug)} className="group block">
                          <span className="line-clamp-2 text-sm text-muted-foreground transition-colors group-hover:text-primary">
                            {p.title}
                          </span>
                          <span className="text-xs text-muted-foreground/70">
                            {p.category} · {p.readTime}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
