'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, Search, X } from 'lucide-react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { CategoryKnowledge } from '@/types/content';

/**
 * The interactive strip of the blog archive: category chips with scroll arrows,
 * the search box, and the category dropdown.
 *
 * In the React app the archive was one 639-line client component that owned the
 * post grid, the queries and the URL. Here the grid and the data are server
 * concerns; this island only reads and writes the URL, and the server re-renders
 * the results. That keeps every filter combination a real, shareable, crawlable
 * URL while the typing-and-clicking feel is unchanged.
 */
export function BlogToolbar({
  categories,
  categorySlug,
  activeCategoryName,
  initialSearch,
  sort,
  basePath,
}: {
  categories: CategoryKnowledge[];
  categorySlug?: string;
  activeCategoryName?: string;
  initialSearch: string;
  sort: 'latest' | 'popular';
  basePath: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  // Debounced so typing doesn't fire one navigation per keystroke — the same
  // 350 ms window the React app used to debounce its API calls.
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const lastPushed = useRef(initialSearch.trim());

  /** Build a URL for the archive, preserving the filters that still apply. */
  const buildUrl = useCallback(
    (next: { q?: string; sort?: string }) => {
      const params = new URLSearchParams();
      const q = next.q ?? debouncedSearch;
      const s = next.sort ?? (sort === 'popular' ? 'popular' : '');
      if (q) params.set('q', q);
      if (s === 'popular') params.set('sort', 'popular');
      // Any filter change resets to page 1, exactly as before.
      const qs = params.toString();
      return qs ? `${basePath}?${qs}` : basePath;
    },
    [basePath, debouncedSearch, sort],
  );

  useEffect(() => {
    if (debouncedSearch === lastPushed.current) return;
    lastPushed.current = debouncedSearch;
    startTransition(() => {
      router.replace(buildUrl({ q: debouncedSearch }), { scroll: false });
    });
  }, [debouncedSearch, buildUrl, router]);

  /* ── Category scroll arrows ────────────────────────────────────────────── */
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScrollability();
    el.addEventListener('scroll', checkScrollability, { passive: true });
    const ro = new ResizeObserver(checkScrollability);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScrollability);
      ro.disconnect();
    };
  }, [checkScrollability, categories.length]);

  const scrollBy = (dir: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  /* ── Category dropdown ─────────────────────────────────────────────────── */
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCategorySelect = (slug: string | null) => {
    setDropdownOpen(false);
    router.push(slug ? `/blog/category/${slug}` : '/blog');
  };

  return (
    <>
      {/* ── Category chips with scroll arrows ─────────────────────────────── */}
      <div className="sticky top-16 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container-px mx-auto max-w-7xl py-3">
          <div className="relative flex items-center">
            <button
              onClick={() => scrollBy('left')}
              disabled={!canScrollLeft}
              className={`
                shrink-0 mr-2 h-8 w-8 rounded-full border border-border bg-card flex items-center justify-center transition-all duration-200
                ${
                  canScrollLeft
                    ? 'text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-card cursor-pointer'
                    : 'text-muted-foreground/30 cursor-default opacity-0 pointer-events-none'
                }
              `}
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div
              ref={scrollContainerRef}
              className="flex gap-2 overflow-x-auto flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <Link
                href="/blog"
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  !categorySlug
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/blog/category/${cat.slug}`}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    categorySlug === cat.slug
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>

            <button
              onClick={() => scrollBy('right')}
              disabled={!canScrollRight}
              className={`
                shrink-0 ml-2 h-8 w-8 rounded-full border border-border bg-card flex items-center justify-center transition-all duration-200
                ${
                  canScrollRight
                    ? 'text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-card cursor-pointer'
                    : 'text-muted-foreground/30 cursor-default opacity-0 pointer-events-none'
                }
              `}
              aria-label="Scroll categories right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Search bar + Category dropdown ────────────────────────────────── */}
      <div className="border-b border-border bg-background">
        <div className="container-px mx-auto max-w-7xl py-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeCategoryName ? `Search ${activeCategoryName} articles…` : 'Search articles…'
                }
                className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="Search articles"
                type="search"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            <div ref={dropdownRef} className="relative sm:w-60">
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-border bg-card py-3 px-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 hover:border-primary/40"
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
              >
                <span
                  className={categorySlug ? 'text-foreground font-medium' : 'text-muted-foreground'}
                >
                  {activeCategoryName ?? 'All Categories'}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-border bg-card shadow-elegant overflow-hidden"
                  role="listbox"
                >
                  <div className="max-h-64 overflow-y-auto py-1 [scrollbar-width:thin]">
                    <button
                      onClick={() => handleCategorySelect(null)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        !categorySlug
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                      role="option"
                      aria-selected={!categorySlug}
                    >
                      All Categories
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.slug}
                        onClick={() => handleCategorySelect(cat.slug)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          categorySlug === cat.slug
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                        role="option"
                        aria-selected={categorySlug === cat.slug}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

export default BlogToolbar;
