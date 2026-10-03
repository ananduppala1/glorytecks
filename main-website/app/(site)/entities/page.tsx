import type { Metadata } from "next";
import EntitiesView from "@/components/views/EntitiesView";
import { JsonLd } from "@/components/seo/JsonLd";
import { staticPageMetadata, breadcrumbSchema } from "@/lib/seo";

/**
 * The React page had no useSEO() call, so it inherited index.html's homepage
 * title and description on every visit — a duplicate-title issue across the
 * whole site. Giving it its own metadata is the minimum correct behaviour;
 * the copy is taken from the page's existing visible content, not invented.
 */
// Title, description, canonical and indexability all come from the
// route registry in lib/seo/routes.ts, which is also what the sitemap and the
// indexability matrix read — so the three cannot drift apart.
export const metadata: Metadata = staticPageMetadata("/entities");

export default function EntitiesPage() {
  return (
    <>
      <JsonLd schema={breadcrumbSchema([{ name: "Our Entities", url: "/entities" }])} />
      <EntitiesView />
    </>
  );
}
