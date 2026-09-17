// Full-text search results page. Supports Videos / Performers / Studios / Tags
// type tabs and URL-driven sorting. The active query string is read from the
// `q` URL param so users can share or bookmark search results. Only the query
// for the active tab is enabled.

import { useNavigate, useSearchParams } from "react-router-dom";

import { SceneGrid } from "@/components/scene/SceneGrid";
import { PerformerGrid } from "@/components/performer/PerformerGrid";
import { StudioGrid } from "@/components/studio/StudioGrid";
import { TagGrid } from "@/components/tag/TagGrid";
import { CountLabel } from "@/components/ui/CountLabel";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { SortSelect } from "@/components/ui/SortSelect";
import { useConfig } from "@/contexts/ConfigContext";
import { usePerformers, useScenes, useStudios, useTags } from "@/lib/queries";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const SORT_OPTIONS = [
  { value: "date_DESC", label: "Newest" },
  { value: "play_count_DESC", label: "Most Watched" },
  { value: "rating_DESC", label: "Top Rated" },
  { value: "title_ASC", label: "Title A-Z" },
  { value: "duration_DESC", label: "Longest" },
];

const TYPE_OPTIONS = [
  { value: "videos", label: "Videos" },
  { value: "performers", label: "Performers" },
  { value: "studios", label: "Studios" },
  { value: "tags", label: "Tags" },
];

export default function SearchPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pageSize } = useConfig();

  const q = params.get("q") ?? "";
  const type = params.get("type") ?? "videos";
  const sort = params.get("sort") ?? "date";
  const dir = (params.get("dir") ?? "DESC") as "ASC" | "DESC";
  const page = parseInt(params.get("page") ?? "1");
  // When set, filters scenes to only those featuring performers from this country/nationality.
  const performerCountry = params.get("performer_country") ?? "";
  const sortKey = `${sort}_${dir}`;

  useDocumentTitle(q ? `Search: ${q}` : "Search");

  // Only the query matching the active tab runs; the rest are disabled via enabled.
  const { data: sceneData, isLoading: sceneLoading } = useScenes(
    { q, sort, dir, per_page: pageSize, page, performer_country: performerCountry || undefined },
    { enabled: type === "videos" },
  );
  const { data: perfData, isLoading: perfLoading } = usePerformers(
    { q, per_page: pageSize, page, sort: "name", dir: "ASC" },
    { enabled: type === "performers" },
  );
  const { data: studioData, isLoading: studioLoading } = useStudios(
    { q, per_page: pageSize, page, sort: "scenes_count", dir: "DESC" },
    { enabled: type === "studios" },
  );
  const { data: tagData, isLoading: tagLoading } = useTags(
    { q, per_page: pageSize, page, sort: "scenes_count", dir: "DESC" },
    { enabled: type === "tags" },
  );

  const isLoading =
    (type === "videos" && sceneLoading) ||
    (type === "performers" && perfLoading) ||
    (type === "studios" && studioLoading) ||
    (type === "tags" && tagLoading);
  const total =
    type === "videos"
      ? (sceneData?.count ?? 0)
      : type === "performers"
      ? (perfData?.count ?? 0)
      : type === "studios"
      ? (studioData?.count ?? 0)
      : (tagData?.count ?? 0);
  const totalPages = Math.ceil(total / pageSize);

  function update(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    p.set(key, value);
    if (key !== "page") p.delete("page");
    navigate(`/search?${p.toString()}`);
  }

  function updateSort(value: string) {
    // Split on the last underscore so multi-word sort keys like "play_count" stay
    // intact and only the trailing ASC/DESC becomes the direction.
    const idx = value.lastIndexOf("_");
    const p = new URLSearchParams(params.toString());
    p.set("sort", value.slice(0, idx));
    p.set("dir", value.slice(idx + 1));
    p.delete("page");
    navigate(`/search?${p.toString()}`);
  }

  return (
    <div className="py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          {performerCountry
            ? `Videos · ${performerCountry} performers`
            : q
            ? `Results for "${q}"`
            : "Search"}
        </h1>
        <CountLabel loading={isLoading}>
          {total > 0 ? `${total.toLocaleString()} results` : null}
        </CountLabel>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Type toggle */}
        <div className="flex rounded overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {TYPE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => update("type", value)}
              className="px-4 py-1.5 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: type === value ? "var(--primary)" : "var(--bg-secondary)",
                color: type === value ? "black" : "var(--text-secondary)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {type === "videos" && (
          <SortSelect value={sortKey} options={SORT_OPTIONS} onChange={updateSort} label="Sort" />
        )}
      </div>

      {/* Results */}
      {type === "videos" && (
        <>
          <SceneGrid scenes={sceneData?.scenes ?? []} loading={sceneLoading} />
          <PaginationBar page={page} totalPages={totalPages} onPageChange={(p) => update("page", String(p))} />
        </>
      )}

      {type === "performers" && (
        <>
          <PerformerGrid performers={perfData?.performers ?? []} loading={perfLoading} />
          <PaginationBar page={page} totalPages={totalPages} onPageChange={(p) => update("page", String(p))} />
        </>
      )}

      {type === "studios" && (
        <>
          <StudioGrid studios={studioData?.studios ?? []} loading={studioLoading} />
          <PaginationBar page={page} totalPages={totalPages} onPageChange={(p) => update("page", String(p))} />
        </>
      )}

      {type === "tags" && (
        <>
          <TagGrid tags={tagData?.tags ?? []} loading={tagLoading} />
          <PaginationBar page={page} totalPages={totalPages} onPageChange={(p) => update("page", String(p))} />
        </>
      )}
    </div>
  );
}
