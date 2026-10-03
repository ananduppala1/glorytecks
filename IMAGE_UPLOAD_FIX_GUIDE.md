# GloryTecks Image Upload Fix — Production Runbook

This document explains the end-to-end image-upload path and the changes made for the current upload failure.

## 1. How the three applications are connected

```text
Admin Frontend (Vite React)
        |
        | POST multipart/form-data
        v
Backend (Express / Vercel)
        |
        | validate bytes -> Cloudinary
        v
Cloudinary
        |
        | secure image URL
        v
Backend -> Supabase blog record
        |
        | GET /blogs / GET /blogs/:slug
        v
Main Website (Next.js)
        |
        | featuredImage
        v
Blog card + Blog detail hero
```

The admin `ImageUpload` control already uploads through `POST /api/v1/uploads/image`, and the backend already stores the resulting Cloudinary URL. The database already has a `featured_image` field. The missing pieces were the false-positive file inspection and the public rendering of that stored URL.

## 2. What was causing the error

The backend's `fileSignature.ts` scanned the first 2048 bytes of **every** upload for text such as `<html>`, `<body>`, `<script>`, and `<svg>` before trusting the binary image detectors.

A legitimate binary image can contain those character sequences in metadata. The previous order therefore produced the admin toast:

> File contains HTML markup

The fix keeps the executable/text protection for files that actually begin like text documents, while letting binary images be parsed by their structural PNG/JPEG/GIF/WebP/AVIF detectors.

Raw HTML still gets rejected.

## 3. Frontend multipart fix

The Axios client previously set:

```ts
headers: { 'Content-Type': 'application/json' }
```

for every request, and the upload hook manually set:

```ts
headers: { 'Content-Type': 'multipart/form-data' }
```

A browser FormData request should not have its multipart Content-Type set manually. Axios/the browser must add the multipart boundary.

The new code:

```ts
const form = new FormData();
form.append('file', file);
const res = await api.post(endpoint, form);
```

The global Axios client now advertises only `Accept: application/json`.

## 4. Public blog image display fix

The admin blog editor already saves `featuredImage` into the blog object, and the main website API mapper already reads it.

The old `BlogCover` component ignored that value and always rendered an SVG fallback. It now:

1. Uses the CMS `featuredImage` when present.
2. Renders it through the existing `SafeImage`/Cloudinary image pipeline.
3. Falls back to the deterministic SVG for old posts without an image.
4. Passes the featured image through both the blog archive cards and the blog detail hero.
5. Adds the featured image to `BlogPosting` structured data when available.

## 5. Production environment checklist

### Backend (Vercel)

These must exist in the backend deployment environment:

```text
NODE_ENV=production
COOKIE_SECRET=<strong-secret>
COOKIE_SECURE=true
COOKIE_SAMESITE=none
CORS_ORIGINS=https://<your-admin-domain>

CLOUDINARY_CLOUD_NAME=<cloudinary-cloud-name>
CLOUDINARY_API_KEY=<cloudinary-api-key>
CLOUDINARY_API_SECRET=<cloudinary-api-secret>
CLOUDINARY_UPLOAD_FOLDER=glorytecks
```

Use the exact backend environment variables already documented in `backend/.env.example` and `backend/README.md`.

Do not place `CLOUDINARY_API_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, or other backend secrets in the admin frontend.

### Admin Frontend (Vercel)

Set:

```text
VITE_API_URL=https://<your-backend-domain>
VITE_API_PREFIX=/api/v1
```

`VITE_API_URL` is the backend origin only; do not append `/api/v1` when `VITE_API_PREFIX=/api/v1` is also set.

After changing Vercel environment variables, redeploy the admin frontend because Vite variables are compiled into the browser bundle at build time.

## 6. End-to-end verification

After deployment:

1. Sign in to the admin dashboard.
2. Open **Blogs** and create or edit a post.
3. In **Featured image**, choose a normal `.jpg`, `.jpeg`, `.png`, `.webp`, or `.avif` image under the displayed size limit.
4. The admin control should show a thumbnail after the upload succeeds.
5. Save the blog.
6. Open the public blog archive and confirm the same image appears on the blog card.
7. Open the individual blog post and confirm the same image appears in the hero area.
8. Open browser DevTools -> Network and confirm the upload request is `POST /api/v1/uploads/image` with a `multipart/form-data; boundary=...` Content-Type.
9. Confirm the response contains a Cloudinary `https://res.cloudinary.com/...` URL.
10. Confirm the blog API response contains `featuredImage` with that Cloudinary URL.

## 7. What a healthy request looks like

```text
POST https://<backend-domain>/api/v1/uploads/image
Content-Type: multipart/form-data; boundary=----...
Authorization: Bearer <short-lived-access-token>

file=<binary image>
folder=blog
```

Successful response shape:

```json
{
  "success": true,
  "message": "Image uploaded",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "..."
  }
}
```

## 8. If the upload still fails after deployment

Use this exact order:

### A. If the Network request is HTML

If the upload response body starts with:

```html
<!DOCTYPE html>
```

the admin is calling the wrong host/path or a Vercel rewrite is catching the API request. Check `VITE_API_URL` and `VITE_API_PREFIX`, then redeploy the admin.

### B. If the response says Cloudinary is not configured

Check these backend variables:

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Then redeploy the backend.

### C. If the browser gets 401/403

The upload route requires an authenticated admin/content-writer role. Check login/refresh cookies and ensure the admin origin is present in `CORS_ORIGINS`.

### D. If the response still says `File contains HTML markup` for a normal binary image

Confirm the deployed backend contains the updated `backend/src/utils/fileSignature.ts`. The new guard should only scan markup patterns when the upload begins as a text document.

### E. If the image uploads but the public page still shows the generated SVG cover

Check the blog API response. `featuredImage` must contain the Cloudinary URL. Then ensure the deployed main website includes the updated `BlogCover.tsx`, `BlogCard.tsx`, and blog detail page.

## 9. Local verification performed on the supplied source tree

The updated TypeScript/TSX files were syntax-checked with TypeScript's transpiler.

The backend file inspector was executed directly against:

- a valid PNG containing HTML-looking text in metadata — accepted as PNG
- a raw HTML document — rejected as HTML markup
- the project's real `main-website/public/logo.png` — accepted as PNG
- the project's real `main-website/public/og-image.jpg` — accepted as JPEG

A full dependency-based build/test run could not be completed from the supplied archive because the included dependency installation is incomplete and package installation timed out in the execution environment. The source-level upload flow and the critical binary-inspection regression were validated separately.
