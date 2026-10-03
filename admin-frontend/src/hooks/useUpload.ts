import { useCallback, useEffect, useRef, useState } from 'react';
import { api, apiGet } from '@/lib/api';
import { toast } from '@/components/ui/sonner';

interface UploadResult {
  url: string;
  publicId: string;
}

export interface UploadKindPolicy {
  /** Value for the file input's `accept` attribute. */
  accept: string;
  maxBytes: number;
  /** Extensions the server will actually store, e.g. ['jpg','png']. */
  formats: string[];
}

export interface UploadPolicy {
  image: UploadKindPolicy;
  document: UploadKindPolicy;
}

/**
 * Fallback policy, used only until `GET /uploads/config` answers (and if it
 * never does). It is deliberately the *narrow* set: if the server later says it
 * accepts more, the UI widens; it never advertises something the server would
 * refuse.
 */
const FALLBACK: UploadPolicy = {
  image: {
    accept: 'image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif',
    maxBytes: 8 * 1024 * 1024,
    formats: ['jpg', 'png', 'webp', 'avif'],
  },
  document: {
    accept: 'application/pdf,.pdf,.docx',
    maxBytes: 20 * 1024 * 1024,
    formats: ['pdf', 'docx'],
  },
};

/**
 * The server's upload policy, fetched once per session.
 *
 * The admin UI used to hard-code `accept="image/*"` and a "PNG, JPG or WebP"
 * caption, neither of which matched what the API would take. Reading the
 * policy from the API keeps the picker honest as the allowlist changes — while
 * remaining, as ever, a convenience: the server re-decides everything.
 */
let cached: UploadPolicy | null = null;
let inFlight: Promise<UploadPolicy> | null = null;

async function loadPolicy(): Promise<UploadPolicy> {
  if (cached) return cached;
  inFlight =
    inFlight ??
    apiGet<UploadPolicy>('/uploads/config')
      .then((res) => {
        cached = res.data;
        return cached;
      })
      .catch(() => FALLBACK)
      .finally(() => {
        inFlight = null;
      });
  return inFlight;
}

export function useUploadPolicy(): UploadPolicy {
  const [policy, setPolicy] = useState<UploadPolicy>(cached ?? FALLBACK);

  useEffect(() => {
    let active = true;
    void loadPolicy().then((p) => {
      if (active) setPolicy(p);
    });
    return () => {
      active = false;
    };
  }, []);

  return policy;
}

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${Math.round(mb)}MB` : `${Math.round(bytes / 1024)}KB`;
}

/**
 * Client-side pre-checks.
 *
 * These exist so a user finds out about a 50MB file before uploading it, not
 * after. They are NOT a security control — the browser is the attacker's
 * machine — and the server repeats every one of them against the actual bytes.
 */
function preCheck(file: File, policy: UploadKindPolicy): string | null {
  if (file.size === 0) return 'That file is empty.';
  if (file.size > policy.maxBytes) {
    return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(policy.maxBytes)}.`;
  }
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  const normalised = ext === 'jpeg' || ext === 'jpe' ? 'jpg' : ext;
  if (normalised && !policy.formats.includes(normalised)) {
    return `${ext.toUpperCase()} files are not supported. Use ${policy.formats
      .join(', ')
      .toUpperCase()}.`;
  }
  return null;
}

/** Upload a file to the backend (which streams it to Cloudinary) and return its URL. */
export function useUpload() {
  const [uploading, setUploading] = useState(false);
  // A ref, not the state value: two clicks in the same tick both read the old
  // state, so state alone does not prevent a duplicate submission.
  const busy = useRef(false);
  const policy = useUploadPolicy();

  const upload = useCallback(
    async (file: File, kind: 'image' | 'document', folder?: string): Promise<string | null> => {
      if (busy.current) return null;

      const problem = preCheck(file, policy[kind]);
      if (problem) {
        toast.error(problem);
        return null;
      }

      busy.current = true;
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        if (folder) form.append('folder', folder);
        const endpoint = kind === 'image' ? '/uploads/image' : '/uploads/document';
        // Do not set Content-Type manually. With FormData, Axios/the browser
        // must generate the multipart boundary for the server to parse the body.
        const res = await api.post<{ data: UploadResult }>(endpoint, form);
        return res.data.data.url;
      } catch (err) {
        toast.error(uploadErrorMessage(err));
        return null;
      } finally {
        busy.current = false;
        setUploading(false);
      }
    },
    [policy],
  );

  return { upload, uploading, policy };
}

/**
 * Turn a failed upload into something an editor can act on.
 *
 * The shared `getErrorMessage` helper is already status-aware; this adds the
 * wording specific to uploading a file, where "that file is too large" is far
 * more use than a generic failure. The content-inspection verdicts — written
 * for a human, e.g. "PNG has data appended after the final chunk" — are the
 * one thing worth passing through; everything else collapses to a
 * status-appropriate sentence.
 */
function uploadErrorMessage(err: unknown): string {
  const error = err as {
    response?: { status?: number; data?: { message?: string } };
    code?: string;
  };
  const status = error?.response?.status;

  if (status === 413) return 'That file is too large.';
  if (status === 415) return 'That file type is not supported.';
  if (status === 429) return 'Too many uploads. Please wait a moment and try again.';
  if (status === 401 || status === 403) return 'You do not have permission to upload files.';
  if (status === 503) return 'Uploads are temporarily unavailable. Please try again shortly.';

  // 400/422 carry the inspection verdict, which is written to be read by an
  // admin ("PNG has data appended after the final chunk"). Length-capped so a
  // future message cannot turn into a wall of server text in a toast.
  if (status === 400 || status === 422) {
    const message = error?.response?.data?.message;
    if (typeof message === 'string' && message.length > 0 && message.length <= 160) return message;
    return 'That file could not be accepted.';
  }

  if (!error?.response) return 'Upload failed — check your connection and try again.';
  return 'Upload failed. Please try again.';
}
