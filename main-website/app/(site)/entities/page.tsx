import type { Metadata } from "next";
import EntitiesView from "@/components/views/EntitiesView";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";

/**
 * The React page had no useSEO() call, so it inherited index.html's homepage
 * title and description on every visit — a duplicate-title issue across the
 * whole site. Giving it its own metadata is the minimum correct behaviour;
 * the copy is taken from the page's existing visible content, not invented.
 */
export const metadata: Metadata = buildMetadata({
  title: "Our Entities | GloryTecks — Academy, Labs, Careers, Enterprise & Foundation",
  description:
    "The GloryTecks family of brands: GloryTecks Academy, Labs, Careers, Enterprise, Foundation and Global — building the future of technology education and careers from Hyderabad.",
  canonical: "/entities",
});

export default function EntitiesPage() {
  return (
    <>
      <JsonLd schema={breadcrumbSchema([{ name: "Our Entities", url: "/entities" }])} />
      <EntitiesView />
    </>
  );
}
