import type { Metadata } from "next";
import NotFoundView from "@/components/views/NotFoundView";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "404 — Page Not Found | GloryTecks Hyderabad",
  description:
    "Page not found. Return to GloryTecks — Hyderabad's best IT training institute for Data Science, AI, Python, Power BI, MLOps and more courses.",
  noindex: true,
});

/**
 * Global 404 — rendered without the header/footer, matching the React app's
 * `path="*"` route which sat outside <Layout />. Unlike the SPA it now returns
 * a real HTTP 404 status, so crawlers stop treating missing URLs as live pages.
 */
export default function NotFound() {
  return <NotFoundView />;
}
