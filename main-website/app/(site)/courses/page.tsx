import type { Metadata } from "next";
import CoursesView from "@/components/views/CoursesView";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, breadcrumbSchema, SITE_URL } from "@/lib/seo";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

export const metadata: Metadata = buildMetadata({
  title: "All IT Courses in Hyderabad | GloryTecks — Data Science, AI, Python, Power BI, MLOps",
  description:
    "Browse all IT training courses at GloryTecks Hyderabad. Data Science, Generative AI, Agentic AI, MLOps, Python, Power BI, Data Analytics, Data Engineering & SQL Server — all with 100% placement support. Best software courses near Ameerpet & Kukatpally.",
  canonical: "/courses",
  keywords:
    "IT courses Hyderabad, data science course Hyderabad, generative AI course Hyderabad, agentic AI course Hyderabad, MLOps course Hyderabad, python course Hyderabad, power BI course Hyderabad, data engineering course Hyderabad, data analytics course Hyderabad, SQL server course Hyderabad, machine learning course Hyderabad, software courses Hyderabad, best IT courses Ameerpet, job oriented courses Hyderabad",
});

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${SITE_URL}/courses#webpage`,
  url: `${SITE_URL}/courses`,
  name: "All IT Training Courses in Hyderabad | GloryTecks",
  description:
    "Complete catalog of IT training courses at GloryTecks Hyderabad including Data Science, AI, Python, Power BI, MLOps, and more.",
  isPartOf: { "@id": `${SITE_URL}/#website` },
};

export default async function CoursesPage() {
  const courses = await safe(() => api.fetchCourses(), [], "courses:list");

  return (
    <>
      <JsonLd schema={[collectionSchema, breadcrumbSchema([{ name: "Courses", url: "/courses" }])]} />
      <CoursesView courses={courses} />
    </>
  );
}
