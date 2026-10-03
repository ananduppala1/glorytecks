import type { Metadata } from "next";
import ComparisonIndexView from "@/components/views/ComparisonIndexView";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { staticPageMetadata, breadcrumbSchema, SITE_URL } from "@/lib/seo";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

// Title, description, canonical and indexability all come from the
// route registry in lib/seo/routes.ts, which is also what the sitemap and the
// indexability matrix read — so the three cannot drift apart.
export const metadata: Metadata = staticPageMetadata("/compare");

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
