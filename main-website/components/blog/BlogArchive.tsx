import Link from 'next/link';
import { Sparkles, Flame, LayoutGrid, Search, TrendingUp, BookOpen, Tag, X } from 'lucide-react';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogPagination } from '@/components/blog/BlogPagination';
import { BlogToolbar } from '@/components/blog/BlogToolbar';
import { ErrorState } from '@/components/common/states';
import { safe } from '@/lib/site-data';
import * as api from '@/lib/api/services';
import type { BlogPost, CategoryKnowledge } from '@/types/content';

/** Professional pagination: 6 articles per page — unchanged from the React app. */
export const PAGE_SIZE = 6;

export type SortKey = 'latest' | 'popular';

export interface BlogArchiveParams {
  page: number;
  q: string;
  tag: string;
  sort: SortKey;
}

/**
 * Normalise the URL search params into the shape the backend expects.
 * `page` is clamped to a sane positive integer so a hand-edited URL cannot ask
 * the backend for page -3.
 */
export function parseArchiveParams(sp: Record<string, string | string[] | undefined>): BlogArchiveParams {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const rawPage = parseInt(one(sp.page) || '1', 10);
  return {
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
    q: one(sp.q).trim(),
    tag: one(sp.tag).trim(),
    sort: one(sp.sort) === 'popular' ? 'popular' : 'latest',
  };
}

/** The exact backend query the archive issues — shared with generateMetadata. */
export function archiveQuery(params: BlogArchiveParams, categorySlug?: string) {
  return {
    page: params.page,
    limit: PAGE_SIZE,
    sort: params.sort === 'popular' ? '-popular,-trending,-date' : '-date',
    categorySlug: categorySlug || undefined,
    tag: params.tag || undefined,
    q: params.q || undefined,
  };
}

export async function fetchArchivePage(params: BlogArchiveParams, categorySlug?: string) {
  return safe(
    async () => ({ ...(await api.fetchBlogs(archiveQuery(params, categorySlug))), failed: false }),
    { items: [] as BlogPost[], meta: undefined, failed: true },
    'blog:archive',
  );
}

/** Build a shareable URL for a page, preserving the active search / tag / sort. */
export function buildArchiveUrl(basePath: string, params: BlogArchiveParams, page: number) {
  const usp = new URLSearchParams();
  if (params.q) usp.set('q', params.q);
  if (params.tag) usp.set('tag', params.tag);
  if (params.sort === 'popular') usp.set('sort', 'popular');
  if (page > 1) usp.set('page', String(page));
  const qs = usp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

interface BlogArchiveProps {
  params: BlogArchiveParams;
  basePath: string;
  categories: CategoryKnowledge[];
  activeCategory?: CategoryKnowledge;
  posts: BlogPost[];
  totalPosts: number;
  totalPages: number;
  currentPage: number;
  failed: boolean;
  featured: BlogPost[];
  trending: BlogPost[];
}

/**
 * The blog archive, shared by `/blog` and `/blog/category/[categorySlug]`.
 *
 * Everything except the toolbar is a Server Component: the grid, the featured
 * and trending strips, the counts and the pagination are all rendered from data
 * the server already has. Pagination and filtering remain strictly server-side
 * — one page of six posts per request, never the whole archive — matching the
 * backend's `page`/`limit` contract and its 24-item hard cap.
 */
export function BlogArchive({
  params,
  basePath,
  categories,
  activeCategory,
  posts,
  totalPosts,
  totalPages,
  currentPage,
  failed,
  featured,
  trending,
}: BlogArchiveProps) {
  const isCategoryView = Boolean(activeCategory);
  const hasActiveFilter = Boolean(params.q || params.tag);
  const showStrips = !isCategoryView && !hasActiveFilter;

  const sortUrl = (s: SortKey) => {
    const usp = new URLSearchParams();
    if (params.q) usp.set('q', params.q);
    if (params.tag) usp.set('tag', params.tag);
    if (s === 'popular') usp.set('sort', 'popular');
    const qs = usp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const clearTagUrl = (() => {
    const usp = new URLSearchParams();
    if (params.q) usp.set('q', params.q);
    if (params.sort === 'popular') usp.set('sort', 'popular');
    const qs = usp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  })();

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-hero py-14 md:py-16">
        <div className="container-px mx-auto max-w-7xl">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              <BookOpen className="h-3 w-3" />{' '}
              {totalPosts > 0 ? `${totalPosts}+ Free Guides` : 'Free Career Guides'}
            </div>
            {activeCategory ? (
              <>
                <nav
                  className="mb-3 flex items-center justify-center gap-2 text-sm text-muted-foreground"
                  aria-label="Breadcrumb"
                >
                  <Link href="/blog" className="hover:text-primary">
                    Blog
                  </Link>
                  <span aria-hidden="true">/</span>
                  <span className="text-foreground">{activeCategory.name}</span>
                </nav>
                <h1 className="mb-4 text-3xl font-bold md:text-5xl">
                  {activeCategory.name} <span className="gradient-text">Guides &amp; Tutorials</span>
                </h1>
                <p className="mx-auto mb-4 max-w-2xl text-lg text-muted-foreground">
                  {activeCategory.description}
                </p>
              </>
            ) : (
              <>
                <h1 className="mb-4 text-3xl font-bold md:text-5xl">
                  IT Career Guides &amp; <span className="gradient-text">Free Resources</span>
                </h1>
                <p className="mx-auto mb-4 max-w-2xl text-lg text-muted-foreground">
                  Expert roadmaps, tutorials, salary guides and interview prep across Data Science,
                  Generative AI, Python, Cloud &amp; Analytics — written by GloryTecks trainers in
                  Hyderabad.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <BlogToolbar
        categories={categories}
        categorySlug={activeCategory?.slug}
        activeCategoryName={activeCategory?.name}
        initialSearch={params.q}
        sort={params.sort}
        basePath={basePath}
      />

      <section className="container-px mx-auto max-w-7xl py-10">
        {failed ? (
          <ErrorState
            minHeight="40vh"
            message="We couldn't load the articles right now. Please try again."
          />
        ) : (
          <>
            {/* ── Featured (home blog view only) ───────────────────────────── */}
            {showStrips && featured.length > 0 && (
              <div className="mb-12">
                <div className="mb-5 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Featured Guides</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3">
                  {featured.map((post, i) => (
                    <BlogCard key={post.slug} post={post} priority={i === 0} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Trending strip (home blog view only) ─────────────────────── */}
            {showStrips && trending.length > 0 && (
              <div className="mb-12 rounded-2xl border border-border bg-card/40 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">Trending This Week</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {trending.map((post, i) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="group flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3 transition-all hover:border-primary/40"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
                          {post.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {post.category} · {post.readTime}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── Toolbar: count + active tag + sort ───────────────────────── */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <LayoutGrid className="h-4 w-4" />
                <span>
                  {totalPosts} {totalPosts === 1 ? 'article' : 'articles'}
                  {params.q && <> for &ldquo;{params.q}&rdquo;</>}
                  {activeCategory && <> in {activeCategory.name}</>}
                  {totalPages > 1 && (
                    <>
                      {' '}
                      · Page {currentPage} of {totalPages}
                    </>
                  )}
                </span>
                {params.tag && (
                  <Link
                    href={clearTagUrl}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    aria-label={`Remove tag filter ${params.tag}`}
                  >
                    <Tag className="h-3 w-3" /> #{params.tag}
                    <X className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <div
                className="flex items-center gap-1 rounded-lg border border-border bg-card p-1"
                role="group"
                aria-label="Sort articles"
              >
                <Link
                  href={sortUrl('latest')}
                  scroll={false}
                  aria-current={params.sort === 'latest' ? 'true' : undefined}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    params.sort === 'latest'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles className="h-3 w-3" /> Latest
                </Link>
                <Link
                  href={sortUrl('popular')}
                  scroll={false}
                  aria-current={params.sort === 'popular' ? 'true' : undefined}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    params.sort === 'popular'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <TrendingUp className="h-3 w-3" /> Popular
                </Link>
              </div>
            </div>

            {/* ── Grid → pagination ────────────────────────────────────────── */}
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card/40 py-20 text-center">
                <Search className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No articles found
                  {params.q && <> for &ldquo;{params.q}&rdquo;</>}
                  {params.tag && <> tagged &ldquo;#{params.tag}&rdquo;</>}.
                </p>
                {hasActiveFilter && (
                  <Link
                    href={basePath}
                    className="mt-5 inline-flex items-center justify-center rounded-md bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-elegant"
                  >
                    Clear filters
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                  {posts.map((post) => (
                    <BlogCard key={post.slug} post={post} />
                  ))}
                </div>

                <BlogPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  buildPageUrl={(page) => buildArchiveUrl(basePath, params, page)}
                />
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}

export default BlogArchive;
