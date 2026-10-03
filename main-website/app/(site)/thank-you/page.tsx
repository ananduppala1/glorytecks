import type { Metadata } from "next";
import ThankYouView from "@/components/views/ThankYouView";
import { staticPageMetadata } from "@/lib/seo";

// Title, description, canonical and indexability all come from the
// route registry in lib/seo/routes.ts, which is also what the sitemap and the
// indexability matrix read — so the three cannot drift apart.
export const metadata: Metadata = staticPageMetadata("/thank-you");

export default function ThankYouPage() {
  return <ThankYouView />;
}
