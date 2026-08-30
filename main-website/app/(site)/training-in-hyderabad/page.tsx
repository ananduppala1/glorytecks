import type { Metadata } from "next";
import LocationView from "@/components/views/LocationView";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, breadcrumbSchema, SITE_URL } from "@/lib/seo";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

export const metadata: Metadata = buildMetadata({
  title:
    "GloryTecks Ameerpet Hyderabad | Best IT Training Institute Near Ameerpet Metro | Data Science, AI Courses",
  description:
    "GloryTecks IT training institute at Ameerpet, Hyderabad — just 2 minutes from Ameerpet Metro Station. Best Data Science, Generative AI, Agentic AI, Python, Power BI, MLOps, Data Engineering & SQL Server courses near Ameerpet. 100% placement support. Visit us at 603, Annapurna Block, Aditya Enclave.",
  canonical: "/training-in-hyderabad",
  keywords:
    "GloryTecks Ameerpet, IT training institute Ameerpet Hyderabad, data science training Ameerpet, software courses near Ameerpet metro, best IT institute near Ameerpet, training institute near me Hyderabad, GloryTecks Kukatpally, data science training Hyderabad offline, best training institute near Ameerpet metro, Glorytecks address",
});

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/training-in-hyderabad#localbusiness`,
  name: "GloryTecks IT Training Institute",
  description:
    "Best Data Science, Generative AI, Agentic AI, Python, Power BI, MLOps, Data Analytics, Data Engineering & SQL Server training institute in Ameerpet, Hyderabad with 100% placement support.",
  url: SITE_URL,
  telephone: "+919908099980",
  email: "gloryteckss@gmail.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "603, Annapurna Block, Aditya Enclave",
    addressLocality: "Ameerpet",
    addressRegion: "Telangana",
    postalCode: "500038",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 17.436739241114978,
    longitude: 78.44500078388435,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "08:00",
      closes: "21:00",
    },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "09:00", closes: "17:00" },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "500",
    bestRating: "5",
  },
  hasMap: "https://maps.google.com/?q=Aditya+Enclave+Ameerpet+Hyderabad",
  priceRange: "₹₹",
  areaServed: ["Ameerpet", "Kukatpally", "Hyderabad", "Secunderabad", "Telangana"],
};

export default async function TrainingInHyderabadPage() {
  const courses = await safe(() => api.fetchCourses(), [], "location:courses");

  return (
    <>
      <JsonLd
        schema={[
          localBusinessSchema,
          breadcrumbSchema([{ name: "Training in Hyderabad", url: "/training-in-hyderabad" }]),
        ]}
      />
      <LocationView courses={courses} />
    </>
  );
}
