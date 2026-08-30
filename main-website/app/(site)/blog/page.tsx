import type { Metadata } from "next";
import BlogArchive, { fetchArchivePage, parseArchiveParams } from "@/components/blog/BlogArchive";
import { JsonLd, PaginationLinks } from "@/components/seo/JsonLd";
import { buildMetadata, breadcrumbSchema, paginationSeo, absoluteUrl, SITE_URL } from "@/lib/seo";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = parseArchiveParams(await searchParams);

  // One extra request so the title and rel=next reflect the real page count.
  // It hits Next's fetch cache alongside the identical call in the page body,
  // so it does NOT double the load on the backend.
  const { meta } = await fetchArchivePage(params);
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const currentPage = Math.min(params.page, totalPages);

  const { canonical, prevUrl, nextUrl, pageSuffix } = paginationSeo("/blog", currentPage, totalPages);

  return buildMetadata({
    title: `Blog${pageSuffix} | GloryTecks — Data Science, AI, Python & Cloud Career Guides Hyderabad`,
    description:
      "Free expert guides, roadmaps, tutorials, salary insights and interview questions across Data Science, Generative AI, Python, Power BI, MLOps, Data Engineering, AWS, GCP, Azure and more. Hyderabad IT career resources from GloryTecks.",
    canonical,
    keywords:
      "data science blog Hyderabad, generative AI guide, python tutorial, power BI tips, MLOps, data engineering, AWS, GCP, Azure data factory, IT interview questions Hyderabad, GloryTecks blog",
    prevUrl,
    nextUrl,
  });
}

export default async function BlogIndexPage({ searchParams }: { searchParams: SearchParams }) {
  const params = parseArchiveParams(await searchParams);
  const showStrips = !params.q && !params.tag;

  // One page of six posts — never the whole archive. The featured and trending
  // strips are two more tiny server-filtered queries, exactly as the React app
  // requested them, and only on the unfiltered view.
  const [page, featured, trending, categories] = await Promise.all([
    fetchArchivePage(params),
    showStrips
      ? safe(
          async () => (await api.fetchBlogs({ featured: true, limit: 3, sort: "-date" })).items,
          [],
          "blog:featured",
        )
      : Promise.resolve([]),
    showStrips
      ? safe(
          async () => (await api.fetchBlogs({ trending: true, limit: 4, sort: "-date" })).items,
          [],
          "blog:trending",
        )
      : Promise.resolve([]),
    safe(() => api.fetchCategories(), [], "blog:categories"),
  ]);

  const totalPages = Math.max(1, page.meta?.totalPages ?? 1);
  const currentPage = Math.min(params.page, totalPages);
  const { prevUrl, nextUrl } = paginationSeo("/blog", currentPage, totalPages);

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE_URL}/blog#webpage`,
    url: `${SITE_URL}/blog`,
    name: "GloryTecks Blog — Data Science, AI, Python & Cloud Career Guides",
    description:
      "Free IT career guides, tutorials, and interview preparation resources from GloryTecks Hyderabad.",
    publisher: { "@id": `${SITE_URL}/#organization` },
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };

  return (
    <>
      <JsonLd schema={[blogSchema, breadcrumbSchema([{ name: "Blog", url: "/blog" }])]} />
      <PaginationLinks
        prev={prevUrl ? absoluteUrl(prevUrl) : undefined}
        next={nextUrl ? absoluteUrl(nextUrl) : undefined}
      />
      <BlogArchive
        params={params}
        basePath="/blog"
        categories={categories}
        posts={page.items}
        totalPosts={page.meta?.total ?? page.items.length}
        totalPages={totalPages}
        currentPage={currentPage}
        failed={page.failed}
        featured={featured}
        trending={trending}
      />
    </>
  );
}
