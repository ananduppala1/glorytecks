"use client";

// Still a Client Component, but no longer because of an animation library.
// It reads contact details from the SiteDataProvider React context via
// useContactInfo(). Framer Motion is gone (see components/ui/reveal.tsx), so
// the JS this now ships is its own logic rather than 62 KB of animation
// runtime. To finish the conversion, the page would pass the derived contact
// info down as a prop instead of reading context — tracked in
// docs/PERFORMANCE_AUDIT.md.

import Link from "next/link";
import { motion } from '@/components/ui/reveal';
import { ArrowRight, MapPin, Clock, Briefcase, TrendingUp, MessageCircle, Phone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContactInfo, whatsappLink } from "@/components/site/SiteDataProvider";
import { locationLandings, type LocationLanding } from "@/config/locationLandings";
import type { CategoryKnowledge, Course, Locality } from "@/types/content";

const reveal = {
  initial: { opacity: 0, y: 60 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 1 },
  viewport: { once: true },
};

export interface LocationCourseViewProps {
  landing: LocationLanding;
  course: Course;
  loc: Locality;
  allCourses: Course[];
  localities: Locality[];
  career?: CategoryKnowledge;
  /** Pre-built FAQ pairs — shared with the page's FAQPage JSON-LD. */
  faqs: [string, string][];
}

/**
 * Programmatic local-SEO landing page body.
 *
 * The route file resolves the landing slug from config, fetches the course and
 * locality, builds the FAQ copy (so the visible <details> and the FAQPage
 * schema can never drift apart) and 404s when anything is missing. This
 * component only renders.
 */
const LocationCourseView = ({
  landing,
  course,
  loc,
  allCourses,
  localities,
  career,
  faqs,
}: LocationCourseViewProps) => {
  const { phone, phoneHref, whatsapp } = useContactInfo();

  const courseTitleBySlug = new Map(allCourses.map((c) => [c.slug, c.title]));
  const localityNameBySlug = new Map(localities.map((l) => [l.slug, l.name]));

  // Other localities offering the same course (internal links)
  const sameCourseElsewhere = landing
    ? locationLandings.filter((l) => l.courseSlug === landing.courseSlug && l.slug !== landing.slug)
    : [];
  // Other priority courses at this locality (internal links)
  const otherCoursesHere = landing
    ? locationLandings.filter((l) => l.localitySlug === landing.localitySlug && l.courseSlug !== landing.courseSlug)
    : [];

  return (
    <>
      {/* HERO */}
      <motion.section className="bg-gradient-hero" {...reveal}>
        <div className="container-px mx-auto max-w-7xl py-14 md:py-20 space-y-5">
          <div className="section-label inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {loc.name}, Hyderabad
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            {course.title} Course in {loc.name}, Hyderabad
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">{loc.intro}</p>
          <p className="text-foreground/80 max-w-3xl">
            {course.description} {loc.context}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild variant="hero" size="lg">
              <Link href="/contact">Book a Free Demo <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-green-500/50 text-green-400 hover:bg-green-500/10 hover:text-green-300">
              <a href={whatsappLink(whatsapp, `Hi, I'm interested in the ${course.title} course in ${loc.name}`)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" /> WhatsApp Us
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={phoneHref}><Phone className="h-4 w-4" /> {phone}</a>
            </Button>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-muted-foreground pt-2">
            <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> {course.duration}</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 100% placement support</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Online & classroom batches</span>
          </div>
        </div>
      </motion.section>

      {/* WHY LEARN HERE */}
      <motion.section className="container-px mx-auto max-w-7xl py-14" {...reveal}>
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Why learn {course.title} in {loc.name}?
        </h2>
        <p className="text-foreground/80 max-w-4xl">
          {loc.context} GloryTecks combines industry-experienced trainers, real-time projects and dedicated
          placement support so learners near {loc.nearby} become job-ready for Hyderabad&rsquo;s growing technology
          job market.
        </p>
      </motion.section>

      {/* CURRICULUM HIGHLIGHTS */}
      <motion.section className="container-px mx-auto max-w-7xl pb-4" {...reveal}>
        <h2 className="text-2xl md:text-3xl font-bold mb-6">{course.title} Course Curriculum</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {course.modules.slice(0, 10).map((m, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl bg-card border border-border p-4">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-foreground/90">{m}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Tools covered: {course.tools.slice(0, 12).join(", ")}.
        </p>
        <div className="mt-5">
          <Button asChild variant="outline">
            <Link href={`/courses/${course.slug}`}>
              View full {course.title} syllabus <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.section>

      {/* CAREER & SALARY */}
      {career && (
        <motion.section className="container-px mx-auto max-w-7xl py-14" {...reveal}>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            {course.title} Career Opportunities & Salaries in Hyderabad
          </h2>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <div className="flex items-center gap-2 font-semibold mb-3"><Briefcase className="h-5 w-5 text-primary" /> Job Roles</div>
              <ul className="space-y-2">
                {career.roles.map((r) => (
                  <li key={r} className="flex items-center gap-2 text-foreground/90">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> {r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 font-semibold mb-3"><TrendingUp className="h-5 w-5 text-primary" /> Salary Range (Hyderabad)</div>
              <div className="space-y-2 text-foreground/90">
                <div className="flex justify-between rounded-lg bg-card border border-border px-4 py-2"><span>Fresher (0–1 yr)</span><span className="font-semibold">{career.salary.fresher}</span></div>
                <div className="flex justify-between rounded-lg bg-card border border-border px-4 py-2"><span>Mid-level (2–5 yr)</span><span className="font-semibold">{career.salary.mid}</span></div>
                <div className="flex justify-between rounded-lg bg-card border border-border px-4 py-2"><span>Senior (6+ yr)</span><span className="font-semibold">{career.salary.senior}</span></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Indicative ranges based on Hyderabad market trends; actual pay varies by skills and employer.</p>
            </div>
          </div>
        </motion.section>
      )}

      {/* FAQ */}
      <motion.section className="container-px mx-auto max-w-4xl py-12" {...reveal}>
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          {course.title} Course in {loc.name} — FAQs
        </h2>
        <div className="space-y-3">
          {faqs.map(([q, a], i) => (
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

      {/* INTERNAL LINKS */}
      <motion.section className="container-px mx-auto max-w-7xl pb-20 space-y-8" {...reveal}>
        {sameCourseElsewhere.length > 0 && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-4">{course.title} Course in Other Areas of Hyderabad</h2>
            <div className="flex flex-wrap gap-3">
              {sameCourseElsewhere.map((l) => (
                <Link key={l.slug} href={`/${l.slug}`} className="text-sm rounded-full border border-border bg-card px-4 py-2 hover:border-primary/50 transition-smooth">
                  {course.title} in {localityNameBySlug.get(l.localitySlug) ?? l.localitySlug}
                </Link>
              ))}
            </div>
          </div>
        )}
        {otherCoursesHere.length > 0 && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-4">Other Courses in {loc.name}, Hyderabad</h2>
            <div className="flex flex-wrap gap-3">
              {otherCoursesHere.map((l) => (
                <Link key={l.slug} href={`/${l.slug}`} className="text-sm rounded-full border border-border bg-card px-4 py-2 hover:border-primary/50 transition-smooth">
                  {courseTitleBySlug.get(l.courseSlug) ?? l.courseSlug} in {loc.name}
                </Link>
              ))}
            </div>
          </div>
        )}
        <div className="rounded-3xl bg-gradient-primary text-primary-foreground p-10 md:p-14 grid md:grid-cols-2 gap-6 items-center shadow-elegant">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Start your {course.title} journey in {loc.name}</h2>
            <p className="opacity-90 mt-2 max-w-xl">Book a free demo, talk to a counsellor, and get a personalized learning and placement roadmap.</p>
          </div>
          <div className="md:text-right">
            <Button asChild size="lg" variant="secondary">
              <Link href="/contact">Book a Free Demo</Link>
            </Button>
          </div>
        </div>
      </motion.section>
    </>
  );
};

export default LocationCourseView;
