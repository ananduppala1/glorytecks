// ─────────────────────────────────────────────────────────────────────────────
// Pure pagination helpers — no React, unit-testable.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the list of page tokens to render, e.g. [1, "…", 4, 5, 6, "…", 12].
 * Always shows first, last, and current ±1; collapses long runs to an ellipsis
 * so the control never overflows on small screens.
 */
export function getPageTokens(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const tokens: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) tokens.push("ellipsis");
  for (let p = start; p <= end; p++) tokens.push(p);
  if (end < total - 1) tokens.push("ellipsis");
  tokens.push(total);
  return tokens;
}
