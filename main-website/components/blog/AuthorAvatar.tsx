import type { Author } from "@/types/content";

// Deterministic gradient initials avatar — no network image, on-brand.
// Initials come from the resolved author (fetched with the post); falls back to
// the GloryTecks mark when an author isn't set.
export function AuthorAvatar({
  author,
  size = 40,
  className = "",
}: {
  author?: Author | null;
  size?: number;
  className?: string;
}) {
  const initials = author?.initials || "GT";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary-deep/40 font-semibold text-primary ring-1 ring-primary/20 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export default AuthorAvatar;
