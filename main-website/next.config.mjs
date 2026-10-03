/** @type {import('next').NextConfig} */

/**
 * Hosts allowed to serve images through next/image.
 *
 * Cloudinary remains the image store for the platform — the backend returns
 * Cloudinary secure URLs and this migration does not touch that infrastructure.
 * Extra hosts can be added at deploy time via NEXT_PUBLIC_IMAGE_HOSTS
 * (comma-separated) without a code change.
 *
 * Kept in sync with lib/images.ts, which decides at render time whether a URL
 * can be optimised or must fall back to a plain <img>.
 */
const imageHosts = [
  'res.cloudinary.com',
  ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean),
];

// Ported verbatim from the React app's vercel.json so the security posture is
// unchanged. `connect-src` additionally allows the configured backend origin.
const backendOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api/v1').origin;
  } catch {
    return '';
  }
})();

// NOTE ON `script-src`:
//   'unsafe-inline' and 'unsafe-eval' remain below because Next.js emits an
//   inline bootstrap script and Google Tag Manager evaluates its container at
//   runtime. Removing them requires per-request nonces from a middleware, which
//   is an architectural change rather than a config edit — it is recorded as an
//   accepted risk with a defined next step, not silently tolerated. Every other
//   directive is tightened to compensate.
const csp = [
  "default-src 'self'",
  `connect-src 'self' ${backendOrigin} https://glorytecks-backend.vercel.app https://backendforglory-production.up.railway.app https://wa.me https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://stats.g.doubleclick.net https://region1.google-analytics.com`,
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://maps.google.com https://maps.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com https://tagmanager.google.com https://*.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://tagmanager.google.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  'frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com https://maps.google.com https://www.googletagmanager.com',
  "base-uri 'self'",
  "form-action 'self'",
  // No plugin content at all: <object>/<embed> are a script-execution route
  // that nothing on this site uses.
  "object-src 'none'",
  // The CSP-level equivalent of the X-Frame-Options header below, which modern
  // browsers prefer.
  "frame-ancestors 'self'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: csp },
];

/** Vercel's deployment and alias hosts — never the canonical copy of the site. */
export const VERCEL_APP_HOST = '.*\\.vercel\\.app';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    remotePatterns: imageHosts.map((hostname) => ({ protocol: 'https', hostname })),
    formats: ['image/avif', 'image/webp'],
  },
  devIndicators: false,

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/brochures/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, immutable' }],
      },
      // Keep every *.vercel.app host out of the index, whatever
      // NEXT_PUBLIC_SITE_URL says. robots.ts already disallows a build whose
      // origin is not production, but the production deployment's own alias
      // (e.g. glorytecks-psi.vercel.app) is built WITH the production origin,
      // so it would otherwise be a public, crawlable mirror of the site held
      // back only by its canonicals.
      //
      // Next compiles a host condition to `^value$` against the lower-cased
      // hostname, so this cannot match glorytecks.com or www.glorytecks.com.
      // lib/seo/crawl.test.ts pins that.
      {
        source: '/:path*',
        has: [{ type: 'host', value: VERCEL_APP_HOST }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
    ];
  },

  // See docs/SEO_REDIRECT_MAP.md for the evidence behind every entry.
  // `permanent: true` emits HTTP 308, which preserves SEO equity exactly as a
  // 301 does while also preserving the request method.
  async redirects() {
    return [
      // Legacy URL from the pre-React static site, carried over from vercel.json.
      { source: '/data-science-course', destination: '/courses/data-science', permanent: true },

      // The four sitemap URLs the React app published and that are already
      // submitted to Search Console (docs/MIGRATION.md §6). The sitemap
      // architecture moved to one index with per-type children, so these are
      // redirected to their exact new equivalent rather than 404'd.
      { source: '/sitemap-index.xml', destination: '/sitemap.xml', permanent: true },
      { source: '/blog-sitemap.xml', destination: '/sitemaps/blog.xml', permanent: true },
      { source: '/category-sitemap.xml', destination: '/sitemaps/categories.xml', permanent: true },
      // No image sitemap replaces this one: the covers it listed are inline
      // SVGs rendered by BlogCover and were never on the pages. The blog
      // sitemap is the closest surviving equivalent — same URL set, no
      // phantom images.
      { source: '/image-sitemap.xml', destination: '/sitemaps/blog.xml', permanent: true },

      // ── Merged blog articles ────────────────────────────────────────────
      // Five interview articles were cross-posted into two categories each,
      // with identical titles AND identical excerpts. The copy in the topic
      // category is kept; the duplicate redirects to it.
      //
      // This list is mirrored by MERGED_ARTICLES in lib/blog/merged.ts, which
      // is what keeps these URLs out of the sitemap and is the source the
      // content docs describe. `lib/blog/merged.test.ts` reads THIS FILE and
      // fails if the two ever disagree.
      //
      // See docs/BLOG_CONTENT_ACTION_PLAN.md §2.2.
      {
        source: '/blog/aws-interview-questions-for-data-engineers-2',
        destination: '/blog/aws-interview-questions-for-data-engineers',
        permanent: true,
      },
      {
        source: '/blog/data-engineering-interview-questions-and-answers-2',
        destination: '/blog/data-engineering-interview-questions-and-answers',
        permanent: true,
      },
      {
        source: '/blog/data-analyst-interview-questions-and-answers-2',
        destination: '/blog/data-analyst-interview-questions-and-answers',
        permanent: true,
      },
      {
        source: '/blog/gcp-interview-questions-for-data-engineers-2',
        destination: '/blog/gcp-interview-questions-for-data-engineers',
        permanent: true,
      },
      {
        source: '/blog/mlops-interview-questions-and-answers-2',
        destination: '/blog/mlops-interview-questions-and-answers',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
