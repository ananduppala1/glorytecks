"use client";

import { useState, useEffect } from "react";
import { X, Rocket, CheckCircle2, Phone, User, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubmitDemoRequest } from "@/hooks/api";
import { useCourses, useContactInfo, whatsappLink } from "@/components/site/SiteDataProvider";

interface DemoModalProps {
  open: boolean;
  onClose: () => void;
  defaultCourse?: string;
  trigger?: "exit" | "popup" | "button" | "sticky-mobile-cta";
}

const HEADINGS: Record<string, string> = {
  exit: "Wait! Don't Miss Out 🎯",
  popup: "Start Your IT Career Today 🚀",
  button: "Book Your Free Demo Class",
  "sticky-mobile-cta": "Book Your Free Demo Class",
};

const DemoModal = ({ open, onClose, defaultCourse = "", trigger = "button" }: DemoModalProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [course, setCourse] = useState(defaultCourse);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const courses = useCourses();
  const { whatsapp } = useContactInfo();
  const demoRequest = useSubmitDemoRequest();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (defaultCourse) setCourse(defaultCourse);
  }, [defaultCourse]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Best-effort: record the lead in the CMS so it appears in the admin even if
    // the visitor never sends the prefilled WhatsApp message. Never blocks the UX.
    demoRequest.mutate({
      name,
      phone,
      course: course || undefined,
      source: `demo-modal:${trigger}`,
    });

    // Primary action: hand off to WhatsApp with a prefilled message.
    const msg = `Hi GloryTecks! I'd like to book a *Free Demo*.\n\n*Name:* ${name}\n*Phone:* ${phone}\n*Interested Course:* ${course || "Not specified"}\n\nPlease contact me.`;
    setTimeout(() => {
      const href = whatsappLink(whatsapp, msg);
      if (href) window.open(href, "_blank");
      setSubmitted(true);
      setLoading(false);
    }, 800);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Book a free demo class">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-[var(--shadow-elegant)] overflow-hidden animate-fade-up">
        {/* Top gradient bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary-deep via-primary to-primary-glow" />

        {/* Close */}
        <button onClick={onClose} aria-label="Close dialog" className="absolute top-4 right-4 h-8 w-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center transition-colors z-10">
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          {!submitted ? (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-deep to-primary flex items-center justify-center">
                  <Rocket className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{HEADINGS[trigger] ?? HEADINGS.button}</h3>
                  <p className="text-sm text-muted-foreground">Free • No commitment • 60-minute live session</p>
                </div>
              </div>

              <div className="flex gap-3 mb-5">
                {["Live Demo", "Q&A Session", "Career Guidance"].map(b => (
                  <span key={b} className="badge-success text-[11px] px-2 py-0.5">✓ {b}</span>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    minLength={2}
                    maxLength={160}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    type="tel"
                    maxLength={15}
                    pattern="[0-9]{10,15}"
                    title="Enter a valid phone number (10-15 digits)"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                    placeholder="WhatsApp Number"
                    aria-label="WhatsApp phone number"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
                  />
                </div>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    value={course}
                    onChange={e => setCourse(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                  >
                    <option value="">Select a Course</option>
                    {(courses ?? []).map(c => <option key={c.slug} value={c.title}>{c.title}</option>)}
                  </select>
                </div>
                <Button type="submit" variant="hero" className="w-full mt-1" disabled={loading}>
                  {loading ? "Booking..." : "Book Free Demo via WhatsApp"}
                </Button>
              </form>

              <p className="text-[11px] text-muted-foreground text-center mt-3">
                🔒 We never spam. Your info is 100% secure.
              </p>
            </>
          ) : (
            <div className="text-center py-6">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Demo Booked! 🎉</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Our counselor will contact you within 2 hours on WhatsApp.
              </p>
              <Button variant="outline" onClick={onClose} className="mt-2">Close</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoModal;
