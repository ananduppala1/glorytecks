import { SITE_URL } from "@/lib/seo";
import { isoDate, xmlEscape, xmlResponse } from "@/lib/sitemap-data";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

// Next requires route-segment config to be a statically analysable literal, so
// this cannot import SITEMAP_REVALIDATE. Keep the two in step (1 hour).
export const revalidate = 3600;

/** /category-sitemap.xml — the blog index plus every category archive. */
export async function GET() {
  const categories = await safe(() => api.fetchCategories(), [], "sitemap:categories");
  const today = isoDate();

  const entries = [
    { loc: `${SITE_URL}/blog`, changefreq: "daily", priority: "0.8" },
    ...categories.map((c) => ({
      loc: `${SITE_URL}/blog/category/${c.slug}`,
      changefreq: "weekly",
      priority: "0.7",
    })),
  ];

  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${xmlEscape(e.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
    )
    .join("\n");

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
}
