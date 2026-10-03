import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogArchive, { fetchArchivePage, parseArchiveParams } from "@/components/blog/BlogArchive";
import { JsonLd, PaginationLinks } from "@/components/seo/JsonLd";
import {
  buildMetadata,
  notFoundMetadata,
  breadcrumbSchema,
  paginatedTitle,
  absoluteUrl,
  SITE_URL,
} from "@/lib/seo";
import { archiveDecision, isFiltered, paginationNeighbours } from "@/lib/seo/archive";
import { courseForCategory, pillarArticles } from "@/lib/blog/clusters";
import { CourseHubLink, ClusterReading } from "@/components/blog/ClusterLinks";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

type Params = Promise<{ categorySlug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Pre-render every category archive; `/public/categories` enumerates them.
 *
 * `dynamicParams` stays on (the default): categories are CMS rows, and a new
 * one must not 404 until the next deploy.
 */
export async function generateStaticParams() {
  const categories = await safe(() => api.fetchCategories(), [], "blogCategory:staticParams");
  return categories.map((c) => ({ categorySlug: c.slug }));
}

/**
 * Everything both `generateMetadata` and the page body need. The two backend
 * reads are deduplicated by Next's fetch cache within a render pass, so this
 * costs the same as calling it once.
 */
async function resolve(params: Params, searchParams: SearchParams) {
  const { categorySlug } = await params;
  const archiveParams = parseArchiveParams(await searchParams);

  const [categories, page, courses] = await Promise.all([
    safe(() => api.fetchCategories(), [], "blogCategory:categories"),
    fetchArchivePage(archiveParams, categorySlug),
    safe(() => api.fetchCourses(), [], "blogCategory:courses"),
  ]);

  const category = categories.find((c) => c.slug === categorySlug);
  const basePath = category ? `/blog/category/${category.slug}` : `/blog/category/${categorySlug}`;

  // Null on a failed read: an outage must not 404 a real category archive.
  const totalPages = page.failed ? null : Math.max(1, page.meta?.totalPages ?? 1);

  const decision = archiveDecision({
    basePath,
    page: archiveParams.pageParam,
    filters: archiveParams,
    totalPages,
    totalItems: page.failed ? null : page.meta?.total,
  });

  return { archiveParams, categories, category, page, courses, basePath, totalPages, decision };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { category, page, decision } = await resolve(params, searchParams);

  // No canonical on a 404 — pointing an unknown category at /blog would
  // consolidate a missing page onto a live one.
  if (!category) {
    return notFoundMetadata(
      "Category Not Found | GloryTecks Blog",
      "This blog category does not exist.",
    );
  }

  if (decision.status === 404) {
    return buildMetadata({
      title: `Page Not Found | ${category.name} | GloryTecks Blog`,
      description: "This page of the category archive does not exist.",
      index: false,
      follow: true,
    });
  }

  const totalPosts = page.meta?.total ?? 0;
  const title = `${category.name} Blogs & Tutorials${totalPosts ? ` (${totalPosts}+ Guides)` : ""} | GloryTecks Hyderabad`;

  return buildMetadata({
    title: paginatedTitle(title, decision.page),
    description: `${category.description} Browse expert ${category.name} guides, tutorials, roadmaps, salary insights and interview questions from GloryTecks Hyderabad.`,
    // null on a filtered view — see lib/seo/archive.ts.
    canonical: decision.canonical ?? undefined,
    index: decision.index,
    follow: decision.follow,
  });
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { archiveParams, categories, category, page, courses, basePath, totalPages, decision } =
    await resolve(params, searchParams);

  // An unknown category slug is a real 404, not an empty grid rendered with a
  // 200 status the way the React app did it.
  if (!category) notFound();

  // …and so is a page of it that does not exist.
  if (decision.status === 404) notFound();

  const pages = totalPages ?? 1;
  const { prev, next } = paginationNeighbours(
    basePath,
    decision.page,
    pages,
    isFiltered(archiveParams),
  );

  // Cluster wiring: the course this topic supports, and the strongest
  // articles in it. See lib/blog/clusters.ts for the selection rules.
  const course = courseForCategory(category, courses);
  const pillars = pillarArticles(page.items);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}${basePath}#webpage`,
    url: `${SITE_URL}${basePath}`,
    name: `${category.name} Blogs — GloryTecks`,
    description: category.description,
    isPartOf: { "@id": `${SITE_URL}/blog#webpage` },
  };

  return (
    <>
      {/* Emitted only on the real archive, not on a filtered slice of it. */}
      {decision.index && (
        <JsonLd
          schema={[
            collectionSchema,
            breadcrumbSchema([
              { name: "Blog", url: "/blog" },
              { name: category.name, url: basePath },
            ]),
          ]}
        />
      )}
      <PaginationLinks
        prev={prev ? absoluteUrl(prev) : undefined}
        next={next ? absoluteUrl(next) : undefined}
      />
      {/*
        Hub-and-spoke internal linking. Before this, a category archive linked
        to nothing outside the blog: the commercial course page it supports
        received no link from any of the ~50 articles in its topic. The
        category→course mapping is the CMS's own `courseSlug` field, not a
        mapping invented here.

        Only rendered on the clean, indexable archive — a filtered or
        search view is noindex, so spending internal links there would push
        equity into pages that are deliberately out of the index.
      */}
      {decision.index && (course || pillars.length > 0) && (
        <div className="container-px mx-auto max-w-7xl pt-8">
          <div className="grid gap-4 md:grid-cols-2">
            {course && (
              <CourseHubLink
                courseSlug={course.slug}
                courseTitle={course.title}
                categoryName={category.name}
                tagline={course.tagline}
              />
            )}
            <ClusterReading
              title={`Start here in ${category.name}`}
              intro="The most useful guides in this topic, not just the most recent."
              links={pillars}
            />
          </div>
        </div>
      )}
      <BlogArchive
        params={archiveParams}
        basePath={basePath}
        categories={categories}
        activeCategory={category}
        posts={page.items}
        totalPosts={page.meta?.total ?? page.items.length}
        totalPages={pages}
        currentPage={decision.page}
        failed={page.failed}
        featured={[]}
        trending={[]}
      />
    </>
  );
}
