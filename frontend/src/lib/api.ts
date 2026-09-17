// Typed fetch client for the Python REST API. Every network call in the app goes
// through here. Requests are same-origin (/api/...) and proxied to the backend by
// nginx in production or by the Vite dev server during development.

import type {
  AppConfig,
  FindPerformersResult,
  FindScenesResult,
  FindStudiosResult,
  FindTagsResult,
  Performer,
  Scene,
  StatsResult,
  Studio,
  SuggestionData,
  Tag,
} from "@/types/stash";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

// Serialises a params object to a query string, skipping empty/undefined values.
function buildQuery(params?: QueryParams): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// Performs a fetch and throws a descriptive Error on any non-2xx response so
// TanStack Query surfaces it through its error state.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // Non-JSON error body; keep the status text.
    }
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

// Convenience wrapper for JSON POST/PATCH bodies.
function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

// Filter/sort/pagination parameters accepted by the unified scenes endpoint.
export interface SceneListParams {
  page?: number;
  per_page?: number;
  sort?: string;
  dir?: string;
  q?: string;
  performer_id?: string;
  studio_id?: string;
  tag_id?: string;
  performers?: string;
  tags?: string;
  played?: boolean;
  min_rating?: number;
  performer_country?: string;
}

export interface ListParams {
  page?: number;
  per_page?: number;
  sort?: string;
  dir?: string;
  q?: string;
  gender?: string;
}

export const api = {
  // Runtime config (page size + external Stash URL).
  config: () => request<AppConfig>("/api/config"),

  // Scene reads.
  scenes: (params?: SceneListParams) =>
    request<FindScenesResult>(`/api/scenes${buildQuery(params as QueryParams)}`),
  scene: (id: string) => request<Scene>(`/api/scenes/${id}`),

  // Scene mutations.
  addPlay: (id: string) => request<{ count: number }>(`/api/scenes/${id}/play`, jsonInit("POST")),
  rateScene: (id: string, rating100: number) =>
    request<{ id: string; rating100: number }>(`/api/scenes/${id}`, jsonInit("PATCH", { rating100 })),

  // Performer reads.
  performers: (params?: ListParams) =>
    request<FindPerformersResult>(`/api/performers${buildQuery(params as QueryParams)}`),
  performer: (id: string) => request<Performer>(`/api/performers/${id}`),

  // Studio reads.
  studios: (params?: ListParams) =>
    request<FindStudiosResult>(`/api/studios${buildQuery(params as QueryParams)}`),
  studio: (id: string) => request<Studio>(`/api/studios/${id}`),

  // Tag reads.
  tags: (params?: ListParams) =>
    request<FindTagsResult>(`/api/tags${buildQuery(params as QueryParams)}`),
  tag: (id: string) => request<Tag>(`/api/tags/${id}`),

  // Cross-entity live-search suggestions.
  searchSuggestions: (q: string) =>
    request<SuggestionData>(`/api/search/suggestions${buildQuery({ q })}`),

  // Library statistics.
  stats: () => request<StatsResult>("/api/stats"),
};
