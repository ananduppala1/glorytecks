import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  UseQueryOptions,
} from '@tanstack/react-query';
import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  ApiEnvelope,
  PaginationMeta,
} from '@/lib/api';

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  [key: string]: unknown;
}

export interface ListResult<T> {
  items: T[];
  meta?: PaginationMeta;
}

function buildQuery(params: ListParams = {}): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Factory returning a set of typed hooks bound to a base path, e.g. `/trainers`.
 * Used by every resource page so list/create/edit/delete behave consistently.
 */
export function createResourceHooks<T extends { id: string }>(basePath: string, key: string) {
  const keys = {
    all: [key] as const,
    list: (params: ListParams) => [key, 'list', params] as const,
    detail: (id: string) => [key, 'detail', id] as const,
  };

  function useList(params: ListParams = {}, options?: Partial<UseQueryOptions<ListResult<T>>>) {
    return useQuery<ListResult<T>>({
      queryKey: keys.list(params),
      queryFn: async () => {
        const res = await apiGet<T[]>(`${basePath}${buildQuery(params)}`);
        return { items: res.data, meta: res.meta };
      },
      placeholderData: keepPreviousData,
      ...options,
    });
  }

  function useDetail(id: string | undefined, options?: Partial<UseQueryOptions<T>>) {
    return useQuery<T>({
      queryKey: keys.detail(id ?? 'new'),
      queryFn: async () => {
        const res = await apiGet<T>(`${basePath}/${id}`);
        return res.data;
      },
      enabled: Boolean(id),
      ...options,
    });
  }

  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (payload: Partial<T>): Promise<ApiEnvelope<T>> =>
        apiPost<T>(basePath, payload),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    });
  }

  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, payload }: { id: string; payload: Partial<T> }) =>
        apiPut<T>(`${basePath}/${id}`, payload),
      onSuccess: (_data, vars) => {
        qc.invalidateQueries({ queryKey: keys.all });
        qc.invalidateQueries({ queryKey: keys.detail(vars.id) });
      },
    });
  }

  function usePatch() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, payload, suffix }: { id: string; payload: unknown; suffix?: string }) =>
        apiPatch<T>(`${basePath}/${id}${suffix ?? ''}`, payload),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    });
  }

  function useRemove() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => apiDelete<null>(`${basePath}/${id}`),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    });
  }

  return { keys, useList, useDetail, useCreate, useUpdate, usePatch, useRemove };
}
