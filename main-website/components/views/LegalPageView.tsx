import type { LegalDoc } from "@/types/content";

interface LegalPageViewProps {
  document: LegalDoc;
}

export default function LegalPageView({
  document,
}: LegalPageViewProps) {
  return (
    <article className="container-px mx-auto max-w-4xl py-14 lg:py-20">
      {/* Header */}
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          GloryTecks
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {document.title}
        </h1>

        {document.updated && (
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated:{" "}
            {new Date(document.updated).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </header>

      {/* Intro */}
      {document.intro && (
        <div className="mb-10 rounded-2xl border border-border bg-card p-6 text-muted-foreground leading-7">
          {document.intro}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-10">
        {document.sections.map((section, index) => (
          <section key={`${section.heading}-${index}`}>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              {section.heading}
            </h2>

            {section.paragraphs?.length ? (
              <div className="mt-4 space-y-4 text-muted-foreground leading-8">
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex}>{paragraph}</p>
                ))}
              </div>
            ) : null}

            {section.bullets?.length ? (
              <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground leading-7">
                {section.bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {/* Bottom */}
      <div className="mt-14 border-t border-border pt-8">
        <p className="text-sm text-muted-foreground">
          For questions about this document, please contact GloryTecks through
          the contact details provided on our website.
        </p>
      </div>
    </article>
  );
}