import { Building2 } from "lucide-react";
import { motion } from '@/components/ui/reveal';

import { PageHeader } from "@/components/site/PageHeader";

const smoothReveal = {
  initial: { opacity: 0, y: 80 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 1.2 },
  viewport: { once: true },
};

const entities = [
  {
    name: "GloryTecks Academy",
    desc: "Our flagship IT training arm delivering job-ready programs across emerging tech.",
  },
  {
    name: "GloryTecks Labs",
    desc: "R&D wing building real-world products with our students and mentors.",
  },
  {
    name: "GloryTecks Careers",
    desc: "Dedicated placement and recruitment partner connecting talent to 50+ companies.",
  },
  {
    name: "GloryTecks Enterprise",
    desc: "Corporate upskilling programs tailored for organizations of every size.",
  },
  {
    name: "GloryTecks Foundation",
    desc: "Non-profit initiative providing scholarships and free training for underserved learners.",
  },
  {
    name: "GloryTecks Global",
    desc: "International partnerships and cross-border learning programs.",
  },
];

const EntitiesView = () => (
  <>
    <PageHeader
      title="Our Entities"
      subtitle="A family of brands building the future of education and careers."
    />

    <motion.section
      className="container-px mx-auto max-w-7xl py-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
      {...smoothReveal}
    >
      {entities.map((e, index) => (
        <motion.div
          key={e.name}
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
          className="rounded-2xl bg-card border border-border p-6 shadow-card transition-smooth"
        >
          <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6" />
          </div>

          <h3 className="font-semibold text-lg">
            {e.name}
          </h3>

          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {e.desc}
          </p>
        </motion.div>
      ))}
    </motion.section>
  </>
);

export default EntitiesView;