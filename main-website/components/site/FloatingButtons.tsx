"use client";

import { Phone, MessageCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { trackLead } from "@/lib/analytics";
import { useContactInfo } from "@/components/site/SiteDataProvider";

const FloatingButtons = () => {
  const [openWhatsApp, setOpenWhatsApp] = useState(false);
  const [openCall, setOpenCall] = useState(false);
  const { phoneHref, whatsappHref } = useContactInfo();

  const whatsappRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<HTMLDivElement>(null);

  // CLOSE WHEN CLICK OUTSIDE
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        whatsappRef.current &&
        !whatsappRef.current.contains(event.target as Node)
      ) {
        setOpenWhatsApp(false);
      }

      if (
        callRef.current &&
        !callRef.current.contains(event.target as Node)
      ) {
        setOpenCall(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">

      {/* WHATSAPP */}
      <div className="flex justify-end" ref={whatsappRef}>
        <a
          href={openWhatsApp ? whatsappHref : "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!openWhatsApp) {
              e.preventDefault();
              setOpenWhatsApp(true);
            } else {
              trackLead("whatsapp", { source: "floating_button" });
            }
          }}
          className={`
            bg-green-500 text-white
            px-4 py-3 rounded-l-2xl shadow-xl
            flex items-center gap-3
            transition-all duration-500
            overflow-hidden
            cursor-pointer
            ${openWhatsApp ? "translate-x-0" : "translate-x-[125px]"}
          `}
        >
          <MessageCircle className="h-6 w-6 shrink-0" />

          <span className="font-medium whitespace-nowrap">
            WhatsApp Us
          </span>
        </a>
      </div>

      {/* CALL */}
      <div className="flex justify-end" ref={callRef}>
        <a
          href={openCall ? phoneHref : "#"}
          onClick={(e) => {
            if (!openCall) {
              e.preventDefault();
              setOpenCall(true);
            } else {
              trackLead("call", { source: "floating_button" });
            }
          }}
          className={`
            bg-blue-500 text-white
            px-4 py-3 rounded-l-2xl shadow-xl
            flex items-center gap-3
            transition-all duration-500
            overflow-hidden
            cursor-pointer
            ${openCall ? "translate-x-0" : "translate-x-[108px]"}
          `}
        >
          <Phone className="h-6 w-6 shrink-0" />

          <span className="font-medium whitespace-nowrap">
            Contact Us
          </span>
        </a>
      </div>
    </div>
  );
};

export default FloatingButtons;
