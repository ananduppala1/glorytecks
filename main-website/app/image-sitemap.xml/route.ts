import { SITE_URL } from "@/lib/seo";
import {
  fetchAllBlogPosts,
  xmlEscape,
  xmlResponse,
} from "@/lib/sitemap-data";

// Next requires route-segment config to be a statically analysable literal, so
// this cannot import SITEMAP_REVALIDATE. Keep the two in step (1 hour).
export const revalidate = 3600;

/**
 * /image-sitemap.xml — post cover images.
 *
 * Covers are the per-category SVGs in /public/blog-assets, matching what the
 * BlogCover component renders and what the original image sitemap listed.
 */
export async function GET() {
  const posts = await fetchAllBlogPosts();

  const urls = posts
    .map(
      (p) => `  <url>
    <loc>${xmlEscape(`${SITE_URL}/blog/${p.slug}`)}</loc>
    <image:image>
      <image:loc>${xmlEscape(`${SITE_URL}/blog-assets/${p.categorySlug}-cover.svg`)}</image:loc>
      <image:title>${xmlEscape(p.title)}</image:title>
    </image:image>
  </url>`,
    )
    .join("\n");

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`);
}
