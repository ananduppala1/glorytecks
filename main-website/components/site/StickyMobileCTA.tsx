"use client";

import { useState } from "react";
import { Phone, MessageCircle, Calendar } from "lucide-react";
import DemoModal from "./DemoModal";
import { trackLead } from "@/lib/analytics";
import { useContactInfo, whatsappLink } from "@/components/site/SiteDataProvider";

/**
 * Mobile-only sticky bottom action bar. The Layout's <main> already reserves
 * `pb-16` on mobile, so this 64px bar never covers page content.
 */
const StickyMobileCTA = () => {
  const [demoOpen, setDemoOpen] = useState(false);
  const { phoneHref, whatsapp } = useContactInfo();

  return (
    <>
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} trigger="sticky-mobile-cta" />
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 h-16 bg-background/95 backdrop-blur-md border-t border-border grid grid-cols-3 gap-px"
        role="navigation"
        aria-label="Quick contact actions"
      >
        <a
          href={phoneHref}
          onClick={() => trackLead("call", { source: "sticky_mobile_cta" })}
          className="flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-foreground hover:text-primary transition-colors"
        >
          <Phone className="h-5 w-5" />
          Call
        </a>
        <a
          href={whatsappLink(whatsapp, "Hi, I'm interested in a course at GloryTecks")}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackLead("whatsapp", { source: "sticky_mobile_cta" })}
          className="flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-green-500 hover:text-green-400 transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          WhatsApp
        </a>
        <button
          onClick={() => setDemoOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Calendar className="h-5 w-5" />
          Free Demo
        </button>
      </div>
    </>
  );
};

export default StickyMobileCTA;
