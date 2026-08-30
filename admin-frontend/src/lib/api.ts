import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

const API_PREFIX = (import.meta.env.VITE_API_PREFIX as string) || '/api/v1';
const API_BASE = (import.meta.env.VITE_API_URL as string) || '';

/**
 * The access token is held in memory only (never localStorage) to reduce XSS
 * exposure. The refresh token lives in a secure HTTP-only cookie set by the API.
 */
let accessToken: string | null = null;
const subscribers = new Set<(token: string | null) => void>();

export const tokenStore = {
  get: (): string | null => accessToken,
  set(token: string | null) {
    accessToken = token;
    subscribers.forEach((fn) => fn(token));
  },
  subscribe(fn: (token: string | null) => void): () => void {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },
};

export const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE}${API_PREFIX}`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

/* ── Refresh handling: queue requests while a refresh is in flight ──────── */
let refreshing: Promise<string | null> | null = null;

async function runRefresh(): Promise<string | null> {
  try {
    const res = await axios.post(
      `${API_BASE}${API_PREFIX}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const token = res.data?.data?.accessToken ?? null;
    tokenStore.set(token);
    return token;
  } catch {
    tokenStore.set(null);
    return null;
  }
}

interface RetriableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';

    // Don't try to refresh the refresh/login endpoints themselves.
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      refreshing = refreshing ?? runRefresh();
      const token = await refreshing;
      refreshing = null;

      if (token) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${token}`;
        return api(original);
      }
      // Refresh failed — broadcast a logout so the app can redirect.
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    return Promise.reject(error);
  },
);

/** Normalise an Axios error into a human-readable message. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: { message: string }[] } | undefined;
    if (data?.errors?.length) return data.errors.map((e) => e.message).join(', ');
    return data?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

/* ── Typed envelope helpers ────────────────────────────────────────────── */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<ApiEnvelope<T>> {
  const res = await api.get<ApiEnvelope<T>>(url, config);
  return res.data;
}
export async function apiPost<T>(url: string, body?: unknown): Promise<ApiEnvelope<T>> {
  const res = await api.post<ApiEnvelope<T>>(url, body);
  return res.data;
}
export async function apiPut<T>(url: string, body?: unknown): Promise<ApiEnvelope<T>> {
  const res = await api.put<ApiEnvelope<T>>(url, body);
  return res.data;
}
export async function apiPatch<T>(url: string, body?: unknown): Promise<ApiEnvelope<T>> {
  const res = await api.patch<ApiEnvelope<T>>(url, body);
  return res.data;
}
export async function apiDelete<T>(url: string): Promise<ApiEnvelope<T>> {
  const res = await api.delete<ApiEnvelope<T>>(url);
  return res.data;
}
