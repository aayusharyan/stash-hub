// Paginated performer list with sort order.
// Sort and page are stored in URL params to support shareable links.

import { useNavigate, useSearchParams } from "react-router-dom";

import { PerformerGrid } from "@/components/performer/PerformerGrid";
import { CountLabel } from "@/components/ui/CountLabel";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { SortSelect } from "@/components/ui/SortSelect";
import { useConfig } from "@/contexts/ConfigContext";
import { usePerformers } from "@/lib/queries";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const SORT_OPTIONS = [
  { value: "random", label: "Random" },
  { value: "scenes_count_DESC", label: "Most Videos" },
  { value: "rating_DESC", label: "Top Rated" },
  { value: "name_ASC", label: "Name A-Z" },
  { value: "name_DESC", label: "Name Z-A" },
  { value: "created_at_DESC", label: "Recently Added" },
];

export default function PerformerListPage() {
  useDocumentTitle("Performers");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pageSize } = useConfig();

  const sort = params.get("sort") ?? "random";
  const dir = (params.get("dir") ?? "DESC") as "ASC" | "DESC";
  const page = parseInt(params.get("page") ?? "1");
  // Random has no direction concept, so its option value is just "random".
  const sortKey = sort === "random" ? "random" : `${sort}_${dir}`;

  const { data, isLoading } = usePerformers({
    sort,
    dir,
    per_page: pageSize,
    page,
  });

  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  function update(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    if (key !== "page") p.delete("page");
    navigate(`/performers?${p.toString()}`);
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
    navigate(`/performers?${p.toString()}`);
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Performers</h1>
          <CountLabel loading={isLoading}>
            {`${total.toLocaleString()} performers`}
          </CountLabel>
        </div>
        <SortSelect value={sortKey} options={SORT_OPTIONS} onChange={updateSort} label="Sort" />
      </div>

      <PerformerGrid performers={data?.performers ?? []} loading={isLoading} />
      <PaginationBar page={page} totalPages={totalPages} onPageChange={(p) => update("page", String(p))} />
    </div>
  );
}
