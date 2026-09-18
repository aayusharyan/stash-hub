// Square tag tile that links to the tag detail page.
// Shows the tag image (or a fallback icon) with a gradient overlay for the name
// and video count.

import { useState } from "react";
import { Link } from "react-router-dom";
import { Tag as TagIcon } from "lucide-react";

import type { Tag } from "@/types/stash";
import { cn, toProxyUrl } from "@/lib/utils";

interface Props {
  tag: Tag;
  className?: string;
}

// Renders the tile, swapping to an icon if the image is missing or fails to load.
export function TagCard({ tag, className }: Props) {
  const [imgError, setImgError] = useState(false);
  const showImage = !!tag.image_path && !imgError;

  return (
    <Link
      to={`/tags/${tag.id}`}
      className={cn(
        "group relative flex items-end rounded overflow-hidden transition-transform hover:scale-105",
        className
      )}
      style={{ aspectRatio: "1/1", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}
    >
      {showImage ? (
        <img
          src={toProxyUrl(tag.image_path!)!}
          alt={tag.name}
          className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ color: "var(--text-muted)", opacity: 0.25 }}>
          <TagIcon size={40} />
        </div>
      )}
      <div className="relative w-full p-2" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)" }}>
        <p className="text-xs font-bold truncate" style={{ color: "white" }}>{tag.name}</p>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{tag.scene_count} videos</p>
      </div>
    </Link>
  );
}
