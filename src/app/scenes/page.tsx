"use client";

// Paginated, sortable list of all scenes. Sort and page state live in URL
// search params so the browser back button works and URLs are shareable.

import { useQuery } from "@apollo/client/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { FIND_SCENES } from "@/lib/graphql/scene-queries";
import { SceneGrid } from "@/components/scene/SceneGrid";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { SortSelect } from "@/components/ui/SortSelect";
import type { FindScenesResult } from "@/types/stash";

const PAGE_SIZE = parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE ?? "60");

const SORT_OPTIONS = [
  { value: "random", label: "Random" },
  { value: "date_DESC", label: "Newest First" },
  { value: "date_ASC", label: "Oldest First" },
  { value: "play_count_DESC", label: "Most Watched" },
  { value: "rating_DESC", label: "Top Rated" },
  { value: "created_at_DESC", label: "Recently Added" },
  { value: "title_ASC", label: "Title A–Z" },
  { value: "title_DESC", label: "Title Z–A" },
  { value: "duration_DESC", label: "Longest First" },
  { value: "filesize_DESC", label: "Largest File" },
];

// Inner component that reads URL params and renders the scene list; wrapped in Suspense below.
function ScenesContent() {
  const router = useRouter();
  const params = useSearchParams();

  const sort = params.get("sort") ?? "date";
  const dir = (params.get("dir") ?? "DESC") as "ASC" | "DESC";
  const page = parseInt(params.get("page") ?? "1");
  // Random has no direction concept, so its option value is just "random".
  const sortKey = sort === "random" ? "random" : `${sort}_${dir}`;

  const { data, loading } = useQuery<{ findScenes: FindScenesResult }>(FIND_SCENES, {
    variables: {
      filter: {
        sort,
        direction: dir,
        per_page: PAGE_SIZE,
        page,
      },
    },
  });

  const total = data?.findScenes.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function updateSort(value: string) {
    const p = new URLSearchParams(params.toString());
    p.delete("page");
    if (value === "random") {
      p.set("sort", "random");
      p.delete("dir");
    } else {
      // Split on the last underscore so compound keys like "play_count_DESC"
      // correctly yield sort="play_count" and dir="DESC".
      const lastUnderscore = value.lastIndexOf("_");
      const s = value.substring(0, lastUnderscore);
      const d = value.substring(lastUnderscore + 1);
      p.set("sort", s);
      p.set("dir", d);
    }
    router.push(`/scenes?${p.toString()}`);
  }

  function setPage(p: number) {
    const q = new URLSearchParams(params.toString());
    q.set("page", String(p));
    router.push(`/scenes?${q.toString()}`);
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Videos</h1>
          {total > 0 && (
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {total.toLocaleString()} videos
            </p>
          )}
        </div>
        <SortSelect
          value={sortKey}
          options={SORT_OPTIONS}
          onChange={updateSort}
          label="Sort"
        />
      </div>

      <SceneGrid scenes={data?.findScenes.scenes ?? []} loading={loading} />
      <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

export default function ScenesPage() {
  return (
    <Suspense>
      <ScenesContent />
    </Suspense>
  );
}
