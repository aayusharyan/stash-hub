// Paginated, sortable tag grid. Each tag renders as an image tile with a gradient
// overlay. Sort and page are stored in URL params for shareability.

import { useNavigate, useSearchParams } from "react-router-dom";

import { TagGrid } from "@/components/tag/TagGrid";
import { CountLabel } from "@/components/ui/CountLabel";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { SortSelect } from "@/components/ui/SortSelect";
import { useConfig } from "@/contexts/ConfigContext";
import { useTags } from "@/lib/queries";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const SORT_OPTIONS = [
  { value: "random", label: "Random" },
  { value: "scenes_count_DESC", label: "Most Videos" },
  { value: "name_ASC", label: "Name A-Z" },
  { value: "name_DESC", label: "Name Z-A" },
  { value: "performer_count_DESC", label: "Most Performers" },
];

export default function TagListPage() {
  useDocumentTitle("Tags");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pageSize } = useConfig();

  const sort = params.get("sort") ?? "random";
  const dir = (params.get("dir") ?? "DESC") as "ASC" | "DESC";
  const page = parseInt(params.get("page") ?? "1");
  // Random has no direction concept, so its option value is just "random".
  const sortKey = sort === "random" ? "random" : `${sort}_${dir}`;

  const { data, isLoading } = useTags({ sort, dir, per_page: pageSize, page });

  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

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
    navigate(`/tags?${p.toString()}`);
  }

  function setPage(p: number) {
    const q = new URLSearchParams(params.toString());
    q.set("page", String(p));
    navigate(`/tags?${q.toString()}`);
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Tags</h1>
          <CountLabel loading={isLoading}>
            {total > 0 ? `${total.toLocaleString()} tags` : null}
          </CountLabel>
        </div>
        <SortSelect value={sortKey} options={SORT_OPTIONS} onChange={updateSort} label="Sort" />
      </div>

      <TagGrid tags={data?.tags ?? []} loading={isLoading} />
      <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
