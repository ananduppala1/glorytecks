'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Client-side data hooks.
//
// The React app used React Query for *everything*: every page fetched its own
// content from the browser after hydration. In the Next.js app that role belongs
// to Server Components — pages fetch on the server via `lib/api/services` and
// pass data down as props, so content is in the HTML on first byte.
//
// What genuinely still belongs on the client are the two lead-capture form
// submissions, which are user-initiated writes. React Query is retained for
// those (rather than being ripped out) so the mutation call sites, pending
// state and error handling behave exactly as before.
//
// Read hooks (useCourses, useSettings, useCategories, …) now live in
// components/site/SiteDataProvider and read server-supplied context.
// ─────────────────────────────────────────────────────────────────────────────
import { useMutation } from '@tanstack/react-query';
import * as api from '@/lib/api/services';

export function useSubmitContact() {
  return useMutation({ mutationFn: api.submitContact });
}

export function useSubmitDemoRequest() {
  return useMutation({ mutationFn: api.submitDemoRequest });
}
