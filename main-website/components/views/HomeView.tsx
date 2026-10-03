"use client";

import Link from "next/link";
import { blogPath } from "@/lib/blog/merged";
import { safeUrl } from "@/lib/safeUrl";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from '@/components/ui/reveal';
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Award, Briefcase, CheckCircle2, GraduationCap,
  Quote, Rocket, Users, Brain, Sparkles, BarChart3, LayoutDashboard,
  Database, Workflow, Bot, Star, Play, MapPin, Phone, Calendar,
  TrendingUp, Shield, Zap, Target, ChevronDown, ChevronRight,
  BookOpen, Clock, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContactInfo } from "@/components/site/SiteDataProvider";
import { QueryState } from "@/components/common/states";
import { homepageVideoEmbedUrl } from "@/lib/youtube";
import { SafeImage } from "@/components/SafeImage";
import heroImg from "@/assets/hero.webp";
import DemoModal from "@/components/site/DemoModal";
import { HOME_FAQS } from '@/lib/schema';
import type {
  Batch, BlogPost, Company, Course, Faq, Roadmap, SiteSettings, Testimonial, Trainer,
} from "@/types/content";

/* Format an ISO batch start date the way the static data used to read. */
function fmtBatchDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

/* ─── animation variants ─── */
const reveal = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
  viewport: { once: true },
};

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: i * 0.08 },
  viewport: { once: true },
});

/* ─── data ─── */

const features = [
  { icon: GraduationCap, title: "Expert Trainers", desc: "10+ year industry professionals actively building real products — not just teachers." },
  { icon: Rocket,        title: "Real-time Projects", desc: "5+ production-grade capstone projects per course to build a job-winning portfolio." },
  { icon: Briefcase,     title: "100% Placement Support", desc: "Dedicated career cell, resume building, mock interviews & 500+ hiring partners." },
  { icon: Award,         title: "Industry Certifications", desc: "Globally recognized certificates that make your profile stand out to recruiters." },
  { icon: Zap,           title: "Live Doubt Sessions", desc: "Daily live sessions, recorded lectures & lifetime access to course material." },
  { icon: Shield,        title: "Small Batch Size", desc: "Max 15 students per batch for personal attention and better learning outcomes." },
];



const courseIcons: Record<string, LucideIcon> = {
  "Generative AI": Sparkles, "Agentic AI": Bot, "MLOps": Workflow,
  "Data Science": BarChart3, "Data Analytics": LayoutDashboard,
  "Power BI": LayoutDashboard, "Data Engineering": Database,
  "Python Programming": Brain, "SQL Server": Database,
};





/* ─── counter hook ─── */
function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let iv: ReturnType<typeof setInterval> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const steps = 60;
      const step = target / steps;
      iv = setInterval(() => {
        start += step;
        if (start >= target) { setCount(target); clearInterval(iv); }
        else setCount(Math.floor(start));
      }, duration / steps);
    });
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      if (iv) clearInterval(iv); // don't tick after unmount
    };
  }, [target, duration]);
  return { count, ref };
}

function AnimatedStat({ value, label, icon: Icon }: { value: string; label: string; icon: LucideIcon }) {
  const num = parseInt(value.replace(/\D/g, ""));
  const suffix = value.replace(/\d/g, "");
  const { count, ref } = useCounter(Number.isNaN(num) ? 0 : num);
  return (
    <div ref={ref} className="text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="stat-number">{Number.isNaN(num) ? value : `${count}${suffix}`}</div>
      <div className="text-xs md:text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─── */
export interface HomeViewProps {
  courses: Course[];
  latestBlogs: BlogPost[];
  testimonials: Testimonial[];
  companies: Company[];
  trainers: Trainer[];
  roadmaps: Roadmap[];
  faqs: Faq[];
  batches: Batch[];
  settings: SiteSettings | null;
}

const HomeView = ({
  courses,
  latestBlogs,
  testimonials,
  companies,
  trainers,
  roadmaps,
  faqs,
  batches,
  settings,
}: HomeViewProps) => {
  // All content is fetched on the server and passed in — the page HTML is
  // complete on first byte instead of being assembled after hydration.
  const { phone, phoneHref, whatsappHref, address } = useContactInfo();

  const popular = courses.slice(0, 6);
  const batchList = batches;
  const stats = [
    { v: settings?.stats.studentsTrained ?? "", l: "Students Trained", icon: Users },
    { v: settings?.stats.placementRate ?? "", l: "Placement Rate", icon: TrendingUp },
    { v: settings?.stats.hiringPartners ?? "", l: "Hiring Partners", icon: Briefcase },
    { v: settings?.stats.coursesOffered ?? "", l: "Courses Offered", icon: BookOpen },
  ];
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoCourse, setDemoCourse] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeRoadmap, setActiveRoadmap] = useState(0);

  const openDemo = (course = "") => { setDemoCourse(course); setDemoOpen(true); };
  const roadmapList = roadmaps;
  const activeRoadmapData = roadmapList[activeRoadmap] ?? roadmapList[0];


  return (
    <>
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} defaultCourse={demoCourse} />

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-hero min-h-[90vh] flex items-center">
        {/* Background particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-primary/5 animate-float"
              style={{ width: `${80 + i * 40}px`, height: `${80 + i * 40}px`, top: `${10 + i * 15}%`, left: `${5 + i * 15}%`, animationDelay: `${i * 0.7}s` }} />
          ))}
        </div>

        <div className="container-px mx-auto max-w-7xl py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* LEFT */}
          <motion.div className="space-y-7" {...reveal}>
            <div className="section-label">
              <MapPin className="h-3 w-3" /> {settings?.heroSection?.badge ?? "Hyderabad's #1 IT Training Institute"}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
              {settings?.heroSection?.headingLine1 ?? "Launch Your"}{" "}
              <span className="gradient-text">{settings?.heroSection?.headingHighlight ?? "Tech Career"}</span>{" "}
              {/* Fallback only — the live H1 comes from the CMS hero settings.
                  Was "with Hyderabad's Best Training"; an unsubstantiated
                  superlative in the page's single H1 is the worst place for
                  one. The CMS value overrides this, so the admin copy still
                  needs its own review. */}
              {settings?.heroSection?.headingLine2 ?? 'with Training in Hyderabad'}
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              {settings?.heroSection?.description ?? "Industry-aligned courses in Data Science, Gen AI, Python & Analytics — built for the Hyderabad job market. Expert mentors, real projects, 100% placement."}
            </p>

            <div className="flex flex-wrap gap-3">
              {(settings?.heroSection?.badges ?? [`✅ 3000+ Students Placed`, "⭐ 4.9/5 Google Rating", "🎓 100% Placement Support"]).map(t => (
                <span key={t} className="text-xs bg-secondary border border-border px-3 py-1.5 rounded-full text-foreground/80">{t}</span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="hero" size="lg" onClick={() => openDemo()} className="animate-pulse-glow">
                <Calendar className="h-4 w-4" /> {settings?.heroSection?.primaryCta?.text ?? "Book Free Demo"}
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href={safeUrl(settings?.heroSection?.secondaryCta?.link) ?? "/courses"}>
                  {settings?.heroSection?.secondaryCta?.text ?? "Explore Courses"} <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="text-muted-foreground">
                <a href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4 text-green-500" /> {settings?.heroSection?.whatsappText ?? "WhatsApp Us"}
                </a>
              </Button>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground pt-2">
              {(settings?.heroSection?.trustPoints ?? ["No prior experience needed", "EMI available"]).map(tp => (
                <div key={tp} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {tp}</div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT — hero image */}
          <motion.div {...reveal} className="relative">
            <div className="absolute -inset-8 bg-gradient-primary opacity-15 blur-3xl rounded-full" />
            <div className="relative rounded-3xl overflow-hidden shadow-[var(--shadow-elegant)]">
              <SafeImage
                src={settings?.heroSection?.heroImage || heroImg}
                alt={settings?.heroSection?.heroImageAlt ?? "GloryTecks IT training institute classroom at Ameerpet Hyderabad — Data Science, AI and Python courses"}
                width={1536}
                height={1024}
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
                className="w-full h-auto aspect-[3/2] object-cover"
              />
              <div className="absolute bottom-4 left-4 glass-card rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-deep to-primary flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{settings?.heroSection?.overlayCard?.label ?? "Average Salary Hike"}</div>
                  <div className="font-bold text-sm">{settings?.heroSection?.overlayCard?.value ?? "3x — 5x"} <span className="text-primary">{settings?.heroSection?.overlayCard?.suffix ?? "after course"}</span></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground animate-bounce">
          <ChevronDown className="h-5 w-5" />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════ */}
      <motion.section className="container-px mx-auto max-w-7xl -mt-8 relative z-30" {...reveal}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-card rounded-2xl shadow-[var(--shadow-elegant)] border border-border p-6 md:p-8">
          {stats.map((s) => <AnimatedStat key={s.l} value={s.v} label={s.l} icon={s.icon} />)}
        </div>
      </motion.section>

      {/* ══════════════════════════════════════════
          UPCOMING BATCHES TICKER
      ══════════════════════════════════════════ */}
      <div className="bg-primary/10 border-y border-primary/20 py-3 overflow-hidden ticker-wrap mt-12">
        <div className="flex gap-12 animate-ticker whitespace-nowrap">
          {[...batchList, ...batchList].map((b, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-sm">
              <span className="badge-success">NEW</span>
              <strong>{b.course}</strong> — {fmtBatchDate(b.startDate)} • {b.mode} • 
              <span className="text-primary font-semibold">{b.seats} seats left</span>
              <span className="text-muted-foreground mx-4">|</span>
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          YOUTUBE VIDEO (autoplay, muted, loop)
      ══════════════════════════════════════════ */}
      <section className="container-px mx-auto max-w-4xl py-16">
        <div className="relative w-full rounded-2xl overflow-hidden border border-border shadow-2xl" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={homepageVideoEmbedUrl(settings?.homepageVideoUrl, "aj1u0IiVZpI")}
            title="GloryTecks IT Training Institute Hyderabad — Introduction Video"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          POPULAR COURSES
      ══════════════════════════════════════════ */}
      <section className="container-px mx-auto max-w-7xl py-20">
        <motion.div className="flex items-end justify-between mb-10 flex-wrap gap-4" {...reveal}>
          <div>
            <div className="section-label"><BookOpen className="h-3 w-3" /> Our Courses</div>
            <h2 className="text-3xl md:text-4xl font-bold">Industry-Ready IT Courses in Hyderabad</h2>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Designed with hiring managers. Built for Hyderabad&rsquo;s job market.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/courses" className="flex items-center gap-2">View All Courses <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </motion.div>

        {/* Data is resolved server-side, so loading/error states can no longer
            occur here — the empty state is still honoured exactly as before. */}
        <QueryState
          isLoading={false}
          isError={false}
          isEmpty={!popular.length}
          minHeight="16rem"
          emptyTitle="No courses yet"
          emptyMessage="Courses will appear here once they're published."
        >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {popular.map((c, i) => {
            const Icon = courseIcons[c.title] || GraduationCap;
            return (
              <motion.div key={c.slug} {...stagger(i)}>
                <div className="group rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-card)] card-hover flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-deep to-primary text-primary-foreground flex items-center justify-center">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {c.duration}
                    </span>
                  </div>
                  <div className="text-xs text-primary font-medium mb-1">{c.category}</div>
                  <h3 className="text-lg font-bold mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{c.tagline}</p>

                  <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 flex-wrap">
                    <span className="badge-success">✓ 100% Placement</span>
                    <span className="text-xs text-muted-foreground">{c.modules.length}+ modules</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button asChild variant="soft" size="sm" className="flex-1">
                      <Link href={`/courses/${c.slug}`}>View Details <ChevronRight className="h-3 w-3" /></Link>
                    </Button>
                    <Button size="sm" variant="hero" onClick={() => openDemo(c.title)}>
                      Free Demo
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        </QueryState>
      </section>

      {/* ══════════════════════════════════════════
          WHY CHOOSE US
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-soft py-20">
        <div className="container-px mx-auto max-w-7xl">
          <motion.div className="text-center max-w-2xl mx-auto mb-14" {...reveal}>
            <div className="section-label"><Target className="h-3 w-3" /> Why GloryTecks</div>
            <h2 className="text-3xl md:text-4xl font-bold">Why GloryTecks is Hyderabad&rsquo;s Best IT Training Institute</h2>
            <p className="text-muted-foreground mt-3">
              We don&rsquo;t just teach — we transform careers with a proven system.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={f.title} {...stagger(i)}
                className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-card)] card-hover flex gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          LEARNING ROADMAPS
      ══════════════════════════════════════════ */}
      <section className="container-px mx-auto max-w-7xl py-20">
        <motion.div className="text-center max-w-2xl mx-auto mb-12" {...reveal}>
          <div className="section-label"><Workflow className="h-3 w-3" /> Learning Path</div>
          <h2 className="text-3xl md:text-4xl font-bold">Your Step-by-Step Roadmap</h2>
          <p className="text-muted-foreground mt-3">From zero to job-ready. Here&rsquo;s exactly what you&rsquo;ll learn.</p>
        </motion.div>
        <div className="flex gap-3 justify-center mb-8 flex-wrap">
          {roadmapList.map((r, i) => (
            <button key={i} onClick={() => setActiveRoadmap(i)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeRoadmap === i ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {r.course}
            </button>
          ))}
        </div>
        {activeRoadmapData && (
        <AnimatePresence mode="wait">
          <motion.div key={activeRoadmap}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            // className={`rounded-2xl border border-border p-8 bg-gradient-to-br ${activeRoadmapData.color} backdrop-blur`}>
            className="rounded-2xl border border-border p-8 backdrop-blur" style={{ background: activeRoadmapData.color }}>
            
            <div className="flex flex-wrap gap-3 justify-center">
              {activeRoadmapData.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                    <span className="text-sm font-medium">{step}</span>
                  </div>
                  {i < activeRoadmapData.steps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 hidden sm:block" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Button variant="hero" onClick={() => openDemo(activeRoadmapData.course)}>
                Start This Roadmap — Free Demo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
        )}
      </section>

      {/* ══════════════════════════════════════════
          MEET OUR TRAINERS
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-soft py-20">
        <div className="container-px mx-auto max-w-7xl">
          <motion.div className="text-center max-w-2xl mx-auto mb-12" {...reveal}>
            <div className="section-label"><Users className="h-3 w-3" /> Meet The Team</div>
            <h2 className="text-3xl md:text-4xl font-bold">Learn from Industry Experts</h2>
            <p className="text-muted-foreground mt-3">Not just academics — real professionals from top companies.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {trainers.map((t, i) => (
              <motion.div key={t.name} {...stagger(i)}
                className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-card)] card-hover text-center">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary-deep to-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {t.name[0]}
                </div>
                <h3 className="font-bold text-lg">{t.name}</h3>
                <p className="text-sm text-primary font-medium mt-1">{t.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.company} • {t.experience} Experience</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {t.skills.map(s => (
                    <span key={s} className="text-xs bg-secondary border border-border px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PLACEMENTS / HIRING PARTNERS
      ══════════════════════════════════════════ */}
      <section className="container-px mx-auto max-w-7xl py-20">
        <motion.div className="text-center max-w-2xl mx-auto mb-10" {...reveal}>
          <div className="section-label"><Briefcase className="h-3 w-3" /> Placements</div>
          <h2 className="text-3xl md:text-4xl font-bold">GloryTecks Students Work At Top Companies</h2>
          <p className="text-muted-foreground mt-3">500+ companies actively hire GloryTecks graduates.</p>
        </motion.div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {companies.map((co, i) => (
            <motion.div key={co.id ?? co.name} {...stagger(i)}
              className="h-16 rounded-xl bg-secondary border border-border flex items-center justify-center text-secondary-foreground font-semibold text-xs card-hover">
              {co.name}
            </motion.div>
          ))}
        </div>
        <motion.div className="mt-8 text-center" {...reveal}>
          <Button asChild variant="outline">
            <Link href="/placements">View Placement Records <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-soft py-20">
        <div className="container-px mx-auto max-w-7xl">
          <motion.div className="text-center max-w-2xl mx-auto mb-12" {...reveal}>
            <div className="section-label"><Star className="h-3 w-3" /> Student Stories</div>
            <h2 className="text-3xl md:text-4xl font-bold">Real Results. Real Careers.</h2>
            <p className="text-muted-foreground mt-3">Join 3000+ professionals who transformed their lives with GloryTecks.</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              {[1,2,3,4,5].map(s => <Star key={s} className="h-5 w-5 fill-yellow-400 text-yellow-400" />)}
              <span className="font-bold ml-1">4.9/5</span>
              <span className="text-muted-foreground text-sm">from 500+ Google reviews</span>
            </div>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} {...stagger(i)}
                className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-card)] card-hover flex flex-col">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(s => <Star key={s} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}
                </div>
                <Quote className="h-6 w-6 text-primary mb-2 flex-shrink-0" />
                <p className="text-sm text-foreground/80 leading-relaxed flex-1">&quot;{t.quote}&quot;</p>
                <div className="mt-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-deep to-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                  <div className="badge-success text-xs">{t.salary}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div className="mt-10 text-center" {...reveal}>
            <a href="https://www.youtube.com/@glorytecks" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-3 bg-card border border-border rounded-2xl px-6 py-4 hover:border-primary/40 transition-all card-hover">
              <div className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center">
                <Play className="h-5 w-5 text-white fill-white ml-0.5" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Watch Student Testimonials</div>
                <div className="text-sm text-muted-foreground">50+ video success stories on YouTube</div>
              </div>
            </a>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          LOCATION / MAP
      ══════════════════════════════════════════ */}
      <section className="container-px mx-auto max-w-7xl py-20">
        <motion.div className="grid lg:grid-cols-2 gap-10 items-center" {...reveal}>
          <div>
            <div className="section-label"><MapPin className="h-3 w-3" /> Visit Us</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Best Data Science Training in<br />
              <span className="gradient-text">Ameerpet, Hyderabad</span>
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Located at <strong className="text-foreground">Ameerpet</strong> — Hyderabad&rsquo;s IT training hub. Easily accessible from all areas of Hyderabad.
              Just 2 minutes walk from Ameerpet Metro Station.
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">{address}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                <a href={phoneHref} className="text-sm hover:text-primary transition-colors">{phone}</a>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm">Mon–Sat: 8AM – 9PM | Sunday: 9AM – 5PM</span>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button variant="hero" onClick={() => openDemo()}>Book Free Demo</Button>
              <Button asChild variant="outline">
                <a href="https://maps.app.goo.gl/oCUrDQA4QUp22E8B6" target="_blank" rel="noreferrer">
                  Get Directions <ArrowRight className="h-4 w-4 ml-1" />
                </a>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border border-border shadow-[var(--shadow-card)] h-[350px]">
            <iframe
              title="GloryTecks Location — Ameerpet Hyderabad"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6468.056115879587!2d78.44224537686785!3d17.436332501389888!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x651a567e218dfc37%3A0xcbca18824dcfbc45!2sGloryTecks!5e1!3m2!1sen!2sin!4v1783153651341!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
                  </motion.div>
      </section>

      {/* ══════════════════════════════════════════
          FAQS
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-soft py-20">
        <div className="container-px mx-auto max-w-4xl">
          <motion.div className="text-center mb-12" {...reveal}>
            <div className="section-label">FAQs</div>
            <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions — GloryTecks IT Courses Hyderabad</h2>
            <p className="text-muted-foreground mt-3">Everything you want to know before enrolling.</p>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} {...stagger(i)}
                className="rounded-2xl bg-card border border-border overflow-hidden shadow-[var(--shadow-card)]">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between gap-4">
                  <span className="font-semibold text-sm sm:text-base">{faq.question}</span>
                  <ChevronDown className={`h-5 w-5 text-primary flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          UPCOMING BATCHES
      ══════════════════════════════════════════ */}
      <section className="container-px mx-auto max-w-7xl py-16">
        <motion.div className="text-center mb-10" {...reveal}>
          <div className="section-label"><Calendar className="h-3 w-3" /> Upcoming Batches</div>
          <h2 className="text-3xl font-bold">Enroll Before Seats Fill Up</h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batchList.map((b, i) => (
            <motion.div key={b.id ?? i} {...stagger(i)}
              className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)] card-hover">
              <div className="text-primary font-bold mb-1">{b.course}</div>
              <div className="text-sm text-muted-foreground mb-1">{fmtBatchDate(b.startDate)}</div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs bg-secondary px-2 py-1 rounded-full">{b.mode}</span>
                <span className="badge-success">{b.seats} seats left</span>
              </div>
              <Button className="w-full mt-3" size="sm" variant="hero" onClick={() => openDemo(b.course)}>
                Reserve Seat
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          BLOG PREVIEW
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-soft py-20">
        <div className="container-px mx-auto max-w-7xl">
          <motion.div className="flex items-end justify-between mb-10 flex-wrap gap-4" {...reveal}>
            <div>
              <div className="section-label"><BookOpen className="h-3 w-3" /> Free Resources</div>
              <h2 className="text-3xl md:text-4xl font-bold">Latest Tech Career Guides</h2>
              <p className="text-muted-foreground mt-2">Free articles to help you navigate your IT career journey.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/blog">View All Articles <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {latestBlogs.map((post, i) => (
              <motion.div key={post.slug} {...stagger(i)}>
                <Link href={blogPath(post.slug)} className="group rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)] card-hover block h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">{post.category}</span>
                    <span className="text-xs text-muted-foreground">{post.readTime} read</span>
                  </div>
                  <h3 className="font-bold leading-snug group-hover:text-primary transition-colors line-clamp-3">{post.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{post.excerpt}</p>
                  <div className="mt-4 text-xs text-primary font-medium flex items-center gap-1">Read article <ArrowRight className="h-3 w-3" /></div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════ */}
      <section className="container-px mx-auto max-w-7xl py-20">
        <motion.div
          className="rounded-3xl bg-gradient-to-br from-primary-deep via-primary to-primary-glow text-primary-foreground p-10 md:p-16 text-center shadow-[var(--shadow-elegant)] relative overflow-hidden"
          {...reveal}
        >
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="relative">
            <div className="section-label bg-white/20 border-white/30 text-white mx-auto w-fit mb-4">
              🎓 Limited Seats Available
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Ready to Launch Your Tech Career?
            </h2>
            <p className="max-w-xl mx-auto opacity-90 mb-8 text-lg">
              Join 3000+ students who got placed at top companies after training at GloryTecks Hyderabad.
              Book your free demo class today — no commitment required.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" variant="secondary" className="font-bold" onClick={() => openDemo()}>
                <Calendar className="h-5 w-5 mr-2" /> Book Free Demo Class
              </Button>
              <Button asChild size="lg" className="bg-white/10 border border-white/30 text-white hover:bg-white/20">
                <a href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-5 w-5 mr-2 text-green-400" /> WhatsApp Us Now
                </a>
              </Button>
            </div>
            <p className="mt-6 text-sm opacity-75">
              📞 Call: +91 9908099980 | 📍 Ameerpet, Hyderabad | ⏰ Mon–Sat 8AM–9PM
            </p>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════
          SEO RICH-TEXT SECTION — Keywords for crawlers, readable for users
      ══════════════════════════════════════════ */}
      <section className="container-px mx-auto max-w-4xl py-16 border-t border-border">
        <motion.div {...reveal} className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <h2 className="text-xl font-bold text-foreground">Best IT Training Institute in Hyderabad — GloryTecks</h2>
          <p>
            GloryTecks is Hyderabad&rsquo;s most trusted IT training institute, located at Ameerpet — the hub of software
            coaching centers in Telangana. We specialize in job-oriented, industry-aligned courses for freshers,
            graduates, BTech students, and working professionals looking to upskill or switch careers into high-demand
            technology roles.
          </p>
          <h3 className="text-base font-semibold text-foreground">Top Courses at GloryTecks Hyderabad</h3>
          <p>
            Our flagship programs include the{" "}
            <Link href="/courses/data-science" className="text-primary hover:underline font-medium">Data Science course in Hyderabad</Link>,{" "}
            <Link href="/courses/gen-ai" className="text-primary hover:underline font-medium">Generative AI course in Hyderabad</Link>,{" "}
            <Link href="/courses/agentic-ai" className="text-primary hover:underline font-medium">Agentic AI course in Hyderabad</Link>,{" "}
            <Link href="/courses/python-programming" className="text-primary hover:underline font-medium">Python programming course in Hyderabad</Link>,{" "}
            <Link href="/courses/power-bi" className="text-primary hover:underline font-medium">Power BI course in Hyderabad</Link>,{" "}
            <Link href="/courses/mlops" className="text-primary hover:underline font-medium">MLOps course in Hyderabad</Link>,{" "}
            <Link href="/courses/data-engineering" className="text-primary hover:underline font-medium">Data Engineering course in Hyderabad</Link>,{" "}
            <Link href="/courses/data-analytics" className="text-primary hover:underline font-medium">Data Analytics course in Hyderabad</Link>, and{" "}
            <Link href="/courses/sql-server" className="text-primary hover:underline font-medium">SQL Server course in Hyderabad</Link>.
            All programs are available in both online and offline (classroom) formats with weekend and weekday batches.
          </p>
          <h3 className="text-base font-semibold text-foreground">Why Students Choose GloryTecks Near Ameerpet &amp; Kukatpally</h3>
          <p>
            Students searching for the best software training institute near Hyderabad, coaching center near Ameerpet Metro,
            or job-oriented courses for freshers consistently choose GloryTecks for our 4.9/5 rating, 95% placement rate,
            and 3000+ successful alumni placed at companies including Google, Amazon, Microsoft, Infosys, TCS, Wipro,
            Deloitte, and 500+ other hiring partners. Our courses come with real-time projects, industry certifications,
            mock interviews, resume building, and dedicated placement drives.
          </p>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════
          VISIBLE FAQ SECTION

          Rendered from HOME_FAQS in lib/schema.ts — the same array the
          FAQPage JSON-LD is built from. Before this the two were maintained
          separately and had already diverged: the schema asserted questions
          that were not on the page (including a "4.9/5 rating" claim) and the
          page showed questions that were not in the schema. FAQ markup that
          does not match visible content is a rich-results violation, so there
          is now exactly one list.
      ══════════════════════════════════════════ */}
      <section className="container-px mx-auto max-w-4xl py-16 border-t border-border">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {HOME_FAQS.map(([q, a], i) => (
            <details
              key={i}
              className="rounded-xl bg-card border border-border p-4 group"
            >
              <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                {q}
                <span className="text-primary transition-transform group-open:rotate-45 text-xl leading-none">+</span>
              </summary>
              <p className="text-muted-foreground mt-3 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
};

export default HomeView;