// Responsive grid of SceneCards with an animated pulse skeleton loading state.
// Column count is driven by the global GridDensity from ViewContext.
// Renders an empty-state message when the scenes array is empty and not loading.

import type { Scene } from "@/types/stash";
import { SceneCard } from "./SceneCard";
import { cn } from "@/lib/utils";
import { useView, SCENE_GRID_CLASS } from "@/contexts/ViewContext";

interface Props {
  scenes: Scene[];
  className?: string;
  loading?: boolean;
}

// Placeholder card shown while data is fetching; matches the SceneCard layout.
function SkeletonCard() {
  return (
    <div className="block animate-pulse">
      <div className="rounded" style={{ aspectRatio: "16/9", backgroundColor: "#2b2b2b" }} />
      <div className="mt-2 space-y-1.5 px-0.5">
        <div className="h-3.5 rounded" style={{ backgroundColor: "#2b2b2b", width: "90%" }} />
        <div className="h-3 rounded" style={{ backgroundColor: "#2b2b2b", width: "60%" }} />
        <div className="h-3 rounded" style={{ backgroundColor: "#2b2b2b", width: "40%" }} />
      </div>
    </div>
  );
}

// Renders loading skeletons, the empty state, or the populated grid depending on props.
// The number of large-screen columns scales with the user's chosen GridDensity.
export function SceneGrid({ scenes, className, loading }: Props) {
  const { gridDensity } = useView();
  const gridClass = SCENE_GRID_CLASS[gridDensity];

  if (loading) {
    return (
      <div className={cn(gridClass, className)}>
        {Array.from({ length: 20 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!scenes?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24" style={{ color: "var(--text-muted)" }}>
        <p className="text-lg">No videos found</p>
        <p className="text-sm mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className={cn(gridClass, className)}>
      {scenes.map((scene) => (
        <SceneCard key={scene.id} scene={scene} />
      ))}
    </div>
  );
}
