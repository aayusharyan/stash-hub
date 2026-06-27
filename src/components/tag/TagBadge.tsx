import Link from "next/link";
import type { Tag } from "@/types/stash";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  tag: Tag;
  size?: "sm" | "md";
  className?: string;
}

// Renders a tag as a clickable badge that navigates to the tag detail page.
// Uses the shadcn Badge with the outline variant for a subtle bordered look.
export function TagBadge({ tag, size = "md", className }: Props) {
  return (
    <Badge
      variant="outline"
      render={<Link href={`/tags/${tag.id}`} />}
      className={cn(
        "cursor-pointer transition-opacity hover:opacity-80",
        size === "sm" ? "text-[10px] px-1.5 py-0 h-4" : "text-xs px-2.5 py-1 h-auto",
        className
      )}
    >
      {tag.name}
    </Badge>
  );
}
