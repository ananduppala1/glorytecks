# Migration: MongoDB/Mongoose → Supabase PostgreSQL, JWT → Supabase Auth

Two changes were made to this backend. Nothing else was replaced.

| | Before | After |
|---|---|---|
| Database | MongoDB + Mongoose | Supabase PostgreSQL + SQL migrations |
| Authentication | Self-signed JWT + bcrypt | Supabase Auth |
| **File storage** | **Cloudinary** | **Cloudinary — unchanged** |
| **Cache / rate limiting** | **Redis + express-rate-limit** | **Redis + express-rate-limit — unchanged** |
| **Frontends** | **Admin React app, marketing site** | **Unchanged — no code edits required** |
| Runtime | Node.js + Express + TypeScript | Node.js + Express + TypeScript |

**Cloudinary was not replaced.** No image or PDF was moved, re-uploaded,
re-hosted or deleted. The database stores URLs and public IDs exactly as it did
before; Cloudinary still holds every byte.

---

## 1. Collection → table mapping

21 Mongoose models became 21 tables.

| Mongoose model | Collection | PostgreSQL table | Notes |
|---|---|---|---|
| `AdminUser` | `adminusers` | `admin_users` | `id` references `auth.users(id)`; `password` and `refreshTokenHash` dropped — Supabase Auth owns them |
| `Author` | `authors` | `authors` | |
| `BlogCategory` | `blogcategories` | `blog_categories` | `salary` → `salary_fresher` / `_mid` / `_senior` |
| `Blog` | `blogs` | `blogs` | `author` ref → `author_id` FK; `seo` flattened; `content`/`toc`/`faqs` → jsonb; `tags_text` companion added |
| `Course` | `courses` | `courses` | `trainer` ref → `trainer_id` FK; `syllabus`/`faqs` → jsonb; `seo` flattened |
| `Trainer` | `trainers` | `trainers` | |
| `Testimonial` | `testimonials` | `testimonials` | `stars` gains `CHECK (stars BETWEEN 1 AND 5)` |
| `Placement` | `placements` | `placements` | `packageLpa` → `package_lpa` |
| `Company` | `companies` | `companies` | `name` UNIQUE (was the registry's `uniqueField`) |
| `Roadmap` | `roadmaps` | `roadmaps` | |
| `Faq` | `faqs` | `faqs` | |
| `DemoRequest` | `demorequests` | `demo_requests` | |
| `ContactEnquiry` | `contactenquiries` | `contact_enquiries` | |
| `Comparison` | `comparisons` | `comparisons` | `rows`/`relatedCourses`/`faqs` → jsonb; `itemA`/`itemB` → `item_a`/`item_b` |
| `Locality` | `localities` | `localities` | |
| `LegalDoc` | `legaldocs` | `legal_docs` | `sections` → jsonb |
| `Gallery` | `galleries` | `gallery_items` | `imageUrl` → `image_url` (Cloudinary URL) |
| `Brochure` | `brochures` | `brochures` | `fileUrl` → `file_url` (Cloudinary URL) |
| `Batch` | `batches` | `batches` | |
| `Settings` | `settings` | `settings` | Singleton; `social`/`stats`/`seo`/`heroSection` fully flattened |
| `AboutPage` | `aboutpages` | `about_page` | Singleton; `hero`/`cta`/`seo` flattened, `sections`/`stats` → jsonb |

### Modelling decisions

- **`order` → `order_index`.** `order` is a SQL keyword and collides with
  PostgREST's own `order` parameter. The API field is still `order`.
- **Scalar arrays stay arrays.** `tags`, `tools`, `modules`, `skills`, `steps`,
  `images`, `keywords` → `text[]`, not child tables. They are ordered, always
  written whole, and have no attributes of their own.
- **jsonb only where it is genuinely the right type.** Blog content blocks are a
  discriminated union that was `Schema.Types.Mixed` in Mongo and is validated at
  the API layer; syllabus sections, comparison rows, legal sections and About
  sections are ordered lists always read and written with their parent row. Each
  carries a `jsonb_typeof(...) = 'array'` CHECK. Everything with a fixed shape —
  `seo`, `salary`, `social`, `stats`, `heroSection` — is flattened into real
  columns instead.
- **No invented relationships.** The data model has no genuine many-to-many, so
  no join tables were created.
- **Date-like strings stay `text`.** `blogs.date`, `blogs.updated`,
  `legal_docs.updated` and `batches.start_date` were strings in Mongo, compared
  with `$lt`/`$gt` and sorted as strings. ISO dates sort chronologically as text,
  and `batches.start_date` holds free-form values like `"Jun 10, 2026"`.
  Converting the type would have changed behaviour.
- **`tags_text` companion column.** Postgres has no `ILIKE` over `text[]`. A
  trigger maintains a pipe-delimited copy of `tags`, so substring search
  (`%term%`) and case-insensitive exact-element matching (`%|term|%`) both
  reproduce the old regex semantics. A trigger rather than a `GENERATED` column
  because `array_to_string` is only `STABLE`.

### Relationships

| Mongo | PostgreSQL | On delete |
|---|---|---|
| `Blog.author` → `Author` | `blogs.author_id` → `authors.id` | `SET NULL` |
| `Course.trainer` → `Trainer` | `courses.trainer_id` → `trainers.id` | `SET NULL` |
| — | `admin_users.id` → `auth.users.id` | `CASCADE` |

`SET NULL` matches the old behaviour: deleting a trainer left the course in
place with a dangling reference that `populate()` resolved to null.

---

## 2. Query translation

| Mongo / Mongoose | PostgreSQL / PostgREST |
|---|---|
| `find(filter)` | `.select()` + `.eq()` / `.neq()` / `.lt()` / `.gt()` |
| `findById(id)` | `.eq('id', id).maybeSingle()` |
| `findOne(filter)` | `.limit(1).maybeSingle()` |
| `findByIdAndUpdate(id, doc, {new:true})` | `.update(row).eq('id', id).select().maybeSingle()` |
| `findByIdAndDelete(id)` | `.delete().eq('id', id).select('id').maybeSingle()` |
| `countDocuments(filter)` | `.select('id', { head: true, count: 'exact' })` |
| `.skip(n).limit(m)` | `.range(from, from + m - 1)` |
| `.sort({ f: -1 })` | `.order(col, { ascending: false, nullsFirst: false })` |
| `.select('a b c')` | field projection → `select=a,b,c` |
| `.populate('author', '...')` | embedded select `author:authors(id,name,key,...)` |
| `{ $or: [{ f: /term/i }] }` | `or=(f.ilike."%term%", …)` |
| `{ tags: /^tag$/i }` | `tags_text.ilike."%|tag|%"` |
| `distinct('tags')` | `distinct_blog_tags()` SQL function |
| `Model.getSingleton()` | `get_or_create_settings()` / `get_or_create_about_page()` |
| `pre('save')` derived fields | `deriveContentFields()` in `blog.service.ts` |
| Unique index + error 11000 | `UNIQUE` constraint + SQLSTATE `23505` → 409 |
| `Schema` `enum` | `CHECK (col IN (...))` |
| `timestamps: true` | `created_at` / `updated_at` + trigger |

**Sort null ordering.** MongoDB places missing values before all others when
sorting ascending; PostgreSQL defaults to `NULLS LAST`. Every `.order()` call
sets `nullsFirst` explicitly so result ordering is identical.

**Search escaping.** The old code escaped RegExp metacharacters so terms matched
literally. The equivalent here escapes LIKE wildcards (`%`, `_`, `\`) and quotes
the value for the PostgREST filter grammar, so a search for `50%` or `a,b` still
means exactly that.

**Aggregation.** The codebase had no `aggregate()` pipelines. The two places
doing aggregate-like work were the dashboard (15 parallel counts + 3 recent
lists) and the blog "related posts" ranking. Counts became `count: 'exact'` head
requests; the tag-overlap ranking stays in JavaScript so results are identical.

**Transactions.** PostgREST issues one statement per request, and each is atomic
on its own. Three flows needed more:

1. *Singleton get-or-create* — was a racy find-then-create. Now a single
   `INSERT … ON CONFLICT DO NOTHING; SELECT` inside a database function.
2. *Slug uniqueness* — the pre-flight check remains for the friendly 409, but the
   `UNIQUE` constraint is the real guarantee; a concurrent insert that slips past
   the check still fails and maps to the same 409.
3. *Admin creation* — spans Supabase Auth and PostgreSQL, which cannot share a
   transaction. A failed profile insert deletes the just-created identity, so no
   half-created account can occupy an email address.

---

## 3. Authentication

### What the frontend sees: nothing new

| | Before | After |
|---|---|---|
| `POST /auth/login` | `{ user, accessToken }` + `gt_refresh_token` cookie | identical |
| `POST /auth/refresh` | reads cookie or `body.refreshToken` | identical |
| `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/profile`, `POST /auth/change-password` | | identical |
| Protected requests | `Authorization: Bearer <token>` | identical |
| Cookie name / flags | `gt_refresh_token`, httpOnly | identical |
| Error messages & status codes | | identical |

The `accessToken` is now issued by Supabase Auth rather than signed here, and the
cookie carries a Supabase refresh token. Both are opaque to the client, so the
admin frontend requires **no changes**.

### Mapping

| Old | New |
|---|---|
| `bcrypt.compare` in `authService.login` | `supabaseAuth.auth.signInWithPassword()` |
| `signAccessToken` / `signRefreshToken` | Supabase Auth session |
| `refreshTokenHash` column + rotation | Supabase refresh-token rotation and reuse detection |
| `jwt.verify(token, JWT_ACCESS_SECRET)` | local HS256 verify when `SUPABASE_JWT_SECRET` is set, else `auth.getUser(token)` |
| `AdminUser.findById(payload.sub)` per request | `admin_users` lookup per request — unchanged |
| `AdminUser.create()` in `POST /admins` | `auth.admin.createUser()` + profile insert |
| `user.password = new; save()` | `auth.admin.updateUserById({ password })` |
| Clearing `refreshTokenHash` on logout | `auth.admin.signOut(token, 'global')` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_*_EXPIRES_IN` | removed; token lifetimes are project settings |

### Authorization is unchanged and still ours

Supabase Auth answers *who is this*. It never answers *what may they do*.

- The role is read from `admin_users` on **every** request. It is never taken
  from a token claim, and `apiToRow()` drops any body key that is not on the
  table definition, so a client cannot write `role` or `id`.
- A valid Supabase identity **with no `admin_users` row is rejected with 401.**
  This is what keeps admin access closed: even a self-registered account reaches
  nothing.
- Inactive accounts (`is_active = false`) are rejected at the same point.
- `enable_signup = false` in `supabase/config.toml`, and this API exposes no
  registration route — as before.

### Password migration

Mongo stored bcrypt hashes; Supabase Auth (GoTrue) verifies bcrypt. The import
hands each hash over via the admin API's `password_hash` field, so **existing
administrators keep their current passwords**. Any account the API rejects is
listed in the import report; fall back to `npm run seed:admin` or a reset email.

---

## 4. Row Level Security

RLS is enabled on all 21 tables **with no policies attached**, and the default
`anon` / `authenticated` grants are revoked.

This is deliberate. Neither frontend holds a Supabase key: the admin panel and
the marketing site both call this Express API, which authorizes each request and
then queries with the service-role key — and `service_role` bypasses RLS by
design. So no endpoint changes behaviour, while a leaked anon key yields zero
rows instead of a full dump of the leads table.

`contact_enquiries`, `demo_requests` and `admin_users` hold personal data and
must never receive a public policy. If direct client reads are wanted later, add
narrow `SELECT` policies (e.g. `using (status = 'published')` on blogs/courses)
in a new migration — the backend needs no change.

---

## 5. Data migration

`src/scripts/migrate-mongodb-to-supabase.ts` — the only file that imports
`mongodb`, which is a **devDependency** and never loaded by the API.

```bash
MONGODB_URI="mongodb+srv://..." npm run migrate:mongo -- --dry-run
MONGODB_URI="mongodb+srv://..." npm run migrate:mongo
MONGODB_URI="mongodb+srv://..." npm run migrate:mongo -- --only=blogs
```

**ID preservation.** An ObjectId is 12 bytes and a UUID is 16, so left-padding
the hex with eight zeros gives a deterministic, collision-free, reversible
mapping:

```
507f1f77bcf86cd799439011  →  00000000-507f-1f77-bcf8-6cd799439011
```

Every cross-document reference survives, and re-running maps each document to
the same row.

**Guarantees**

1. Reads MongoDB, transforms documents through the same table definitions the
   API uses.
2. Preserves relationships (authors and trainers imported before blogs and
   courses), original `createdAt`/`updatedAt`, and admin passwords.
3. **Preserves every Cloudinary reference** — URLs, secure URLs, public IDs,
   `imageUrl`, `fileUrl`, `bannerImage`, `images[]`, `brochureUrl`, `avatar`,
   `logo`, `heroImage`, `ogImage`. No asset is fetched, uploaded or deleted.
4. Re-runnable: rows are upserted on the deterministic primary key, so a rerun
   updates rather than duplicating.
5. Validates via the database's own constraints; a failed batch is retried
   row-by-row so one bad document cannot mask 199 good ones.
6. Reports every failure with collection, id and reason, and exits non-zero.
7. Non-destructive — **nothing is ever deleted from MongoDB.**

Blog `html`/`toc`/`faqs` are recomputed from `content` during the import so
stored markup matches the current renderer exactly.

---

## 6. What did not change

**Cloudinary.** Same config, same `upload_stream` and `uploader.destroy`, same
folders, `resource_type`, transformations, public IDs and secure URLs. Same
`src/services/upload.service.ts`, `src/middlewares/upload.ts`,
`src/config/cloudinary.ts`. The brochure proxy still streams PDFs through this
domain so the Cloudinary URL never reaches the browser's address bar.

**Redis.** Same `ioredis` client, `cacheWrap`, TTL constants, key prefix, key
names, SCAN-based `cacheDeletePattern`, and the invalidation map that runs on
every admin mutation. Cache invalidation still fires on create/update/delete.

**Rate limiting.** `express-rate-limit` with the same windows and limits. It
never used Redis, so nothing moved.

**Also unchanged:** all route paths and HTTP methods, request/response shapes,
status codes, the `{ success, message, data, meta }` envelope, pagination meta
(including the `hasNext`/`hasPrev` aliases), express-validator chains, Helmet,
CORS, the block renderer in `utils/blocks.ts`, `ApiError`/`ApiResponse`, the
role model, and the `vercel.json` deployment shape.

**Both frontends need zero changes.**

### Removed

`mongoose`, `mongoose-lean-virtuals`, `bcryptjs` (passwords are Supabase Auth's
job), `src/models/*`, `src/config/database.ts`, `src/config/registerPlugins.ts`,
`src/middlewares/dbConnect.ts`, `src/utils/jwt.ts`, and the `MONGODB_URI` /
`JWT_*` runtime variables.

`src/middlewares/dbConnect.ts` is gone because PostgREST is stateless HTTP —
there is no connection to open, pool or re-establish on a serverless cold start.

---

## 7. Two behavioural notes

Everything above is equivalent. Two details are worth stating plainly rather
than leaving to be discovered:

1. **Identifiers are UUIDs, not 24-character ObjectId hex strings.** Both are
   opaque strings the frontend passes back unchanged, and responses still carry
   `id` *and* `_id` with the same value, as list rows did before. Only code that
   validated the 24-hex format would notice — inside the backend that check was
   in `blog.service.resolveAuthor()` and now tests for a UUID.

2. **A literal `*` in a search term.** PostgREST treats `*` as an alias for `%`
   in `ilike` patterns and offers no escape for it, so searching `C*` matches
   more broadly than the old escaped-regex search did. `%`, `_`, `\`, quotes,
   commas and parentheses are all escaped correctly; only `*` is affected, and
   it can only widen results, never leak data across a filter.

---

## 8. Verification matrix

`npm test` covers the mapping and query-translation layers with no database
(41 assertions). Run this matrix against a live stack before cutting over.

### Authentication
- [ ] Valid login returns 200 with `data.user` + `data.accessToken`, sets `gt_refresh_token`
- [ ] Wrong password → 401 `Invalid email or password`
- [ ] Unknown email → 401 with the **same** message (no account enumeration)
- [ ] Auth identity with no `admin_users` row → 401
- [ ] `is_active = false` → 403 `Account is disabled`
- [ ] `GET /auth/me` with a valid token → 200
- [ ] Missing / malformed / expired token → 401
- [ ] `POST /auth/refresh` rotates the cookie and returns a new access token
- [ ] Reusing a consumed refresh token → 401
- [ ] Logout revokes the session and clears the cookie
- [ ] Change password: wrong current → 400; correct → 200, other sessions dropped
- [ ] Rate limit on `/auth/login` still trips after `AUTH_RATE_LIMIT_MAX`

### Authorization
- [ ] `content_writer` can manage blogs/courses; blocked from `/settings` PUT and `/admins`
- [ ] `receptionist` can manage leads; blocked from blogs
- [ ] `viewer` blocked from every mutation
- [ ] Sending `role: "admin"` in a profile update does **not** escalate
- [ ] A token from a different Supabase project → 401
- [ ] Deleting your own admin account → 400

### Blogs / Courses
- [ ] Create, read by id, read by slug, update, delete
- [ ] Duplicate produces a draft with a `-copy` slug
- [ ] Status change stamps `publishedAt` on first publish only
- [ ] Editing `content` recomputes `html`, `toc`, `faqs`, `readTime`
- [ ] Duplicate slug → 409 with the previous wording
- [ ] Search, each filter, sort (`?sort=-date,title`), pagination meta
- [ ] `GET /blogs/tags` returns the same sorted distinct list
- [ ] Author / trainer arrive populated with the same fields as before

### Public API
- [ ] Every `/public/*` route returns the same shape as the old backend
- [ ] Only published/active content is exposed
- [ ] `?category=`, `?tag=` (case-insensitive), `?featured=`, `?full=`
- [ ] `/public/blogs/:slug/context` returns related + prev/next
- [ ] Settings and About return schema defaults on an unseeded install

### Redis
- [ ] Cache miss populates, second request hits
- [ ] Admin mutation clears the matching keys; next read is fresh
- [ ] `CACHE_ENABLED=false` and a stopped Redis both degrade to direct reads

### Cloudinary
- [ ] `POST /uploads/image` and `/uploads/document` return `url` + `publicId`
- [ ] Uploaded URL saves to a record and renders on the public site
- [ ] Replacing an image works; `destroy` still removes assets
- [ ] `GET /public/brochures/:courseSlug/download` streams the PDF (`?dl=1` too)
- [ ] Migrated Cloudinary URLs still resolve

### Database
- [ ] `supabase db reset` on a clean project reproduces the full schema
- [ ] Unique, NOT NULL and CHECK constraints reject bad writes
- [ ] Deleting an author nulls `blogs.author_id` and leaves the post
- [ ] A malformed id → 400, not 500
- [ ] `EXPLAIN` on the public blog list uses `blogs_status_date_idx`
