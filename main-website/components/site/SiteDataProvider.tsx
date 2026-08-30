'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Shared site data (settings, courses, categories, localities, comparisons,
// latest posts) for the interactive chrome.
//
// In the React app every one of these was a React Query fetch fired from the
// browser after hydration — the Header alone triggered three (`useCourses`,
// `useLocalities`, `useSettings`), and the Footer three more, on *every* page
// view. Because the header, footer, demo modal and floating CTAs must stay
// client components (menus, modals, scroll listeners), the data is now fetched
// once on the server in the (site) layout and handed down through this context.
//
// Result: identical UI and identical hook call sites, minus ~6 client round
// trips per page load, and the chrome is present in the server-rendered HTML.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { whatsappLink } from '@/lib/contact';
import type {
  BlogPost,
  CategoryKnowledge,
  Comparison,
  Course,
  Locality,
  SiteSettings,
} from '@/types/content';

export interface SiteData {
  settings: SiteSettings | null;
  courses: Course[];
  categories: CategoryKnowledge[];
  localities: Locality[];
  comparisons: Comparison[];
  latestBlogs: BlogPost[];
}

const EMPTY: SiteData = {
  settings: null,
  courses: [],
  categories: [],
  localities: [],
  comparisons: [],
  latestBlogs: [],
};

const SiteDataContext = createContext<SiteData>(EMPTY);

export function SiteDataProvider({ value, children }: { value: SiteData; children: ReactNode }) {
  return <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteData {
  return useContext(SiteDataContext);
}

/* ── Drop-in replacements for the old React Query hooks ───────────────────── */
/* Same names, same call sites — the data just arrives from the server now.   */

export const useSettings = () => useSiteData().settings;
export const useCourses = () => useSiteData().courses;
export const useCategories = () => useSiteData().categories;
export const useLocalities = () => useSiteData().localities;
export const useComparisons = () => useSiteData().comparisons;
export const useLatestBlogs = () => useSiteData().latestBlogs;

export { whatsappLink };

export interface ContactInfo {
  phone: string;
  phoneHref: string;
  whatsapp: string;
  whatsappHref: string;
  email: string;
  emailHref: string;
  address: string;
  mapUrl?: string;
  social: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    twitter?: string;
  };
}

/**
 * Ready-to-use contact values and href strings, driven by the Settings
 * singleton — identical output to the React app's `useContactInfo()`.
 */
export function useContactInfo(): ContactInfo {
  const settings = useSettings();

  return useMemo(() => {
    const phone = settings?.phone ?? '';
    const whatsapp = settings?.whatsapp ?? '';
    const email = settings?.email ?? '';

    return {
      phone,
      phoneHref: phone ? `tel:${phone.replace(/\s+/g, '')}` : '',
      whatsapp,
      whatsappHref: whatsappLink(whatsapp),
      email,
      emailHref: email ? `mailto:${email}` : '',
      address: settings?.address ?? '',
      mapUrl: settings?.mapUrl,
      social: settings?.social ?? {},
    };
  }, [settings]);
}
