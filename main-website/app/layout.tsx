import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

// Self-hosted fonts — removes render-blocking Google Fonts requests.
// Carried over unchanged from the React app's main.tsx.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';

import './globals.css';

import Providers from './providers';
import ExitIntent from '@/components/site/ExitIntent';
import FloatingButtons from '@/components/site/FloatingButtons';
import StickyMobileCTA from '@/components/site/StickyMobileCTA';
import { JsonLd } from '@/components/seo/JsonLd';
import { REVEAL_SCRIPT } from '@/components/ui/reveal';
import { getSiteData } from '@/lib/site-data';
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, TWITTER_HANDLE } from '@/lib/seo';
import { BUSINESS } from '@/config/business';
import { organizationSchema, websiteSchema } from '@/lib/schema';

const GTM_ID = 'GTM-TD5HFZ79';
const GA_ID = 'G-MKXRJHXL9C';

/**
 * Site-wide defaults. Every page overrides title/description through its own
 * `generateMetadata` — these are the fallbacks and the tags that were static in
 * the React app's index.html.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Fallbacks only — every page sets its own from the route registry. The
  // previous defaults led with "Best" and "#1" and promised "100% placement
  // support"; a superlative the business cannot substantiate and an outcome
  // promise are both liabilities in a site-wide default.
  title: {
    default: 'GloryTecks — IT Training Institute in Ameerpet, Hyderabad',
    template: '%s',
  },
  description:
    'GloryTecks is an IT training institute in Ameerpet, Hyderabad, running classroom and live online courses in Data Science, Generative AI, Python, Power BI, MLOps and Data Engineering.',
  authors: [{ name: 'GloryTecks' }],
  applicationName: 'GloryTecks',
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  // No site-wide default canonical. A default of '/' is inherited by any page
  // that ships metadata without an `alternates` key, which would canonicalise
  // that page to the homepage. Every page that should have a canonical sets
  // its own through `buildMetadata`.
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_IN',
    url: SITE_URL,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'GloryTecks IT training institute, Ameerpet, Hyderabad',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
  /**
   * Legacy <meta> tags carried over from the React app's index.html.
   *
   * Most of that block is gone. `revisit-after`, `target`, `HandheldFriendly`,
   * `MobileOptimized`, `classification`, `coverage`, `category`, `language`,
   * `subject` and `abstract` are read by no search engine in use today — they
   * are 1990s-era directives and duplicated description text, and the
   * `abstract` also repeated a "100% placement support" promise.
   *
   * `googlebot` / `bingbot` are dropped too: they restated what the generic
   * `robots` directive above already says, and a per-agent override that
   * disagrees with it is exactly how a page ends up accidentally indexable.
   *
   * What stays: the geo pair, which some local-search tooling still reads, now
   * sourced from config/business.ts instead of a third hardcoded coordinate.
   */
  other: {
    'geo.region': 'IN-TG',
    'geo.placename': 'Ameerpet, Hyderabad, Telangana, India',
    'geo.position': `${BUSINESS.geo.latitude};${BUSINESS.geo.longitude}`,
    ICBM: `${BUSINESS.geo.latitude}, ${BUSINESS.geo.longitude}`,
    'ai-content-declaration': 'human-authored',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: 'hsl(160 25% 5%)',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetched once on the server and shared with every client component that
  // needs it, replacing six per-page-view fetches from the browser.
  const siteData = await getSiteData();

  return (
    // suppressHydrationWarning: REVEAL_SCRIPT adds `reveal-ready` to <html>
    // before React hydrates.
    <html lang="en" style={{ background: 'hsl(160 25% 5%)' }} suppressHydrationWarning>
      <head>
        {/* Scroll-reveal trigger — inline and first in <head> so it is running
            before the first .reveal element is parsed. See ui/reveal.tsx. */}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_SCRIPT }} />
{/*
          Site-wide structured data: the organization and the website, which are
          true on every page.

          LocalBusiness and the homepage FAQPage used to be here too. Both were
          wrong site-wide: the FAQ block is only visible on the homepage, so
          every course, blog and comparison page was publishing FAQ markup for
          questions a visitor could not see there; and LocalBusiness was then
          emitted a second time by /training-in-hyderabad, putting two nodes
          with the same @id on one page. They now render on the pages that
          actually show them.
        */}
        <JsonLd schema={[organizationSchema(), websiteSchema()]} />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>

        <Providers siteData={siteData}>
          {/* Global overlays — rendered on every route, exactly as in App.tsx
              where they sat outside the <Layout> route element. */}
          <ExitIntent />
          {children}
          <FloatingButtons />
          <StickyMobileCTA />
        </Providers>

        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>

        {/* Google tag (gtag.js) */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
        </Script>
      </body>
    </html>
  );
}
