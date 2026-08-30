'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronDown, Menu, X, Phone, MessageCircle, Calendar } from 'lucide-react';
import Logo from './Logo';
import { Button } from '@/components/ui/button';
import { useCourses, useLocalities, useSettings, useContactInfo } from './SiteDataProvider';
import { buildCourseNav } from '@/lib/courseNav';
import DemoModal from './DemoModal';

const resources = [
  { label: 'LMS', to: '/resources/lms' },
  { label: 'Glory-AI', to: '/resources/glory-ai' },
  { label: 'Interview Questions', to: '/resources/interview-questions' },
  { label: 'Course Material', to: '/resources/course-material' },
  { label: 'Video Lectures', to: '/resources/video-lectures' },
];

const Header = () => {
  // Course mega-menu, location links and the announcement bar are still driven
  // entirely by the CMS — the data now arrives from the server through context
  // instead of three React Query fetches per page view.
  const courses = useCourses();
  const courseNav = buildCourseNav(courses);
  const localities = useLocalities();
  const settings = useSettings();
  const { phone, phoneHref, whatsappHref } = useContactInfo();

  // Replaces react-router's <NavLink isActive> render-prop.
  const pathname = usePathname();

  // Announcement bar text is CMS-managed; fall back to the original default.
  const announcementText =
    settings?.announcementText?.trim() || '🎓 Next Batch Starting June 10 —';

  // Data Science is the flagship course; each location page cross-links the others.
  const locationNav = localities.map((l) => ({
    label: l.name,
    to: `/data-science-course-${l.slug}`,
  }));

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [mobileCourseOpen, setMobileCourseOpen] = useState(false);
  const [mobileResourceOpen, setMobileResourceOpen] = useState(false);
  const [mobileLocationOpen, setMobileLocationOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile drawer when a navigation completes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navLinkClass = (href: string, exact = false) => {
    const isActive = exact ? pathname === href : pathname.startsWith(href);
    return `text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:text-primary ${
      isActive ? 'text-primary' : 'text-muted-foreground'
    }`;
  };

  return (
    <>
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />

      {/* Top announcement bar */}
      <div className="bg-primary/10 border-b border-primary/20 py-1.5 text-center text-xs font-medium">
        {announcementText}
        <button
          onClick={() => setDemoOpen(true)}
          className="text-primary ml-1 hover:underline font-semibold"
        >
          Book Free Demo Seat →
        </button>
      </div>

      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm' : 'bg-transparent'}`}
        role="banner"
        itemScope
        itemType="https://schema.org/WPHeader"
      >
        <div className="container-px mx-auto max-w-7xl flex h-16 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 mr-6">
            <Logo />
          </div>

          {/* Desktop Nav */}
          <nav
            className="hidden lg:flex items-center flex-1 justify-center gap-1"
            aria-label="Main navigation — GloryTecks IT Training Hyderabad"
          >
            <Link href="/" className={navLinkClass('/', true)}>
              Home
            </Link>

            <Link href="/about" className={navLinkClass('/about')}>
              About Us
            </Link>

            {/* Courses dropdown */}
            <div className="relative group">
              <button
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 px-4 py-2 rounded-lg"
                aria-haspopup="true"
                aria-label="Courses menu"
              >
                Courses <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <div className="absolute top-full left-0 mt-1 w-56 rounded-xl bg-popover border border-border shadow-[var(--shadow-card)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-2 z-50">
                <Link
                  href="/courses"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors font-medium mb-1"
                >
                  All Courses →
                </Link>
                {courseNav.map((cat) =>
                  cat.items.map((item) => (
                    <Link
                      key={item.slug}
                      href={`/courses/${item.slug}`}
                      className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                    >
                      {item.label}
                    </Link>
                  )),
                )}
              </div>
            </div>

            {/* Resources dropdown */}
            <div className="relative group">
              <button
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 px-4 py-2 rounded-lg"
                aria-haspopup="true"
                aria-label="Resources menu"
              >
                Resources <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <div className="absolute top-full left-0 mt-1 w-52 rounded-xl bg-popover border border-border shadow-[var(--shadow-card)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-2 z-50">
                {resources.map((r) => (
                  <Link
                    key={r.to}
                    href={r.to}
                    className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                  >
                    {r.label}
                  </Link>
                ))}
                <div className="my-1 border-t border-border" />
                <Link
                  href="/blog"
                  className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                >
                  📝 Blog &amp; Guides
                </Link>
              </div>
            </div>

            {/* Locations dropdown — commented out in the original, kept commented
                so the desktop nav renders identically.
            <div className="relative group">…</div> */}

            <Link href="/entities" className={navLinkClass('/entities')}>
              Our Entities
            </Link>

            <Link href="/placements" className={navLinkClass('/placements')}>
              Placements
            </Link>

            <Link href="/contact" className={navLinkClass('/contact')}>
              Contact
            </Link>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <a
              href={phoneHref}
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              <Phone className="h-3.5 w-3.5" /> {phone}
            </a>
            <Button variant="hero" size="sm" onClick={() => setDemoOpen(true)}>
              <Calendar className="h-3.5 w-3.5" /> Free Demo
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden ml-auto p-2 rounded-lg bg-secondary"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border bg-background/98 backdrop-blur-md px-4 py-4 space-y-1">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-accent hover:text-primary transition-colors"
            >
              Home
            </Link>

            <Link
              href="/about"
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-accent hover:text-primary transition-colors"
            >
              About Us
            </Link>

            {/* Mobile Courses Dropdown */}
            <div>
              <button
                onClick={() => setMobileCourseOpen((v) => !v)}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-accent hover:text-primary transition-colors"
              >
                Courses
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${mobileCourseOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {mobileCourseOpen && (
                <div className="mt-1 ml-3 pl-3 border-l border-border space-y-1">
                  <Link
                    href="/courses"
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 px-3 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors font-medium"
                  >
                    All Courses →
                  </Link>
                  {courseNav.map((cat) =>
                    cat.items.map((item) => (
                      <Link
                        key={item.slug}
                        href={`/courses/${item.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className="block py-2 px-3 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                      >
                        {item.label}
                      </Link>
                    )),
                  )}
                </div>
              )}
            </div>

            {/* Mobile Resources Dropdown */}
            <div>
              <button
                onClick={() => setMobileResourceOpen((v) => !v)}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-accent hover:text-primary transition-colors"
              >
                Resources
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${mobileResourceOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {mobileResourceOpen && (
                <div className="mt-1 ml-3 pl-3 border-l border-border space-y-1">
                  {resources.map((r) => (
                    <Link
                      key={r.to}
                      href={r.to}
                      onClick={() => setMobileOpen(false)}
                      className="block py-2 px-3 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                    >
                      {r.label}
                    </Link>
                  ))}
                  <div className="my-1 border-t border-border" />
                  <Link
                    href="/blog"
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 px-3 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                  >
                    📝 Blog &amp; Guides
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Locations Dropdown */}
            <div>
              <button
                onClick={() => setMobileLocationOpen((v) => !v)}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-accent hover:text-primary transition-colors"
              >
                Locations
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${mobileLocationOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {mobileLocationOpen && (
                <div className="mt-1 ml-3 pl-3 border-l border-border space-y-1">
                  {locationNav.map((l) => (
                    <Link
                      key={l.to}
                      href={l.to}
                      onClick={() => setMobileOpen(false)}
                      className="block py-2 px-3 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/entities"
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-accent hover:text-primary transition-colors"
            >
              Our Entities
            </Link>

            <Link
              href="/placements"
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-accent hover:text-primary transition-colors"
            >
              Placements
            </Link>

            <Link
              href="/contact"
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-accent hover:text-primary transition-colors"
            >
              Contact
            </Link>

            <div className="pt-3 flex gap-2">
              <Button
                variant="hero"
                className="flex-1"
                onClick={() => {
                  setMobileOpen(false);
                  setDemoOpen(true);
                }}
              >
                <Calendar className="h-4 w-4 mr-1" /> Book Free Demo
              </Button>
              <Button asChild variant="outline" size="icon">
                <a href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                </a>
              </Button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;
