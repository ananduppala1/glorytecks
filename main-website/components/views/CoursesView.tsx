"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from '@/components/ui/reveal';

import {
  ArrowRight,
  GraduationCap,
  Sparkles,
  BarChart3,
  LayoutDashboard,
  Database,
  Workflow,
  Bot,
  FileCode2,
  ServerCog,
  Search,
  X,
  SlidersHorizontal,
} from "lucide-react";

import { useContactInfo } from "@/components/site/SiteDataProvider";
import { QueryState } from "@/components/common/states";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/site/PageHeader";
import type { Course } from "@/types/content";

const smoothReveal = {
  initial: { opacity: 0, y: 80 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 1.2 },
  viewport: { once: true },
};

/* COURSE ICONS */
const courseIcons: Record<string, LucideIcon> = {
  "Generative AI": Sparkles,
  "Agentic AI": Bot,
  "MLOps": Workflow,
  "Data Science": BarChart3,
  "Data Analytics": LayoutDashboard,
  "Power BI": LayoutDashboard,
  "Data Engineering": Database,
  "Python": FileCode2,
  "Python Programming": FileCode2,
  "SQL": Database,
  "SQL Server": ServerCog,
};

/* ─── Category icon helper (reuses courseIcons) ─────────────────────────── */
const getCategoryIcon = (category: string) => {
  return courseIcons[category] || GraduationCap;
};

const ALL_COURSES_LABEL = "All Courses";

const CoursesView = ({ courses }: { courses: Course[] }) => {
  // The catalogue arrives from the server. `/public/courses` returns the whole
  // published set in one ordered response — it takes no query parameters — so
  // search and category filtering stay client-side over that array, exactly as
  // in the React app. See docs/MIGRATION.md for why this is not paginated.
  const { phone } = useContactInfo();

  /* ── Filter state ──────────────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_COURSES_LABEL);

  /* ── Derive unique categories from data ────────────────────────────────── */
  const categories = useMemo(() => {
    if (!courses?.length) return [ALL_COURSES_LABEL];
    const unique = Array.from(new Set(courses.map((c) => c.category).filter(Boolean)));
    return [ALL_COURSES_LABEL, ...unique];
  }, [courses]);

  /* ── Category counts ───────────────────────────────────────────────────── */
  const categoryCounts = useMemo(() => {
    if (!courses?.length) return {};
    const counts: Record<string, number> = { [ALL_COURSES_LABEL]: courses.length };
    for (const c of courses) {
      if (c.category) {
        counts[c.category] = (counts[c.category] || 0) + 1;
      }
    }
    return counts;
  }, [courses]);

  /* ── Filtered courses (client-side, no extra API calls) ────────────────── */
  const filteredCourses = useMemo(() => {
    if (!courses?.length) return [];
    const query = searchQuery.toLowerCase().trim();

    return courses.filter((c) => {
      // Category filter
      const matchesCategory =
        selectedCategory === ALL_COURSES_LABEL || c.category === selectedCategory;

      // Search filter — match against title, tagline, category, description
      const matchesSearch =
        !query ||
        c.title.toLowerCase().includes(query) ||
        c.tagline?.toLowerCase().includes(query) ||
        c.category?.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [courses, searchQuery, selectedCategory]);

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <>
      <PageHeader
        title="Explore Our Courses"
        subtitle="Industry-aligned programs designed with hiring partners. Pick a track and start building your career."
      />

      <motion.section
        className="container-px mx-auto max-w-7xl py-14"
        {...smoothReveal}
      >
        <QueryState
          isLoading={false}
          isError={false}
          isEmpty={!courses.length}
          emptyTitle="No courses yet"
          emptyMessage="Courses will appear here once they're published."
        >
          {/* ── SEARCH BAR (full width, above sidebar + grid) ─────────────── */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                id="courses-search"
                type="text"
                placeholder="Search courses — try Data Science, AI, Python, SQL…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-12 pr-12 text-base rounded-2xl bg-card border-border shadow-card focus-visible:ring-primary/40 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </motion.div>

          {/* ── SIDEBAR + GRID LAYOUT ────────────────────────────────────── */}
          <div className="grid lg:grid-cols-[260px_1fr] gap-8">

            {/* ─ SIDEBAR: DESKTOP (sticky vertical list) ─────────────────── */}
            <motion.aside
              className="hidden lg:block"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="sticky top-28">
                <div className="rounded-2xl bg-card border border-border shadow-card p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="h-8 w-8 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center">
                      <SlidersHorizontal className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground">
                      Categories
                    </h3>
                  </div>

                  <nav className="space-y-1" aria-label="Course categories">
                    {categories.map((cat) => {
                      const isActive = selectedCategory === cat;
                      const CatIcon = cat === ALL_COURSES_LABEL ? GraduationCap : getCategoryIcon(cat);

                      return (
                        <button
                          key={cat}
                          onClick={() => handleCategoryClick(cat)}
                          className={`
                            w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left group
                            ${isActive
                              ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            }
                          `}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <CatIcon className={`h-4 w-4 shrink-0 ${isActive ? "" : "text-primary/60 group-hover:text-primary"}`} />
                          <span className="flex-1 truncate">{cat}</span>
                          {/* <span
                            className={`
                              text-xs px-2 py-0.5 rounded-full font-semibold tabular-nums
                              ${isActive
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-secondary text-muted-foreground"
                              }
                            `}
                          >
                            {categoryCounts[cat] ?? 0}
                          </span> */}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </div>
            </motion.aside>

            {/* ─ SIDEBAR: MOBILE (horizontal scroll strip) ───────────────── */}
            <motion.div
              className="lg:hidden -mx-4 px-4 mb-2"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              viewport={{ once: true }}
            >
              <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;

                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryClick(cat)}
                      className={`
                        shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap
                        ${isActive
                          ? "bg-gradient-primary text-primary-foreground border-transparent shadow-elegant"
                          : "bg-card text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                        }
                      `}
                    >
                      {cat}
                      <span
                        className={`ml-1.5 text-xs ${isActive ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}
                      >
                        ({categoryCounts[cat] ?? 0})
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* ─ COURSE GRID ─────────────────────────────────────────────── */}
            <div>
              {/* Result count */}
              <motion.div
                className="flex items-center justify-between mb-6"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
              >
                <p className="text-sm text-muted-foreground">
                  Showing{" "}
                  <span className="font-semibold text-foreground">
                    {filteredCourses.length}
                  </span>{" "}
                  {filteredCourses.length === 1 ? "course" : "courses"}
                  {selectedCategory !== ALL_COURSES_LABEL && (
                    <span>
                      {" "}in <span className="text-primary font-medium">{selectedCategory}</span>
                    </span>
                  )}
                  {searchQuery && (
                    <span>
                      {" "}matching &quot;<span className="text-primary font-medium">{searchQuery}</span>&quot;
                    </span>
                  )}
                </p>
              </motion.div>

              {/* Empty filter state */}
              {filteredCourses.length === 0 && (
                <motion.div
                  className="flex flex-col items-center justify-center text-center py-20"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="h-16 w-16 rounded-2xl bg-secondary text-muted-foreground flex items-center justify-center mb-5">
                    <Search className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">No courses found</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    No courses match your current filters. Try adjusting your search or selecting a different category.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory(ALL_COURSES_LABEL);
                    }}
                    className="mt-5 px-5 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold hover:shadow-elegant transition-all duration-300"
                  >
                    Clear all filters
                  </button>
                </motion.div>
              )}

              {/* Course cards grid */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selectedCategory}-${searchQuery}`}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                >
                  {filteredCourses.map((c, index) => {
                    const Icon = courseIcons[c.title] || GraduationCap;

                    return (
                      <motion.div
                        key={c.slug}
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.5,
                          delay: Math.min(index * 0.08, 0.4),
                        }}
                        viewport={{ once: true }}
                      >
                        <Link
                          href={`/courses/${c.slug}`}
                          className="group rounded-2xl bg-card border border-border p-6 shadow-card hover:shadow-elegant transition-smooth block h-full"
                        >
                          {/* ICON */}
                          <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center mb-4">
                            <Icon className="h-6 w-6" />
                          </div>

                          {/* CATEGORY BADGE */}
                          {c.category && (
                            <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full mb-3">
                              {c.category}
                            </span>
                          )}

                          {/* TITLE */}
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors duration-200">
                            {c.title}
                          </h3>

                          {/* TAGLINE */}
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {c.tagline}
                          </p>

                          {/* FOOTER */}
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50 text-xs">
                            <span className="text-muted-foreground">
                              {c.duration}
                            </span>

                            <span className="text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
                              View details
                              <ArrowRight className="h-3 w-3" />
                            </span>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </QueryState>
      </motion.section>

      {/* SEO RICH-TEXT SECTION */}
      <section className="container-px mx-auto max-w-4xl py-12 border-t border-border">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-muted-foreground space-y-3 text-sm"
        >
          <h2 className="text-lg font-bold text-foreground">IT Courses in Hyderabad with Placement — GloryTecks</h2>
          <p>
            GloryTecks offers the most comprehensive range of job-oriented IT courses in Hyderabad with 100% placement
            assistance. Whether you are a fresher looking for the best Data Science course in Hyderabad, a working
            professional searching for a Generative AI course near Ameerpet, or a BTech graduate wanting the best
            Python programming course in Hyderabad — GloryTecks has a program tailored for your career goals.
          </p>
          <p>
            All courses are available as offline classroom training at our Ameerpet center, live online training,
            and hybrid batches. Weekend batches are available for working professionals. EMI options start from
            ₹1,999/month. Contact us at <strong>{phone}</strong> or{" "}
            <Link href="/contact" className="text-primary hover:underline">fill out our enquiry form</Link> to
            get a free counseling session and course demo.
          </p>
        </motion.div>
      </section>
    </>
  );
};

export default CoursesView;
