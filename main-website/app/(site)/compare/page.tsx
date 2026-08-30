import type { Metadata } from "next";
import ComparisonIndexView from "@/components/views/ComparisonIndexView";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, breadcrumbSchema, SITE_URL } from "@/lib/seo";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

export const metadata: Metadata = buildMetadata({
  title: "Course & Tool Comparisons | Data Science, Power BI, Python | GloryTecks Hyderabad",
  description:
    "Compare data and AI career paths and tools — Power BI vs Tableau, Data Science vs Data Analytics, Python vs R and more — to choose the right course in Hyderabad.",
  canonical: "/compare",
});

export default async function ComparisonIndexPage() {
  const comparisons = await safe(() => api.fetchComparisons(), [], "compare:list");

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "GloryTecks Course & Tool Comparisons",
    itemListElement: comparisons.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${c.itemA} vs ${c.itemB}`,
      url: `${SITE_URL}/compare/${c.slug}`,
    })),
  };

  return (
    <>
      <JsonLd schema={[itemListSchema, breadcrumbSchema([{ name: "Compare", url: "/compare" }])]} />
      <Breadcrumbs items={[{ name: "Compare", url: "/compare" }]} />
      <ComparisonIndexView comparisons={comparisons} />
    </>
  );
}
