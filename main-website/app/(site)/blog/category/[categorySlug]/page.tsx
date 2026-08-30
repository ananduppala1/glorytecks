import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogArchive, { fetchArchivePage, parseArchiveParams } from "@/components/blog/BlogArchive";
import { JsonLd, PaginationLinks } from "@/components/seo/JsonLd";
import { buildMetadata, breadcrumbSchema, paginationSeo, absoluteUrl, SITE_URL } from "@/lib/seo";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

type Params = Promise<{ categorySlug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Pre-render every category archive; `/public/categories` enumerates them. */
export async function generateStaticParams() {
  const categories = await safe(() => api.fetchCategories(), [], "blogCategory:staticParams");
  return categories.map((c) => ({ categorySlug: c.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const archiveParams = parseArchiveParams(await searchParams);

  const [categories, page] = await Promise.all([
    safe(() => api.fetchCategories(), [], "blogCategory:meta:categories"),
    fetchArchivePage(archiveParams, categorySlug),
  ]);

  const cat = categories.find((c) => c.slug === categorySlug);
  if (!cat) {
    return buildMetadata({
      title: "Category Not Found | GloryTecks Blog",
      description: "This blog category does not exist.",
      canonical: "/blog",
      noindex: true,
    });
  }

  const totalPosts = page.meta?.total ?? 0;
  const totalPages = Math.max(1, page.meta?.totalPages ?? 1);
  const currentPage = Math.min(archiveParams.page, totalPages);
  const basePath = `/blog/category/${cat.slug}`;
  const { canonical, prevUrl, nextUrl, pageSuffix } = paginationSeo(basePath, currentPage, totalPages);

  return buildMetadata({
    title: `${cat.name} Blogs & Tutorials${totalPosts ? ` (${totalPosts}+ Guides)` : ""}${pageSuffix} | GloryTecks Hyderabad`,
    description: `${cat.description} Browse expert ${cat.name} guides, tutorials, roadmaps, salary insights and interview questions from GloryTecks Hyderabad.`,
    canonical,
    keywords: `${cat.name} blog, ${cat.name} tutorial Hyderabad, ${cat.tools.slice(0, 5).join(", ")}, GloryTecks`,
    prevUrl,
    nextUrl,
  });
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { categorySlug } = await params;
  const archiveParams = parseArchiveParams(await searchParams);

  const [categories, page] = await Promise.all([
    safe(() => api.fetchCategories(), [], "blogCategory:categories"),
    fetchArchivePage(archiveParams, categorySlug),
  ]);

  const cat = categories.find((c) => c.slug === categorySlug);
  // An unknown category slug is a real 404, not an empty grid rendered with a
  // 200 status the way the React app did it.
  if (!cat) notFound();

  const totalPages = Math.max(1, page.meta?.totalPages ?? 1);
  const currentPage = Math.min(archiveParams.page, totalPages);
  const basePath = `/blog/category/${cat.slug}`;
  const { prevUrl, nextUrl } = paginationSeo(basePath, currentPage, totalPages);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}${basePath}#webpage`,
    url: `${SITE_URL}${basePath}`,
    name: `${cat.name} Blogs — GloryTecks`,
    description: cat.description,
    isPartOf: { "@id": `${SITE_URL}/blog#webpage` },
  };

  return (
    <>
      <JsonLd
        schema={[
          collectionSchema,
          breadcrumbSchema([
            { name: "Blog", url: "/blog" },
            { name: cat.name, url: basePath },
          ]),
        ]}
      />
      <PaginationLinks
        prev={prevUrl ? absoluteUrl(prevUrl) : undefined}
        next={nextUrl ? absoluteUrl(nextUrl) : undefined}
      />
      <BlogArchive
        params={archiveParams}
        basePath={basePath}
        categories={categories}
        activeCategory={cat}
        posts={page.items}
        totalPosts={page.meta?.total ?? page.items.length}
        totalPages={totalPages}
        currentPage={currentPage}
        failed={page.failed}
        featured={[]}
        trending={[]}
      />
    </>
  );
}
