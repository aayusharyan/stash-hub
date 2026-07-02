"use client";

// Full-text search results page. Supports Videos / Performers / Studios / Tags
// type tabs and URL-driven sorting. The active query string is read from the
// `q` URL param so users can share or bookmark search results.

import { useQuery } from "@apollo/client/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Tag as TagIcon } from "lucide-react";
import { FIND_SCENES } from "@/lib/graphql/scene-queries";
import { FIND_PERFORMERS } from "@/lib/graphql/performer-queries";
import { FIND_STUDIOS } from "@/lib/graphql/studio-queries";
import { FIND_TAGS } from "@/lib/graphql/tag-queries";
import { SceneGrid } from "@/components/scene/SceneGrid";
import { PerformerGrid } from "@/components/performer/PerformerGrid";
import { StudioGrid } from "@/components/studio/StudioGrid";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { SortSelect } from "@/components/ui/SortSelect";
import type { FindScenesResult, FindPerformersResult, FindStudiosResult, FindTagsResult } from "@/types/stash";
import { toProxyUrl } from "@/lib/utils";

const PAGE_SIZE = parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE ?? "60");

const SORT_OPTIONS = [
  { value: "date_DESC", label: "Newest" },
  { value: "play_count_DESC", label: "Most Watched" },
  { value: "rating100_DESC", label: "Top Rated" },
  { value: "title_ASC", label: "Title A–Z" },
  { value: "duration_DESC", label: "Longest" },
];

const TYPE_OPTIONS = [
  { value: "videos", label: "Videos" },
  { value: "performers", label: "Performers" },
  { value: "studios", label: "Studios" },
  { value: "tags", label: "Tags" },
];

// Inner component that reads URL params; must be wrapped in Suspense.
function SearchContent() {
  const router = useRouter();
  const params = useSearchParams();

  const q = params.get("q") ?? "";
  const type = params.get("type") ?? "videos";
  const sort = params.get("sort") ?? "date";
  const dir = (params.get("dir") ?? "DESC") as "ASC" | "DESC";
  const page = parseInt(params.get("page") ?? "1");
  // When set, filters scenes to only those featuring performers from this country/nationality.
  const performerCountry = params.get("performer_country") ?? "";
  const sortKey = `${sort}_${dir}`;

  const { data: sceneData, loading: sceneLoading } = useQuery<{ findScenes: FindScenesResult }>(FIND_SCENES, {
    variables: {
      filter: { q, sort, direction: dir, per_page: PAGE_SIZE, page },
      ...(performerCountry && {
        scene_filter: {
          performers_filter: { country: { value: performerCountry, modifier: "INCLUDES" } },
        },
      }),
    },
    skip: type !== "videos",
  });

  const { data: perfData, loading: perfLoading } = useQuery<{ findPerformers: FindPerformersResult }>(FIND_PERFORMERS, {
    variables: {
      filter: { q, per_page: PAGE_SIZE, page, sort: "name", direction: "ASC" },
    },
    skip: type !== "performers",
  });

  const { data: studioData, loading: studioLoading } = useQuery<{ findStudios: FindStudiosResult }>(FIND_STUDIOS, {
    variables: {
      filter: { q, per_page: PAGE_SIZE, page, sort: "scenes_count", direction: "DESC" },
    },
    skip: type !== "studios",
  });

  const { data: tagData, loading: tagLoading } = useQuery<{ findTags: FindTagsResult }>(FIND_TAGS, {
    variables: {
      filter: { q, per_page: PAGE_SIZE, page, sort: "scenes_count", direction: "DESC" },
    },
    skip: type !== "tags",
  });

  const total =
    type === "videos"
      ? (sceneData?.findScenes.count ?? 0)
      : type === "performers"
      ? (perfData?.findPerformers.count ?? 0)
      : type === "studios"
      ? (studioData?.findStudios.count ?? 0)
      : (tagData?.findTags.count ?? 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function update(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    p.set(key, value);
    if (key !== "page") p.delete("page");
    router.push(`/search?${p.toString()}`);
  }

  function updateSort(value: string) {
    const [s, d] = value.split("_");
    const p = new URLSearchParams(params.toString());
    p.set("sort", s === "play" ? "play_count" : s === "rating100" ? "rating100" : s);
    p.set("dir", d);
    p.delete("page");
    router.push(`/search?${p.toString()}`);
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
        {total > 0 && (
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {total.toLocaleString()} results
          </p>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Type toggle */}
        <div
          className="flex rounded overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
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
          <SceneGrid scenes={sceneData?.findScenes.scenes ?? []} loading={sceneLoading} />
          <PaginationBar page={page} totalPages={totalPages} onPageChange={(p) => update("page", String(p))} />
        </>
      )}

      {type === "performers" && (
        <>
          <PerformerGrid performers={perfData?.findPerformers.performers ?? []} loading={perfLoading} />
          <PaginationBar page={page} totalPages={totalPages} onPageChange={(p) => update("page", String(p))} />
        </>
      )}

      {type === "studios" && (
        <>
          <StudioGrid studios={studioData?.findStudios.studios ?? []} loading={studioLoading} />
          <PaginationBar page={page} totalPages={totalPages} onPageChange={(p) => update("page", String(p))} />
        </>
      )}

      {type === "tags" && (
        <>
          <TagGrid tags={tagData?.findTags.tags ?? []} loading={tagLoading} />
          <PaginationBar page={page} totalPages={totalPages} onPageChange={(p) => update("page", String(p))} />
        </>
      )}
    </div>
  );
}

// Individual tag card with local image-error state to show a fallback icon when needed.
function TagCard({ tag }: { tag: { id: string; name: string; image_path?: string | null; scene_count: number } }) {
  const [imgError, setImgError] = useState(false);
  const showImage = !!tag.image_path && !imgError;

  return (
    <Link
      href={`/tags/${tag.id}`}
      className="group relative flex items-end rounded overflow-hidden transition-transform hover:scale-105"
      style={{
        aspectRatio: "1/1",
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border)",
      }}
    >
      {showImage ? (
        <Image
          src={toProxyUrl(tag.image_path!)!}
          alt={tag.name}
          fill
          className="object-cover opacity-40 group-hover:opacity-60 transition-opacity"
          onError={() => setImgError(true)}
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ color: "var(--text-muted)", opacity: 0.25 }}>
          <TagIcon size={40} />
        </div>
      )}
      <div className="relative w-full p-2" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)" }}>
        <p className="text-xs font-bold truncate" style={{ color: "white" }}>{tag.name}</p>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{tag.scene_count} videos</p>
      </div>
    </Link>
  );
}

// Responsive tile grid for tag results, matching the style of the main tags page.
function TagGrid({ tags, loading }: { tags: { id: string; name: string; image_path?: string; scene_count: number }[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded h-16" style={{ backgroundColor: "#2b2b2b" }} />
        ))}
      </div>
    );
  }

  if (!tags.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24" style={{ color: "var(--text-muted)" }}>
        <p className="text-lg">No tags found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {tags.map((tag) => (
        <TagCard key={tag.id} tag={tag} />
      ))}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
