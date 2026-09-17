// TanStack Query hooks wrapping the REST client. They add caching, background
// refetching and a consistent loading/error surface across every screen. Query
// keys embed the parameters so changing a filter or page fetches (and caches)
// independently.

import { useMutation, useQuery } from "@tanstack/react-query";

import { api, type ListParams, type SceneListParams } from "@/lib/api";

// Paginated/filterable scene list. Pass enabled: false to skip the fetch.
export function useScenes(params: SceneListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["scenes", params],
    queryFn: () => api.scenes(params),
    enabled: options?.enabled ?? true,
  });
}

// Full detail for a single scene.
export function useScene(id: string | undefined) {
  return useQuery({
    queryKey: ["scene", id],
    queryFn: () => api.scene(id!),
    enabled: !!id,
  });
}

// Paginated/filterable performer list.
export function usePerformers(params: ListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["performers", params],
    queryFn: () => api.performers(params),
    enabled: options?.enabled ?? true,
  });
}

// Full profile for a single performer.
export function usePerformer(id: string | undefined) {
  return useQuery({
    queryKey: ["performer", id],
    queryFn: () => api.performer(id!),
    enabled: !!id,
  });
}

// Paginated/sortable studio list.
export function useStudios(params: ListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["studios", params],
    queryFn: () => api.studios(params),
    enabled: options?.enabled ?? true,
  });
}

// Full detail for a single studio.
export function useStudio(id: string | undefined) {
  return useQuery({
    queryKey: ["studio", id],
    queryFn: () => api.studio(id!),
    enabled: !!id,
  });
}

// Paginated/sortable tag list.
export function useTags(params: ListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["tags", params],
    queryFn: () => api.tags(params),
    enabled: options?.enabled ?? true,
  });
}

// Full detail for a single tag.
export function useTag(id: string | undefined) {
  return useQuery({
    queryKey: ["tag", id],
    queryFn: () => api.tag(id!),
    enabled: !!id,
  });
}

// Library-wide statistics for the home dashboard.
export function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: () => api.stats() });
}

// Debounced live-search suggestions; disabled for very short queries.
export function useSearchSuggestions(q: string) {
  return useQuery({
    queryKey: ["suggestions", q],
    queryFn: () => api.searchSuggestions(q),
    enabled: q.trim().length >= 2,
  });
}

// Scene mutations. Callers attach onSuccess to update local optimistic state.
export function useAddPlay() {
  return useMutation({ mutationFn: (id: string) => api.addPlay(id) });
}

export function useRateScene() {
  return useMutation({
    mutationFn: (vars: { id: string; rating100: number }) => api.rateScene(vars.id, vars.rating100),
  });
}
