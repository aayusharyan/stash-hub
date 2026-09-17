// Watch history page - shows all scenes the user has played, sorted by most recently
// watched. Pagination state lives in the URL so the back button works and links are
// shareable. Backed by /api/scenes?played=true&sort=last_played_at.

import { useNavigate, useSearchParams } from "react-router-dom";
import { History } from "lucide-react";

import { SceneGrid } from "@/components/scene/SceneGrid";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { useConfig } from "@/contexts/ConfigContext";
import { useScenes } from "@/lib/queries";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function HistoryPage() {
  useDocumentTitle("Watch History");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pageSize } = useConfig();
  const page = parseInt(params.get("page") ?? "1");

  const { data, isLoading } = useScenes({
    played: true,
    sort: "last_played_at",
    dir: "DESC",
    page,
    per_page: pageSize,
  });

  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  const scenes = data?.scenes ?? [];

  function setPage(p: number) {
    const q = new URLSearchParams(params.toString());
    q.set("page", String(p));
    navigate(`/history?${q.toString()}`);
  }

  return (
    <div className="py-6">
      <div className="flex items-center gap-3 mb-6">
        <History size={22} style={{ color: "var(--primary)" }} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Watch History</h1>
          {total > 0 && (
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {total.toLocaleString()} {total === 1 ? "video" : "videos"} watched
            </p>
          )}
        </div>
      </div>

      {/* Empty state shown after loading completes with no results */}
      {!isLoading && scenes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: "var(--text-muted)" }}>
          <History size={48} strokeWidth={1.2} />
          <p className="text-lg font-medium">No watch history yet</p>
          <p className="text-sm">Start watching a video and it will appear here.</p>
        </div>
      )}

      <SceneGrid scenes={scenes} loading={isLoading} />
      <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
