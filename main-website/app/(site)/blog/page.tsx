import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogArchive, { fetchArchivePage, parseArchiveParams } from "@/components/blog/BlogArchive";
import { JsonLd, PaginationLinks } from "@/components/seo/JsonLd";
import { buildMetadata, breadcrumbSchema, paginatedTitle, absoluteUrl, SITE_URL, staticRoute } from "@/lib/seo";
import { archiveDecision, isFiltered, paginationNeighbours } from "@/lib/seo/archive";
import { SCHEMA_ID, ref } from "@/lib/schema";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const BASE_PATH = "/blog";
const route = staticRoute(BASE_PATH);

/**
 * One request describes the archive: the page count settles whether the
 * requested page exists, and the filter flags settle whether it may be
 * indexed. It hits Next's fetch cache alongside the identical call in the page
 * body, so it does NOT double the load on the backend.
 */
async function resolve(searchParams: SearchParams) {
  const params = parseArchiveParams(await searchParams);
  const page = await fetchArchivePage(params);

  // `failed` means the backend did not answer. A null totalPages tells the
  // policy to serve page 1's shell rather than 404 the archive during an
  // outage — de-indexing /blog because the API blipped would be far worse
  // than one page of error state.
  const totalPages = page.failed ? null : Math.max(1, page.meta?.totalPages ?? 1);

  const decision = archiveDecision({
    basePath: BASE_PATH,
    page: params.pageParam,
    filters: params,
    totalPages,
    totalItems: page.failed ? null : page.meta?.total,
  });

  return { params, page, totalPages, decision };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { decision } = await resolve(searchParams);

  if (decision.status === 404) {
    // The page itself calls notFound(); this keeps the head of that response
    // consistent — noindex, follow, no canonical.
    return buildMetadata({
      title: "Page Not Found | GloryTecks Blog",
      description: "This page of the blog archive does not exist.",
      index: false,
      follow: true,
    });
  }

  return buildMetadata({
    title: paginatedTitle(route.title, decision.page),
    description: route.description,
    // null on a filtered view: it is already noindex, and a canonical pointing
    // at /blog from a noindex page risks the directive being attributed to
    // /blog itself. See lib/seo/archive.ts.
    canonical: decision.canonical ?? undefined,
    index: decision.index,
    follow: decision.follow,
  });
}

export default async function BlogIndexPage({ searchParams }: { searchParams: SearchParams }) {
  const { params, page, totalPages, decision } = await resolve(searchParams);

  // An out-of-range or malformed ?page= is a real 404, not an empty grid
  // rendered with a 200 status.
  if (decision.status === 404) notFound();

  const showStrips = !isFiltered(params);

  // One page of six posts — never the whole archive. The featured and trending
  // strips are two more tiny server-filtered queries, exactly as the React app
  // requested them, and only on the unfiltered view.
  const [featured, trending, categories] = await Promise.all([
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

  const pages = totalPages ?? 1;
  const { prev, next } = paginationNeighbours(
    BASE_PATH,
    decision.page,
    pages,
    isFiltered(params),
  );

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE_URL}/blog#webpage`,
    url: `${SITE_URL}/blog`,
    name: "GloryTecks Blog — Data Science, AI, Python & Cloud Career Guides",
    description:
      "Free IT career guides, tutorials, and interview preparation resources from GloryTecks Hyderabad.",
    publisher: ref(SCHEMA_ID.organization),
    isPartOf: ref(SCHEMA_ID.website),
  };

  return (
    <>
      {/* Structured data describes the archive, so it is emitted only on the
          real archive — not on a filtered slice of it. */}
      {decision.index && (
        <JsonLd schema={[blogSchema, breadcrumbSchema([{ name: "Blog", url: "/blog" }])]} />
      )}
      <PaginationLinks
        prev={prev ? absoluteUrl(prev) : undefined}
        next={next ? absoluteUrl(next) : undefined}
      />
      <BlogArchive
        params={params}
        basePath={BASE_PATH}
        categories={categories}
        posts={page.items}
        totalPosts={page.meta?.total ?? page.items.length}
        totalPages={pages}
        currentPage={decision.page}
        failed={page.failed}
        featured={featured}
        trending={trending}
      />
    </>
  );
}
