// ─────────────────────────────────────────────────────────────────────────────
// Contact-link helpers.
//
// Plain module with no "use client" directive: `whatsappLink()` is called from
// Server Components (the blog post sidebar builds the WhatsApp CTA on the
// server) as well as from client components. A function exported from a client
// module cannot be invoked on the server — it arrives as an opaque client
// reference — so it lives here and SiteDataProvider re-exports it.
// ─────────────────────────────────────────────────────────────────────────────

/** Build a wa.me link, optionally with a prefilled message. */
export function whatsappLink(number: string, message?: string): string {
  if (!number) return "";
  const base = `https://wa.me/${number.replace(/[^\d]/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
