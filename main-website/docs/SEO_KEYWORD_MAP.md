# SEO Keyword & Intent Map

One page, one primary intent. This is the anti-cannibalisation contract.

For the fixed pages the intent is declared in code as `primaryIntent` in
[`lib/seo/routes.ts`](../lib/seo/routes.ts), and `lib/seo/onpage.test.ts` fails
the build if two indexable pages ever claim the same one. Nothing here is
injected into a page — there is no keywords meta tag, and `primaryIntent` is
never rendered. It exists so that the decision about *which page owns which
query* is written down and enforced rather than re-litigated per commit.

**Intent is not a keyword to repeat.** The page earns the query through its
title, its H1, its body copy, the pages that link to it and its structured
data. Repeating the phrase is what the previous implementation did, and it is
why nine course pages all carried "best … course Hyderabad" in the title.

---

## 1. Fixed pages

| Page | Primary intent | Intent type | Why this page owns it |
| --- | --- | --- | --- |
| `/` | IT training institute Hyderabad | Commercial / brand | Broadest entity query. Homepage is the strongest URL and carries the Organization node. |
| `/courses` | IT courses Hyderabad | Commercial category | Catalogue hub; distributes authority to the nine course pages. |
| `/training-in-hyderabad` | IT training Ameerpet | **Local** | The only page describing a physical location. Owns the *locality*, while `/` owns the *city* — see §4. |
| `/placements` | GloryTecks placement support | Evaluative | Prospective students comparing institutes. Not a course query. |
| `/about` | About GloryTecks | Brand / E-E-A-T | Entity page. |
| `/contact` | GloryTecks contact | Navigational | NAP block supporting local search. |
| `/compare` | data career and tool comparisons | Evaluative hub | Comparison intent, not transactional. |
| `/resources` | GloryTecks learning resources | Brand / utility | Hub for the five resource pages. |
| `/blog` | IT career guides and tutorials | **Informational** | Deliberately fenced off from commercial queries — see §3. |
| `/entities` | GloryTecks group brands | Brand disambiguation | Low volume, genuine entity content. |
| `/thank-you` | *none* | — | Conversion confirmation. `noindex`. |

## 2. Course pages — `/courses/{slug}`

One transactional intent each, following the pattern
**`{course} course Hyderabad`**. The title template is
`{Course} Course in Hyderabad | GloryTecks` — the course name is the only
variable, so no two course titles collide.

| Page | Primary intent |
| --- | --- |
| `/courses/data-science` | Data Science course Hyderabad |
| `/courses/gen-ai` | Generative AI course Hyderabad |
| `/courses/agentic-ai` | Agentic AI course Hyderabad |
| `/courses/python-programming` | Python course Hyderabad |
| `/courses/power-bi` | Power BI course Hyderabad |
| `/courses/data-engineering` | Data Engineering course Hyderabad |
| `/courses/data-analytics` | Data Analytics course Hyderabad |
| `/courses/mlops` | MLOps course Hyderabad |
| `/courses/sql-server` | SQL Server course Hyderabad |

Slugs are the live CMS set (verified against `/public/courses`). A course added
in the CMS inherits the template automatically; the intent is implied by the
course name, so no registry entry is needed.

## 3. Blog — informational only

`/blog`, `/blog/category/{slug}` and `/blog/{slug}` serve **informational**
queries: how-to, roadmap, salary, interview-prep, "what is X". They must not
target the commercial course queries the `/courses/*` pages own.

The practical rule for writers:

- ✅ `"data science roadmap for beginners"`, `"power bi interview questions"`,
  `"data engineer salary in Hyderabad"`
- ❌ `"best data science course in Hyderabad"` — that query belongs to
  `/courses/data-science`. A blog post targeting it competes with the page
  that converts.

Category archives own the topic-hub query (`data science articles`), not the
course query. Paginated, filtered and search URLs target nothing — see
`SEO_INDEXABILITY_MATRIX.md`.

## 4. Location pages — the cannibalisation risk that matters

Three tiers of local intent exist, and they must stay separated:

| Tier | Page | Intent |
| --- | --- | --- |
| City | `/` | IT training institute **Hyderabad** |
| Locality (physical) | `/training-in-hyderabad` | IT training **Ameerpet** |
| Course × locality | `/{course}-course-{locality}` | *{course}* course in *{locality}* |

The 15 landing pages target `{course} course {locality}` — a genuinely
different query from `{course} course Hyderabad`, which the course page owns.
`/courses/data-science` and `/data-science-course-ameerpet` are therefore not
in conflict.

**Where the real risk sits:** the nine non-Ameerpet landings. See
`SEO_PHASE_2_AUDIT.md` §M for the full assessment. In short — Ameerpet is the
only locality with a physical centre; the other five are served online and via
the Ameerpet centre, and their pages differ from each other only by the
locality intro, context, nearby landmarks and locality-specific FAQs. They are
kept indexed because that copy is genuinely distinct and human-written, and
because de-indexing live pages without traffic data is destructive. They are
flagged for review against Search Console data.

## 5. What is deliberately not targeted

| Query class | Why not |
| --- | --- |
| "free data science course" | No free course exists. Targeting it would be a mismatch that bounces. |
| "data science course fees Hyderabad" | No price is published anywhere on the site. Until fees are public, the query cannot be answered on-page — so it is not claimed, and `Offer`/`priceRange` are absent from structured data. |
| "GloryTecks reviews" | Owning a review query with self-published ratings is what `AggregateRating` markup would have done. Removed — see §J of the audit. |
| "IT training near me" | Served by the local entity signals (NAP, LocalBusiness, GBP), not by a page. |
| Competitor brand names | Not pursued. |

## 6. Maintaining this

1. New fixed page → add it to `STATIC_ROUTES` with a `primaryIntent`. The test
   suite rejects a duplicate.
2. New course → nothing to do; the template covers it.
3. New blog post → informational intent only. If a draft targets a course
   query, it belongs on the course page instead.
4. New locality landing → confirm the locality has something true and specific
   to say. If it does not, do not create the page.
