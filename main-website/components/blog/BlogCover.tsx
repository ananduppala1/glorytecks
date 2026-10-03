"use client";

import { useCategories } from "@/components/site/SiteDataProvider";
import SafeImage from "@/components/SafeImage";
import { safeUrl } from "@/lib/safeUrl";

// CMS-backed blog cover. When a featured image exists, render the real Cloudinary
// asset uploaded from the admin dashboard. When it does not, fall back to the
// deterministic on-brand SVG so older posts still have a polished cover. Hue comes
// from the post's category; a seeded value varies the pattern so fallback covers
// in the same category still look distinct.
//
// The category's colour/name come from the live categories API. Callers that
// already have them can pass `categoryColor`/`categoryName` to avoid the lookup.
function seedFrom(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function BlogCover({
  slug,
  categorySlug,
  title,
  featuredImage,
  className = "",
  rounded = true,
  categoryColor,
  categoryName,
  priority = false,
}: {
  slug: string;
  categorySlug: string;
  title?: string;
  featuredImage?: string;
  className?: string;
  rounded?: boolean;
  categoryColor?: string;
  categoryName?: string;
  priority?: boolean;
}) {
  // Categories arrive from the server-rendered site-data context, so however
  // many covers a page renders they cost zero network requests.
  const categories = useCategories();
  const cat = categories.find((c) => c.slug === categorySlug);

  const hsl = categoryColor || cat?.color || "145 80% 55%";
  const name = categoryName || cat?.name || "GloryTecks";
  const [hStr, sStr, lStr] = hsl.split(" ");
  const hue = parseInt(hStr, 10);
  const seed = seedFrom(slug);
  const gid = `g-${categorySlug}-${seed % 9999}`;
  const dotsId = `d-${seed % 9999}`;

  const c1 = `hsl(${hue} 70% 14%)`;
  const c2 = `hsl(${hue} 60% 8%)`;
  const accent = `hsl(${hue} ${sStr} ${lStr})`;
  const accentSoft = `hsl(${hue} 70% 60% / 0.18)`;
  const imageSrc = safeUrl(featuredImage);

  // Prefer the image uploaded through the CMS. Older posts without an image
  // keep the deterministic SVG cover, so no existing blog post breaks.
  if (imageSrc) {
    return (
      <div className={`${className} ${rounded ? "rounded-xl" : ""} relative overflow-hidden`} aria-hidden="true">
        <SafeImage
          src={imageSrc}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 640px"
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  // A few decorative "blobs" placed deterministically.
  const blobs = [0, 1, 2].map((i) => {
    const s = seedFrom(slug + i);
    return {
      cx: 60 + (s % 520),
      cy: 30 + ((s >> 4) % 200),
      r: 70 + ((s >> 8) % 120),
      o: 0.1 + ((s >> 3) % 12) / 100,
    };
  });

  return (
    <div className={`${className} ${rounded ? "rounded-xl" : ""} relative overflow-hidden`} aria-hidden="true">
      <svg viewBox="0 0 640 320" className="h-full w-full" preserveAspectRatio="xMidYMid slice" role="img">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
          <pattern id={dotsId} width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill={accent} opacity="0.18" />
          </pattern>
        </defs>
        <rect width="640" height="320" fill={`url(#${gid})`} />
        {blobs.map((b, i) => (
          <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={accentSoft} opacity={b.o} />
        ))}
        <rect width="640" height="320" fill={`url(#${dotsId})`} />
        {/* category label */}
        <text x="40" y="56" fill={accent} fontSize="15" fontWeight="700" letterSpacing="3" fontFamily="Inter, sans-serif">
          {name.toUpperCase()}
        </text>
        {/* big glyph: first letters of title */}
        <text
          x="40"
          y="225"
          fill="#ffffff"
          opacity="0.92"
          fontSize="92"
          fontWeight="800"
          fontFamily="'Plus Jakarta Sans', Inter, sans-serif"
        >
          {(title || name || "GT").slice(0, 2).toUpperCase()}
        </text>
        {/* accent rule */}
        <rect x="42" y="250" width="120" height="5" rx="2.5" fill={accent} />
        <text x="40" y="288" fill="#ffffff" opacity="0.55" fontSize="14" fontWeight="600" fontFamily="Inter, sans-serif">
          GloryTecks · Hyderabad
        </text>
      </svg>
    </div>
  );
}

export default BlogCover;
