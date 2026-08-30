import type { Metadata } from "next";
import ResourcesView from "@/components/views/ResourcesView";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Free IT Resources & Study Material | GloryTecks Hyderabad | Data Science, AI, Python Guides",
  description:
    "Access free IT learning resources, study materials, course brochures, guides and tutorials from GloryTecks Hyderabad. Data Science, Generative AI, Agentic AI, Python, Power BI, MLOps, Data Engineering and SQL Server study material — all free to download.",
  canonical: "/resources",
  keywords:
    "free IT resources Hyderabad, data science study material, AI learning resources, python tutorial free, power BI guide, MLOps resources, GloryTecks free material, IT course brochure Hyderabad",
});

export default function ResourcesPage() {
  return (
    <>
      <JsonLd schema={breadcrumbSchema([{ name: "Resources", url: "/resources" }])} />
      <ResourcesView />
    </>
  );
}
