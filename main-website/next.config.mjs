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

const csp = [
  "default-src 'self'",
  `connect-src 'self' ${backendOrigin} https://glorytecks-backend.vercel.app https://backendforglory-production.up.railway.app https://wa.me https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://stats.g.doubleclick.net https://region1.google-analytics.com https: wss:`,
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://maps.google.com https://maps.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com https://tagmanager.google.com https://*.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://tagmanager.google.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  'frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com https://maps.google.com https://www.googletagmanager.com',
  "base-uri 'self'",
  "form-action 'self'",
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
    ];
  },

  // Carried over from vercel.json — an already-indexed legacy URL.
  async redirects() {
    return [
      { source: '/data-science-course', destination: '/courses/data-science', permanent: true },
    ];
  },
};

export default nextConfig;
