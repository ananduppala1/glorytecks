"use client";

import { memo } from "react";
import Link from "next/link";
import { Clock, ArrowRight, Calendar } from "lucide-react";
import { BlogCover } from "./BlogCover";
import { AuthorAvatar } from "./AuthorAvatar";
import type { BlogPost } from "@/types/content";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// `priority` is accepted for API parity (featured card = LCP candidate) but covers
// are inline SVG, so no fetch-priority hint is needed.
export const BlogCard = memo(function BlogCard({ post, priority: _priority = false }: { post: BlogPost; priority?: boolean }) {
  const author = post.author;
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-all card-hover hover:border-primary/40"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <BlogCover
          slug={post.slug}
          categorySlug={post.categorySlug}
          title={post.title}
          rounded={false}
          className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3 rounded-full border border-primary/30 bg-background/80 px-2.5 py-1 text-xs font-medium text-primary backdrop-blur">
          {post.category}
        </span>
        {post.trending && (
          <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
            Trending
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {fmtDate(post.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {post.readTime}
          </span>
        </div>

        <h3 className="mb-2 line-clamp-2 font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
          {post.title}
        </h3>
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <AuthorAvatar author={author} size={28} />
            <span className="text-xs text-muted-foreground">{author?.name ?? "GloryTecks"}</span>
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-primary transition-all group-hover:gap-2">
            Read <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
});

export default BlogCard;
