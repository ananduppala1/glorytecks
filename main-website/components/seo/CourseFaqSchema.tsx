import { JsonLd } from "./JsonLd";

/**
 * Course-specific FAQPage JSON-LD.
 *
 * The React version was a client component that appended a <script> to
 * document.head from a useEffect — invisible to any crawler that does not run
 * JavaScript, which is the audience this schema exists for. The questions and
 * answers are unchanged; they are simply rendered on the server now.
 */
export function CourseFaqSchema({
  courseTitle,
  duration,
  phone,
}: {
  courseTitle: string;
  duration: string;
  phone?: string;
}) {
  const contactLine = phone
    ? ` Contact us at ${phone} or visit our Ameerpet center for the latest pricing, scholarships, and group discounts.`
    : "";

  const faqs = [
    {
      q: `Is the ${courseTitle} course at GloryTecks good for beginners?`,
      a: `Yes! GloryTecks ${courseTitle} course is designed for all levels — from complete beginners to experienced professionals. Our structured curriculum starts from fundamentals and progressively covers advanced topics with hands-on projects.`,
    },
    {
      q: `Does GloryTecks ${courseTitle} course provide placement assistance in Hyderabad?`,
      a: `Yes. GloryTecks provides 100% placement assistance for the ${courseTitle} course. Our dedicated placement cell offers resume building, mock interviews, LinkedIn optimization, and access to 500+ hiring partners across Hyderabad and India.`,
    },
    {
      q: `How long is the ${courseTitle} course at GloryTecks Hyderabad?`,
      a: `The ${courseTitle} course at GloryTecks is ${duration}. We offer both weekday and weekend batches to suit freshers, students, and working professionals.`,
    },
    {
      q: `Is the ${courseTitle} course available online at GloryTecks?`,
      a: `Yes, GloryTecks offers the ${courseTitle} course in three formats: offline classroom training at Ameerpet Hyderabad, live online training, and hybrid batches. All students receive recorded session access.`,
    },
    {
      q: `What is the fee for ${courseTitle} course at GloryTecks Hyderabad?`,
      a: `GloryTecks offers flexible fee structures for the ${courseTitle} course with EMI options.${contactLine}`,
    },
  ];

  return (
    <JsonLd
      schema={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      }}
    />
  );
}

export default CourseFaqSchema;
