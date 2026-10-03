import { Briefcase, TrendingUp, Users, Star, ArrowRight, Award } from "lucide-react";
import { motion } from '@/components/ui/reveal';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/site/PageHeader";
import { QueryState } from "@/components/common/states";
import type { Company, Placement, SiteSettings } from "@/types/content";

const smoothReveal = { initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, transition: { duration: 0.6 }, viewport: { once: true } };

// Placement support is a fixed methodology, not CMS content — kept as page copy.
const process = [
  { step: 1, title: "Resume Building", desc: "ATS-friendly resume crafted by our placement team with industry keywords." },
  { step: 2, title: "LinkedIn Optimization", desc: "Professional LinkedIn profile that attracts recruiters automatically." },
  { step: 3, title: "Mock Interviews", desc: "10+ mock interviews with real industry professionals before actual drives." },
  { step: 4, title: "Company Drives", desc: "Exclusive placement drives with 500+ hiring partners every month." },
  { step: 5, title: "Offer & Negotiation", desc: "Salary negotiation support and offer letter guidance from our team." },
];

export interface PlacementsViewProps {
  settings: SiteSettings | null;
  companies: Company[];
  placements: Placement[];
}

const PlacementsView = ({ settings, companies, placements }: PlacementsViewProps) => {

  const stats = [
    { icon: Users, v: settings?.stats.studentsTrained ?? "", l: "Students Placed", sub: "Across all programs" },
    { icon: Briefcase, v: settings?.stats.hiringPartners ?? "", l: "Hiring Partners", sub: "Across India" },
    { icon: TrendingUp, v: "22 LPA", l: "Highest Package", sub: "Gen AI role" },
    { icon: Award, v: settings?.stats.placementRate ?? "", l: "Placement Rate", sub: "Across batches" },
  ];

  return (
    <>
      <PageHeader title="Placements at GloryTecks" subtitle="Real outcomes. Real careers. 95% placement rate across all flagship programs." />

      <section className="container-px mx-auto max-w-7xl py-14">
        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {stats.map((s, i) => (
            <motion.div key={s.l} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
              className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-card)] text-center card-hover">
              <s.icon className="h-8 w-8 text-primary mx-auto mb-3" />
              <div className="text-3xl font-bold gradient-text mb-1">{s.v}</div>
              <div className="text-sm font-semibold">{s.l}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Placement process */}
        <motion.div {...smoothReveal} className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Our Placement Process</h2>
          <p className="text-muted-foreground text-sm mb-8">A systematic, 5-step process to get you job-ready and placed.</p>
          <div className="grid sm:grid-cols-5 gap-4">
            {process.map((p, i) => (
              <div key={i} className="relative">
                <div className="rounded-xl bg-card border border-border p-5 text-center h-full">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-deep to-primary text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto mb-3">{p.step}</div>
                  <div className="font-semibold text-sm mb-1">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.desc}</div>
                </div>
                {i < process.length - 1 && <ArrowRight className="hidden sm:block absolute -right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Hiring partners */}
        <motion.div {...smoothReveal} className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Our Hiring Partners</h2>
          <p className="text-muted-foreground text-sm mb-6">500+ companies actively recruit GloryTecks graduates.</p>
          <QueryState
            isLoading={false}
            isError={false}
            isEmpty={!companies.length}
            minHeight="12rem"
            emptyTitle="No hiring partners yet"
            emptyMessage="Hiring partners will appear here once they're added."
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {companies.map((c, i) => (
                <motion.div key={c.id ?? c.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} viewport={{ once: true }}
                  className="h-16 rounded-xl bg-secondary border border-border flex items-center justify-center font-semibold text-xs card-hover text-center px-2">
                  {c.name}
                </motion.div>
              ))}
            </div>
          </QueryState>
        </motion.div>

        {/* Stories */}
        <motion.div {...smoothReveal}>
          <h2 className="text-2xl font-bold mb-2">Recent Success Stories</h2>
          <p className="text-muted-foreground text-sm mb-8">Real students, real packages, real companies.</p>
          <QueryState
            isLoading={false}
            isError={false}
            isEmpty={!placements.length}
            minHeight="16rem"
            emptyTitle="No success stories yet"
            emptyMessage="Placement success stories will appear here once they're added."
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {placements.map((s, i) => (
                <motion.div key={s.id ?? s.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                  className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-card)] card-hover">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary-deep to-primary text-primary-foreground flex items-center justify-center text-xl font-bold flex-shrink-0">
                      {s.name[0]}
                    </div>
                    <div>
                      <div className="font-bold">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.role} @ {s.company}</div>
                      <div className="flex mt-1">{Array.from({ length: s.stars }).map((_, x) => <Star key={x} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-border">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Course</div>
                      <div className="text-xs font-semibold">{s.course}</div>
                    </div>
                    {s.previousPackage && (
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Before</div>
                        <div className="text-xs font-semibold text-muted-foreground">{s.previousPackage}</div>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Package</div>
                      <div className="text-sm font-bold text-primary">{s.packageLpa}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </QueryState>
        </motion.div>

        {/* CTA */}
        <motion.div {...smoothReveal} className="mt-16 text-center">
          <h3 className="text-2xl font-bold mb-3">Want to Be Our Next Success Story?</h3>
          <p className="text-muted-foreground mb-6">Book a free demo and talk to our placement team.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button variant="hero" size="lg" asChild><Link href="/contact">Book Free Demo <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
            <Button variant="outline" size="lg" asChild><Link href="/courses">Browse Courses</Link></Button>
          </div>
        </motion.div>
      </section>
    </>
  );
};

export default PlacementsView;
