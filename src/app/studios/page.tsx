"use client";

// Paginated, sortable studio list. Sort and page state live in URL search params.

import { useQuery } from "@apollo/client/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { FIND_STUDIOS } from "@/lib/graphql/studio-queries";
import { StudioGrid } from "@/components/studio/StudioGrid";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { SortSelect } from "@/components/ui/SortSelect";
import type { FindStudiosResult } from "@/types/stash";

const PAGE_SIZE = parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE ?? "60");

const SORT_OPTIONS = [
  { value: "random", label: "Random" },
  { value: "scenes_count_DESC", label: "Most Videos" },
  { value: "rating_DESC", label: "Top Rated" },
  { value: "name_ASC", label: "Name A-Z" },
  { value: "name_DESC", label: "Name Z-A" },
  { value: "created_at_DESC", label: "Recently Added" },
];

// Inner component that reads URL params; must be wrapped in Suspense.
function StudiosContent() {
  const router = useRouter();
  const params = useSearchParams();

  const sort = params.get("sort") ?? "scenes_count";
  const dir = (params.get("dir") ?? "DESC") as "ASC" | "DESC";
  const page = parseInt(params.get("page") ?? "1");
  // Random has no direction concept, so its option value is just "random".
  const sortKey = sort === "random" ? "random" : `${sort}_${dir}`;

  const { data, loading } = useQuery<{ findStudios: FindStudiosResult }>(FIND_STUDIOS, {
    variables: { filter: { sort, direction: dir, per_page: PAGE_SIZE, page } },
  });

  const total = data?.findStudios.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function updateSort(value: string) {
    const p = new URLSearchParams(params.toString());
    p.delete("page");
    if (value === "random") {
      p.set("sort", "random");
      p.delete("dir");
    } else {
      const parts = value.split("_");
      const d = parts.pop()!;
      const s = parts.join("_");
      p.set("sort", s);
      p.set("dir", d);
    }
    router.push(`/studios?${p.toString()}`);
  }

  function setPage(p: number) {
    const q = new URLSearchParams(params.toString());
    q.set("page", String(p));
    router.push(`/studios?${q.toString()}`);
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Studios</h1>
          {total > 0 && <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{total.toLocaleString()} studios</p>}
        </div>
        <SortSelect value={sortKey} options={SORT_OPTIONS} onChange={updateSort} label="Sort" />
      </div>

      <StudioGrid studios={data?.findStudios.studios ?? []} loading={loading} />
      <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

export default function StudiosPage() {
  return (
    <Suspense>
      <StudiosContent />
    </Suspense>
  );
}
