"use client";

// Watch history page - shows all scenes the user has played, sorted by most recently watched.
// Pagination state lives in the URL so the back button works and links are shareable.

import { useQuery } from "@apollo/client/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { History } from "lucide-react";
import { FIND_WATCH_HISTORY } from "@/lib/graphql/scene-queries";
import { SceneGrid } from "@/components/scene/SceneGrid";
import { PaginationBar } from "@/components/ui/PaginationBar";
import type { FindScenesResult } from "@/types/stash";

const PAGE_SIZE = parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE ?? "60");

// Inner component that reads URL params and renders the history list; wrapped in Suspense below.
function HistoryContent() {
  const router = useRouter();
  const params = useSearchParams();
  const page = parseInt(params.get("page") ?? "1");

  const { data, loading } = useQuery<{ findScenes: FindScenesResult }>(FIND_WATCH_HISTORY, {
    variables: { page, per_page: PAGE_SIZE },
  });

  const total = data?.findScenes.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const scenes = data?.findScenes.scenes ?? [];

  function setPage(p: number) {
    const q = new URLSearchParams(params.toString());
    q.set("page", String(p));
    router.push(`/history?${q.toString()}`);
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
      {!loading && scenes.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-24 gap-3"
          style={{ color: "var(--text-muted)" }}
        >
          <History size={48} strokeWidth={1.2} />
          <p className="text-lg font-medium">No watch history yet</p>
          <p className="text-sm">Start watching a video and it will appear here.</p>
        </div>
      )}

      <SceneGrid scenes={scenes} loading={loading} />
      <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense>
      <HistoryContent />
    </Suspense>
  );
}
