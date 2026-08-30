import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt — ported from the React app's static /public/robots.txt.
 *
 * Same allow/disallow rules, same crawl delays, same AI-crawler allowances.
 * Two things changed: the sitemap URLs are derived from NEXT_PUBLIC_SITE_URL
 * so a staging deployment cannot advertise production sitemaps, and the
 * duplicated user-agent blocks in the original file are collapsed.
 *
 * Note the /api/ disallow is retained. It matches nothing on this origin (the
 * backend lives elsewhere), but removing it could un-hide a path if the site is
 * ever proxied, so it stays.
 */
export default function robots(): MetadataRoute.Robots {
  const allowAll = [
    "Googlebot-Image",
    "Googlebot-Video",
    "Twitterbot",
    "facebookexternalhit",
    "LinkedInBot",
    "WhatsApp",
    // AI crawlers — all explicitly allowed in the original file.
    "GPTBot",
    "ChatGPT-User",
    "CCBot",
    "anthropic-ai",
    "Claude-Web",
    "Google-Extended",
    "GoogleOther",
    "Applebot",
    "Applebot-Extended",
    "Amazonbot",
    "meta-externalagent",
    "Bytespider",
    "cohere-ai",
    "PerplexityBot",
    "Perplexity-User",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/api/", crawlDelay: 1 },
      { userAgent: "Googlebot", allow: "/", crawlDelay: 0 },
      { userAgent: "Bingbot", allow: "/", crawlDelay: 1 },
      { userAgent: allowAll, allow: "/" },
    ],
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/sitemap-index.xml`,
      `${SITE_URL}/blog-sitemap.xml`,
      `${SITE_URL}/category-sitemap.xml`,
      `${SITE_URL}/image-sitemap.xml`,
    ],
    host: SITE_URL,
  };
}
