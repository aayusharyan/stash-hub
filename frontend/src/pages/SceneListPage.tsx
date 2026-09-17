// Paginated, sortable list of all scenes. Sort and page state live in URL
// search params so the browser back button works and URLs are shareable.

import { useNavigate, useSearchParams } from "react-router-dom";

import { SceneGrid } from "@/components/scene/SceneGrid";
import { CountLabel } from "@/components/ui/CountLabel";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { SortSelect } from "@/components/ui/SortSelect";
import { useConfig } from "@/contexts/ConfigContext";
import { useScenes } from "@/lib/queries";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const SORT_OPTIONS = [
  { value: "random", label: "Random" },
  { value: "date_DESC", label: "Newest First" },
  { value: "date_ASC", label: "Oldest First" },
  { value: "play_count_DESC", label: "Most Watched" },
  { value: "rating_DESC", label: "Top Rated" },
  { value: "created_at_DESC", label: "Recently Added" },
  { value: "title_ASC", label: "Title A-Z" },
  { value: "title_DESC", label: "Title Z-A" },
  { value: "duration_DESC", label: "Longest First" },
  { value: "filesize_DESC", label: "Largest File" },
];

export default function SceneListPage() {
  useDocumentTitle("Videos");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pageSize } = useConfig();

  const sort = params.get("sort") ?? "random";
  const dir = (params.get("dir") ?? "DESC") as "ASC" | "DESC";
  const page = parseInt(params.get("page") ?? "1");
  // Random has no direction concept, so its option value is just "random".
  const sortKey = sort === "random" ? "random" : `${sort}_${dir}`;

  const { data, isLoading } = useScenes({ sort, dir, per_page: pageSize, page });

  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

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
    navigate(`/scenes?${p.toString()}`);
  }

  function setPage(p: number) {
    const q = new URLSearchParams(params.toString());
    q.set("page", String(p));
    navigate(`/scenes?${q.toString()}`);
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Videos</h1>
          <CountLabel loading={isLoading}>
            {total > 0 ? `${total.toLocaleString()} videos` : null}
          </CountLabel>
        </div>
        <SortSelect value={sortKey} options={SORT_OPTIONS} onChange={updateSort} label="Sort" />
      </div>

      <SceneGrid scenes={data?.scenes ?? []} loading={isLoading} />
      <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
