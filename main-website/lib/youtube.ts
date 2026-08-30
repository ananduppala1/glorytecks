// ─────────────────────────────────────────────────────────────────────────────
// Small helper to normalise any YouTube URL (or bare id) into an embeddable id.
// Used so the homepage promo video can be configured from the CMS while keeping
// the exact same embed markup/behaviour the site already uses.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract the 11-character YouTube video id from the common URL shapes:
 *  - https://www.youtube.com/watch?v=ID
 *  - https://youtu.be/ID
 *  - https://www.youtube.com/embed/ID
 *  - https://www.youtube.com/shorts/ID
 *  - a bare ID
 * Returns null when nothing usable is found.
 */
export function youtubeEmbedId(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  // Already a bare id.
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean); // e.g. ["embed", "ID"] or ["shorts", "ID"]
      const last = parts[parts.length - 1];
      if (last && /^[a-zA-Z0-9_-]{11}$/.test(last)) return last;
    }
  } catch {
    // Not a valid URL — fall through.
  }
  return null;
}

/**
 * Build the homepage promo-video embed URL, preserving the site's original
 * autoplay/mute/loop/controls parameters. Falls back to `fallbackId` when the
 * provided URL is empty or unparseable.
 */
export function homepageVideoEmbedUrl(url: string | null | undefined, fallbackId: string): string {
  const id = youtubeEmbedId(url) ?? fallbackId;
  return `https://www.youtube.com/embed/${id}?autoplay=0&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0`;
}
