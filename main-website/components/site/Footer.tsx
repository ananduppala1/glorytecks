"use client";

import Link from "next/link";
import { Facebook, Instagram, Linkedin, Twitter, Youtube, Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import Logo from "./Logo";
import {
  useCourses,
  useLatestBlogs,
  useComparisons,
  useLocalities,
  useContactInfo,
} from "./SiteDataProvider";
import { locationLandings } from "@/config/locationLandings";

// Maps the settings.social keys to their icons, in display order.
const SOCIAL_ICONS = [
  { key: "facebook", Icon: Facebook, label: "Facebook" },
  { key: "instagram", Icon: Instagram, label: "Instagram" },
  { key: "linkedin", Icon: Linkedin, label: "LinkedIn" },
  { key: "twitter", Icon: Twitter, label: "Twitter" },
  { key: "youtube", Icon: Youtube, label: "YouTube" },
] as const;

const Footer = () => {
  // All four collections are fetched once on the server in the (site) layout
  // and shared through context — the React app made four browser requests
  // from the footer on every single page view.
  const courses = useCourses();
  const latestBlogs = useLatestBlogs();
  const comparisons = useComparisons();
  const localities = useLocalities();
  const { phone, phoneHref, whatsappHref, email, emailHref, address, social } = useContactInfo();

  // Lookups for resolving the location-landing route config into display labels.
  const courseTitleBySlug = new Map(courses.map((c) => [c.slug, c.title]));
  const localityNameBySlug = new Map(localities.map((l) => [l.slug, l.name]));

  // Only render landings whose course + locality both exist in the CMS.
  const landings = locationLandings.filter(
    (l) => courseTitleBySlug.has(l.courseSlug) && localityNameBySlug.has(l.localitySlug),
  );

  const socialLinks = SOCIAL_ICONS.map((s) => ({ ...s, href: social?.[s.key] })).filter(
    (s) => !!s.href,
  );

  return (
    <footer className="mt-20 border-t border-border bg-gradient-soft">
      {/* CTA strip */}
      <div className="bg-primary/10 border-b border-primary/20">
        <div className="container-px mx-auto max-w-7xl py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm font-medium">
            🎓 <strong>Free Demo Available</strong> — Talk to our counselor today
          </div>
          <div className="flex items-center gap-3">
            <a href={phoneHref} className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {phone}
            </a>
            <a href={whatsappHref} target="_blank" rel="noreferrer"
              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
              WhatsApp Now
            </a>
          </div>
        </div>
      </div>

      <div className="container-px mx-auto max-w-7xl py-14 grid gap-10 md:grid-cols-2 lg:grid-cols-5">
        {/* Brand */}
        <div className="lg:col-span-2 space-y-4">
          <Logo />
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Hyderabad&rsquo;s #1 IT training institute at Ameerpet. Industry-ready courses in Data Science, Gen AI, Python &
            Analytics with 100% placement support.
          </p>
          {socialLinks.length > 0 && (
            <div className="flex gap-2">
              {socialLinks.map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}
                  className="h-9 w-9 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex">
              {[1,2,3,4,5].map(s => <span key={s} className="text-yellow-400 text-sm">★</span>)}
            </div>
            <span className="text-sm font-semibold">4.9/5</span>
            <span className="text-xs text-muted-foreground">Google Reviews</span>
          </div>
        </div>

        {/* Courses */}
        <div>
          <h4 className="text-sm font-bold mb-4">IT Courses in Hyderabad</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {courses.map(c => (
              <li key={c.slug}>
                <Link href={`/courses/${c.slug}`} className="hover:text-primary transition-colors flex items-center gap-1 group">
                  <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {c.title} Course Hyderabad
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick links + Blog */}
        <div>
          <h4 className="text-sm font-bold mb-4">Quick Links</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {[["Home", "/"], ["About Us", "/about"], ["Placements", "/placements"], ["Blog & Guides", "/blog"], ["Contact Us", "/contact"], ["IT Training in Hyderabad", "/training-in-hyderabad"], ["Our Entities", "/entities"]].map(([l, h]) => (
              <li key={h}><Link href={h} className="hover:text-primary transition-colors">{l}</Link></li>
            ))}
          </ul>
          <h4 className="text-sm font-bold mt-6 mb-3">Latest Blogs</h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {latestBlogs.map(p => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="hover:text-primary transition-colors line-clamp-2 leading-snug">{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-sm font-bold mb-4">Contact Us</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{address}</span>
            </li>
            <li className="flex gap-2">
              <Phone className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <a href={phoneHref} className="hover:text-primary transition-colors">{phone}</a>
            </li>
            <li className="flex gap-2">
              <Mail className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <a href={emailHref} className="hover:text-primary transition-colors">{email}</a>
            </li>
          </ul>
          <div className="mt-4 p-3 rounded-xl bg-card border border-border text-xs text-muted-foreground">
            <strong className="text-foreground block mb-1">Training Hours</strong>
            Mon–Sat: 8AM – 9PM<br />Sunday: 9AM – 5PM
          </div>
        </div>
      </div>

      {/* Popular course locations (internal linking for local SEO) */}
      {landings.length > 0 && (
        <div className="border-t border-border">
          <div className="container-px mx-auto max-w-7xl py-6">
            <h4 className="text-sm font-bold mb-3">Popular Courses by Location in Hyderabad</h4>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {landings.map((l) => (
                <Link key={l.slug} href={`/${l.slug}`} className="hover:text-primary transition-colors">
                  {courseTitleBySlug.get(l.courseSlug)} in {localityNameBySlug.get(l.localitySlug)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Popular comparisons (internal linking) */}
      {comparisons.length > 0 && (
        <div className="border-t border-border">
          <div className="container-px mx-auto max-w-7xl py-6">
            <h4 className="text-sm font-bold mb-3">
              <Link href="/compare" className="hover:text-primary transition-colors">Popular Comparisons →</Link>
            </h4>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {comparisons.map((c) => (
                <Link key={c.slug} href={`/compare/${c.slug}`} className="hover:text-primary transition-colors">
                  {c.itemA} vs {c.itemB}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="container-px mx-auto max-w-7xl py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} GloryTecks IT Training Institute Hyderabad. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/contact" className="hover:text-primary">Privacy Policy</Link>
            <Link href="/contact" className="hover:text-primary">Terms of Service</Link>
            <Link href="/training-in-hyderabad" className="hover:text-primary">IT Training Hyderabad</Link>
            <Link href="/courses/data-science" className="hover:text-primary">Data Science Hyderabad</Link>
            <Link href="/courses/gen-ai" className="hover:text-primary">Gen AI Hyderabad</Link>
            <Link href="/placements" className="hover:text-primary">Placements</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
