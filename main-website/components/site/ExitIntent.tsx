"use client";

import { useEffect, useRef, useState } from "react";
import DemoModal from "./DemoModal";

const ExitIntent = () => {
  const [open, setOpen] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem("gt_exit_shown") === "1";
    } catch {
      /* sessionStorage unavailable (incognito/restricted) */
    }
    if (alreadyShown) return;

    const markShown = () => {
      try { sessionStorage.setItem("gt_exit_shown", "1"); } catch { /* ignore */ }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 5 && !fired.current) {
        fired.current = true;
        markShown();
        setTimeout(() => setOpen(true), 200);
      }
    };

    const timer = setTimeout(() => {
      if (!fired.current) {
        fired.current = true;
        markShown();
        setOpen(true);
      }
    }, 45000);

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      clearTimeout(timer);
    };
  }, []);

  return <DemoModal open={open} onClose={() => setOpen(false)} trigger="exit" />;
};

export default ExitIntent;
