import type { Metadata } from "next";
import PlacementsView from "@/components/views/PlacementsView";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, breadcrumbSchema, SITE_URL } from "@/lib/seo";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

export const metadata: Metadata = buildMetadata({
  title: "Placements at GloryTecks | 95% Placement Rate | 500+ Hiring Partners in Hyderabad",
  description:
    "GloryTecks has a 95% placement rate with 3000+ students placed at Google, Amazon, Microsoft, Infosys, TCS, Wipro & 500+ hiring partners. Salary packages up to 22 LPA. 100% placement assistance for Data Science, AI, Python, Power BI, MLOps courses in Hyderabad.",
  canonical: "/placements",
  keywords:
    "GloryTecks placements, IT placement training Hyderabad, data science placement Hyderabad, AI job placement Hyderabad, 100% placement IT course Hyderabad, software training with placement Hyderabad, GloryTecks placement record, best placement institute Hyderabad, interview preparation Hyderabad",
});

const placementsSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${SITE_URL}/placements#webpage`,
  url: `${SITE_URL}/placements`,
  name: "Placements at GloryTecks — 95% Placement Rate | Hyderabad",
  description:
    "GloryTecks placement record: 3000+ students placed, 95% placement rate, 500+ hiring partners, salary up to 22 LPA in Hyderabad.",
  isPartOf: { "@id": `${SITE_URL}/#website` },
};

export default async function PlacementsPage() {
  const [settings, companies, placements] = await Promise.all([
    safe(() => api.fetchSettings(), null, "placements:settings"),
    safe(() => api.fetchCompanies(), [], "placements:companies"),
    safe(() => api.fetchPlacements(), [], "placements:stories"),
  ]);

  return (
    <>
      <JsonLd
        schema={[placementsSchema, breadcrumbSchema([{ name: "Placements", url: "/placements" }])]}
      />
      <PlacementsView settings={settings} companies={companies} placements={placements} />
    </>
  );
}
