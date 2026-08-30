"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { MapPin, Phone, Clock, Train, ArrowRight, CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContactInfo } from "@/components/site/SiteDataProvider";
import { QueryState } from "@/components/common/states";
import type { Course } from "@/types/content";

const reveal = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, transition: { duration: 0.5 }, viewport: { once: true } };

const LocationView = ({ courses }: { courses: Course[] }) => {
  const { phoneHref, whatsappHref, phone, email, address } = useContactInfo();


  const keywords = [
    "Best Data Science Training in Hyderabad",
    "Python Course near Ameerpet",
    "Generative AI Course Hyderabad",
    "Power BI Training Ameerpet",
    "Data Analytics Course Hyderabad",
    "IT Training Institute near Metro",
    "MLOps Course Hyderabad",
    "Data Engineering Training",
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-hero py-16">
        <div className="container-px mx-auto max-w-7xl">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:text-primary">Home</Link> /
            <span className="text-foreground">IT Training in Hyderabad</span>
          </nav>
          <motion.div className="max-w-3xl" {...reveal}>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-4">
              <MapPin className="h-3 w-3" /> Ameerpet, Hyderabad
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Best IT Training Institute in <span className="gradient-text">Hyderabad</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              GloryTecks at Ameerpet, Hyderabad — the city&rsquo;s top-rated training center for Data Science,
              Generative AI, Python, Power BI and Data Analytics. Walk-in demos daily. 100% placement support.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button variant="hero" asChild><a href={phoneHref}><Phone className="h-4 w-4 mr-1" /> Call Now</a></Button>
              <Button variant="outline" asChild><a href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp Demo</a></Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Location details + map */}
      <section className="container-px mx-auto max-w-7xl py-16">
        <div className="grid lg:grid-cols-2 gap-10">
          <motion.div {...reveal}>
            <h2 className="text-2xl font-bold mb-6">Visit Our Hyderabad Center</h2>
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Address</div>
                  <div className="text-sm text-muted-foreground">{address}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                <Train className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Nearest Metro</div>
                  <div className="text-sm text-muted-foreground">Ameerpet Metro Station — 2 min walk (both Red & Blue lines)</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Working Hours</div>
                  <div className="text-sm text-muted-foreground">Mon–Sat: 8AM – 9PM | Sunday: 9AM – 5PM</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Contact</div>
                  <div className="text-sm text-muted-foreground">{phone} | {email}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => <Star key={s} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
              </div>
              <span className="font-bold">4.9/5</span>
              <span className="text-sm text-muted-foreground">from 500+ Google Reviews</span>
            </div>
          </motion.div>
          <motion.div {...reveal} className="rounded-2xl overflow-hidden border border-border h-[400px]">
            <iframe title="GloryTecks Hyderabad" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.4!2d78.4463!3d17.4375!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb90d2e7a2f4a1%3A0x1!2sAmeerpet%2C+Hyderabad%2C+Telangana!5e0!3m2!1sen!2sin!4v1" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" />
          </motion.div>
        </div>
      </section>

      {/* Courses in Hyderabad */}
      <section className="bg-gradient-soft py-16">
        <div className="container-px mx-auto max-w-7xl">
          <motion.div className="text-center mb-10" {...reveal}>
            <h2 className="text-3xl font-bold">IT Courses Available in Hyderabad</h2>
            <p className="text-muted-foreground mt-2">All courses available online and at our Ameerpet center.</p>
          </motion.div>
          <QueryState
            isLoading={false}
            isError={false}
            isEmpty={!courses.length}
            minHeight="12rem"
            emptyTitle="No courses yet"
            emptyMessage="Courses will appear here once they're published."
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((c, i) => (
                <motion.div key={c.slug} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} viewport={{ once: true }}>
                  <Link href={`/courses/${c.slug}`} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all group">
                    <div>
                      <div className="font-semibold group-hover:text-primary transition-colors">{c.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{c.duration} • {c.modules.length}+ modules</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </QueryState>
        </div>
      </section>

      {/* SEO keyword section */}
      <section className="container-px mx-auto max-w-7xl py-16">
        <motion.div {...reveal}>
          <h2 className="text-2xl font-bold mb-6">Why GloryTecks is Hyderabad&rsquo;s Top IT Institute</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {keywords.map((kw, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                <span>{kw}</span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl">
            GloryTecks is Hyderabad&rsquo;s most trusted IT training institute, located in the heart of Ameerpet —
            the city&rsquo;s tech training hub. We offer hands-on training in Data Science, Generative AI, Python,
            Power BI, MLOps, Data Analytics, and Data Engineering. Our industry expert trainers, small batch
            sizes (max 15 students), and dedicated placement cell ensure every student gets personalized
            attention and job-ready skills. With 500+ hiring partners across Hyderabad, Bengaluru, Chennai,
            and Pune, GloryTecks graduates are placed across India&rsquo;s top companies.
          </p>
        </motion.div>
      </section>

      {/* NEAR HYDERABAD / LOCAL SEO SECTION */}
      <section className="container-px mx-auto max-w-4xl py-10 border-t border-border">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-muted-foreground text-sm space-y-3"
        >
          <h2 className="text-lg font-bold text-foreground">Training Institute Near Hyderabad — Serving Ameerpet, Kukatpally &amp; Nearby Areas</h2>
          <p>
            GloryTecks is conveniently located near Ameerpet Metro Station, making it easily accessible from across
            Hyderabad. Students from Kukatpally, KPHB, Miyapur, Madhapur, Begumpet, Banjara Hills, Dilsukhnagar,
            LB Nagar, Uppal, and all parts of Hyderabad regularly attend our courses. We are the top-rated training
            institute near Ameerpet for Data Science, AI, Python, Power BI, MLOps, Data Engineering, Data Analytics,
            and SQL Server training.
          </p>
          <p>
            Looking for the best coaching center near Hyderabad with placement support? GloryTecks offers offline
            classroom training, live online training, and hybrid batches to serve students from Hyderabad, Secunderabad,
            and nearby areas. Our{" "}
            <Link href="/placements" className="text-primary hover:underline">placement record</Link> speaks for itself —
            3000+ students placed, 95% placement rate, packages up to 22 LPA.
          </p>
        </motion.div>
      </section>
    </>
  );
};

export default LocationView;
