"use client";

import Link from "next/link";

import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/site/PageHeader";
import { resources, type ResourceSlug } from "@/config/resources";

const smoothReveal = {
  initial: { opacity: 0, y: 80 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 1.2 },
  viewport: { once: true },
};

const ResourcesView = () => {


  const items = Object.entries(
    resources
  ).map(([slug, r]) => ({
    slug,
    ...r,
  }));

  return (
    <>
      <PageHeader
        title="Learning Resources"
        subtitle="Everything you need to learn faster, smarter, and at your own pace."
      />

      <motion.section
        className="container-px mx-auto max-w-7xl py-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        {...smoothReveal}
      >
        {items.map((r, index) => (
          <motion.div
            key={r.slug}
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
            <Link
              href={`/resources/${r.slug}`}
              className="group rounded-2xl bg-card border border-border p-6 shadow-card transition-smooth block"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center mb-4">

                <r.icon className="h-6 w-6" />
              </div>

              <h3 className="font-semibold text-lg">
                {r.title}
              </h3>

              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {r.desc}
              </p>
            </Link>
          </motion.div>
        ))}
      </motion.section>
    </>
  );
};

export const ResourceDetailView = ({ slug }: { slug: ResourceSlug }) => {
  const r = resources[slug];

  if (!r) {
    return (
      <motion.section
        className="container-px mx-auto max-w-3xl py-24 text-center"
        {...smoothReveal}
      >
        <motion.h1
          className="text-3xl font-bold"
          {...smoothReveal}
        >
          Resource not found
        </motion.h1>

        <motion.div
          className="mt-6"
          {...smoothReveal}
        >
          <Button
            asChild
            variant="hero"
          >
            <Link href="/resources">
              All Resources
            </Link>
          </Button>
        </motion.div>
      </motion.section>
    );
  }

  return (
    <>
      <PageHeader
        title={r.title}
        subtitle={r.desc}
      />

      <motion.section
        className="container-px mx-auto max-w-4xl py-14"
        {...smoothReveal}
      >
        <motion.div
          className="rounded-2xl bg-card border border-border p-8 shadow-card space-y-4"
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
          <div className="h-14 w-14 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center">

            <r.icon className="h-7 w-7" />
          </div>

          {/* TITLE */}
          <h2 className="text-2xl font-bold">
            About this resource
          </h2>

          {/* DESCRIPTION */}
          <p className="text-muted-foreground leading-relaxed">
            {r.desc} Available
            exclusively to GloryTecks
            students, this resource is
            designed to accelerate your
            learning, deepen your
            understanding, and prepare
            you for industry roles with
            confidence.
          </p>

          {/* BUTTONS */}
          <div className="flex flex-wrap gap-3 pt-3">

            <Button
              asChild
              variant="hero"
            >
              <a
                href="https://glorytecks.online"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Access
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
            >
              <Link href="/resources">
                All Resources
              </Link>
            </Button>
          </div>
        </motion.div>
      </motion.section>
    </>
  );
};

export default ResourcesView;