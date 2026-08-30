import { SITE_URL } from "@/lib/seo";
import { isoDate, xmlEscape, xmlResponse } from "@/lib/sitemap-data";

// Next requires route-segment config to be a statically analysable literal, so
// this cannot import SITEMAP_REVALIDATE. Keep the two in step (1 hour).
export const revalidate = 3600;

/** /sitemap-index.xml — points at the four sitemaps, as the original did. */
export async function GET() {
  const today = isoDate();

  const sitemaps = [
    `${SITE_URL}/sitemap.xml`,
    `${SITE_URL}/blog-sitemap.xml`,
    `${SITE_URL}/category-sitemap.xml`,
    `${SITE_URL}/image-sitemap.xml`,
  ];

  const body = sitemaps
    .map(
      (loc) => `  <sitemap>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`,
    )
    .join("\n");

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`);
}
