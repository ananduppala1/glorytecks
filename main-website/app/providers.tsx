'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import ErrorBoundary from '@/components/ErrorBoundary';
import { SiteDataProvider, type SiteData } from '@/components/site/SiteDataProvider';

/**
 * Client-side providers, mirroring the composition in the React app's App.tsx:
 *
 *   <ErrorBoundary><QueryClientProvider><TooltipProvider>
 *     <Toaster /><Sonner />
 *     …
 *
 * `SiteDataProvider` is new: it carries the server-fetched settings, courses,
 * categories, localities, comparisons and latest posts down to the interactive
 * chrome, so those components render from props instead of fetching.
 *
 * The QueryClient is created inside `useState` so each browser session gets its
 * own instance and it is never shared across requests on the server.
 */
export default function Providers({
  siteData,
  children,
}: {
  siteData: SiteData;
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SiteDataProvider value={siteData}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {children}
          </TooltipProvider>
        </SiteDataProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
