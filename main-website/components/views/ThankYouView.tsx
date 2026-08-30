"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Phone, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { useContactInfo } from "@/components/site/SiteDataProvider";

const ThankYouView = () => {
  const { phone, phoneHref, whatsappHref } = useContactInfo();

  useEffect(() => {
    // Confirmation page view — useful as a GA4 conversion destination.
    trackEvent("lead_thank_you_view");
  }, []);

  return (
    <section className="container-px mx-auto max-w-2xl py-24 text-center">
      <div className="flex justify-center mb-6">
        <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center">
          <CheckCircle2 className="h-9 w-9 text-primary" />
        </div>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold">Thank you! Your enquiry has been received.</h1>
      <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
        Our team at GloryTecks will contact you shortly with course details, fees and the next
        batch schedule. For anything urgent, reach us directly:
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <Button asChild variant="hero" size="lg">
          <a href={phoneHref}><Phone className="h-4 w-4" /> {phone}</a>
        </Button>
        <Button asChild variant="outline" size="lg" className="border-green-500/50 text-green-400 hover:bg-green-500/10 hover:text-green-300">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" /> WhatsApp Us
          </a>
        </Button>
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm">
        <Link href="/courses" className="text-primary hover:underline inline-flex items-center gap-1">
          Explore Courses <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link href="/blog" className="text-primary hover:underline inline-flex items-center gap-1">
          Read our Guides <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
};

export default ThankYouView;
