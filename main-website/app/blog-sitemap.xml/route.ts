import { SITE_URL } from "@/lib/seo";
import {
  fetchAllBlogPosts,
  isoDate,
  xmlEscape,
  xmlResponse,
} from "@/lib/sitemap-data";

// Next requires route-segment config to be a statically analysable literal, so
// this cannot import SITEMAP_REVALIDATE. Keep the two in step (1 hour).
export const revalidate = 3600;

/**
 * /blog-sitemap.xml — every published post, with its cover image.
 *
 * Same URL and same shape as the file the React app shipped in /public, but
 * built from the live archive instead of a snapshot that was last regenerated
 * by hand. The archive is walked at the backend's own 24-item page cap.
 */
export async function GET() {
  const posts = await fetchAllBlogPosts();

  const urls = posts
    .map((p) => {
      const loc = `${SITE_URL}/blog/${p.slug}`;
      const image = `${SITE_URL}/blog-assets/${p.categorySlug}-cover.svg`;
      return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${isoDate(p.updated || p.date)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <image:image>
      <image:loc>${xmlEscape(image)}</image:loc>
      <image:title>${xmlEscape(p.title)}</image:title>
    </image:image>
  </url>`;
    })
    .join("\n");

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`);
}
