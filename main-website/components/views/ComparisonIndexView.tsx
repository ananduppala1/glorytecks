import Link from "next/link";
import { motion } from '@/components/ui/reveal';
import { GitCompare, ArrowRight } from "lucide-react";
import { QueryState } from "@/components/common/states";
import type { Comparison } from "@/types/content";

const reveal = {
  initial: { opacity: 0, y: 50 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.9 },
  viewport: { once: true },
};

const ComparisonIndexView = ({ comparisons }: { comparisons: Comparison[] }) => {
  const list = comparisons;

  return (
    <>
      <motion.section className="container-px mx-auto max-w-7xl py-12 md:py-16" {...reveal}>
        <div className="section-label inline-flex items-center gap-1 mb-3">
          <GitCompare className="h-3 w-3" /> Compare
        </div>
        <h1 className="text-3xl md:text-5xl font-bold mb-3">Course &amp; Tool Comparisons</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Not sure which path or tool to pick? These side-by-side comparisons help you choose the
          right course for Hyderabad&rsquo;s job market.
        </p>

        <div className="mt-10">
          <QueryState
            isLoading={false}
            isError={false}
            isEmpty={!list.length}
            emptyTitle="No comparisons yet"
            emptyMessage="Comparisons will appear here once they're published."
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((c) => (
                <Link
                  key={c.slug}
                  href={`/compare/${c.slug}`}
                  className="rounded-2xl bg-card border border-border p-6 shadow-card hover:border-primary/50 transition-smooth block group"
                >
                  <h2 className="text-lg font-bold">{c.itemA} vs {c.itemB}</h2>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{c.intro}</p>
                  <span className="inline-flex items-center gap-1 text-sm text-primary mt-4">
                    Read comparison
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              ))}
            </div>
          </QueryState>
        </div>
      </motion.section>
    </>
  );
};

export default ComparisonIndexView;
