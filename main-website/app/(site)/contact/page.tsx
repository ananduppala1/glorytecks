import type { Metadata } from "next";
import ContactView from "@/components/views/ContactView";
import { JsonLd } from "@/components/seo/JsonLd";
import { staticPageMetadata, breadcrumbSchema, staticRoute } from "@/lib/seo";
import { webPageSchema } from "@/lib/schema";

// Title, description, canonical and indexability all come from the
// route registry in lib/seo/routes.ts, which is also what the sitemap and the
// indexability matrix read — so the three cannot drift apart.
export const metadata: Metadata = staticPageMetadata("/contact");

const route = staticRoute("/contact");


/**
 * The course dropdown and every contact detail come from the site-data context
 * the layout already loaded, so this page needs no fetch of its own.
 */
export default function ContactPage() {
  return (
    <>
      <JsonLd schema={[webPageSchema({
          path: route.path,
          name: route.title,
          description: route.description,
          type: "ContactPage",
        }), breadcrumbSchema([{ name: "Contact", url: "/contact" }])]} />
      <ContactView />
    </>
  );
}
