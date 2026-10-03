# Local SEO — Launch Checklist

GloryTecks competes for "IT training institute Hyderabad" and "data science
course Ameerpet". Those are local-intent queries, decided largely by the Google
Business Profile and by whether your NAP agrees with itself everywhere.

> **Nothing in this document involves creating citations, reviews or listings
> that do not represent reality.** Fake reviews and fabricated citations are
> both a policy violation and, in India, a consumer-protection exposure under
> the 2022 CCPA guidelines on fake reviews. Every item below is about making
> *true* information consistent and complete.

---

## 0. BLOCKER — resolve the address first

**Do not complete the rest of this checklist until this is settled.**

```
Repository (9 locations incl. the DB seed default):
    603, Annapurna Block, Aditya Enclave, Ameerpet, Hyderabad – 500038
Live site currently states:
    611, Annapurna Block, Aditya Enclave, Ameerpet, Hyderabad – 500038
```

One of these is wrong. A mismatch between on-site NAP and the Google Business
Profile is the single largest suppressor of local pack ranking, so this
outranks every other item here.

**To resolve:**

1. Confirm the real suite number — door, rental agreement, GST registration.
2. Update `main-website/config/business.ts`:
   - `BUSINESS.address.streetAddress`
   - `VERIFICATION.streetAddress` → `true`
3. Update the backend copies in the **same commit**, or the CMS-rendered
   contact block will disagree with the structured data:
   - `backend/src/seed/sitedata/homedata.ts`
   - `backend/src/seed/sitedata/legal.ts`
   - `backend/src/seed/sitedata/locations.ts`
   - the `settings` row in the database (via the admin panel)
   - the default in `20260101000100_singletons.sql`
4. Make the Google Business Profile match **character for character**.

Same applies to `VERIFICATION.geo` — confirm the pin's coordinates from the GBP
and set the flag.

---

## 1. Google Business Profile

| Field | Value | Status |
| --- | --- | --- |
| **Business name** | `GloryTecks` | Must match the site exactly. **No keywords** — "GloryTecks Data Science Training Hyderabad" is a name-stuffing violation and a common cause of suspension. |
| **Primary category** | *Software Training Institute* | Closest match to what the business does |
| **Secondary categories** | *Computer Training School*, *Educational Institution* | Only if genuinely applicable |
| **Address** | See §0 | Must match the site exactly |
| **Phone** | `+91 99080 99980` | Same number as the site; a tracking number that differs breaks NAP |
| **Website** | `https://glorytecks.com` | Exactly this — no trailing slash, no `www`, no UTM |
| **Hours** | Mon–Sat 08:00–21:00 · Sun 09:00–17:00 | Matches `config/business.ts` and the footer |
| **Description** | 750 chars, see §2 | |
| **Opening date** | Real founding date | Leave blank if unknown — `foundingDate` was removed from schema for exactly this reason |
| **Service area** | Ameerpet, Kukatpally, Madhapur, Gachibowli, HITEC City, Dilsukhnagar | Matches `areaServed` in the LocalBusiness schema |

**Verification:** postcard or phone, whichever Google offers. Keep the profile
claimed and verified — an unclaimed profile can be edited by the public.

---

## 2. Business description

Must be true and match the site's own description. Draft, using only claims the
site already makes:

> GloryTecks is an IT training institute in Ameerpet, Hyderabad, offering
> classroom and live online courses in Data Science, Generative AI, Agentic AI,
> Python, Power BI, MLOps, Data Engineering, Data Analytics and SQL Server.
> Courses are project-based and taught by working practitioners, with weekday
> and weekend batches for students and working professionals. The centre is a
> short walk from Ameerpet Metro Station. Placement support includes career
> counselling, resume and ATS review, mock interviews and introductions to
> hiring partners.

**Do not include:** "best", "#1", "guaranteed placement", or any statistic that
cannot be substantiated on request.

> ⚠️ The CMS `settings.tagline` currently reads *"Hyderabad's #1 IT Training
> Institute"*. That is visible on the site. Decide whether it is defensible; if
> it stays on the site it will invite comparison with the GBP description, and
> "#1" is not a claim to put in a GBP description.

---

## 3. Photos

Photos materially affect local conversion. All must be genuine and recent.

| Type | Count | Notes |
| --- | ---: | --- |
| Logo | 1 | Square, matches `/logo.png` |
| Cover | 1 | Exterior or reception |
| Exterior | 3–5 | Building, entrance, signage, street context for wayfinding |
| **Classroom / interior** | 5–10 | Real classrooms, lab, seating — the highest-value set |
| Team | 3–5 | Trainers, with their consent |
| At work | 3–5 | Sessions in progress, with attendee consent |

> **Student photos need consent.** Prefer wide shots where individuals are not
> identifiable, or get written permission.

**Also fixes a site gap:** 0 of 597 blog articles has an image, and no course
has a photo — which is why `og:image` falls back to the site default
everywhere. Real classroom photos uploaded to Cloudinary would serve both the
GBP and the site.

---

## 4. Reviews

**Genuine only. Never purchased, incentivised, written in-house, or filtered to
positives.**

- Ask real students at course completion — in person or by email.
- Share the GBP short review link directly.
- **Reply to every review**, positive and negative. Reply rate is a visible
  quality signal and negative reviews handled well read better than an
  unbroken wall of five stars.
- Never offer a discount or anything else in exchange for a review — a review
  gating or incentive scheme is a policy violation.

> **Structured data note:** `AggregateRating` markup was *removed* from the site
> in Phase 2. It asserted 4.9 from 500 reviews, published by the business about
> itself — self-serving review markup, which Google's policy disallows and
> which risks a manual action. Ratings shown in search results come from the
> GBP, which is the legitimate source. Do not re-add rating markup to the site.

---

## 5. NAP consistency

The exact strings, everywhere:

```
Name:    GloryTecks
Address: <resolve §0>, Annapurna Block, Aditya Enclave, Ameerpet, Hyderabad – 500038, Telangana, India
Phone:   +91 99080 99980
Website: https://glorytecks.com
```

| Surface | Status |
| --- | --- |
| Website structured data | ✅ Single source — `config/business.ts` |
| Website footer / contact page | ⚠️ From CMS `settings` — must be updated with §0 |
| Google Business Profile | ⬜ |
| Facebook | ⬜ `facebook.com/profile.php?id=61589860342695` |
| Instagram | ⬜ `instagram.com/glorytecks/` |
| LinkedIn | ⬜ `linkedin.com/company/glorytecks/` |
| YouTube | ⬜ `youtube.com/@glorytecks` |

All four social profiles are already in `sameAs`. **Each should link back to
`https://glorytecks.com`** — the reciprocal link is what lets Google associate
them with the entity.

Once the GBP exists, add its URL to `BUSINESS.googleBusinessProfile` in
`config/business.ts`; it flows into `sameAs` automatically.

---

## 6. Directories

Accuracy over volume. A handful of consistent listings beats fifty
inconsistent ones, and inconsistency is actively harmful.

| Priority | Directory | Notes |
| --- | --- | --- |
| 1 | Google Business Profile | Everything else is secondary |
| 2 | Bing Places | Free, feeds Bing and Copilot |
| 3 | Apple Business Connect | Apple Maps / Siri |
| 4 | Justdial, Sulekha | High-intent in India for training institutes |
| 5 | IndiaMART, Yellow Pages India | Only if actually used |

**Rules**

- Use the exact NAP block above — copy and paste it, do not retype.
- One listing per directory. Duplicates split signal; if you find a duplicate,
  claim and merge it rather than creating another.
- **Never pay for bulk citation building.** Those services generate listings on
  low-quality directories with mangled data — the opposite of what this
  checklist is for.

---

## 7. Post-launch monitoring

| Signal | Where | Cadence |
| --- | --- | --- |
| GBP views, searches, actions | GBP Insights | Monthly |
| Direction requests, calls | GBP Insights | Monthly |
| Review count and rating | GBP | Weekly |
| Local pack position for "IT training institute Ameerpet" | Manual, logged-out | Monthly |
| NAP drift | Search `"GloryTecks" + phone` | Quarterly |
| Duplicate listings | Search the business name on Maps | Quarterly |

---

## 8. Ready / not ready

| Item | Status |
| --- | --- |
| LocalBusiness schema, `@id`-linked, single node | ✅ |
| Address/phone/hours from one source | ✅ `config/business.ts` |
| Hours match schema and footer | ✅ |
| `sameAs` social profiles | ✅ 4 |
| No self-serving rating markup | ✅ Removed |
| No fabricated business facts | ✅ `foundingDate`, `numberOfEmployees` removed |
| Dedicated location page with LocalBusiness | ✅ `/training-in-hyderabad` |
| **Street number confirmed** | ❌ **BLOCKER — §0** |
| **Geo coordinates confirmed** | ❌ §0 |
| Google Business Profile URL in config | ❌ Pending profile |
| `legalName` | ❌ Unknown — omitted rather than guessed |
| Classroom photos | ❌ None |
