import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";

/**
 * Chrome for the main site routes.
 *
 * Equivalent to the React app's <Layout /> route element: skip link, sticky
 * header, <main> landmark and footer. Two behaviours from the original are now
 * handled by the framework instead of by hand:
 *
 *   • Scroll-to-top on navigation — the App Router already resets scroll
 *     position on route change, so the useEffect that did it is gone.
 *   • The <Outlet /> is simply `children`.
 *
 * `/brochures/[slug]/download` and the global 404 deliberately sit outside this
 * group, matching the React routes that lived outside <Layout />.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" itemScope itemType="https://schema.org/WebPage">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-2 focus:left-2 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1 pb-16 lg:pb-0" role="main" itemProp="mainContentOfPage">
        {children}
      </main>
      <Footer />
    </div>
  );
}
