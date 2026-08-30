"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Comparison } from "@/types/content";

const reveal = {
  initial: { opacity: 0, y: 60 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 1 },
  viewport: { once: true },
};

export interface ComparisonViewProps {
  cmp: Comparison;
  allComparisons: Comparison[];
}

/**
 * Comparison body. The slug lookup, the loading/error branches and the
 * not-found fallback all moved to the server route, which returns a real 404
 * for an unknown slug instead of a 200 with "Comparison not found".
 */
const ComparisonView = ({ cmp, allComparisons }: ComparisonViewProps) => {
  return (
    <>
      {/* HERO */}
      <motion.section className="bg-gradient-hero" {...reveal}>
        <div className="container-px mx-auto max-w-5xl py-14 md:py-20 space-y-5">
          <div className="section-label inline-flex items-center gap-1">
            <GitCompare className="h-3 w-3" /> Comparison
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            {cmp.itemA} vs {cmp.itemB}
          </h1>
          <p className="text-lg text-foreground/80 max-w-3xl">{cmp.intro}</p>
          <Button asChild variant="hero" size="lg">
            <Link href="/contact">Book a Free Demo <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </motion.section>

      {/* COMPARISON TABLE */}
      <motion.section className="container-px mx-auto max-w-5xl py-12" {...reveal}>
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          {cmp.itemA} vs {cmp.itemB} — Side by Side
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-card">
                <th className="text-left font-semibold p-4">Factor</th>
                <th className="text-left font-semibold p-4 text-primary">{cmp.itemA}</th>
                <th className="text-left font-semibold p-4">{cmp.itemB}</th>
              </tr>
            </thead>
            <tbody>
              {cmp.rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-4 font-medium text-foreground/90">{r.factor}</td>
                  <td className="p-4 text-foreground/80">{r.a}</td>
                  <td className="p-4 text-foreground/80">{r.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>

      {/* VERDICT */}
      <motion.section className="container-px mx-auto max-w-5xl pb-4" {...reveal}>
        <div className="rounded-2xl bg-card border border-border p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-bold mb-3">Which should you choose?</h2>
          <p className="text-foreground/85 leading-relaxed">{cmp.verdict}</p>
        </div>
      </motion.section>

      {/* RELATED COURSES */}
      {cmp.relatedCourses.length > 0 && (
        <motion.section className="container-px mx-auto max-w-5xl py-12" {...reveal}>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Learn These Skills in Hyderabad</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {cmp.relatedCourses.map((rc) => (
              <Link
                key={rc.slug}
                href={`/courses/${rc.slug}`}
                className="rounded-2xl bg-card border border-border p-5 shadow-card hover:border-primary/50 transition-smooth flex items-center justify-between gap-3"
              >
                <span className="font-semibold">{rc.label}</span>
                <ArrowRight className="h-4 w-4 text-primary shrink-0" />
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* FAQ */}
      {cmp.faqs.length > 0 && (
        <motion.section className="container-px mx-auto max-w-4xl pb-12" {...reveal}>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            {cmp.itemA} vs {cmp.itemB} — FAQs
          </h2>
          <div className="space-y-3">
            {cmp.faqs.map(([q, a], i) => (
              <details key={i} className="rounded-xl bg-card border border-border p-4 group">
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                  {q}
                  <span className="text-primary transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                </summary>
                <p className="text-muted-foreground mt-3 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </motion.section>
      )}

      {/* MORE COMPARISONS */}
      <motion.section className="container-px mx-auto max-w-5xl pb-20" {...reveal}>
        <h2 className="text-xl md:text-2xl font-bold mb-4">More Comparisons</h2>
        <div className="flex flex-wrap gap-3">
          {allComparisons
            .filter((c) => c.slug !== cmp.slug)
            .slice(0, 8)
            .map((c) => (
              <Link
                key={c.slug}
                href={`/compare/${c.slug}`}
                className="text-sm rounded-full border border-border bg-card px-4 py-2 hover:border-primary/50 transition-smooth"
              >
                {c.itemA} vs {c.itemB}
              </Link>
            ))}
        </div>
      </motion.section>
    </>
  );
};

export default ComparisonView;
