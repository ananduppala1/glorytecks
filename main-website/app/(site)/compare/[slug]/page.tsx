import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ComparisonView from "@/components/views/ComparisonView";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, breadcrumbSchema, SITE_URL } from "@/lib/seo";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";
import { ApiError } from "@/lib/api/client";
import type { Comparison } from "@/types/content";

type Params = Promise<{ slug: string }>;

async function getComparison(slug: string): Promise<Comparison | null> {
  try {
    return await api.fetchComparison(slug);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) return null;
    throw err;
  }
}

export async function generateStaticParams() {
  const comparisons = await safe(() => api.fetchComparisons(), [], "compare:staticParams");
  return comparisons.map((c) => ({ slug: c.slug }));
}

/** Meta description = the intro, truncated to 160 chars, as in the React app. */
const describe = (intro: string) => (intro.length > 160 ? `${intro.slice(0, 157)}...` : intro);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const cmp = await getComparison(slug);

  if (!cmp) {
    return buildMetadata({
      title: "Comparison | GloryTecks Hyderabad",
      description: "Side-by-side course and tool comparisons from GloryTecks Hyderabad.",
      canonical: "/compare",
      noindex: true,
    });
  }

  return buildMetadata({
    title: cmp.metaTitle || cmp.title,
    description:
      describe(cmp.intro ?? "") ||
      "Side-by-side course and tool comparisons from GloryTecks Hyderabad.",
    canonical: `/compare/${cmp.slug}`,
    keywords: `${cmp.itemA} vs ${cmp.itemB}, ${cmp.itemA.toLowerCase()} or ${cmp.itemB.toLowerCase()}, ${cmp.itemA.toLowerCase()} vs ${cmp.itemB.toLowerCase()} hyderabad`,
  });
}

export default async function ComparisonPage({ params }: { params: Params }) {
  const { slug } = await params;

  const [cmp, allComparisons] = await Promise.all([
    getComparison(slug),
    safe(() => api.fetchComparisons(), [], "compare:related"),
  ]);

  if (!cmp) notFound();

  const canonical = `/compare/${cmp.slug}`;
  const description = describe(cmp.intro ?? "");

  const crumbs = [
    { name: "Compare", url: "/compare" },
    { name: `${cmp.itemA} vs ${cmp.itemB}`, url: canonical },
  ];

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: cmp.title,
    description,
    about: [
      { "@type": "Thing", name: cmp.itemA },
      { "@type": "Thing", name: cmp.itemB },
    ],
    author: { "@type": "Organization", name: "GloryTecks" },
    publisher: {
      "@type": "Organization",
      name: "GloryTecks",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${canonical}` },
  };

  // Only emit FAQPage when the comparison actually has FAQs on the page —
  // schema without matching visible content is a rich-results violation.
  const faqSchema = cmp.faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: cmp.faqs.map(([q, a]) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      }
    : null;

  return (
    <>
      <JsonLd schema={[articleSchema, ...(faqSchema ? [faqSchema] : []), breadcrumbSchema(crumbs)]} />
      <Breadcrumbs items={crumbs} />
      <ComparisonView cmp={cmp} allComparisons={allComparisons} />
    </>
  );
}
