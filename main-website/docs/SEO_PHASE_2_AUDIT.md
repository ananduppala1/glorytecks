# SEO Phase 2 — On-Page, Entity, Structured Data & Local

**Scope:** on-page SEO, entity/NAP consolidation, the JSON-LD graph, and local
SEO. Phase 1 (crawl, indexation, canonicals, sitemaps) is recorded in
`SEO_PHASE_1_AUDIT.md` and is not revisited here.

**Verified against:** the live GloryTecks backend on `localhost:5000` (real
Supabase content — 9 courses, real blog posts, the production Settings
singleton), not a fixture. Several findings below only surfaced because the
real data was available.

**Date:** 2026-09-22

---

## 1. Headline findings

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| 1 | **Self-serving `AggregateRating`** — `4.9` from `500` reviews published as machine-readable markup by the business about itself | **Critical** — against Google's structured-data policy; manual-action risk | Removed |
| 2 | **Course pages published FAQ markup for questions that appear nowhere on them.** `CourseFaqSchema` emitted 5 hardcoded Q&As; the visible section renders `course.faqs`, and **all 9 courses have `faqs: []`** — so the visible section was empty while the schema claimed five questions | **Critical** — total schema/content mismatch | Fixed |
| 3 | **Homepage FAQ schema and visible FAQ were different question sets** (different wording, different questions; the schema asserted a "4.9/5 rating from 500+ students" that was on no page) | High | Fixed — one source |
| 4 | **FAQPage emitted site-wide from the root layout** — every course, blog and comparison page carried the homepage's FAQ markup | High | Fixed |
| 5 | **`LocalBusiness` emitted twice on `/training-in-hyderabad`** (root layout + the page's own copy), same `@id` | High | Fixed |
| 6 | **Four independent nodes described one business**, none referencing the others | High | One `@id`-linked graph |
| 7 | **NAP in 9 places, already drifted** — street number disagrees with the live site; **three different coordinate pairs** | High (local) | Centralised + flagged |
| 8 | **Invented entity facts** — `foundingDate: 2020`, `numberOfEmployees: 20` | High | Removed |
| 9 | **Invented Course offers** — `priceCurrency: INR` + `availability: InStock` on every course with no price anywhere; plus invented `coursePrerequisites` / `educationalLevel` | High | Removed |
| 10 | **Visible keyword-stuffing block** — a checkmarked list of 8 keyword phrases under "Why GloryTecks is Hyderabad's Top IT Institute" | Medium | Replaced with real content |
| 11 | **Meta keywords on every page**, publishing the full target list to competitors | Medium | Removed sitewide |
| 12 | **Titles stuffed and superlative-led** — "Best", "#1", duration and "100% Placement Support" bolted onto every course title | Medium | Rewritten |
| 13 | **"100% placement" promised in meta descriptions** on all 9 course pages | Medium — consumer-protection exposure | Rewritten |
| 14 | **Logo carried `priority`** — a 48px mark preloading against the real LCP element on every page | Medium (CWV) | Removed |
| 15 | **Course-page `settings` fetch** existed only to feed the hardcoded FAQ | Low | Removed |
| 16 | CMS image blocks in articles had no reserved space (CLS) | Low | Aspect ratio added |

---

## 2. Business entity & NAP (§F)

### The problem

Nine copies of the address, three of the phone, and **three different
coordinate pairs**:

| Source | Coordinates |
| --- | --- |
| `lib/schema.ts` | `17.4375, 78.4463` (rounded — Ameerpet generally) |
| `app/(site)/training-in-hyderabad/page.tsx` | `17.436739241114978, 78.44500078388435` |
| Google Maps embed (home + contact) | `17.436332501389888, 78.44224537686785` |

### The street-number conflict — NOT silently resolved

```
This repository (9 locations, incl. the DB seed default):
    603, Annapurna Block, Aditya Enclave
The live site at glorytecks.com currently states:
    611, Annapurna Block, Aditya Enclave
```

Per the brief this was **not** decided unilaterally. Both facts are recorded in
[`config/business.ts`](../config/business.ts) under a `VERIFICATION` block with
`streetAddress: false`, the repository value retained so publishing this change
does not alter what customers see, and a four-step resolution procedure in the
comment. `lib/seo/onpage.test.ts` asserts the flag exists and is honest, so the
reminder cannot be quietly dropped.

> **Why this is the highest-value open item.** A mismatch between the address
> on the site and the address on the Google Business Profile suppresses local
> pack rankings. Everything else in this document is worth less than getting
> this one string right and making GBP match it character for character.

The coordinate conflict is flagged the same way (`VERIFICATION.geo: false`).
The value adopted is the Maps-embed pair, because it is the only one tied to an
actual Google place reference for GloryTecks
(`0x651a567e218dfc37:0xcbca18824dcfbc45`) rather than a guess at the area.

### What was not asserted

| Field | Why null |
| --- | --- |
| `legalName` | No incorporation document, GST certificate or About statement names one. Omitted from `Organization` entirely rather than guessed. |
| `googleBusinessProfile` | No GBP share link exists anywhere in the repository. A Maps link built from a place id is not proof of a claimed, verified profile. `sameAs` picks it up automatically once set. |

### Still duplicated downstream

`config/business.ts` governs **metadata and structured data**. The backend
still seeds its own copy for the CMS-rendered contact block:
`backend/src/seed/sitedata/homedata.ts`, `legal.ts`, `locations.ts`, and the
`settings` table default in `20260101000100_singletons.sql`. Those feed the
editable Settings record and were deliberately left alone — changing a database
default is a migration, not an SEO change. **They must be updated in the same
commit that resolves the street number**, or the visible contact block will
disagree with the schema.

---

## 3. Structured data (§G–J)

### Before → after

```
BEFORE                                  AFTER
EducationalOrganization  (root)         EducationalOrganization  #organization
LocalBusiness            (root)  ─┐       ├── address, hours, geo ← config/business.ts
WebSite                  (root)   │     LocalBusiness            #localbusiness
FAQPage                  (root)   │       └── parentOrganization → #organization
LocalBusiness  (training page) ───┘     WebSite                  #website
  + aggregateRating 4.9/500               └── publisher          → #organization
WebPage/AboutPage/…  (per page,         WebPage                  {url}#webpage
  each restating isPartOf by hand)        ├── isPartOf           → #website
Course (per course)                       └── about              → #organization
  + provider with inline address        Course                   {url}#course
  + offers with no price                  ├── provider           → #organization
                                          └── hasCourseInstance.location → #localbusiness
```

### Reviews and ratings (§J)

`aggregateRating: { ratingValue: "4.9", reviewCount: "500" }` on
`/training-in-hyderabad` was **self-serving review markup** — a rating about
the business, supplied by the business, on its own site. Google's policy does
not allow it and it carries manual-action risk.

Removed. Visible testimonials continue to render from the CMS; they are simply
not re-asserted as machine-readable ratings. `onpage.test.ts` asserts that
`aggregateRating`, `ratingValue`, `reviewCount` and `review` appear nowhere in
the graph.

### Course schema (§H)

Removed as unsupported:

| Property | Why |
| --- | --- |
| `offers` (`category: Paid`, `priceCurrency: INR`, `availability: InStock`) | **No price is published anywhere on the site.** A currency with no price is an incomplete offer, and asserting availability for a course with no published dates is a claim the page cannot back. |
| `coursePrerequisites: "Basic computer knowledge"` | Invented — the CMS has no prerequisites field. |
| `educationalLevel: "Beginner to Advanced"` | Invented, and meaningless as a range. |
| Inline `provider` address block | Replaced by an `@id` reference, so one organization node exists. |

`name` changed from `"{Course} Course in Hyderabad"` to `"{Course} Course"` —
a course name is a name, not a promotional string with a city in it.

Kept, because each is real CMS data: `teaches` (syllabus modules),
`description`, `image` (banner, scheme-vetted), `inLanguage`, and two
`CourseInstance` entries for onsite/online with `courseWorkload` from the real
`duration` field. The onsite instance points at `#localbusiness` — the actual
Ameerpet centre — rather than implying a campus per locality.

### FAQ (§I)

Three distinct violations, all fixed:

1. **Course pages** — schema had 5 hardcoded Q&As, page had `course.faqs`,
   which is empty for all 9 courses. Schema now derives from the visible list
   and emits nothing when empty; the visible heading no longer renders over an
   empty accordion.
2. **Homepage** — schema and visible block were maintained separately and had
   diverged. Both now render from `HOME_FAQS` in `lib/schema.ts`.
3. **Site-wide leakage** — the homepage FAQPage was emitted from the root
   layout onto every page. Now only on the homepage.

Claims removed from FAQ answers while reviewing them: a "4.9/5 rating from
500+ students" (unverifiable, and self-certified), "consistently rated among
the best", and an EMI figure of ₹1,999/month that appears nowhere else on the
site or in the CMS. The placement answer now describes the service and states
plainly that it is *"assistance with the job search, not a guarantee of
employment."*

Per the brief, FAQ markup is kept where it matches visible content but is
**not relied on for rich results** — Google restricted FAQ rich results to
authoritative government and health sites in 2023.

---

## 4. On-page (§A–E)

- **Intent map** — one `primaryIntent` per page, enforced by test. See
  `SEO_KEYWORD_MAP.md`.
- **Titles** — rewritten; tests reject superlatives, repeated place names,
  >65 characters, and repeated segments across the `|` separator.
- **Descriptions** — rewritten; tests reject guarantee language and
  superlatives, and enforce 70–260 characters. The regex deliberately ignores
  explicit *disclaimers* ("not a guarantee of employment") so honest copy is
  not penalised.
- **Meta keywords** — removed from the root layout and all 6 page types. Not
  replaced by any other injection mechanism; `primaryIntent` is never rendered.
- **Headings** — see `SEO_HEADING_AUDIT.md`.

### Visible business claims left in place

The CMS Settings singleton holds `studentsTrained: "3000+"`,
`placementRate: "95%"`, `hiringPartners: "500+"`, and
`tagline: "Hyderabad's #1 IT Training Institute"`. These render as visible
page copy and are the business's own claims to make in its own marketing.

They were **not** edited: they are owner-controlled CMS content, not code. What
changed is that they no longer appear in *structured data* or in *meta
descriptions*, where they become machine-readable assertions rather than
marketing copy.

⚠️ **For the owner to review in the admin panel** (outside this refactor's
reach): the `#1` tagline, and the homepage hero H1 if it still reads
"Hyderabad's Best Training". The in-code fallbacks were de-superlatived; the
CMS values override them.

---

## 5. Images (§L)

The image layer was already in reasonable shape — `SafeImage` handles host
allow-listing, dimensions, `sizes`, lazy-loading and `fetchPriority`, and alt
text is CMS-overridable with descriptive fallbacks.

| Item | Finding | Action |
| --- | --- | --- |
| Header logo | `priority` on a 48×48 mark, on every page | **Removed.** It preloaded against the real LCP element. `priority` now sits on exactly two images — the home and About heroes. |
| Blog body images | CMS block has no dimensions → CLS as each loads | Fixed wrapper `aspect-[16/9]`. Dimensions cannot be added without inventing them. |
| `AuthorAvatar` | Renders initials, `aria-hidden` | ✅ Correct — no image, no alt needed. |
| Blog covers | Deterministic **inline** `<svg>` | ✅ Decorative, `aria-hidden`. |
| Alt text | No generic `image`/`banner`/`photo` anywhere | ✅ |
| Filenames | Static assets are descriptive (`hero.webp`, `about1.webp`, `logo.png`). CMS filenames come from Cloudinary uploads | Editor guidance, not a code change. |
| Blog `og:image` | Was a category SVG no social scraper renders | Fixed in Phase 1 → `featuredImage` or the JPG default |
| Course `og:image` | Now the course's real CMS banner, scheme-vetted | ✅ |

---

## 6. Local landing pages (§M)

15 pages: 6 course × locality combos for Ameerpet, 9 across five other
localities.

**The honest picture.** Ameerpet is the only locality with a physical centre.
The other five — Kukatpally, Madhapur, Gachibowli, HITEC City, Dilsukhnagar —
are explicitly served *online and via the Ameerpet centre*; the seed copy says
so plainly. Those nine pages differ from one another only by the locality
intro, the context paragraph, nearby landmarks, and four locality-specific
FAQs generated from real course and locality data.

**Assessment: keep indexed, review with data.** They are not doorway pages —
each has distinct, human-written locality copy, serves a genuinely different
query (`{course} course {locality}` ≠ `{course} course Hyderabad`), and
honestly describes how a learner in that area is served. But the content is
thin relative to the course page it sits beside, and the risk grows if the set
is ever expanded.

De-indexing nine live pages without knowing whether they rank would be
destructive, so it was not done. **The decision needs one input this repository
cannot provide:** Search Console impressions and clicks per landing URL over
90 days.

- URLs with impressions → keep, and deepen with real local facts (batch
  timings, travel time from that locality, local hiring employers).
- URLs with none → consolidate into `/courses/{slug}` with a 301, or noindex.

What *was* fixed: the structured data no longer implies a campus in each
locality. `hasCourseInstance.location` references the real Ameerpet centre by
`@id`, and `areaServed` on `#localbusiness` lists the six localities as served
areas — which is true — rather than as places of business.

---

## 7. Open items

| # | Item | Owner | Blocking |
| --- | --- | --- | --- |
| 1 | **Confirm the street number (603 vs 611)** and make GBP match exactly | Business | Local pack rankings |
| 2 | Confirm the GBP pin coordinates | Business | Map accuracy |
| 3 | Update the backend seed + `settings` row once #1 is resolved | Engineering | NAP consistency |
| 4 | Add the GBP URL to `config/business.ts` → flows into `sameAs` | Business | Entity confidence |
| 5 | Add `legalName` if a registered entity exists | Business | Entity confidence |
| 6 | Review the CMS `#1` tagline and hero H1 in the admin panel | Business | Superlative claims |
| 7 | Pull GSC data for the 9 non-Ameerpet landings, then keep/consolidate | SEO | Thin-content risk |
| 8 | Decide whether course fees become public — if so, `Offer` can return with a real price | Business | "course fees" queries |
| 9 | Courses have **no FAQs in the CMS** — adding real ones would restore a genuine FAQ section | Content | On-page depth |

---

## 8. Verification performed

Built and served against the live backend, then asserted on the rendered HTML:

- Schema node placement per page type (FAQPage, LocalBusiness, Organization)
- `aggregateRating` / `ratingValue` / `reviewCount` absent everywhere
- `coursePrerequisites`, `educationalLevel`, `priceCurrency`, `availability`,
  `foundingDate`, `numberOfEmployees` absent
- `<meta name="keywords">` absent on every page type
- Title uniqueness, length and superlative-freedom across 12 URLs
- No duplicate `@id` on any single page

Plus **51 new unit tests** in `lib/seo/onpage.test.ts` covering intent
uniqueness, title/description quality, keyword removal, NAP single-sourcing,
graph integrity and FAQ honesty.
