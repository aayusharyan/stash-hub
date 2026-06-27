// Responsive grid of StudioCards with a pulse skeleton loading state.
// Column count is driven by the global GridDensity from ViewContext.

import type { Studio } from "@/types/stash";
import { StudioCard } from "./StudioCard";
import { cn } from "@/lib/utils";
import { useView, STUDIO_GRID_CLASS } from "@/contexts/ViewContext";

interface Props {
  studios: Studio[];
  className?: string;
  loading?: boolean;
}

// Placeholder card with matching 16:7 aspect ratio shown during loading.
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div style={{ aspectRatio: "16/7", backgroundColor: "#2b2b2b" }} />
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="h-3 rounded" style={{ backgroundColor: "#2b2b2b", width: "75%" }} />
        <div className="h-3 rounded" style={{ backgroundColor: "#2b2b2b", width: "50%" }} />
      </div>
    </div>
  );
}

// Renders skeletons, an empty state, or the populated grid depending on props.
// The number of large-screen columns scales with the user's chosen GridDensity.
export function StudioGrid({ studios, className, loading }: Props) {
  const { gridDensity } = useView();
  const gridClass = STUDIO_GRID_CLASS[gridDensity];

  if (loading) {
    return (
      <div className={cn(gridClass, className)}>
        {Array.from({ length: 15 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!studios?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24" style={{ color: "var(--text-muted)" }}>
        <p className="text-lg">No studios found</p>
      </div>
    );
  }

  return (
    <div className={cn(gridClass, className)}>
      {studios.map((s) => <StudioCard key={s.id} studio={s} />)}
    </div>
  );
}
