import type { Metadata } from "next";
import ResourcesView from "@/components/views/ResourcesView";
import { JsonLd } from "@/components/seo/JsonLd";
import { staticPageMetadata, breadcrumbSchema } from "@/lib/seo";

// Title, description, canonical and indexability all come from the
// route registry in lib/seo/routes.ts, which is also what the sitemap and the
// indexability matrix read — so the three cannot drift apart.
export const metadata: Metadata = staticPageMetadata("/resources");

export default function ResourcesPage() {
  return (
    <>
      <JsonLd schema={breadcrumbSchema([{ name: "Resources", url: "/resources" }])} />
      <ResourcesView />
    </>
  );
}
