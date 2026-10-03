import Link from "next/link";
import { motion } from '@/components/ui/reveal';

import {
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const smoothReveal = {
  initial: { opacity: 0, y: 80 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 1.2 },
  viewport: { once: true },
};

const NotFoundView = () => {
  return (
    <motion.section
      className="min-h-screen flex items-center justify-center bg-gradient-hero px-6"
      {...smoothReveal}
    >
      <motion.div
        className="max-w-xl w-full text-center rounded-3xl bg-card border border-border p-10 md:p-14 shadow-elegant"
        initial={{
          opacity: 0,
          y: 80,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 1.2,
        }}
        viewport={{ once: true }}
      >
        {/* ICON */}
        <motion.div
          initial={{
            opacity: 0,
            y: 60,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 1,
          }}
          viewport={{ once: true }}
          className="h-20 w-20 rounded-3xl bg-gradient-primary text-primary-foreground flex items-center justify-center mx-auto mb-6"
        >
          <AlertTriangle className="h-10 w-10" />
        </motion.div>

        {/* 404 */}
        <motion.h1
          className="text-6xl md:text-7xl font-bold gradient-text mb-4"
          {...smoothReveal}
        >
          404
        </motion.h1>

        {/* TITLE */}
        <motion.h2
          className="text-2xl md:text-3xl font-bold mb-3"
          {...smoothReveal}
        >
          Oops! Page Not Found
        </motion.h2>

        {/* DESCRIPTION */}
        <motion.p
          className="text-muted-foreground leading-relaxed max-w-md mx-auto"
          {...smoothReveal}
        >
          The page you are looking for
          doesn&rsquo;t exist or may have been
          moved to another location.
        </motion.p>

        {/* BUTTON */}
        <motion.div
          className="mt-8"
          {...smoothReveal}
        >
          <Button
            asChild
            variant="hero"
            size="lg"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />

              Return to Home
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </motion.section>
  );
};

export default NotFoundView;