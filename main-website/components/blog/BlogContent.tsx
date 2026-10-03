"use client";

import { Fragment, type ReactNode } from "react";
import { Info, Lightbulb, AlertTriangle, CheckCircle2, Quote as QuoteIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Block } from "@/types/content";
import { safeUrl } from "@/lib/safeUrl";

// ── Inline formatting parser ────────────────────────────────────────────────
// Supports **bold**, `inline code` and [text](url). Kept intentionally small —
// the content engine only ever emits these three inline markers.
function renderInline(text: string, keyPrefix = ""): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Split on the three markers while keeping the delimiters.
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);
  parts.forEach((part, i) => {
    if (!part) return;
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>,
      );
    } else if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[0.85em] text-primary border border-border/60"
        >
          {part.slice(1, -1)}
        </code>,
      );
    } else {
      const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      // A link target written by an author must not carry an executable
      // scheme; an unusable target renders as plain text rather than a link.
      const linkHref = m ? safeUrl(m[2]) : undefined;
      if (m && linkHref) {
        const internal = linkHref.startsWith("/");
        nodes.push(
          <a
            key={key}
            href={linkHref}
            {...(internal ? {} : { target: "_blank", rel: "noreferrer" })}
            className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
          >
            {m[1]}
          </a>,
        );
      } else {
        nodes.push(<Fragment key={key}>{part}</Fragment>);
      }
    }
  });
  return nodes;
}

const calloutStyles = {
  info: { icon: Info, ring: "border-primary/30 bg-primary/5", tint: "text-primary" },
  tip: { icon: Lightbulb, ring: "border-emerald-400/30 bg-emerald-400/5", tint: "text-emerald-400" },
  warning: { icon: AlertTriangle, ring: "border-amber-400/30 bg-amber-400/5", tint: "text-amber-400" },
  success: { icon: CheckCircle2, ring: "border-primary/30 bg-primary/10", tint: "text-primary" },
} as const;

export function BlogContent({ blocks }: { blocks: Block[] }) {
  return (
    <div className="blog-content space-y-6 leading-relaxed text-muted-foreground">
    {console.log(blocks)}
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <h2
                key={i}
                id={block.id}
                className="scroll-mt-28 pt-4 text-2xl md:text-3xl font-bold text-foreground tracking-tight"
              >
                {block.text}
              </h2>
            );
          case "subheading":
            return (
              <h3
                key={i}
                id={block.id}
                className="scroll-mt-28 pt-2 text-xl font-semibold text-foreground"
              >
                {block.text}
              </h3>
            );
          case "paragraph":
            return (
              <p key={i} className="text-[1.02rem] leading-8">
                {renderInline(block.text, `p${i}`)}
              </p>
            );
          case "list":
            return block.ordered ? (
              <ol key={i} className="ml-5 list-decimal space-y-2 marker:text-primary/70">
                {block.items.map((it, j) => (
                  <li key={j} className="pl-1 leading-7">
                    {renderInline(it, `li${i}-${j}`)}
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={i} className="ml-1 space-y-2">
                {block.items.map((it, j) => (
                  <li key={j} className="flex gap-3 leading-7">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                    <span>{renderInline(it, `li${i}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            );
          case "table":
            return (
              <div
                key={i}
                className="overflow-x-auto rounded-xl border border-border bg-card/50"
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      {block.head.map((th, j) => (
                        <th
                          key={j}
                          className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap"
                        >
                          {th}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr
                        key={r}
                        className="border-b border-border/50 last:border-0 hover:bg-secondary/20"
                      >
                        {row.map((cell, c) => (
                          <td
                            key={c}
                            className={
                              c === 0
                                ? "px-4 py-3 font-medium text-foreground/90"
                                : "px-4 py-3"
                            }
                          >
                            {renderInline(cell, `td${i}-${r}-${c}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "code":
            return (
              <div key={i} className="group relative overflow-hidden rounded-xl border border-border bg-[hsl(160_30%_4%)]">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {block.lang}
                  </span>
                  <span className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                    <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
                  </span>
                </div>
                <pre className="overflow-x-auto px-4 py-4 text-[0.85rem] leading-6">
                  <code className="font-mono text-foreground/90">{block.code}</code>
                </pre>
              </div>
            );
          case "callout": {
            const s = calloutStyles[block.variant];
            const Icon = s.icon;
            return (
              <div
                key={i}
                className={`flex gap-3 rounded-xl border p-4 ${s.ring}`}
                role="note"
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.tint}`} />
                <div className="space-y-1">
                  {block.title && (
                    <p className={`font-semibold ${s.tint}`}>{block.title}</p>
                  )}
                  <p className="text-sm leading-7 text-foreground/85">
                    {renderInline(block.text, `co${i}`)}
                  </p>
                </div>
              </div>
            );
          }
          case "quote":
            return (
              <blockquote
                key={i}
                className="relative rounded-xl border border-border bg-card/40 p-5 pl-12"
              >
                <QuoteIcon className="absolute left-4 top-5 h-5 w-5 text-primary/50" />
                <p className="italic text-foreground/90">{renderInline(block.text, `q${i}`)}</p>
                {block.cite && (
                  <footer className="mt-2 text-sm text-muted-foreground">— {block.cite}</footer>
                )}
              </blockquote>
            );
          case "image": {
            // Author-supplied URL out of the CMS — vet the scheme before it
            // becomes an `src`.
            const imageSrc = safeUrl(block.url);
            if (!imageSrc) return null;
            return (
              <figure key={i} className="my-2">
                {/*
                  The CMS image block carries no dimensions, so width/height
                  cannot be set without inventing them. A fixed aspect ratio on
                  the wrapper reserves the space instead, which is what stops
                  the article text below from jumping as each image loads.
                */}
                <div className="aspect-[16/9] max-h-[420px] overflow-hidden rounded-xl border border-border bg-card/40">
                  <img
                    src={imageSrc}
                    alt={block.alt ?? ""}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                {block.caption && (
                  <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          }
          case "faq":
            return (
              <div key={i} className="not-prose">
                <Accordion type="single" collapsible className="w-full">
                  {block.items.map((item, j) => (
                    <AccordionItem
                      key={j}
                      value={`faq-${i}-${j}`}
                      className="border-border"
                    >
                      <AccordionTrigger className="text-left text-base font-semibold text-foreground hover:text-primary hover:no-underline">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-[0.98rem] leading-7 text-muted-foreground">
                        {renderInline(item.a, `fa${i}-${j}`)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export default BlogContent;
