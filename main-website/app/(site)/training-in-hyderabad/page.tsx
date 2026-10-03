import type { Metadata } from "next";
import LocationView from "@/components/views/LocationView";
import { JsonLd } from "@/components/seo/JsonLd";
import { staticPageMetadata, breadcrumbSchema, staticRoute } from "@/lib/seo";
import { localBusinessSchema, webPageSchema } from "@/lib/schema";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

// Title, description, canonical and indexability all come from the
// route registry in lib/seo/routes.ts, which is also what the sitemap and the
// indexability matrix read — so the three cannot drift apart.
export const metadata: Metadata = staticPageMetadata("/training-in-hyderabad");

const route = staticRoute("/training-in-hyderabad");


export default async function TrainingInHyderabadPage() {
  const courses = await safe(() => api.fetchCourses(), [], "location:courses");

  return (
    <>
      {/*
        This page used to declare its own LocalBusiness object — a fourth node
        describing the same business as the site-wide graph, with its own copy
        of the address, phone, hours and a different set of coordinates. It
        also carried `aggregateRating: 4.9 from 500 reviews`, which is
        self-serving review markup: a rating about the business, published by
        the business, on its own site. Google's policy does not allow that and
        it risks a manual action, so it is gone. Testimonials still render as
        visible content from the CMS.

        The canonical LocalBusiness node now lives in lib/schema.ts, is linked
        to the organization by @id, and is emitted here because this is the
        page that page describes.
      */}
      <JsonLd
        schema={[
          localBusinessSchema(),
          webPageSchema({
            path: route.path,
            name: route.title,
            description: route.description,
          }),
          breadcrumbSchema([{ name: "Training in Ameerpet", url: "/training-in-hyderabad" }]),
        ]}
      />
      <LocationView courses={courses} />
    </>
  );
}
