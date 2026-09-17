// Paginated, sortable studio list. Sort and page state live in URL search params.

import { useNavigate, useSearchParams } from "react-router-dom";

import { StudioGrid } from "@/components/studio/StudioGrid";
import { CountLabel } from "@/components/ui/CountLabel";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { SortSelect } from "@/components/ui/SortSelect";
import { useConfig } from "@/contexts/ConfigContext";
import { useStudios } from "@/lib/queries";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const SORT_OPTIONS = [
  { value: "random", label: "Random" },
  { value: "scenes_count_DESC", label: "Most Videos" },
  { value: "rating_DESC", label: "Top Rated" },
  { value: "name_ASC", label: "Name A-Z" },
  { value: "name_DESC", label: "Name Z-A" },
  { value: "created_at_DESC", label: "Recently Added" },
];

export default function StudiosPage() {
  useDocumentTitle("Studios");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pageSize } = useConfig();

  const sort = params.get("sort") ?? "random";
  const dir = (params.get("dir") ?? "DESC") as "ASC" | "DESC";
  const page = parseInt(params.get("page") ?? "1");
  // Random has no direction concept, so its option value is just "random".
  const sortKey = sort === "random" ? "random" : `${sort}_${dir}`;

  const { data, isLoading } = useStudios({ sort, dir, per_page: pageSize, page });

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
    navigate(`/studios?${p.toString()}`);
  }

  function setPage(p: number) {
    const q = new URLSearchParams(params.toString());
    q.set("page", String(p));
    navigate(`/studios?${q.toString()}`);
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Studios</h1>
          <CountLabel loading={isLoading}>
            {total > 0 ? `${total.toLocaleString()} studios` : null}
          </CountLabel>
        </div>
        <SortSelect value={sortKey} options={SORT_OPTIONS} onChange={updateSort} label="Sort" />
      </div>

      <StudioGrid studios={data?.studios ?? []} loading={isLoading} />
      <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
