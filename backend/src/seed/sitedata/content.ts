// ─────────────────────────────────────────────────────────────────────────
// MIGRATION SOURCE — copied verbatim from the public GloryTecks website
// (src/data/...). Used by seed.ts to populate MongoDB. Do not edit here;
// the canonical data now lives in the database and is managed via the CMS.
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Content engine.
//
// Turns a curated BlogTopic into a real, structured article (typed blocks),
// grounded in the category knowledge base (tools, roles, Hyderabad salaries,
// roadmaps, certifications). The article shape varies by topic "kind" so a
// roadmap reads like a roadmap, a comparison like a comparison, an interview
// post like a question bank, and so on — not generic filler.
//
// The same blocks render as React on the detail page AND serialize to crawlable
// HTML in the SEO prerender script, so human and bot views stay in sync.
// ─────────────────────────────────────────────────────────────────────────────
import type { BlogTopic } from "./topics";
import { categoryBySlug, type CategoryKnowledge } from "./meta";

export type Block =
  | { type: "heading"; id: string; text: string }
  | { type: "subheading"; id: string; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "code"; lang: string; code: string }
  | { type: "callout"; variant: "info" | "tip" | "warning" | "success"; title?: string; text: string }
  | { type: "quote"; text: string; cite?: string }
  | { type: "faq"; items: { q: string; a: string }[] };

const h = (text: string): Block => ({ type: "heading", id: slugify(text), text });
const sub = (text: string): Block => ({ type: "subheading", id: slugify(text), text });
const p = (text: string): Block => ({ type: "paragraph", text });
const ul = (items: string[]): Block => ({ type: "list", items });
const ol = (items: string[]): Block => ({ type: "list", ordered: true, items });
const table = (head: string[], rows: string[][]): Block => ({ type: "table", head, rows });
const code = (lang: string, c: string): Block => ({ type: "code", lang, code: c });
type CalloutVariant = Extract<Block, { type: "callout" }>["variant"];
const callout = (variant: CalloutVariant, text: string, title?: string): Block =>
  ({ type: "callout", variant, text, title });
const faq = (items: { q: string; a: string }[]): Block => ({ type: "faq", items });

export function slugify(s: string) {
  return s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Short list join helper, e.g. ["a","b","c"] -> "a, b and c".
const human = (arr: string[]) =>
  arr.length <= 1 ? arr.join("") : `${arr.slice(0, -1).join(", ")} and ${arr[arr.length - 1]}`;

// Code snippets the engine can drop in where a category is code-relevant.
const SNIPPETS: Record<string, { lang: string; code: string } | undefined> = {
  python: {
    lang: "python",
    code: `# A tiny, idiomatic Python example
from collections import Counter

def top_words(text: str, n: int = 3) -> list[tuple[str, int]]:
    words = [w.lower() for w in text.split() if w.isalpha()]
    return Counter(words).most_common(n)

print(top_words("data data science is fun and data wins"))
# [('data', 3), ('science', 1), ('is', 1)]`,
  },
  "data-science": {
    lang: "python",
    code: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
model = RandomForestClassifier(n_estimators=300, random_state=42)
model.fit(X_train, y_train)
print(classification_report(y_test, model.predict(X_test)))`,
  },
  "data-analytics": {
    lang: "sql",
    code: `-- Revenue by month with a running total
SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(amount)                      AS revenue,
    SUM(SUM(amount)) OVER (
        ORDER BY DATE_TRUNC('month', order_date)
    )                                AS running_total
FROM orders
GROUP BY 1
ORDER BY 1;`,
  },
  "data-engineering": {
    lang: "python",
    code: `# PySpark: clean + aggregate a sales dataset
from pyspark.sql import functions as F

clean = (
    spark.read.parquet("s3://lake/bronze/sales")
        .dropDuplicates(["order_id"])
        .withColumn("amount", F.col("amount").cast("double"))
        .filter(F.col("amount") > 0)
)
(clean.groupBy("region")
      .agg(F.sum("amount").alias("revenue"))
      .write.mode("overwrite").parquet("s3://lake/silver/revenue"))`,
  },
  gcp: {
    lang: "sql",
    code: `-- BigQuery: partitioned, clustered table for fast, cheap scans
CREATE TABLE analytics.events
PARTITION BY DATE(event_time)
CLUSTER BY user_id AS
SELECT * FROM raw.events_staging;

-- Only scans one day's partition:
SELECT COUNT(*) FROM analytics.events
WHERE DATE(event_time) = CURRENT_DATE();`,
  },
  aws: {
    lang: "sql",
    code: `-- Athena: query partitioned Parquet in S3 (scans less = costs less)
SELECT region, SUM(amount) AS revenue
FROM sales
WHERE year = '2026' AND month = '06'
GROUP BY region
ORDER BY revenue DESC;`,
  },
  "azure-data-factory": {
    lang: "json",
    code: `// ADF Copy Activity — parameterised source/sink (excerpt)
{
  "name": "CopyToSilver",
  "type": "Copy",
  "inputs":  [{ "referenceName": "src_@{pipeline().parameters.table}" }],
  "outputs": [{ "referenceName": "sink_silver" }],
  "typeProperties": {
    "source": { "type": "AzureSqlSource" },
    "sink":   { "type": "ParquetSink" }
  }
}`,
  },
  "power-bi": {
    lang: "dax",
    code: `-- A reusable, context-aware DAX measure
Revenue YTD =
TOTALYTD (
    SUM ( Sales[Amount] ),
    'Date'[Date]
)

Revenue YoY % =
DIVIDE (
    [Revenue YTD] - CALCULATE ( [Revenue YTD], SAMEPERIODLASTYEAR ( 'Date'[Date] ) ),
    CALCULATE ( [Revenue YTD], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )
)`,
  },
  mlops: {
    lang: "python",
    code: `import mlflow
from sklearn.metrics import f1_score

with mlflow.start_run():
    model.fit(X_train, y_train)
    f1 = f1_score(y_test, model.predict(X_test), average="macro")
    mlflow.log_param("n_estimators", 300)
    mlflow.log_metric("f1_macro", f1)
    mlflow.sklearn.log_model(model, "model")`,
  },
  "generative-ai": {
    lang: "python",
    code: `# Minimal RAG: embed, retrieve, then answer
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

store = Chroma.from_documents(docs, OpenAIEmbeddings())
context = store.similarity_search(question, k=4)
prompt = f"Answer using only this context:\\n{context}\\n\\nQ: {question}"
answer = ChatOpenAI(model="gpt-4o-mini").invoke(prompt)
print(answer.content)`,
  },
};

const codeFor = (cat: CategoryKnowledge): Block | null => {
  const s = SNIPPETS[cat.slug];
  return s ? code(s.lang, s.code) : null;
};

// ── Shared section builders ─────────────────────────────────────────────────

function introBlocks(t: BlogTopic, c: CategoryKnowledge): Block[] {
  return [
    p(`**${t.title}** is one of the topics learners ask about most when they start with ${c.name}. ${c.blurb} This guide is written by GloryTecks mentors in Hyderabad and is built to be practical — you'll leave knowing what to do next, not just a list of definitions.`),
    callout(
      "info",
      `${c.name} skills are in active demand across Hyderabad's IT corridor — from product companies in HITEC City and Gachibowli to services firms and startups. The fundamentals you build here transfer directly to ${human(c.roles.slice(0, 3))} roles.`,
      "Why this matters",
    ),
  ];
}

function keyTakeaways(points: string[]): Block[] {
  return [h("Key takeaways"), ul(points)];
}

function skillsSection(c: CategoryKnowledge): Block[] {
  return [
    h(`Core skills you'll need`),
    p(`Across ${c.name}, the same foundations show up again and again. Focus your energy here before chasing every new tool:`),
    ul(c.skills),
    p(`The tools change; the fundamentals don't. Strong basics in ${human(c.skills.slice(0, 3))} make every framework easier to pick up.`),
  ];
}

function toolsSection(c: CategoryKnowledge): Block[] {
  const blocks: Block[] = [
    h(`Tools and technologies`),
    p(`The ${c.name} stack you'll see in real Hyderabad job descriptions centres on ${human(c.tools.slice(0, 5))}. You don't need all of them on day one — start with the first two or three and add the rest as projects demand them.`),
    ul(c.tools.map((tool) => `**${tool}** — used in day-to-day ${c.name.toLowerCase()} work`)),
  ];
  const snippet = codeFor(c);
  if (snippet) {
    blocks.push(p(`Here's a small, representative example so the stack feels concrete rather than abstract:`));
    blocks.push(snippet);
  }
  return blocks;
}

function careerSection(t: BlogTopic, c: CategoryKnowledge): Block[] {
  return [
    h(`Career paths and salaries in Hyderabad`),
    p(`${c.name} opens up roles such as ${human(c.roles)}. Pay scales quickly with demonstrable, project-backed experience. Indicative Hyderabad ranges (they vary by company tier and your portfolio):`),
    table(
      ["Experience", "Typical role", "Indicative salary"],
      [
        ["Fresher (0–1 yr)", c.roles[0], c.salary.fresher],
        ["Mid-level (2–5 yrs)", c.roles[1] || c.roles[0], c.salary.mid],
        ["Senior (6+ yrs)", c.roles[c.roles.length - 1], c.salary.senior],
      ],
    ),
    callout(
      "tip",
      `Numbers move with proof of skill. Two or three solid, deployed projects on your GitHub will do more for your offer than another certificate.`,
      "Pay tip",
    ),
  ];
}

function certSection(c: CategoryKnowledge): Block[] {
  return [
    h(`Certifications worth considering`),
    p(`Certifications won't replace projects, but they help pass automated screening and structure your learning. For ${c.name}, the most recognised are:`),
    ul(c.certifications),
  ];
}

function buildFaq(t: BlogTopic, c: CategoryKnowledge): Block {
  const items: { q: string; a: string }[] = [];

  items.push({
    q: `Is ${c.name} a good career choice in 2026?`,
    a: `Yes. ${c.name} remains in strong demand in Hyderabad and across India, with clear paths into roles like ${human(c.roles.slice(0, 3))}. The field rewards people who can show real, applied work.`,
  });
  items.push({
    q: `How long does it take to learn ${c.name}?`,
    a: `Most committed learners reach a job-ready level in 4–6 months of consistent study and projects. With structured mentoring at GloryTecks, that timeline becomes more predictable because you're not guessing what to learn next.`,
  });
  items.push({
    q: `Do I need a degree or coding background?`,
    a: `A degree helps but isn't mandatory. ${c.prerequisites.length ? `What matters more is having the basics: ${human(c.prerequisites)}.` : ""} Many successful ${c.roles[0].toLowerCase()}s are career-switchers who built a portfolio.`,
  });

  if (t.kind === "salary") {
    items.push({
      q: `What is the starting salary for ${c.name} roles in Hyderabad?`,
      a: `Freshers typically start around ${c.salary.fresher}, rising to ${c.salary.mid} at mid-level and ${c.salary.senior} for senior roles. Product companies and niche skills pay at the higher end.`,
    });
  }
  if (t.kind === "interview") {
    items.push({
      q: `How should I prepare for ${c.name} interviews?`,
      a: `Practise explaining concepts out loud, build two or three projects you can discuss in depth, and rehearse with mock interviews. Pattern recognition from real questions matters more than memorising answers.`,
    });
  }
  if (t.kind === "certification") {
    items.push({
      q: `Is a ${c.name} certification worth it?`,
      a: `It's worth it as a structured goal and a screening signal — but pair it with hands-on projects. Recruiters hire for demonstrated ability, and a certificate plus a portfolio is far stronger than a certificate alone.`,
    });
  }

  items.push({
    q: `Does GloryTecks help with placement after the ${c.name} course?`,
    a: `Yes. GloryTecks provides 100% placement support in Hyderabad including resume building, mock interviews and hiring-partner referrals, alongside real-time, project-based ${c.name} training.`,
  });

  return faq(items);
}

function conclusion(t: BlogTopic, c: CategoryKnowledge): Block[] {
  return [
    h("Conclusion"),
    p(`${t.title.replace(/:.*$/, "")} is very learnable with the right sequence and steady practice. Start small, build in public, and let projects pull you through the harder topics. If you'd like a structured path with mentors who place students in Hyderabad's top companies, the GloryTecks ${c.courseTitle} course is built for exactly that.`),
  ];
}

// ── Per-kind article builders ───────────────────────────────────────────────

function buildRoadmap(t: BlogTopic, c: CategoryKnowledge): Block[] {
  return [
    ...introBlocks(t, c),
    ...keyTakeaways([
      `Learn the fundamentals first: ${human(c.skills.slice(0, 3))}.`,
      `Tools to prioritise: ${human(c.tools.slice(0, 4))}.`,
      `Build a portfolio early — projects beat passive courses.`,
      `Target roles: ${human(c.roles.slice(0, 3))}.`,
    ]),
    h(`The ${c.name} roadmap, stage by stage`),
    p(`Treat this as a sequence, not a checklist to rush. Each stage builds on the previous one.`),
    sub("Stage 1 — Foundations (Weeks 1–4)"),
    ul(c.skills.slice(0, 3).map((s) => `${s}`)),
    p(`Don't skip fundamentals to chase frameworks. A shaky foundation slows down everything that follows.`),
    sub("Stage 2 — Core tools (Weeks 5–10)"),
    ul(c.tools.slice(0, 5)),
    sub("Stage 3 — Projects & specialisation (Weeks 11–18)"),
    ol([
      `Pick a domain you find interesting (finance, healthcare, e-commerce).`,
      `Build two end-to-end projects using ${human(c.tools.slice(0, 3))}.`,
      `Document them well — a clear README is part of the deliverable.`,
      `Deploy at least one so it's live and shareable.`,
    ]),
    sub("Stage 4 — Job readiness (Weeks 19–24)"),
    ul([
      `Polish your resume and LinkedIn around your projects.`,
      `Do mock interviews and timed problem-solving.`,
      `Target ${human(c.roles.slice(0, 3))} openings in Hyderabad.`,
    ]),
    ...toolsSection(c),
    ...careerSection(t, c),
    callout("success", `A realistic full-time timeline is 4–6 months. Part-time, expect 8–10 months. Consistency beats intensity — 1–2 focused hours daily outperforms weekend cramming.`, "How long will it take?"),
    buildFaq(t, c),
    ...conclusion(t, c),
  ];
}

function buildComparison(t: BlogTopic, c: CategoryKnowledge): Block[] {
  // Try to split "X vs Y" from the title.
  const m = t.title.match(/(.+?)\s+vs\.?\s+(.+?)(?::|$)/i);
  const a = (m?.[1] || "Option A").trim();
  let b = (m?.[2] || "Option B").trim();
  b = b.replace(/\s+(in|for|2026|2025).*$/i, "").trim();
  return [
    ...introBlocks(t, c),
    callout("info", `Short answer: there's no universal winner. The right choice depends on your goals, your existing skills and the jobs you're targeting in Hyderabad. The table below makes the trade-offs explicit.`, "TL;DR"),
    h(`${a} vs ${b}: at a glance`),
    table(
      ["Factor", a, b],
      [
        ["Learning curve", "Moderate — approachable basics", "Moderate — different mental model"],
        ["Job demand (Hyderabad)", "High", "High"],
        ["Best for", "Structured, mainstream roles", "Specialised or niche roles"],
        ["Ecosystem & community", "Large", "Large"],
        ["Time to first job", "Faster for most beginners", "Slightly steeper start"],
      ],
    ),
    h(`When to choose ${a}`),
    ul([
      `You want the most common, broadly-applicable option.`,
      `You're optimising for the largest number of job openings.`,
      `You prefer a gentler on-ramp.`,
    ]),
    h(`When to choose ${b}`),
    ul([
      `You're targeting a specific role or company that prefers it.`,
      `You already have adjacent skills that transfer.`,
      `You value depth in a niche over breadth.`,
    ]),
    ...skillsSection(c),
    callout("tip", `You rarely have to choose forever. Learn one well, get hired, then add the other. Employers value depth first and breadth second.`, "Our recommendation"),
    buildFaq(t, c),
    ...conclusion(t, c),
  ];
}

function buildSalary(t: BlogTopic, c: CategoryKnowledge): Block[] {
  return [
    ...introBlocks(t, c),
    ...keyTakeaways([
      `Fresher range: ${c.salary.fresher}.`,
      `Mid-level (2–5 yrs): ${c.salary.mid}.`,
      `Senior (6+ yrs): ${c.salary.senior}.`,
      `Skills, portfolio and company tier move pay more than years alone.`,
    ]),
    h(`${c.name} salary in Hyderabad by experience`),
    p(`Hyderabad's pay for ${c.name} roles is competitive with Bangalore and Pune, especially in product companies. These are indicative ranges — your offer depends on skills, interview performance and the employer.`),
    table(
      ["Experience level", "Role", "Annual CTC (indicative)"],
      [
        ["Entry (0–1 yr)", c.roles[0], c.salary.fresher],
        ["Junior (1–3 yrs)", c.roles[1] || c.roles[0], `Between ${c.salary.fresher.split("–")[1] || c.salary.fresher} and ${c.salary.mid.split("–")[0]}`.replace(/\s+LPA/g, " LPA")],
        ["Mid (3–6 yrs)", c.roles[1] || c.roles[0], c.salary.mid],
        ["Senior (6+ yrs)", c.roles[c.roles.length - 1], c.salary.senior],
      ],
    ),
    h(`What moves your salary the most`),
    ol([
      `**Demonstrable skill** — deployed projects and a strong GitHub.`,
      `**Company tier** — product companies pay more than most services firms.`,
      `**Niche specialisation** — scarce skills like ${human(c.tools.slice(0, 2))} command premiums.`,
      `**Interview performance** — negotiation starts with a strong technical round.`,
    ]),
    ...skillsSection(c),
    callout("warning", `Treat any single salary figure online with caution — ranges vary widely by role, company and year. Use these as a directional guide, then validate against live listings on Naukri and LinkedIn.`, "A note on numbers"),
    buildFaq(t, c),
    ...conclusion(t, c),
  ];
}

function buildInterview(t: BlogTopic, c: CategoryKnowledge): Block[] {
  const topic = t.title.replace(/\s+interview questions.*$/i, "").trim() || c.name;
  const qa: { q: string; a: string }[] = [
    { q: `What are the fundamentals an interviewer expects for ${topic}?`, a: `Solid command of ${human(c.skills.slice(0, 3))}. Interviewers probe whether you understand the *why*, not just the syntax.` },
    { q: `Explain a project where you used ${human(c.tools.slice(0, 2))}.`, a: `Use the STAR method: the situation, the task, the actions you took with ${c.tools[0]}, and the measurable result. Concrete numbers beat vague claims.` },
    { q: `How do you debug a problem in production?`, a: `Reproduce, isolate, check logs and recent changes, form a hypothesis, then verify with the smallest possible test. Communicate clearly throughout.` },
    { q: `What's a trade-off you made and why?`, a: `Pick a real one — speed vs accuracy, cost vs latency, simplicity vs flexibility — and explain the reasoning. Interviewers want to see judgement.` },
  ];
  return [
    ...introBlocks(t, c),
    callout("tip", `Don't memorise answers — internalise patterns. Interviewers can tell the difference instantly. Practise explaining each concept out loud as if teaching a junior.`, "How to use this list"),
    h(`Core ${topic} interview questions`),
    p(`These are representative of what Hyderabad employers — from services firms to product companies — actually ask. For each, we give the question and a concise model answer.`),
    faq(qa),
    h(`How to structure your preparation`),
    ol([
      `Revise fundamentals: ${human(c.skills.slice(0, 3))}.`,
      `Build two projects you can discuss for ten minutes each.`,
      `Do timed problem-solving and at least three mock interviews.`,
      `Prepare your STAR stories before the interview, not during.`,
    ]),
    h(`Common mistakes candidates make`),
    ul([
      `Jumping to code before clarifying the question.`,
      `Memorised answers that fall apart under follow-ups.`,
      `Going silent — interviewers want to hear your reasoning.`,
      `No questions for the interviewer at the end.`,
    ]),
    ...(codeFor(c) ? [p(`Be ready to write clean, readable code on a shared screen — like this:`), codeFor(c)!] : []),
    buildFaq(t, c),
    ...conclusion(t, c),
  ];
}

function buildProjects(t: BlogTopic, c: CategoryKnowledge): Block[] {
  return [
    ...introBlocks(t, c),
    callout("success", `Projects are the single highest-leverage thing you can do. A recruiter skims your resume in seconds — a live, well-documented project is what makes them stop.`, "Why projects win"),
    h(`Project ideas, from beginner to advanced`),
    sub("Beginner"),
    ol([
      `A data-cleaning + exploration notebook on a public dataset.`,
      `A simple dashboard or report summarising one clear question.`,
      `A small script that automates a repetitive task using ${c.tools[0]}.`,
    ]),
    sub("Intermediate"),
    ol([
      `An end-to-end pipeline using ${human(c.tools.slice(0, 3))}.`,
      `A project that ingests, transforms and visualises real data.`,
      `A reproducible analysis with tests and a clear README.`,
    ]),
    sub("Advanced"),
    ol([
      `A deployed application or service others can actually use.`,
      `A project that handles scale, monitoring or automation.`,
      `An original analysis or model with a written-up result.`,
    ]),
    ...toolsSection(c),
    h(`How to present a project so it gets you hired`),
    ul([
      `Write a README that states the problem, approach and result up front.`,
      `Include screenshots or a short demo video.`,
      `Explain *decisions and trade-offs*, not just steps.`,
      `Deploy at least one project and link it.`,
    ]),
    callout("tip", `Two excellent, deployed projects beat ten half-finished notebooks. Depth and polish signal real ability.`, "Quality over quantity"),
    buildFaq(t, c),
    ...conclusion(t, c),
  ];
}

function buildCertification(t: BlogTopic, c: CategoryKnowledge): Block[] {
  return [
    ...introBlocks(t, c),
    ...keyTakeaways([
      `Certifications help with screening and structure — not as a replacement for projects.`,
      `Recommended: ${human(c.certifications.slice(0, 2))}.`,
      `Pair any certificate with a portfolio for the strongest profile.`,
    ]),
    ...certSection(c),
    h(`How to prepare efficiently`),
    ol([
      `Download the official exam syllabus and map your gaps.`,
      `Use hands-on labs — passive videos won't make it stick.`,
      `Take timed practice tests until you're consistently above the pass mark.`,
      `Build one project that exercises the certified skills.`,
    ]),
    h(`Is it worth the time and money?`),
    p(`For ${c.name}, a certification is worth it if it gives you a clear goal and helps you past automated resume filters. But hiring managers ultimately hire for demonstrated ability. Think of the certificate as the ticket to the interview, and your projects as what wins it.`),
    ...skillsSection(c),
    buildFaq(t, c),
    ...conclusion(t, c),
  ];
}

function buildWhatIs(t: BlogTopic, c: CategoryKnowledge): Block[] {
  const subject = t.title.replace(/^what is\s*/i, "").replace(/[?:].*$/, "").trim();
  return [
    ...introBlocks(t, c),
    h(`What is ${subject}?`),
    p(`In plain terms, ${subject} is a core idea within ${c.name}. ${c.blurb} Understanding it well is one of the building blocks for ${human(c.roles.slice(0, 2))} roles.`),
    callout("info", `If you remember one thing: ${c.blurb}`, "In one line"),
    h(`Why it matters`),
    ul([
      `It underpins how teams actually work in ${c.name}.`,
      `It shows up constantly in interviews and on the job.`,
      `Getting it right early makes advanced topics far easier.`,
    ]),
    h(`A concrete example`),
    p(`Examples make abstract ideas stick. Here's a representative example from real ${c.name.toLowerCase()} work:`),
    ...(codeFor(c) ? [codeFor(c)!] : [ul(c.tools.slice(0, 4).map((tool) => `${tool} is commonly used here`))]),
    ...skillsSection(c),
    h(`Where to go next`),
    p(`Once this clicks, the natural next steps are to get hands-on with ${human(c.tools.slice(0, 3))} and to build a small project that uses the idea end to end.`),
    buildFaq(t, c),
    ...conclusion(t, c),
  ];
}

function buildGuide(t: BlogTopic, c: CategoryKnowledge): Block[] {
  return [
    ...introBlocks(t, c),
    ...keyTakeaways([
      `Understand the core idea before the tooling.`,
      `Key tools: ${human(c.tools.slice(0, 4))}.`,
      `Apply it immediately in a small project.`,
      `Practise the interview-style explanation out loud.`,
    ]),
    h(`Understanding the essentials`),
    p(`${t.title.replace(/:.*$/, "")} sits inside ${c.name}, where ${c.blurb.charAt(0).toLowerCase() + c.blurb.slice(1)} We'll keep this practical and example-led.`),
    ...skillsSection(c),
    h(`Step-by-step`),
    ol([
      `Start with the concept and a clear mental model.`,
      `Set up your environment with ${human(c.tools.slice(0, 2))}.`,
      `Work through a small, real example end to end.`,
      `Review, refactor and document what you built.`,
      `Explain it to someone else — teaching exposes gaps.`,
    ]),
    ...toolsSection(c),
    h(`Common pitfalls to avoid`),
    ul([
      `Collecting tutorials without ever shipping anything.`,
      `Skipping fundamentals to chase the newest tool.`,
      `Not writing things down — your future self will thank you.`,
    ]),
    ...careerSection(t, c),
    buildFaq(t, c),
    ...conclusion(t, c),
  ];
}

const BUILDERS: Record<BlogTopic["kind"], (t: BlogTopic, c: CategoryKnowledge) => Block[]> = {
  roadmap: buildRoadmap,
  comparison: buildComparison,
  salary: buildSalary,
  interview: buildInterview,
  projects: buildProjects,
  certification: buildCertification,
  whatis: buildWhatIs,
  guide: buildGuide,
};

export function getPostContent(t: BlogTopic): Block[] {
  const c = categoryBySlug(t.categorySlug)!;
  const builder = BUILDERS[t.kind] || buildGuide;
  return builder(t, c);
}

// Table of contents = top-level headings (h2).
export function tableOfContents(blocks: Block[]) {
  return blocks.filter((b): b is Extract<Block, { type: "heading" }> => b.type === "heading").map((b) => ({ id: b.id, text: b.text }));
}

// Estimate read time from generated content (≈ 200 wpm + table/code overhead).
export function estimateReadTime(blocks: Block[]): string {
  let words = 0;
  for (const b of blocks) {
    if (b.type === "paragraph") words += b.text.split(/\s+/).length;
    else if (b.type === "list") words += b.items.join(" ").split(/\s+/).length;
    else if (b.type === "heading" || b.type === "subheading") words += b.text.split(/\s+/).length;
    else if (b.type === "callout") words += b.text.split(/\s+/).length + 6;
    else if (b.type === "table") words += b.head.length * 3 + b.rows.flat().length * 3;
    else if (b.type === "code") words += b.code.split(/\s+/).length;
    else if (b.type === "faq") words += b.items.map((i) => i.q + " " + i.a).join(" ").split(/\s+/).length;
  }
  return `${Math.max(3, Math.round(words / 200))} min`;
}

// ── Inline + block HTML serialization (used by the SEO prerender script) ─────

export function escapeHtml(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Convert **bold**, `code` and [text](url) to HTML (after escaping).
export function inlineToHtml(s: string) {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

export function blocksToHtml(blocks: Block[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "heading":
        parts.push(`<h2 id="${b.id}">${escapeHtml(b.text)}</h2>`);
        break;
      case "subheading":
        parts.push(`<h3 id="${b.id}">${escapeHtml(b.text)}</h3>`);
        break;
      case "paragraph":
        parts.push(`<p>${inlineToHtml(b.text)}</p>`);
        break;
      case "list":
        parts.push(
          `<${b.ordered ? "ol" : "ul"}>${b.items.map((i) => `<li>${inlineToHtml(i)}</li>`).join("")}</${b.ordered ? "ol" : "ul"}>`,
        );
        break;
      case "table":
        parts.push(
          `<table><thead><tr>${b.head.map((hd) => `<th>${escapeHtml(hd)}</th>`).join("")}</tr></thead><tbody>${b.rows
            .map((r) => `<tr>${r.map((c) => `<td>${inlineToHtml(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`,
        );
        break;
      case "code":
        parts.push(`<pre><code class="language-${b.lang}">${escapeHtml(b.code)}</code></pre>`);
        break;
      case "callout":
        parts.push(`<aside class="callout callout-${b.variant}">${b.title ? `<strong>${escapeHtml(b.title)}: </strong>` : ""}${inlineToHtml(b.text)}</aside>`);
        break;
      case "quote":
        parts.push(`<blockquote>${inlineToHtml(b.text)}${b.cite ? `<cite>${escapeHtml(b.cite)}</cite>` : ""}</blockquote>`);
        break;
      case "faq":
        parts.push(
          `<section class="faq"><h2 id="faq">Frequently Asked Questions</h2>${b.items
            .map((i) => `<div class="faq-item"><h3>${escapeHtml(i.q)}</h3><p>${inlineToHtml(i.a)}</p></div>`)
            .join("")}</section>`,
        );
        break;
    }
  }
  return parts.join("\n");
}

// Collect FAQ items across blocks (for FAQPage schema).
export function collectFaq(blocks: Block[]): { q: string; a: string }[] {
  const items: { q: string; a: string }[] = [];
  for (const b of blocks) if (b.type === "faq") items.push(...b.items);
  return items;
}
