import type { Metadata } from "next";
import AboutView from "@/components/views/AboutView";
import { JsonLd } from "@/components/seo/JsonLd";
import { staticPageMetadata, breadcrumbSchema, staticRoute } from "@/lib/seo";
import { webPageSchema } from "@/lib/schema";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

// Title, description, canonical and indexability all come from the
// route registry in lib/seo/routes.ts, which is also what the sitemap and the
// indexability matrix read — so the three cannot drift apart.
export const metadata: Metadata = staticPageMetadata("/about");

const route = staticRoute("/about");


export default async function AboutPage() {
  const about = await safe(() => api.fetchAbout(), null, "about:content");

  return (
    <>
      <JsonLd schema={[webPageSchema({
          path: route.path,
          name: route.title,
          description: route.description,
          type: "AboutPage",
        }), breadcrumbSchema([{ name: "About", url: "/about" }])]} />
      <AboutView about={about} />
    </>
  );
}
