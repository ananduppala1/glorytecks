"use client";

import { motion } from "framer-motion";

const smoothReveal = {
  initial: { opacity: 0, y: 80 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 1.2 },
  viewport: { once: true },
};

/**
 * Shared hero band. Lifted out of pages/Courses.tsx, where it was defined and
 * then re-exported for Contact, Resources and Placements to import — a circular
 * page-imports-page arrangement that does not survive the move to route files.
 * The markup is byte-for-byte the original.
 */
export const PageHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <motion.section className="bg-gradient-hero" {...smoothReveal}>
    <div className="container-px mx-auto max-w-7xl py-14 md:py-20 text-center">
      <motion.h1 className="text-3xl md:text-5xl font-bold" {...smoothReveal}>
        {title}
      </motion.h1>

      {subtitle && (
        <motion.p className="text-muted-foreground mt-3 max-w-2xl mx-auto" {...smoothReveal}>
          {subtitle}
        </motion.p>
      )}
    </div>
  </motion.section>
);

export default PageHeader;
