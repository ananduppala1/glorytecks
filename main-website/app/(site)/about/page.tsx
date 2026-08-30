import type { Metadata } from "next";
import AboutView from "@/components/views/AboutView";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, breadcrumbSchema, SITE_URL } from "@/lib/seo";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

export const metadata: Metadata = buildMetadata({
  title: "About GloryTecks | Best IT Training Institute in Hyderabad | Data Science & AI Experts",
  description:
    "Learn about GloryTecks — Hyderabad's top IT training institute at Ameerpet with 10+ expert mentors, real-time projects, 3000+ students placed, and 100% placement support for Data Science, AI, Python, Power BI & more courses.",
  canonical: "/about",
  keywords:
    "about GloryTecks, GloryTecks Hyderabad, best IT training institute Hyderabad, IT training institute Ameerpet, data science institute Hyderabad, AI training Hyderabad, software training Hyderabad, placement training Hyderabad",
});

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${SITE_URL}/about#webpage`,
  url: `${SITE_URL}/about`,
  name: "About GloryTecks | Best IT Training Institute in Hyderabad",
  description:
    "GloryTecks is Hyderabad's leading IT training institute specializing in Data Science, Generative AI, Agentic AI, Python, Power BI, MLOps, and Data Engineering.",
  isPartOf: { "@id": `${SITE_URL}/#website` },
};

export default async function AboutPage() {
  const about = await safe(() => api.fetchAbout(), null, "about:content");

  return (
    <>
      <JsonLd schema={[aboutSchema, breadcrumbSchema([{ name: "About", url: "/about" }])]} />
      <AboutView about={about} />
    </>
  );
}
