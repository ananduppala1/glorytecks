"use client";

import Link from "next/link";
import { motion } from "framer-motion";


import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Code2,
  GraduationCap,
  Layers,
  MessageCircle,
  Rocket,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { useContactInfo } from "@/components/site/SiteDataProvider";
import type { Course } from "@/types/content";

const smoothReveal = {
  initial: { opacity: 0, y: 80 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 1.2 },
  viewport: { once: true },
};

export interface CourseDetailViewProps {
  course: Course;
  allCourses: Course[];
}

/**
 * Course detail body.
 *
 * The React version resolved the slug, fetched the course, and rendered
 * loading / error / not-found branches inline. In Next.js the server page does
 * the fetching and calls `notFound()` for a missing slug, so this component
 * always receives a real course and renders one thing: the page.
 */
const CourseDetailView = ({ course, allCourses }: CourseDetailViewProps) => {
  const { whatsappHref } = useContactInfo();

  return (
    <>
      {/* HERO SECTION */}
      <motion.section className="bg-gradient-hero" style={{
        backgroundImage: course.bannerImage
              ? `url(${course.bannerImage})`
              : "bg-gradient-hero",
          }}
          {...smoothReveal}
        >
        <div className="container-px mx-auto max-w-7xl py-14 md:py-20 grid lg:grid-cols-3 gap-10 items-start">

          {/* LEFT CONTENT */}
          <motion.div className="lg:col-span-2 space-y-5" {...smoothReveal}>
            <div className="text-xs font-medium text-primary">{course.category}</div>

            <h1 className="text-3xl md:text-5xl font-bold">{course.title} Course in Hyderabad</h1>

            <p className="text-lg text-muted-foreground">{course.tagline}</p>

            <p className="text-foreground/80">{course.description}</p>

            <div className="flex flex-wrap gap-3 pt-2">

              {/* ENROLL BUTTON */}
              <Button asChild variant="hero" size="lg">
                <Link href="/contact">
                  Enroll Now <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              {/* DOWNLOAD BROCHURE */}
              <Button asChild variant="outline" size="lg">
                <Link href={`/brochures/${course.slug}/download`} target="_blank" rel="noopener noreferrer">
                  Download Brochure
                </Link>
              </Button>

              {/* TALK TO EXPERT */}
              <Button asChild variant="outline" size="lg" className="border-green-500/50 text-green-400 hover:bg-green-500/10 hover:text-green-300 hover:border-green-400">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> Talk To Expert
                </a>
              </Button>

            </div>
          </motion.div>

          {/* COURSE INFO CARD */}
          <motion.div className="rounded-2xl bg-card border border-border p-6 shadow-card space-y-4" {...smoothReveal}>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Duration</div>
                <div className="font-semibold">{course.duration}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Layers className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Modules</div>
                <div className="font-semibold">{course.modules.length}+ topics</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Placement</div>
                <div className="font-semibold">100% Support</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Certification</div>
                <div className="font-semibold">Industry Recognized</div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* COURSE CONTENT */}
      <motion.section className="container-px mx-auto max-w-7xl py-16 grid lg:grid-cols-2 gap-10" {...smoothReveal}>

        {/* SYLLABUS */}
        <motion.div className="rounded-2xl bg-card border border-border p-8 shadow-card" {...smoothReveal}>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Syllabus</h2>
          </div>

          {course.syllabus?.length ? (
            <Accordion type="single" collapsible defaultValue="sec-0" className="space-y-3">
              {course.syllabus.map((sec, i) => (
                <motion.div key={sec.title}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: i * 0.15 }}
                  viewport={{ once: true }}>
                  <AccordionItem value={`sec-${i}`} className="border-0">
                    <AccordionTrigger className="rounded-xl px-5 py-3 text-left font-semibold hover:no-underline bg-accent/70 text-foreground data-[state=open]:bg-gradient-primary data-[state=open]:text-primary-foreground data-[state=open]:shadow-elegant transition-smooth [&[data-state=open]>svg]:text-primary-foreground">
                      {sec.title}
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pt-4 pb-2">
                      <ul className="space-y-2">
                        {sec.items.map((it) => (
                          <li key={it} className="flex gap-2 text-sm text-foreground/80">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          ) : (
            <ol className="space-y-3">
              {course.modules.map((m, i) => (
                <motion.li key={m} className="flex gap-3"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                  viewport={{ once: true }}>
                  <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground/80">{m}</span>
                </motion.li>
              ))}
            </ol>
          )}
        </motion.div>

        {/* TOOLS + PROJECTS */}
        <motion.div className="space-y-6" {...smoothReveal}>

          {/* TOOLS */}
          <motion.div className="rounded-2xl bg-card border border-border p-8 shadow-card" {...smoothReveal}>
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Tools Covered</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {course.tools.map((t, i) => (
                <motion.span key={t}
                  className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: i * 0.08 }}
                  viewport={{ once: true }}>
                  {t}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* PROJECTS */}
          <motion.div className="rounded-2xl bg-card border border-border p-8 shadow-card" {...smoothReveal}>
            <div className="flex items-center gap-2 mb-4">
              <Rocket className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Projects Included</h2>
            </div>
            <ul className="space-y-2">
              {course.projects.map((p, i) => (
                <motion.li key={p} className="flex items-start gap-2 text-sm"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: i * 0.12 }}
                  viewport={{ once: true }}>
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  {p}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* PLACEMENT SUPPORT */}
      <motion.section className="container-px mx-auto max-w-7xl pb-20" {...smoothReveal}>
        <motion.div
          className="rounded-3xl bg-gradient-primary text-primary-foreground p-10 md:p-14 grid md:grid-cols-2 gap-6 items-center shadow-elegant"
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          viewport={{ once: true }}>
          <div>
            <h3 className="text-2xl md:text-3xl font-bold">Placement Support</h3>
            <p className="opacity-90 mt-2 max-w-xl">{course.placement}</p>
          </div>
          <div className="md:text-right">
            <Button asChild size="lg" variant="secondary">
              <Link href="/contact">Talk to a Counselor</Link>
            </Button>
          </div>
        </motion.div>
      </motion.section>
      {/* FREQUENTLY ASKED QUESTIONS (visible — matches FAQ schema) */}
      <motion.section className="container-px mx-auto max-w-4xl pb-20" {...smoothReveal}>
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          {course.title} Course in Hyderabad — Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {(course.faqs ?? []).map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-foreground/80">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.section>

      {/* RELATED COURSES (internal linking) */}
      <motion.section className="container-px mx-auto max-w-7xl pb-24" {...smoothReveal}>
        <h2 className="text-2xl md:text-3xl font-bold mb-6">Related Courses in Hyderabad</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCourses
            .filter((c) => c.slug !== course.slug)
            .slice(0, 6)
            .map((c) => (
              <Link
                key={c.slug}
                href={`/courses/${c.slug}`}
                className="rounded-2xl bg-card border border-border p-5 shadow-card hover:border-primary/50 transition-smooth block"
              >
                <div className="text-xs text-primary mb-1">{c.category}</div>
                <div className="font-semibold">{c.title} Course in Hyderabad</div>
                <div className="text-sm text-muted-foreground mt-1">{c.tagline}</div>
                <span className="inline-flex items-center gap-1 text-sm text-primary mt-3">
                  View course <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
        </div>
      </motion.section>
    </>
  );
};

export default CourseDetailView;