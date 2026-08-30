// Lightweight, SSR-safe wrappers around the gtag.js instance loaded in index.html.
type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
  }
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}

/** Fire a GA4 `generate_lead` conversion. `method` = contact_form | whatsapp | call | demo */
export function trackLead(method: string, extra: Record<string, unknown> = {}) {
  trackEvent("generate_lead", { method, ...extra });
}
