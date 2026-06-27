// Responsive grid of PerformerCards with a pulse skeleton loading state.
// Column count is driven by the global GridDensity from ViewContext.

import type { Performer } from "@/types/stash";
import { PerformerCard } from "./PerformerCard";
import { cn } from "@/lib/utils";
import { useView, PERFORMER_GRID_CLASS } from "@/contexts/ViewContext";

interface Props {
  performers: Performer[];
  className?: string;
  loading?: boolean;
}

// Placeholder card shown while performer data is fetching; matches PerformerCard proportions.
function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="rounded" style={{ aspectRatio: "2/3", backgroundColor: "#2b2b2b" }} />
      <div className="mt-2 space-y-1 flex flex-col items-center">
        <div className="h-3 rounded" style={{ backgroundColor: "#2b2b2b", width: "70%" }} />
        <div className="h-3 rounded" style={{ backgroundColor: "#2b2b2b", width: "50%" }} />
      </div>
    </div>
  );
}

// Renders skeletons, empty state, or the populated grid based on the loading/data props.
// The number of large-screen columns scales with the user's chosen GridDensity.
export function PerformerGrid({ performers, className, loading }: Props) {
  const { gridDensity } = useView();
  const gridClass = PERFORMER_GRID_CLASS[gridDensity];

  if (loading) {
    return (
      <div className={cn(gridClass, className)}>
        {Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!performers?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24" style={{ color: "var(--text-muted)" }}>
        <p className="text-lg">No performers found</p>
      </div>
    );
  }

  return (
    <div className={cn(gridClass, className)}>
      {performers.map((p) => <PerformerCard key={p.id} performer={p} />)}
    </div>
  );
}
