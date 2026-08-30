// ─────────────────────────────────────────────────────────────────────────────
// Pure, stateless helpers for rendering blog content blocks.
//
// Ported verbatim from the old `src/data/blog/content.ts` engine — these are the
// rendering utilities (HTML serialisation, TOC, read-time, FAQ extraction), NOT
// content. The article bodies themselves now come from the backend as `Block[]`.
// ─────────────────────────────────────────────────────────────────────────────
import type { Block, FaqItem, TocItem } from "@/types/content";

export type { Block, FaqItem, TocItem };

/** URL-safe slug (matches the backend slugify used to build heading ids). */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function escapeHtml(s = ""): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert **bold**, `code` and [text](url) to HTML (after escaping). */
export function inlineToHtml(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

export function blocksToHtml(blocks: Block[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "heading":
        parts.push(`<h2 id="${b.id}">${escapeHtml(b.text)}</h2>`);
        break;
      case "subheading":
        parts.push(`<h3 id="${b.id}">${escapeHtml(b.text)}</h3>`);
        break;
      case "paragraph":
        parts.push(`<p>${inlineToHtml(b.text)}</p>`);
        break;
      case "list":
        parts.push(
          `<${b.ordered ? "ol" : "ul"}>${b.items
            .map((i) => `<li>${inlineToHtml(i)}</li>`)
            .join("")}</${b.ordered ? "ol" : "ul"}>`,
        );
        break;
      case "table":
        parts.push(
          `<table><thead><tr>${b.head
            .map((hd) => `<th>${escapeHtml(hd)}</th>`)
            .join("")}</tr></thead><tbody>${b.rows
            .map((r) => `<tr>${r.map((c) => `<td>${inlineToHtml(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`,
        );
        break;
      case "code":
        parts.push(`<pre><code class="language-${b.lang}">${escapeHtml(b.code)}</code></pre>`);
        break;
      case "callout":
        parts.push(
          `<aside class="callout callout-${b.variant}">${
            b.title ? `<strong>${escapeHtml(b.title)}: </strong>` : ""
          }${inlineToHtml(b.text)}</aside>`,
        );
        break;
      case "quote":
        parts.push(
          `<blockquote>${inlineToHtml(b.text)}${
            b.cite ? `<cite>${escapeHtml(b.cite)}</cite>` : ""
          }</blockquote>`,
        );
        break;
      case "image":
        if (b.url) {
          parts.push(
            `<figure class="blog-image"><img src="${escapeHtml(b.url)}" alt="${escapeHtml(
              b.alt ?? "",
            )}" loading="lazy" />${
              b.caption ? `<figcaption>${escapeHtml(b.caption)}</figcaption>` : ""
            }</figure>`,
          );
        }
        break;
      case "faq":
        parts.push(
          `<section class="faq"><h2 id="faq">Frequently Asked Questions</h2>${b.items
            .map(
              (i) =>
                `<div class="faq-item"><h3>${escapeHtml(i.q)}</h3><p>${inlineToHtml(i.a)}</p></div>`,
            )
            .join("")}</section>`,
        );
        break;
      default:
        break;
    }
  }
  return parts.join("\n");
}

/** Table of contents = top-level headings (h2). */
export function tableOfContents(blocks: Block[]): TocItem[] {
  return blocks
    .filter((b): b is Extract<Block, { type: "heading" }> => b.type === "heading")
    .map((b) => ({ id: b.id, text: b.text }));
}

/** Estimate read time from content blocks (≈ 200 wpm + table/code overhead). */
export function estimateReadTime(blocks: Block[]): string {
  let words = 0;
  for (const b of blocks) {
    if (b.type === "paragraph") words += b.text.split(/\s+/).length;
    else if (b.type === "list") words += b.items.join(" ").split(/\s+/).length;
    else if (b.type === "heading" || b.type === "subheading") words += b.text.split(/\s+/).length;
    else if (b.type === "callout") words += b.text.split(/\s+/).length + 6;
    else if (b.type === "table") words += b.head.length * 3 + b.rows.flat().length * 3;
    else if (b.type === "code") words += b.code.split(/\s+/).length;
    else if (b.type === "faq")
      words += b.items.map((i) => i.q + " " + i.a).join(" ").split(/\s+/).length;
  }
  return `${Math.max(3, Math.round(words / 200))} min`;
}

/** Collect FAQ items across blocks (for FAQPage schema). */
export function collectFaq(blocks: Block[]): FaqItem[] {
  const items: FaqItem[] = [];
  for (const b of blocks) if (b.type === "faq") items.push(...b.items);
  return items;
}
