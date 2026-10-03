import type { Metadata } from "next";
import PlacementsView from "@/components/views/PlacementsView";
import { JsonLd } from "@/components/seo/JsonLd";
import { staticPageMetadata, breadcrumbSchema, staticRoute } from "@/lib/seo";
import { webPageSchema } from "@/lib/schema";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

// Title, description, canonical and indexability all come from the
// route registry in lib/seo/routes.ts, which is also what the sitemap and the
// indexability matrix read — so the three cannot drift apart.
export const metadata: Metadata = staticPageMetadata("/placements");

const route = staticRoute("/placements");


export default async function PlacementsPage() {
  const [settings, companies, placements] = await Promise.all([
    safe(() => api.fetchSettings(), null, "placements:settings"),
    safe(() => api.fetchCompanies(), [], "placements:companies"),
    safe(() => api.fetchPlacements(), [], "placements:stories"),
  ]);

  return (
    <>
      <JsonLd
        schema={[webPageSchema({
          path: route.path,
          name: route.title,
          description: route.description,
        }), breadcrumbSchema([{ name: "Placements", url: "/placements" }])]}
      />
      <PlacementsView settings={settings} companies={companies} placements={placements} />
    </>
  );
}
