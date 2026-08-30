# GloryTecks Admin Backend

Express + TypeScript API powering the GloryTecks admin panel and the public
read-only API consumed by the marketing website.

**Stack:** Node.js · Express · Supabase PostgreSQL · Supabase Auth · Redis · Cloudinary

> Migrated from MongoDB/Mongoose and a self-signed JWT system. Cloudinary,
> Redis, every API route and every response shape are unchanged — see
> [`docs/MIGRATION.md`](docs/MIGRATION.md).

## Prerequisites

- Node.js 18+
- A **Supabase** project (cloud) or the **Supabase CLI** for a local stack
- Redis — optional (response caching; the app runs fine without it)
- Cloudinary account — optional in dev; upload endpoints return 503 until configured

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env

# 3. Bring up a database (pick ONE)

#    a) Local stack — starts Postgres, Auth, PostgREST and Studio in Docker,
#       applies every migration in supabase/migrations, and prints your keys:
npx supabase start

#    b) Cloud project — link it and push the migrations:
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase db push

# 4. Fill SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env

# 5. Seed the database (creates the admin account + sample content)
npm run seed          # full seed
# npm run seed:admin  # accounts only

# 6. Start the dev server (auto-reloads on changes)
npm run dev
```

The API listens on `http://localhost:5000/api/v1` (configurable via `PORT` / `API_PREFIX`).

## Supabase CLI workflow

| Task | Command |
|---|---|
| Install the CLI | `npm i -D supabase` (used here via `npx`) or `brew install supabase/tap/supabase` |
| Log in | `npx supabase login` |
| Link a cloud project | `npx supabase link --project-ref YOUR-PROJECT-REF` |
| Start the local stack | `npx supabase start` |
| Stop the local stack | `npx supabase stop` |
| Apply migrations to the linked project | `npx supabase db push` (or `npm run db:push`) |
| Reset the local database and replay every migration | `npx supabase db reset` (or `npm run db:reset`) |
| Create a new migration | `npx supabase migration new add_something` |
| Check what has been applied | `npx supabase migration list` |

Migrations are the only supported way to change the schema. Nothing has to be
clicked together in the Supabase dashboard: a clean project plus `db push`
plus `npm run seed` yields a fully working install.

## Database schema

`supabase/migrations/` — applied in filename order:

| File | Contents |
|---|---|
| `20260101000000_initial_schema.sql` | 19 content tables, primary/foreign keys, CHECK constraints, `updated_at` triggers |
| `20260101000100_singletons.sql` | `settings` and `about_page`, one row each, defaults reproducing the previous schema defaults |
| `20260101000200_indexes.sql` | Indexes derived from the queries the app actually issues |
| `20260101000300_functions.sql` | `get_or_create_settings()`, `get_or_create_about_page()`, `distinct_blog_tags()` |
| `20260101000400_rls.sql` | Row Level Security enabled deny-by-default on every table |

21 tables in total. Relationships: `blogs.author_id → authors.id`,
`courses.trainer_id → trainers.id` (both `ON DELETE SET NULL`), and
`admin_users.id → auth.users.id` (`ON DELETE CASCADE`).

### Row Level Security

RLS is **on for every table with no policies attached**. Neither frontend holds
a database key — both call this API, which authorizes each request itself and
then queries Postgres with the service-role key (which bypasses RLS by design).
So a leaked anon key grants nothing. To let a future Next.js app read published
content directly from Supabase, add narrow `SELECT` policies in a new migration;
no backend change is needed.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | yes | Project API URL |
| `SUPABASE_ANON_KEY` | yes | Login only — exchanges credentials for a session |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Server-only.** All database access + Auth admin calls |
| `SUPABASE_JWT_SECRET` | no | Enables in-process HS256 token verification (skips a network hop) |
| `COOKIE_SECRET` | yes in prod | Signs the refresh-token cookie |
| `COOKIE_SECURE` / `COOKIE_SAMESITE` | no | Cookie flags; `none` + `true` for cross-site |
| `CORS_ORIGINS` | no | Admin frontend origins |
| `PUBLIC_CORS_ORIGINS` | no | Marketing site origins (`*` allowed) |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` / `_UPLOAD_FOLDER` | no | Unchanged |
| `REDIS_URL` / `REDIS_KEY_PREFIX` / `CACHE_ENABLED` | no | Unchanged |
| `RATE_LIMIT_*` / `AUTH_RATE_LIMIT_MAX` | no | Unchanged |
| `SEED_*` | no | Bootstrap accounts |
| `MONGODB_URI` | no | **Import script only.** Never read by the running API |

In production the app refuses to boot when a required variable is missing.

## Authentication

Supabase Auth issues and verifies tokens; this API decides what they may do.

```
Admin frontend
   │  POST /auth/login { email, password }
   ▼
Express  ──►  Supabase Auth (signInWithPassword)
   │              └─► access token + refresh token
   │
   ├─ refresh token  ──►  httpOnly cookie  gt_refresh_token
   └─ access token   ──►  response body    data.accessToken
                              │
                              ▼
              Authorization: Bearer <access token>
                              │
                        requireAuth
                    verify token (local HS256, or Supabase Auth)
                              │
                    read role from public.admin_users   ← never from the token
                              │
                         authorize(...roles)
                              ▼
                    controller → service → repository → PostgreSQL
```

Endpoints, request bodies, response envelopes, status codes and the cookie name
are all unchanged, so **the admin frontend needs no modifications.**

### Admin-only access

- No signup route exists in this API, and `enable_signup = false` in `supabase/config.toml`.
- Authorization comes from `admin_users`, never from a token claim or request body.
- A Supabase identity **with no `admin_users` row is rejected with 401**. That is
  the load-bearing guarantee: even if signup were enabled on the project, a
  self-registered account could not reach a single endpoint.
- Accounts are created only by `npm run seed:admin` or by an existing admin
  through `POST /admins`.

### Roles

`admin`, `editor`, `viewer`, `receptionist`, `content_writer` — unchanged.
Blogs/courses/uploads and the People & Proof resources are open to
`admin` + `content_writer`; leads to `admin` + `receptionist`; everything else
is admin-only.

## Architecture

```
src/
  config/        env, supabase clients, redis, cloudinary, logger
  constants/     roles, statuses, enums, upload limits
  controllers/   request/response handling + the generic CRUD factory
  services/      business logic (auth, blog, course, upload, resource registry)
  repositories/  data access — the only layer that talks to Supabase
  db/            table definitions + row ⇄ API mapping
  routes/        route definitions and guards
  middlewares/   auth, validation, rate limiting, uploads, errors
  validators/    express-validator chains
  utils/         ApiError, ApiResponse, blocks renderer, slugs, query parsing
  seed/          seed scripts + site content data
  scripts/       one-time MongoDB → Supabase import
supabase/
  migrations/    SQL schema migrations
tests/           unit tests
```

Request flow: **Routes → Controllers → Services → Repositories → Supabase PostgreSQL.**
Cloudinary and Redis keep their own service/utility layers, untouched.

## Cloudinary

Unchanged. Cloudinary is still the file store; PostgreSQL stores only URLs and
public IDs, exactly as MongoDB did. Uploads stream through
`cloudinary.uploader.upload_stream`, deletions use `uploader.destroy`, and the
brochure proxy still streams PDFs through this domain so the Cloudinary URL is
never exposed. **No asset was moved, re-hosted or re-uploaded by the migration.**

## Redis

Unchanged. Same cache-aside `cacheWrap`, same keys, same TTLs, same
SCAN-based pattern invalidation on every admin mutation. Rate limiting also
still uses `express-rate-limit` (it never used Redis).

## Scripts

- `npm run dev` — development server with hot reload
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled server
- `npm run typecheck` — type-check without emitting
- `npm run lint` — ESLint
- `npm test` — unit tests (no database required)
- `npm run seed` / `npm run seed:admin` — seed content / accounts
- `npm run db:push` / `npm run db:reset` — apply / replay migrations
- `npm run migrate:mongo` — one-time MongoDB import (see below)

## Importing existing MongoDB data

```bash
# Always dry-run first — reports what would be written, changes nothing.
MONGODB_URI="mongodb+srv://..." npm run migrate:mongo -- --dry-run

# Then import for real.
MONGODB_URI="mongodb+srv://..." npm run migrate:mongo
```

- Non-destructive: **nothing is ever deleted from MongoDB.**
- Re-runnable: rows are upserted on a deterministic primary key derived from the
  ObjectId, so a second run updates rather than duplicates.
- Administrators keep their existing passwords — bcrypt hashes transfer to
  Supabase Auth directly.
- Cloudinary URLs and public IDs are copied as-is; **no image is touched.**
- Failures are reported per document with a reason; fix and re-run safely.

Import one collection at a time with `--only=blogs`.

## Testing

`npm test` runs the unit suite with no database or network:

- row ⇄ API mapping (null omission, timestamp format, partial writes, projections)
- query translation, asserted against a recording stand-in for the PostgREST
  client — filters, sort direction and null ordering, paging offsets, search
- injection guards: unknown sort/filter keys dropped, search terms quoted and
  LIKE-escaped, unknown body keys never written
- content-block renderer parity, slug generation, ObjectId→UUID mapping
- database error → HTTP status mapping, and that SQL detail never leaks

For end-to-end checks against a live stack, see the manual matrix in
[`docs/MIGRATION.md`](docs/MIGRATION.md).

## Common startup problems

| Symptom | Cause | Fix |
|---|---|---|
| `Could not reach Supabase at …` on boot | Wrong URL/key, or migrations not applied | Check `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`; run `npm run db:push` |
| `Missing required environment variable: …` (production only) | Secrets unset with `NODE_ENV=production` | Set the Supabase keys and `COOKIE_SECRET` |
| Login returns 401 for a known-good password | Auth identity exists but has no `admin_users` row | Run `npm run seed:admin`, or create the admin via `POST /admins` |
| `relation "public.blogs" does not exist` | Migrations not applied | `npm run db:push` (cloud) or `npx supabase db reset` (local) |
| Uploads fail / disabled | Cloudinary not configured | Set the three `CLOUDINARY_*` vars |
| Redis connection warnings | No Redis running | Harmless — caching is skipped. Set `CACHE_ENABLED=false` to silence |

## Deployment

1. Apply migrations to the production project: `npx supabase db push`.
2. Set the environment variables on the host. `SUPABASE_SERVICE_ROLE_KEY` must be
   a server-side secret — never expose it to a build that ships to the browser.
3. For cross-site cookies set `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none`,
   and list the admin origin in `CORS_ORIGINS`.
4. `npm run build && npm start`, or deploy to Vercel using the included
   `vercel.json`.

Serverless note: Supabase is reached over stateless HTTP, so there is no
connection to warm up. The per-request database-connection guard the MongoDB
setup needed on Vercel has been removed.
