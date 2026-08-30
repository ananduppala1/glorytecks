import type { Metadata } from "next";
import ThankYouView from "@/components/views/ThankYouView";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Thank You | GloryTecks IT Training Institute Hyderabad",
  description: "Thank you for contacting GloryTecks. Our team will reach out shortly.",
  canonical: "/thank-you",
  // Conversion confirmation page — kept out of the index, as before.
  noindex: true,
});

export default function ThankYouPage() {
  return <ThankYouView />;
}
