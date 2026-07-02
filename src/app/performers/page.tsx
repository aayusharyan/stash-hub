"use client";

// Paginated, filterable performer list. Supports gender filter pills and sort order.
// Filters and page are stored in URL params to support sharable links.

import { useQuery } from "@apollo/client/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { FIND_PERFORMERS } from "@/lib/graphql/performer-queries";
import { PerformerGrid } from "@/components/performer/PerformerGrid";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { SortSelect } from "@/components/ui/SortSelect";
import type { FindPerformersResult } from "@/types/stash";

const PAGE_SIZE = parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE ?? "60");

const SORT_OPTIONS = [
  { value: "random", label: "Random" },
  { value: "scenes_count_DESC", label: "Most Videos" },
  { value: "rating_DESC", label: "Top Rated" },
  { value: "name_ASC", label: "Name A-Z" },
  { value: "name_DESC", label: "Name Z-A" },
  { value: "created_at_DESC", label: "Recently Added" },
];

const GENDER_OPTIONS = [
  { value: "", label: "All" },
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "TRANSGENDER_FEMALE", label: "Trans Female" },
  { value: "TRANSGENDER_MALE", label: "Trans Male" },
  { value: "NON_BINARY", label: "Non-Binary" },
];

// Inner component; must be inside Suspense because it calls useSearchParams.
function PerformersContent() {
  const router = useRouter();
  const params = useSearchParams();

  const sort = params.get("sort") ?? "scenes_count";
  const dir = (params.get("dir") ?? "DESC") as "ASC" | "DESC";
  const page = parseInt(params.get("page") ?? "1");
  const gender = params.get("gender") ?? "";
  // Random has no direction concept, so its option value is just "random".
  const sortKey = sort === "random" ? "random" : `${sort}_${dir}`;

  const perfFilter: Record<string, unknown> = {};
  if (gender) perfFilter.gender = { value: gender, modifier: "EQUALS" };

  const { data, loading } = useQuery<{ findPerformers: FindPerformersResult }>(FIND_PERFORMERS, {
    variables: {
      filter: { sort, direction: dir, per_page: PAGE_SIZE, page },
      performer_filter: Object.keys(perfFilter).length ? perfFilter : undefined,
    },
  });

  const total = data?.findPerformers.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function update(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    if (key !== "page") p.delete("page");
    router.push(`/performers?${p.toString()}`);
  }

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
    router.push(`/performers?${p.toString()}`);
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Performers</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{total.toLocaleString()} performers</p>
        </div>
        <SortSelect value={sortKey} options={SORT_OPTIONS} onChange={updateSort} label="Sort" />
      </div>

      {/* Gender filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {GENDER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => update("gender", value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
            style={{
              backgroundColor: gender === value ? "var(--primary)" : "var(--bg-secondary)",
              color: gender === value ? "black" : "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <PerformerGrid performers={data?.findPerformers.performers ?? []} loading={loading} />
      <PaginationBar page={page} totalPages={totalPages} onPageChange={(p) => update("page", String(p))} />
    </div>
  );
}

export default function PerformersPage() {
  return (
    <Suspense>
      <PerformersContent />
    </Suspense>
  );
}
