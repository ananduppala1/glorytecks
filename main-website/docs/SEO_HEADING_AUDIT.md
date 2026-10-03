# SEO Heading Audit

Every public indexable page, its H1, and whether the heading hierarchy holds.

**Rules applied**

1. Exactly one H1 per page, and it describes the page.
2. H2/H3 descend logically — no skipped levels used for styling.
3. Headings are written for a reader, not stuffed with a target phrase.
4. No hidden text, no keyword lists dressed up as headings.
5. No heading over an empty section.

---

## Fixed pages

| Page | H1 | Source | H2 count | Verdict |
| --- | --- | --- | :---: | --- |
| `/` | *"Launch Your **Tech Career** with …"* (CMS-editable) | `HomeView` | 13 | ✅ Single H1 from the CMS hero. Fallback copy de-superlatived — see §Changes. |
| `/courses` | Explore Our Courses | `PageHeader` | 1 | ✅ |
| `/training-in-hyderabad` | IT Training in **Ameerpet, Hyderabad** | `LocationView` | 3 | ✅ **Changed** — see §Changes. |
| `/placements` | Placements at GloryTecks | `PageHeader` | 3 | ✅ |
| `/about` | *CMS hero heading* (fallback: "Shaping Careers. Building Futures.") | `AboutView` | 2 | ✅ |
| `/contact` | Contact GloryTecks | `PageHeader` | 3 | ✅ |
| `/compare` | Course & Tool Comparisons | `ComparisonIndexView` | 1 | ✅ |
| `/resources` | Learning Resources | `PageHeader` | 1 | ✅ |
| `/entities` | Our Entities | `PageHeader` | 0 | ⚠️ H1 + H3 cards, no H2. Cosmetic only — the cards are a list of sibling entities, not a nested outline. Left alone. |
| `/blog` | IT Career Guides & **Free Resources** | `BlogArchive` | — | ✅ |
| `/thank-you` | Thank you! Your enquiry has been received. | `ThankYouView` | 0 | ✅ `noindex`; no hierarchy needed. |

## Dynamic pages

| Page | H1 | H2 structure | Verdict |
| --- | --- | --- | --- |
| `/courses/{slug}` | `{Course} Course in Hyderabad` | Syllabus · Tools Covered · Projects Included · FAQs* · Related Courses | ✅ **FAQ heading fixed** — see §Changes. |
| `/blog/{slug}` | Post title | Content blocks render H2/H3 from the CMS `heading`/`subheading` block types | ✅ |
| `/blog/category/{slug}` | `{Category} Guides & Tutorials` | Shared archive layout | ✅ |
| `/compare/{slug}` | `{ItemA} vs {ItemB}` | 5 sections (comparison table, verdict, related, FAQs) | ✅ |
| `/resources/{slug}` | Resource title | 1 | ✅ |
| `/{landingSlug}` | `{Course} Course in {Locality}, Hyderabad` | 7 | ✅ Distinct from the course page's H1 by locality. |

\* Rendered only when the course has FAQs — see §Changes.

## Utility / non-indexable

| Page | H1 | Notes |
| --- | --- | --- |
| `app/not-found.tsx` | GloryTecks 404 body | `noindex`, HTTP 404. |
| `app/(site)/not-found.tsx` | Page not found | `noindex`, HTTP 404. |
| `/brochures/{slug}/download` | *(none)* | `noindex` spinner hand-off. No content, so no heading is correct. |

---

## Changes made

### 1. `/training-in-hyderabad` — H1 superlative removed

```diff
- <h1>Best IT Training Institute in Hyderabad</h1>
+ <h1>IT Training in Ameerpet, Hyderabad</h1>
```

Two problems. "Best" is an unsubstantiated superlative in the single most
weighted element on the page. And the H1 claimed the **city** while the page is
about the **Ameerpet centre** — which put it in direct competition with the
homepage for the city-level query. The new H1 matches the page's actual
subject and its declared intent (`IT training Ameerpet`).

### 2. `/training-in-hyderabad` — two keyword-stuffed sections removed

The page carried a block commented `{/* SEO keyword section */}` that rendered
eight keyword phrases as a checkmarked list:

> ✓ Best Data Science Training in Hyderabad ✓ Python Course near Ameerpet
> ✓ Generative AI Course Hyderabad ✓ Power BI Training Ameerpet …

…under the heading *"Why GloryTecks is Hyderabad's Top IT Institute"*, followed
by a second section listing every locality in the city
(Kukatpally, KPHB, Miyapur, Madhapur, Begumpet, Banjara Hills, Dilsukhnagar,
LB Nagar, Uppal) inside prose.

That is a keyword list formatted to look like content. It told a visitor
nothing and it is precisely the pattern that "remove meta keywords, don't
replace them with another stuffing mechanism" is about. Both sections are
replaced by one honest section — **"Training at the Ameerpet centre"** —
covering metro access, batch formats and links to placements and contact.

### 3. Course pages — FAQ heading no longer sits over an empty section

The course page rendered:

```html
<h2>{Course} Course in Hyderabad — Frequently Asked Questions</h2>
<Accordion>  <!-- (course.faqs ?? []).map(...) -->
```

**No course in the CMS has any FAQs** (verified against the live
`/public/courses` — all nine return `faqs: []`). So every course page showed a
heading with nothing beneath it, while `CourseFaqSchema` separately published
five *hardcoded* questions as FAQPage rich-results markup. The structured data
and the visible page had nothing in common.

Now: the section renders only when FAQs exist, the schema is built from that
same list, and both vanish together. The heading is also simplified from
`{Course} Course in Hyderabad — Frequently Asked Questions` to
**"Frequently asked questions"** — the course name is already the H1.

### 4. Homepage FAQ heading

`Frequently Asked Questions — GloryTecks Hyderabad` → **"Frequently asked
questions"**. The brand and city are established by the H1 and the rest of the
page; repeating them in an H2 is padding.

---

## Known cosmetic issues, deliberately not changed

| Page | Issue | Why left |
| --- | --- | --- |
| `/entities` | H1 → H3 with no H2 | The six brand cards are siblings in a flat list, not a nested outline. Restructuring is a UI change with no SEO gain. |
| `/courses`, `/resources` | H1 → H3 card titles | Same: card grids, not document outlines. |
| `/` | 13 H2s | A long landing page with many genuine sections. Not a defect. |
| `/` H1 | Ships from the CMS (`settings.heroSection`) | The live H1 is the owner's to write. The in-code **fallback** was `"…with Hyderabad's Best Training"`; only that fallback is within this refactor's reach, and the CMS value overrides it. Flagged in `SEO_PHASE_2_AUDIT.md` §Entity for the owner to review in the admin panel. |
