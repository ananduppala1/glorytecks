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
import { getSiteData } from '@/lib/site-data';
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, TWITTER_HANDLE } from '@/lib/seo';
import {
  organizationSchema,
  localBusinessSchema,
  websiteSchema,
  homeFaqSchema,
} from '@/lib/schema';

const GTM_ID = 'GTM-TD5HFZ79';
const GA_ID = 'G-MKXRJHXL9C';

/**
 * Site-wide defaults. Every page overrides title/description through its own
 * `generateMetadata` — these are the fallbacks and the tags that were static in
 * the React app's index.html.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      'GloryTecks — Best IT Training Institute in Hyderabad | Data Science, AI, Python, Power BI Courses',
    template: '%s',
  },
  description:
    "GloryTecks is Hyderabad's #1 IT training institute at Ameerpet & Kukatpally. Enroll in Data Science, Generative AI, Agentic AI, Python, Power BI, MLOps, SQL Server & Data Engineering courses. 100% placement support, real-time projects, expert mentors. Book a free demo today!",
  keywords:
    'data science training Hyderabad, AI course Hyderabad, python training Hyderabad, power BI training Hyderabad, data engineering course Hyderabad, generative AI course Hyderabad, IT training institute Hyderabad, MLOps course Hyderabad',
  authors: [{ name: 'GloryTecks' }],
  applicationName: 'GloryTecks',
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  alternates: { canonical: '/' },
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
        alt: 'GloryTecks IT Training Institute Hyderabad — Data Science, AI, Python Courses',
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
  // Non-standard tags the React app emitted from index.html, preserved verbatim.
  other: {
    googlebot: 'index, follow',
    bingbot: 'index, follow',
    'revisit-after': '7 days',
    language: 'English',
    category: 'Education, IT Training, Professional Development',
    classification: 'Education',
    coverage: 'Hyderabad, Telangana, India',
    target: 'all',
    HandheldFriendly: 'True',
    MobileOptimized: '320',
    'geo.region': 'IN-TG',
    'geo.placename': 'Ameerpet, Hyderabad, Telangana, India',
    'geo.position': '17.4375;78.4463',
    ICBM: '17.4375, 78.4463',
    'ai-content-declaration': 'human-authored',
    subject: 'IT Training, Data Science, AI, Machine Learning courses in Hyderabad',
    abstract:
      'GloryTecks provides industry-aligned IT training in Data Science, Generative AI, Agentic AI, Python, Power BI, MLOps, SQL Server, and Data Engineering at Ameerpet, Hyderabad with 100% placement support.',
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
    <html lang="en" style={{ background: 'hsl(160 25% 5%)' }}>
      <head>
        {/* Site-wide structured data — previously inline in index.html. */}
        <JsonLd
          schema={[organizationSchema(), localBusinessSchema(), websiteSchema(), homeFaqSchema()]}
        />
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
