'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2, Twitter, Linkedin, Facebook, Link2, Check, ListTree } from 'lucide-react';
import type { TocItem } from '@/types/content';

// ─────────────────────────────────────────────────────────────────────────────
// The interactive slivers of a blog post.
//
// In the React app the whole 547-line article page was one client component
// because of three small behaviours: a scroll-driven progress bar, a scroll-spy
// table of contents, and a copy-to-clipboard button. Everything else — the
// article body, the author block, related posts, the sidebar — was static
// markup paying a hydration cost for no reason.
//
// Those three behaviours now live here as isolated islands. The article itself
// is a Server Component, so the body ships as HTML and none of it is hydrated.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scroll progress bar.
 *
 * Measures the <article> element by id rather than taking a ref, because the
 * article is server-rendered and cannot hand a ref to a client component.
 */
export function ReadingProgress({ targetId = 'article-body' }: { targetId?: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById(targetId);
      if (!el) return;
      const top = el.offsetTop;
      const height = el.offsetHeight - window.innerHeight;
      const scrolled = window.scrollY - top;
      const pct = height > 0 ? Math.min(100, Math.max(0, (scrolled / height) * 100)) : 0;
      setProgress(pct);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [targetId]);

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-1 bg-transparent">
      <div
        className="h-full bg-primary transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/** Table of contents with an active-heading scroll-spy. */
export function TableOfContents({ toc }: { toc: TocItem[] }) {
  const [active, setActive] = useState('');
  const idsKey = toc.map((t) => t.id).join('|');

  useEffect(() => {
    const ids = idsKey ? idsKey.split('|') : [];
    if (!ids.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: [0, 1] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [idsKey]);

  if (!toc.length) return null;

  return (
    <div>
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <ListTree className="h-4 w-4" /> On this page
      </p>
      <nav className="space-y-1 border-l border-border">
        {toc.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className={`-ml-px block border-l-2 py-1 pl-3 text-sm transition-colors ${
              active === t.id
                ? 'border-primary font-medium text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.text}
          </a>
        ))}
      </nav>
    </div>
  );
}

function useCopyLink(url: string) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return { copied, copy };
}

function shareLinks(title: string, url: string) {
  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  };
}

/** Desktop sidebar share cluster. */
export function ShareButtons({ title, url }: { title: string; url: string }) {
  const share = shareLinks(title, url);
  const { copied, copy } = useCopyLink(url);

  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Share2 className="h-4 w-4" /> Share
      </p>
      <div className="flex gap-2">
        <a
          href={share.twitter}
          target="_blank"
          rel="noreferrer"
          aria-label="Share on Twitter"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Twitter className="h-4 w-4" />
        </a>
        <a
          href={share.linkedin}
          target="_blank"
          rel="noreferrer"
          aria-label="Share on LinkedIn"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Linkedin className="h-4 w-4" />
        </a>
        <a
          href={share.facebook}
          target="_blank"
          rel="noreferrer"
          aria-label="Share on Facebook"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Facebook className="h-4 w-4" />
        </a>
        <button
          onClick={copy}
          aria-label="Copy link"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/** Compact share row shown under the cover on mobile. */
export function MobileShareRow({ title, url }: { title: string; url: string }) {
  const share = shareLinks(title, url);
  const { copied, copy } = useCopyLink(url);

  return (
    <div className="mt-6 flex items-center gap-2 lg:hidden">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Share:
      </span>
      <a
        href={share.twitter}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on Twitter"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground"
      >
        <Twitter className="h-4 w-4" />
      </a>
      <a
        href={share.linkedin}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on LinkedIn"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground"
      >
        <Linkedin className="h-4 w-4" />
      </a>
      <button
        onClick={copy}
        aria-label="Copy link"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground"
      >
        {copied ? <Check className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
