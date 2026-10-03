"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from '@/components/ui/reveal';
import { trackLead } from "@/lib/analytics";

import {
  Mail,
  MapPin,
  Phone,
  Send,
  MessageCircle,
  CalendarCheck,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/site/PageHeader";
import { useSubmitContact } from "@/hooks/api";
import { useCourses, useContactInfo } from "@/components/site/SiteDataProvider";
import DemoModal from "@/components/site/DemoModal";
import { Clock } from "lucide-react";

const smoothReveal = {
  initial: { opacity: 0, y: 80 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 1.2 },
  viewport: { once: true },
};

const ContactView = () => {

  const courses = useCourses();
  const { phone, phoneHref, whatsappHref, email, emailHref, address, whatsapp } = useContactInfo();
  const contactMutation = useSubmitContact();
  const [demoOpen, setDemoOpen] = useState(false);

  const courseOptions = courses.map((c) => c.title);
  const openDemo = () => setDemoOpen(true);

  // Contact channel cards, driven by the settings singleton.
  const expertCards = [
    {
      icon: MessageCircle,
      title: "WhatsApp Chat",
      value: whatsapp,
      cta: "Chat Now",
      href: whatsappHref,
      tint: "bg-[hsl(145_60%_15%)] border-[hsl(145_60%_25%)]",
      iconBg: "bg-[hsl(145_80%_45%)]",
      ctaColor: "text-[hsl(145_80%_60%)]",
    },
    {
      icon: Phone,
      title: "Call Us",
      value: phone,
      cta: "Call Now",
      href: phoneHref,
      tint: "bg-[hsl(220_40%_15%)] border-[hsl(220_40%_25%)]",
      iconBg: "bg-[hsl(220_80%_55%)]",
      ctaColor: "text-[hsl(220_90%_70%)]",
    },
    {
      icon: Mail,
      title: "Email Us",
      value: email,
      cta: "Send Mail",
      href: emailHref,
      tint: "bg-[hsl(30_50%_15%)] border-[hsl(30_50%_25%)]",
      iconBg: "bg-[hsl(30_90%_55%)]",
      ctaColor: "text-[hsl(30_95%_65%)]",
    },
    {
      icon: CalendarCheck,
      title: "Schedule Demo",
      value: "Book a Free Demo Class",
      cta: "Book Now",
      onClick: () => setDemoOpen(true),
      tint: "bg-[hsl(10_50%_15%)] border-[hsl(10_50%_25%)]",
      iconBg: "bg-[hsl(10_85%_55%)]",
      ctaColor: "text-[hsl(10_95%_65%)]",
    },
  ];

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    course: "",
    message: "",
  });

  const [hp, setHp] = useState(""); // honeypot — bots fill this; humans never see it
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot: silently drop bot submissions without hitting the API.
    if (hp) {
      setForm({ name: "", email: "", phone: "", course: "", message: "" });
      return;
    }

    try {
      await contactMutation.mutateAsync({
        name: form.name,
        email: form.email,
        phone: form.phone,
        course: form.course || undefined,
        message: form.message,
        subject: `New enquiry from ${form.name}`,
      });

      trackLead("contact_form", { course: form.course || "general" });
      setForm({ name: "", email: "", phone: "", course: "", message: "" });
      router.push("/thank-you");
    } catch {
      toast({
        title: "Something went wrong",
        description: "We couldn't send your message. Please try again.",
      });
    }
  };

  const loading = contactMutation.isPending;

  return (
    <>
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
      <PageHeader
        title="Contact GloryTecks"
        subtitle="Have questions? Talk to our counselors and find the perfect program for your career."
      />

      {/* TALK TO EXPERTS */}
      <motion.section
        className="container-px mx-auto max-w-7xl pt-14"
        {...smoothReveal}
      >
        <motion.div
          className="text-center max-w-2xl mx-auto mb-10"
          {...smoothReveal}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium mb-4">
            Get in Touch
          </span>

          <h2 className="text-3xl sm:text-4xl font-bold">
            Talk to Our{" "}
            <span className="text-primary">
              Experts
            </span>
          </h2>

          <p className="text-muted-foreground mt-3">
            Available 24/7 • Multiple Ways to Connect
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {expertCards.map((c, index) => (
            <motion.div
                key={c.title}
                onClick={() => {
                  if (c.title === "Schedule Demo" || !c.href) {
                    setDemoOpen(true);
                  } else {
                    window.open(c.href, c.href.startsWith("http") ? "_blank" : "_self");
                  }
                }}
                className={`group rounded-2xl border ${c.tint} p-6 shadow-card cursor-pointer`}
                initial={{
                  opacity: 0,
                  y: 80,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 1,
                  delay: index * 0.15,
                }}
                viewport={{ once: true }}
              >
              <div
                className={`h-12 w-12 rounded-xl ${c.iconBg} text-white flex items-center justify-center mb-6`}
              >
                <c.icon className="h-6 w-6" />
              </div>

              <h3 className="text-lg font-bold mb-2">
                {c.title}
              </h3>

              <p className="text-sm text-muted-foreground mb-4 break-all">
                {c.value}
              </p>

              <span
                className={`inline-flex items-center gap-1.5 text-sm font-semibold ${c.ctaColor}`}
              >
                {c.cta}

                <ArrowRight className="h-4 w-4" />
              </span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CONTACT FORM */}
      <motion.section
        className="container-px mx-auto max-w-7xl py-14 grid lg:grid-cols-3 gap-10"
        {...smoothReveal}
      >
        {/* FORM */}
        <motion.div
          className="lg:col-span-2 rounded-2xl bg-card border border-border p-8 shadow-card"
          {...smoothReveal}
        >
          <h2 className="text-2xl font-bold mb-6">
            Send us a message
          </h2>

          <form
            onSubmit={onSubmit}
            className="space-y-4"
          >
            {/* Honeypot — hidden from users & assistive tech; only bots fill it */}
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                required
                minLength={2}
                maxLength={160}
                placeholder="Your Name *"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />

              <Input
                required
                type="email"
                maxLength={254}
                placeholder="Email Address *"
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
              />
            </div>

            <Input
              required
              type="tel"
              maxLength={15}
              pattern="[0-9]{10,15}"
              title="Enter a valid phone number (10-15 digits)"
              placeholder="Phone Number *"
              value={form.phone}
              onChange={(e) =>
                setForm({
                  ...form,
                  phone: e.target.value.replace(/[^0-9+]/g, ""),
                })
              }
            />

            <select
              required
              value={form.course}
              onChange={(e) =>
                setForm({
                  ...form,
                  course: e.target.value,
                })
              }
              className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">
                Select Course *
              </option>

              {courseOptions.map((course) => (
                <option
                  key={course}
                  value={course}
                >
                  {course}
                </option>
              ))}
            </select>

            <Textarea
              required
              minLength={5}
              maxLength={5000}
              placeholder="How can we help? *"
              rows={5}
              value={form.message}
              onChange={(e) =>
                setForm({
                  ...form,
                  message: e.target.value,
                })
              }
            />

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full sm:w-auto"
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : "Send Message"}

              <Send className="h-4 w-4 ml-2" />
            </Button>
          </form>
        </motion.div>

        {/* CONTACT INFO */}
        <motion.div
          className="space-y-4"
          {...smoothReveal}
        >
          {[
            {
              i: MapPin,
              t: "Address",
              v: address,
            },
            {
              i: Phone,
              t: "Phone",
              v: phone,
            },
            {
              i: Mail,
              t: "Email",
              v: email,
            },
          ].map((c, index) => (
            <motion.div
              key={c.t}
              className="rounded-2xl bg-card border border-border p-6 shadow-card flex gap-4"
              initial={{
                opacity: 0,
                y: 80,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 1,
                delay: index * 0.15,
              }}
              viewport={{ once: true }}
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                <c.i className="h-5 w-5" />
              </div>

              <div>
                <div className="text-sm text-muted-foreground">
                  {c.t}
                </div>

                <div className="font-semibold break-all">
                  {c.v}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>
      {/* ═══════════════════════════════════════════════════════
          LOCATION / MAP
      ═══════════════════════════════════════════════════════ */}
      <section className="container-px mx-auto max-w-7xl py-20">
              <motion.div className="grid lg:grid-cols-2 gap-10 items-center" {...smoothReveal}>
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
    </>
  );
};

export default ContactView;
