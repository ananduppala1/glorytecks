"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Users,
  Briefcase,
  Award,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/SafeImage";
import type { AboutContent, AboutSection, AboutStat } from "@/types/content";

/* LOCAL IMAGES — used as fallbacks so the page looks identical before any edits */
import about1 from "@/assets/about1.webp";
import about2 from "@/assets/about2.webp";

const smoothReveal = {
  initial: { opacity: 0, y: 80 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 1.2 },
  viewport: { once: true },
};

/* Map a stat's icon name (from the CMS) to a lucide icon, with a sensible default. */
const STAT_ICONS: Record<string, LucideIcon> = {
  Users,
  GraduationCap,
  Briefcase,
  Award,
};

/* Render a heading string, honouring any manual line breaks the editor added. */
function MultilineHeading({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

/* Fallback content — mirrors the original static About page so it renders
   identically even before any CMS edits or if the API is unavailable. */
const FALLBACK_SECTIONS: AboutSection[] = [
  {
    eyebrow: "Who We Are",
    heading: "Learn From Industry Experts",
    body: "GloryTecks was founded with one mission — bridging the gap between academic learning and real-world industry requirements.",
    bullets: [
      "Real-time industry projects",
      "Hands-on practical training",
      "Placement assistance",
      "Experienced mentors",
      "Industry-recognized certifications",
    ],
    image: "",
    imageAlt:
      "GloryTecks expert trainers and mentors — industry professionals teaching Data Science, AI, Python in Hyderabad",
    imageSide: "left",
  },
];

const FALLBACK_STATS: AboutStat[] = [
  { value: "3000+", label: "Students Trained", icon: "Users" },
  { value: "10+", label: "Courses", icon: "GraduationCap" },
  { value: "95%", label: "Placement Support", icon: "Briefcase" },
  { value: "100%", label: "Practical Learning", icon: "Award" },
];

const AboutView = ({ about }: { about: AboutContent | null }) => {

  const hero = about?.hero;
  const sections: AboutSection[] = about?.sections?.length ? about.sections : FALLBACK_SECTIONS;
  const stats: AboutStat[] = about?.stats?.length ? about.stats : FALLBACK_STATS;
  const cta = about?.cta;

  const heroImage = hero?.image || about1;

  return (
    <>
      {/* HERO */}
      <motion.section
        className="bg-gradient-hero"
        {...smoothReveal}
      >
        <div className="container-px mx-auto max-w-7xl py-20 grid lg:grid-cols-2 gap-12 items-center">

          {/* LEFT CONTENT */}
          <motion.div {...smoothReveal}>
            <div className="text-primary font-medium mb-3">
              {hero?.badge ?? "About GloryTecks"}
            </div>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              <MultilineHeading text={hero?.heading ?? "Shaping Careers.\nBuilding Futures."} />
            </h1>

            <p className="text-muted-foreground text-lg mt-6 leading-relaxed">
              {hero?.description ??
                "At GloryTecks, we don’t just teach technology — we build careers. We help students and working professionals become industry-ready with real-time training, projects, mentorship, and placement support."}
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <Button asChild variant="hero" size="lg">
                <Link href={hero?.primaryCtaLink || "/courses"}>
                  {hero?.primaryCtaText || "Explore Courses"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg">
                <Link href={hero?.secondaryCtaLink || "/contact"}>
                  {hero?.secondaryCtaText || "Talk to Counselor"}
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* HERO IMAGE */}
          <motion.div {...smoothReveal}>
            <SafeImage
              src={heroImage}
              alt={hero?.imageAlt || "GloryTecks IT training institute Hyderabad — expert-led classroom training for Data Science and AI courses"}
              width={1200}
              height={800}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              className="rounded-3xl shadow-elegant w-full h-[500px] object-cover border border-border"
            />
          </motion.div>
        </div>
      </motion.section>

      {/* ALTERNATING CONTENT SECTIONS */}
      {sections.map((section, index) => {
        const imageLeft = section.imageSide !== "right";
        // Fall back to the original static image so an unedited page is unchanged.
        const sectionImage = section.image || about2;

        const imageBlock = (
          <motion.div {...smoothReveal}>
            <SafeImage
              src={sectionImage}
              alt={section.imageAlt || "GloryTecks expert trainers and mentors — industry professionals teaching Data Science, AI, Python in Hyderabad"}
              width={1200}
              height={800}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="rounded-3xl shadow-card w-full h-[500px] object-cover border border-border"
            />
          </motion.div>
        );

        const contentBlock = (
          <motion.div {...smoothReveal}>
            {section.eyebrow && (
              <div className="text-primary font-medium mb-3">{section.eyebrow}</div>
            )}

            {section.heading && (
              <h2 className="text-3xl md:text-5xl font-bold mb-6">{section.heading}</h2>
            )}

            {section.body && (
              <p className="text-muted-foreground leading-relaxed mb-6">{section.body}</p>
            )}

            {section.bullets?.length > 0 && (
              <div className="space-y-4">
                {section.bullets.map((item, i) => (
                  <motion.div
                    key={item + i}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, y: 60 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 1,
                      delay: i * 0.15,
                    }}
                    viewport={{ once: true }}
                  >
                    <CheckCircle2 className="h-5 w-5 text-primary" />

                    <span>{item}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        );

        return (
          <motion.section
            key={index}
            className="container-px mx-auto max-w-7xl py-20"
            {...smoothReveal}
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {imageLeft ? (
                <>
                  {imageBlock}
                  {contentBlock}
                </>
              ) : (
                <>
                  {contentBlock}
                  {imageBlock}
                </>
              )}
            </div>
          </motion.section>
        );
      })}

      {/* STATS */}
      {stats.length > 0 && (
        <motion.section
          className="bg-gradient-soft py-20"
          {...smoothReveal}
        >
          <div className="container-px mx-auto max-w-7xl">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

              {stats.map((s, index) => {
                const Icon = (s.icon && STAT_ICONS[s.icon]) || Award;
                return (
                  <motion.div
                    key={s.label + index}
                    className="rounded-2xl bg-card border border-border p-8 text-center shadow-card transition-smooth"
                    initial={{ opacity: 0, y: 80 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 1,
                      delay: index * 0.2,
                    }}
                    viewport={{ once: true }}
                  >
                    <div className="h-14 w-14 rounded-2xl bg-gradient-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-7 w-7" />
                    </div>

                    <div className="text-3xl font-bold gradient-text">
                      {s.value}
                    </div>

                    <div className="text-muted-foreground mt-2">
                      {s.label}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>
      )}

      {/* CTA */}
      <motion.section
        className="container-px mx-auto max-w-7xl py-20"
        {...smoothReveal}
      >
        <motion.div
          className="rounded-3xl bg-gradient-primary text-primary-foreground p-10 md:p-16 text-center shadow-elegant"
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-bold">
            {cta?.heading || "Start Your Tech Career Today"}
          </h2>

          <p className="mt-4 max-w-2xl mx-auto opacity-90">
            {cta?.description ||
              "Join GloryTecks and become industry-ready with real-world skills and placement-focused learning."}
          </p>

          <div className="mt-8">
            <Button asChild size="lg" variant="secondary">
              <Link href={cta?.buttonLink || "/contact"}>
                {cta?.buttonText || "Get Started"}
              </Link>
            </Button>
          </div>
        </motion.div>
      </motion.section>
    </>
  );
};

export default AboutView;
