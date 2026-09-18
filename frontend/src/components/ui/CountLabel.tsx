// Count subtitle under a page heading (e.g. "1,234 videos"). Shows a shimmer
// bar of matching size while the total is still loading.

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Animated placeholder sized like a typical "N items" subtitle.
export function CountSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("shimmer shimmer-bg h-3.5 w-28 rounded", className)}
      style={{ backgroundColor: "var(--bg-secondary)" }}
      aria-hidden
    />
  );
}

// Renders CountSkeleton while loading, otherwise the count text. Pass null
// children to hide the subtitle after load (empty result sets).
export function CountLabel({
  loading,
  children,
}: {
  loading: boolean;
  children?: ReactNode;
}) {
  if (loading) return <CountSkeleton className="mt-1.5" />;
  if (!children) return null;
  return (
    <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
      {children}
    </p>
  );
}
