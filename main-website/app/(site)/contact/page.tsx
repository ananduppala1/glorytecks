import type { Metadata } from "next";
import ContactView from "@/components/views/ContactView";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, breadcrumbSchema, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contact GloryTecks | Enroll in Data Science, AI, Python Courses in Hyderabad | Free Demo",
  description:
    "Contact GloryTecks to enroll in the best IT courses in Hyderabad. Data Science, Generative AI, Agentic AI, Python, Power BI, MLOps, Data Engineering courses at Ameerpet. Free counseling, flexible batches, 100% placement support.",
  canonical: "/contact",
  keywords:
    "contact GloryTecks, GloryTecks contact number, GloryTecks Hyderabad admission, enroll IT course Hyderabad, free demo IT course Hyderabad, GloryTecks Ameerpet address, data science course admission Hyderabad, AI course enroll Hyderabad",
});

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": `${SITE_URL}/contact#webpage`,
  url: `${SITE_URL}/contact`,
  name: "Contact GloryTecks | Enroll in IT Courses Hyderabad",
  isPartOf: { "@id": `${SITE_URL}/#website` },
};

/**
 * The course dropdown and every contact detail come from the site-data context
 * the layout already loaded, so this page needs no fetch of its own.
 */
export default function ContactPage() {
  return (
    <>
      <JsonLd schema={[contactSchema, breadcrumbSchema([{ name: "Contact", url: "/contact" }])]} />
      <ContactView />
    </>
  );
}
