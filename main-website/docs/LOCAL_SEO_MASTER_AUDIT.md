# Local SEO Master Audit — NAP, Business Identity and Structured Data

**Status: report only for business facts. No business value was changed.** The street number (603 vs 611) is left exactly as it was. The two other conflicts found — email and coordinates — are left alone too, because choosing between them is a business decision, not a code one.

| | |
| --- | --- |
| Date | 2026-09-24 (live reads 21:40–22:03 UTC on 2026-09-23) |
| Canonical source | `main-website/config/business.ts` |
| Scanned | `main-website` (app, components, lib, config), `backend` (src, seeds, Supabase migrations), `admin-frontend/src`, the rendered JSON-LD, the live CMS API, the Google Maps listing behind the site's own share link, the legacy site at glorytecks.com and its source in `website-main.zip` |
| New test | `lib/seo/nap.test.ts` (repository, runs in `npm test`) and `lib/seo/nap.live.test.ts` (live, opt-in): `npm run test:nap` |

---

## 1. Decisions needed

These are the only places where two sources disagree. Every one is recorded, with its exact value, in `NAP_OPEN_CONFLICTS` in `config/business.ts`. The NAP test fails on any *other* difference, and on any entry here that stops being true.

| # | Fact | Canonical today (`config/business.ts`) | Conflicting value → where | Evidence | Who decides |
| --- | --- | --- | --- | --- | --- |
| 1 | **Street number** | `603, Annapurna Block, Aditya Enclave` — also the DB migration default, 3 backend seed files, the CMS Ameerpet locality copy, the JSON-LD and the homepage FAQ | **`611, …`** → the live CMS Settings row (footer, contact page, training page), the legacy site everywhere | None in the repo. Needs the door, rental agreement, GST registration and the Google Business Profile, character for character. | Business |
| 2 | **Email** | `gloryteckss@gmail.com` — also the migration default and 2 seed files, and the JSON-LD | **`info@glorytecks.com`** → live CMS Settings (the visible email on the new site), the legacy site everywhere | The CMS value was set by an admin, and the legacy site agrees with it. | Business |
| 3 | **Coordinates** | `17.4363325, 78.4422454` | **`17.4367335, 78.4450028`** → the pin of the Google Maps listing. **`17.4375, 78.4463`** → legacy site, and the `/training-in-hyderabad` map | The canonical value is the map embed's **viewport centre** (`!2d/!3d`), not a pin. The site's share link resolves to the same place ID, with its pin about 300 m east (296 m). The older training-page value noted in `config/business.ts` (17.4367392, 78.4450008) sits 0.7 m from that pin; the legacy value is 162 m away. | Business (confirm on GBP), then engineering |
| 4 | **Google Business Profile URL** | `null`, so it is not in `sameAs` | `https://maps.app.goo.gl/oCUrDQA4QUp22E8B6` → homepage and contact page links | It resolves to the Maps listing **"Glorytecks"**, place `0x651a567e218dfc37:0xcbca18824dcfbc45`, entity `/g/11zbpqw3c1`. That is the same place the homepage and contact embeds show. Whether the business has *claimed* it is unknown. | Business |
| 5 | **X / Twitter profile** | not in `socialProfiles` | `https://x.com/glorytecks` → live CMS Settings (added in the same 21:51:46 UTC edit). The footer now shows it. | The legacy site's `twitter:site` is `@glorytecks`. | Business |
| 6 | **Training-page map** | GloryTecks listing (as on home and contact) | A generic **"Ameerpet, Hyderabad"** place → `components/views/LocationView.tsx:98` | The embed is centred on the legacy rounded coordinates and pins no business. This is the page that carries the LocalBusiness node. | Approval (it is a visible change) |

### What the new site shows right now

At **2026-09-23 21:51:46 UTC** the CMS Settings row was edited. The address changed 603 → 611 and X was added. The email had already been changed to `info@glorytecks.com` before this audit began. As a result, the Next.js build — with this data — states **both** street numbers:

| Where | Street | Email | Source |
| --- | --- | --- | --- |
| Footer, contact page, training page (visible) | **611** | **info@glorytecks.com** | CMS Settings |
| Organization and LocalBusiness JSON-LD | 603 | gloryteckss@gmail.com | `config/business.ts` |
| Homepage FAQ (visible + FAQPage) | 603 | — | `config/business.ts` |
| Ameerpet location landing copy | 603 | — | CMS localities row |

Search engines weigh visible NAP against structured data and the Google Business Profile, so this must be resolved before the domain moves. Once the true values are confirmed, the fix is mechanical (§7).

---

## 2. One canonical source of truth

| Role | Source | Read by |
| --- | --- | --- |
| **Structured-data business facts** (the only canonical source) | `config/business.ts` → `BUSINESS` | `lib/schema.ts` (Organization, LocalBusiness, WebSite, homepage FAQ), `app/layout.tsx` (`geo.position`, `ICBM`) |
| Editable visible contact block | CMS Settings row (`GET /public/settings`) | `useContactInfo()`: footer, header, contact, training page, sticky CTA, WhatsApp button, thank-you page |
| Graph identity | `SCHEMA_ID` in `lib/schema.ts` | every JSON-LD node. After this phase, no other file writes an `#organization`, `#localbusiness` or `#website` id (enforced). |

The CMS being editable is intentional (see the header of `config/business.ts`). It is exactly why the NAP test compares the CMS with the canonical file on every live run.

**Changed in this phase (structure only — no business value):**

- `config/business.ts`:
  - two new unverified-fact flags, `VERIFICATION.email` and `VERIFICATION.googleBusinessProfile`, with their evidence
  - the new coordinate evidence added to `VERIFICATION.geo`
  - the machine-readable `NAP_OPEN_CONFLICTS` ledger (§1)
- `app/(site)/blog/[slug]/page.tsx`: a post with no named author declared an anonymous second `{ "@type": "Organization", "name": "GloryTecks" }`. It now references the one organization by `@id`.
- `app/(site)/blog/page.tsx`: the Blog node's `publisher` and `isPartOf` used hand-written id strings. They now use `SCHEMA_ID`. The output is byte-identical.

---

## 3. Every occurrence, by fact

### 3.1 Repository (from `lib/seo/nap.test.ts`: 62 observations in 13 sources)

Paths are relative to `main-website/` unless they start with `backend/`. `#Organization`, `#LocalBusiness` and `#homeFaq` are the JSON-LD `lib/schema.ts` renders.

| Fact | Value | Stated at | Matches canonical |
| --- | --- | --- | :---: |
| Business name | `GloryTecks` | `lib/schema.ts#Organization`, `backend/supabase/migrations/20260101000100_singletons.sql:20`, `backend/src/seed/sitedata/homedata.ts:72` | ✅ |
| Legal name | *none asserted* | `BUSINESS.legalName = null`, so `legalName` is omitted from the schema. The legacy site used `alternateName: "Glory Technologies Training Institute"`, which is unconfirmed and not carried over. | ✅ |
| Street | `603, Annapurna Block, Aditya Enclave` | `lib/schema.ts#Organization`, `#LocalBusiness`, `#homeFaq`; `backend/…/20260101000100_singletons.sql:25`; `backend/src/seed/sitedata/homedata.ts:77`, `legal.ts:27`, `locations.ts:23` | ✅ (see §1 #1) |
| Locality | `Ameerpet, Hyderabad` · region `Telangana` · country `IN` | `config/business.ts` → `postalAddressSchema()`, plus the same text in every full-address string above | ✅ |
| Postal code | `500038` | the same 6 places as the street | ✅ |
| Phone | `+91 99080 99980` (every format normalises to `919908099980`) | `app/error.tsx:46`, `components/ErrorBoundary.tsx:52`, `components/views/HomeView.tsx:732`, `lib/schema.ts#Organization`, `#LocalBusiness`, `#homeFaq`, `backend/…/singletons.sql:22-23`, `backend/src/seed/sitedata/homedata.ts:74-75`, `legal.ts:28` | ✅ |
| Email | `gloryteckss@gmail.com` | `lib/schema.ts#Organization`, `#LocalBusiness`, `backend/…/singletons.sql:24`, `backend/src/seed/sitedata/homedata.ts:76`, `legal.ts:29` | ✅ (see §1 #2) |
| Latitude / longitude | `17.4363325, 78.4422454` | `lib/schema.ts#LocalBusiness`, map embeds `components/views/HomeView.tsx:598`, `ContactView.tsx:445`, `app/layout.tsx` geo meta | ✅ |
| | `17.4375, 78.4463` | map embed `components/views/LocationView.tsx:98` | ⚠️ ledger |
| Opening hours | Mon–Sat 08:00–21:00 | `lib/schema.ts#LocalBusiness`, `components/site/Footer.tsx:148`, `ContactView.tsx:430`, `HomeView.tsx:583`, `HomeView.tsx:732`, `LocationView.tsx:78` | ✅ |
| | Sun 09:00–17:00 | the same, except `HomeView.tsx:732` (which states Mon–Sat only) | ✅ |
| Maps place | `0x651a567e218dfc37:0xcbca18824dcfbc45` | `lib/schema.ts#LocalBusiness` (`hasMap`), embeds `HomeView.tsx:598`, `ContactView.tsx:445` | ✅ |
| | `0x3bcb90d2e7a2f4a1:0x1` (generic "Ameerpet") | `LocationView.tsx:98` | ⚠️ ledger |
| GBP URL | `https://maps.app.goo.gl/oCUrDQA4QUp22E8B6` | `HomeView.tsx:589`, `ContactView.tsx:436` | ⚠️ ledger (canonical `null`) |
| Social | Facebook, Instagram, LinkedIn, YouTube (4 URLs) | `lib/schema.ts#Organization` (`sameAs`), `backend/src/seed/sitedata/homedata.ts:79-82`, YouTube also `HomeView.tsx:543` | ✅ |
| Organization `@id` | `https://glorytecks.com/#organization` | `SCHEMA_ID.organization` only (enforced) | ✅ same id as the legacy site |
| LocalBusiness `@id` | `https://glorytecks.com/#localbusiness` | `SCHEMA_ID.localBusiness` only (enforced) | ✅ same id as the legacy site |
| WebSite `@id` | `https://glorytecks.com/#website` | `SCHEMA_ID.website` only (enforced) | ✅ same id as the legacy site |

Not NAP, but stated for completeness:
- `og:site_name` is `GloryTecks — IT Training Institute Hyderabad` (`lib/seo/index.ts:57`, the same as legacy).
- The `geo.placename` meta is `Ameerpet, Hyderabad, Telangana, India`.
- `twitter:site` is `@glorytecks`.
- Staff login emails (`admin@`, `reception@`, `content@glorytecks.com`) and the admin login placeholder are excluded from the scan as auth accounts, not public contact.

**Nothing states NAP in:** `admin-frontend/src`, the sitemap routes (`app/sitemaps/*`), `lib/sitemap-data.ts`, or the location-landing route table (`config/locationLandings.ts`).

### 3.2 Live sources

| Source | Name | Street | Phone | Email | Coordinates | Place / GBP | Social |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS Settings (`/public/settings`, `updatedAt` 2026-09-23 21:51:46 UTC) | GloryTecks ✅ | **611** ⚠️ | ✅ | **info@glorytecks.com** ⚠️ | — (no field) | `mapUrl` empty | 4 ✅ + **x.com/glorytecks** ❌ |
| CMS localities (`/public/localities`) | — | 603 ✅ (Ameerpet intro) | — | — | — | — | — |
| CMS About (`/public/about`) | — | — | — | — | — | — | — |
| Google Maps listing (via the share link) | "Glorytecks" ✅ (case only) | — | — | — | **17.4367335, 78.4450028** ⚠️ | same place id ✅ | — |
| Legacy site (glorytecks.com) | GloryTecks ✅ | **611** ⚠️ | ✅ | **info@glorytecks.com** ⚠️ | **17.4375, 78.4463** ⚠️ | `hasMap` is a search URL, not a place | 4 ✅ |
| Legacy source (`website-main.zip`: `src/data/seo.ts`, `legal.ts`, `locations.ts`, `Footer.tsx`, `Contact.tsx`, `public/llms.txt`) | GloryTecks | 611 | +91 99080 99980 | info@glorytecks.com | 17.4375, 78.4463 | — | 4 + `@glorytecks` handle |

Hours: the legacy source states the same two bands as `config/business.ts`. The Google listing's hours could not be read without the Places API, so they are still to be confirmed on the GBP.

---

## 4. Structured data verification

### 4.1 The graph

| Node | `@type` | `@id` | Linked by | Emitted on |
| --- | --- | --- | --- | --- |
| Organization | `EducationalOrganization` | `…/#organization` | — | every page (root layout) |
| Place | `LocalBusiness` | `…/#localbusiness` | `parentOrganization → #organization` | `/`, `/training-in-hyderabad` |
| Website | `WebSite` | `…/#website` | `publisher → #organization` | every page (root layout) |
| Course | `Course` | `…/courses/{slug}#course` | `provider → #organization`, `isPartOf → #website`, onsite `location → #localbusiness` | `/courses/{slug}` |
| Location-landing course | `Course` | *(none)* | `provider → #organization`, onsite `location → #localbusiness` | `/{course}-course-{locality}` |
| Blog post | `BlogPosting` | — | `publisher → #organization`. `author` is the named Person, or `#organization` (fixed this phase) | `/blog/{slug}` |

EducationalOrganization, LocalBusiness, WebSite, every existing `@id` and `parentOrganization` are preserved, and `nap.test.ts` pins them.

### 4.2 Business-identity claims

| Check | Result | How verified |
| --- | --- | --- |
| Real business identity | ✅ Name, address, phone, email, hours and `sameAs` come only from `config/business.ts`. The brand matches the CMS, the seeds and the Google listing (case only). | `nap.test.ts` *takes every NAP property from config/business.ts*, plus the live run |
| No self-serving `AggregateRating` | ✅ None in any JSON-LD. The old `4.9 from 500 reviews` markup was removed earlier. | Source scan of every page and component, plus the rendered nodes |
| No invented founding date | ✅ No `foundingDate` (legacy had `2020`). The CMS About copy says "was founded with one mission", with no year. | same |
| No invented employee count | ✅ No `numberOfEmployees` (legacy had `20`) | same |
| No unsupported price / availability | ✅ No `priceRange`, `offers`, `price` or `availability` on any node. The CMS has no course prices (`price` is empty or absent on all 9). | same, plus the CMS course data |
| No implied campus | ✅ One `LocalBusiness`, one address. `areaServed` lists 6 districts as bare `Place` names with no address or pin. No `department`, `subOrganization` or `branchOf`. Every location landing's onsite instance points at the Ameerpet `#localbusiness`, and the CMS locality copy says learners there are served "with live online batches and easy metro access to the Ameerpet centre". The legacy Organization description claimed courses "at Ameerpet and Kukatpally"; that is not carried over. | `nap.test.ts` *describes one physical centre* |

**Visible claims that are not in structured data but need the business to confirm** (content, not changed):

- `/training-in-hyderabad` shows **"4.9/5 from 500+ Google Reviews"** (hardcoded, `LocationView.tsx:93-94`).
- The homepage hero shows **"⭐ 4.9/5 Google Rating"** (CMS `heroSection.badges`).
- **"Hyderabad's #1 IT Training Institute"** appears in the CMS tagline and hero badge.
- The CMS stats read **3000+ trained, 95% placement, 500+ hiring partners**.

None of these can be checked against the Google listing without the Places API. A review count that disagrees with the GBP is a trust problem even though it is not markup.

### 4.3 Course schema

Live CMS data for the 9 published courses:

| Course | Duration | Description | Modules | Tools | FAQs | Banner | Price |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| Data Science | 6 Months | 178 ch | 14 | 16 | 0 | none | empty |
| Generative AI | 5 Months | 179 ch | 12 | 19 | 0 | none | — |
| Agentic AI | 5 Months | 176 ch | 11 | 21 | 0 | none | — |
| MLOps | 4 Months | 171 ch | 14 | 16 | 0 | none | — |
| Data Analytics | 4 Months | 180 ch | 9 | 13 | 0 | none | — |
| Power BI | 2 Months | 174 ch | 10 | 11 | 0 | none | — |
| Python Programming | 4 Months | 184 ch | 18 | 11 | 0 | none | — |
| SQL Server | 2 Months | 176 ch | 13 | 5 | 0 | none | — |
| Data Engineering | 3 Months | 182 ch | 14 | 20 | 0 | none | — |

| Check | Result |
| --- | --- |
| Course nodes use only real fields | ✅ `name`, `description`, `teaches` (the modules), `about` and the duration all come from the CMS. Nothing is filled in when a field is empty: no `image` without a banner, and no FAQPage without FAQs. |
| Provider | ✅ `provider → #organization` on course pages and location landings |
| Course instances | ✅ Two instances, `onsite` (location `#localbusiness`) and `online`. Both modes are stated on the page. No `startDate`, `courseSchedule` or `offers`. The CMS "upcoming batches" are all dated **June 2026**, three months past, and are correctly **not** used. |
| `/courses` ItemList | ⚠️ **Not present.** `/courses` emits `CollectionPage` + `BreadcrumbList` only. An ItemList of the 9 course URLs would use only real data; it was not added in this phase. |
| `courseWorkload` | ⚠️ Holds the calendar length ("6 Months"). schema.org types it as Text, so it is valid, but Google's Course guidance describes it as total effort in ISO 8601 (e.g. `PT120H`). The real effort in hours is not in the CMS, so it must not be invented. |
| `timeRequired` (location landings only) | ⚠️ `"6 Months"`. schema.org expects an ISO 8601 Duration (`P6M`), so validators will flag the type. |
| Location-landing Course `@id` | ⚠️ None. The main course pages have `…#course`, and the landing courses are separate unnamed nodes. |
| `#localbusiness` references | ⚠️ Course and landing pages reference `#localbusiness`, but that node is only emitted on `/` and `/training-in-hyderabad`. This is valid JSON-LD, but on those pages the reference carries no address. |
| `hasMap` | ⚠️ `https://www.google.com/maps/place/?q=place_id:0x651a…:0xcbca…` passes a Maps *feature id* where Google expects a Place ID (`ChIJ…`). Whether it opens the listing could not be confirmed by a crawler, because Maps renders in JavaScript. The share link in §1 #4 and `https://maps.google.com/?cid=14684576482925198405` (the CID of the same place) are the documented forms. |

---

## 5. The NAP consistency test

### How it works

1. `lib/seo/nap.ts` normalises every business fact to a comparable value:
   - phone digits (`+91 99080 99980`, `+919908099980` and `919908099980` are all one number)
   - lower-cased street and email
   - the brand without case or punctuation
   - coordinates, compared within **0.0002° (~22 m)**
   - hours as `mon-sat 08:00-21:00`
   - the Maps place id
   - normalised URLs
2. It **discovers** occurrences rather than trusting a hand-kept list. A new file that hardcodes a phone, street, email, map embed, share link, hours string, `siteName` or social URL is compared automatically. Documentation comments are ignored, so `config/business.ts` quoting both 603 and 611 is not a claim.
3. Every observation is compared with `config/business.ts`. Differences are reconciled with `NAP_OPEN_CONFLICTS`.

### It fails when

- any source states a different **address, postal code, phone, email, coordinates, business name, Maps place, GBP URL, hours or social profile** that the ledger does not record with that exact value;
- a ledger entry no longer matches reality (**stale**). Resolving a conflict forces the ledger to be cleaned up with it;
- a ledger entry sits on a fact whose `VERIFICATION` flag is `true`, or on a field that can never be an open conflict (phone, name, hours, social);
- an extractor silently stops finding things (minimum counts per field, and named sources that must be read);
- structured data gains a second Organization, LocalBusiness or WebSite definition, a hand-written `#organization`, `#localbusiness` or `#website` id, a rating, founding date, employee count, price range or offer, or anything implying a second campus;
- a Course node loses `provider → #organization` or the onsite `location → #localbusiness`, or gains an offer, price or schedule.

### Proven on real files (mutation test, each reverted)

| Mutation | Result |
| --- | --- |
| `backend/src/seed/sitedata/legal.ts`: 603 → 611 | ❌ `legal.ts:27 streetAddress = "611, …" (canonical "603, …")` |
| `app/error.tsx`: `tel:+919908099980` → `…81` | ❌ `error.tsx:46 telephone = "919908099981"` |
| `ContactView.tsx` embed latitude 17.4363 → 17.4383 | ❌ `ContactView.tsx:445 geo = "17.4383325,78.4422454"` |
| Migration default email → `hello@glorytecks.com` | ❌ `singletons.sql:24 email = "hello@glorytecks.com"` |
| All reverted | ✅ 21/21 |

### Commands

```bash
cd main-website
npm test                                    # includes the repository NAP scan
NAP_REPORT=nap.json npx vitest run lib/seo/nap.test.ts     # + machine-readable JSON report

# live: CMS, the Google listing, and a deployed site
NAP_LIVE_API=https://glorytecks-backend-one.vercel.app/api/v1 \
NAP_LIVE_GOOGLE=1 \
NAP_LIVE_SITE=https://glorytecks.com \
npm run test:nap
```

---

## 6. Verification runs

| Command | Result |
| --- | --- |
| `npm run typecheck` | ✅ exit 0 |
| `npm run lint` | ✅ exit 0: 0 errors, the same 9 pre-existing warnings |
| `npm test` | ✅ 12 files passed, 2 skipped: **361 passed**, 87 skipped (the opt-in live suites). `nap.test.ts` 21/21, with the 4 repository conflicts printed. |
| `npm run build` | ✅ exit 0, 42/42 static pages |
| Live NAP (`NAP_LIVE_API` + `NAP_LIVE_GOOGLE` + `NAP_LIVE_SITE=https://glorytecks.com`) | ❌ **1 failed**, 4 passed. The failure is the new `https://x.com/glorytecks` in CMS Settings — a real, unrecorded drift, caught as designed. Everything else is either consistent or an acknowledged ledger entry: CMS 611 and email, the Google pin, and the legacy site's 611, email and coordinates. Locality and About copy, the Google place and name, and the legacy structured data all pass. |

Not executed:

- Any change to a business value, including 603/611 (by instruction), the email, the coordinates, the GBP URL, `sameAs` and the training-page map (all need a decision).
- Reading the GBP's hours, review count or claimed status. That needs the Places API or the owner's GBP login.
- `hasMap` resolution. Google Maps renders in JavaScript, so a crawler cannot confirm the listing opens.

---

## 7. When the facts are confirmed

For each resolved fact:

1. Update `config/business.ts` (the value, then set its `VERIFICATION` flag to `true`).
2. Update the backend: the seed (`backend/src/seed/sitedata/homedata.ts`, `legal.ts`, `locations.ts`) and the migration default (`backend/supabase/migrations/20260101000100_singletons.sql` — via a new migration, not by editing an applied one).
3. Update the live CMS: the Settings row and, for the street, the Ameerpet locality intro.
4. Delete the matching `NAP_OPEN_CONFLICTS` entries.
5. Run `npm run test:nap` with the live variables. It passes only when every source agrees.

Recommended once confirmed (not done):

- Point the `/training-in-hyderabad` map at the GloryTecks listing.
- Set `googleBusinessProfile`, and consider using the same URL for `hasMap`.
- Align the LocalBusiness `name` ("GloryTecks — Ameerpet Centre") with the exact GBP name.
- Correct or remove the unverified rating, review and "#1" claims.
- Refresh the June batch dates.
- Consider the `/courses` ItemList and the ISO 8601 duration fix in §4.3.

**Do not begin Phase 3.** This report stops at 603/611, as instructed.
