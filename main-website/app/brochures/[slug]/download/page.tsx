import type { Metadata } from "next";
import BrochureDownloadView from "@/components/views/BrochureDownloadView";

type Params = Promise<{ slug: string }>;

/**
 * Brochure hand-off page, mounted outside the site chrome exactly as the React
 * route was (it rendered without header/footer).
 *
 * The PDF still streams from the backend's Cloudinary proxy, so the visitor
 * never sees a Cloudinary URL and the image/file infrastructure is untouched.
 * Fetching stays client-side on purpose: the browser must receive the blob to
 * open it, and proxying a multi-megabyte PDF through the Next.js server would
 * add a hop for no benefit.
 */
export const metadata: Metadata = {
  title: "Downloading brochure… | GloryTecks",
  robots: { index: false, follow: false },
};

export default async function BrochureDownloadPage({ params }: { params: Params }) {
  const { slug } = await params;
  return <BrochureDownloadView slug={slug} />;
}
