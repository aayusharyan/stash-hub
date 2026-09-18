// Responsive grid of TagCards with a shimmer skeleton loading state.
// Column count is driven by the global GridDensity from ViewContext.

import type { Tag } from "@/types/stash";
import { TagCard } from "./TagCard";
import { cn } from "@/lib/utils";
import { useView, TAG_GRID_CLASS } from "@/contexts/ViewContext";

interface Props {
  tags: Tag[];
  className?: string;
  loading?: boolean;
}

// Square placeholder matching TagCard proportions while tag data is fetching.
function SkeletonCard() {
  return (
    <div
      className="shimmer-container rounded overflow-hidden"
      style={{ aspectRatio: "1/1", border: "1px solid var(--border)" }}
    >
      <div className="shimmer shimmer-bg [--shimmer-x:0] [--shimmer-y:0] w-full h-full" />
    </div>
  );
}

// Renders skeletons, an empty state, or the populated grid depending on props.
export function TagGrid({ tags, className, loading }: Props) {
  const { gridDensity } = useView();
  const gridClass = TAG_GRID_CLASS[gridDensity];

  if (loading) {
    return (
      <div className={cn(gridClass, className)}>
        {Array.from({ length: 24 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!tags?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24" style={{ color: "var(--text-muted)" }}>
        <p className="text-lg">No tags found</p>
      </div>
    );
  }

  return (
    <div className={cn(gridClass, className)}>
      {tags.map((tag) => <TagCard key={tag.id} tag={tag} />)}
    </div>
  );
}
