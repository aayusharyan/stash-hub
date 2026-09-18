// Studio logo card that links to the studio detail page.
// Shows the studio's image at a 16:7 aspect ratio with a text fallback
// when no image is available, and displays the video count below.

import { Link } from "react-router-dom";
import { useState } from "react";
import type { Studio } from "@/types/stash";
import { cn, toProxyUrl } from "@/lib/utils";

interface Props {
  studio: Studio;
  className?: string;
}

// Renders the card with a slight scale-up on hover for visual feedback.
export function StudioCard({ studio, className }: Props) {
  const [imgError, setImgError] = useState(false);
  const showImage = !!studio.image_path && !imgError;

  return (
    <Link
      to={`/studios/${studio.id}`}
      className={cn(
        "group flex flex-col rounded overflow-hidden transition-transform hover:scale-105",
        className
      )}
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {/* Logo area: dark box while a logo is showing (logos are often light-on-dark),
          theme surface when falling back to the studio name. */}
      <div
        className="relative flex items-center justify-center"
        style={{
          aspectRatio: "16/7",
          backgroundColor: showImage ? "#111" : "var(--bg-secondary)",
        }}
      >
        {showImage ? (
          <img
            src={toProxyUrl(studio.image_path)!}
            alt={studio.name}
            className="absolute inset-0 w-full h-full object-contain p-3"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-lg font-bold text-center px-3" style={{ color: "var(--text-muted)" }}>
            {studio.name}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <h3
          className="text-sm font-semibold truncate group-hover:text-primary transition-colors"
          style={{ color: "var(--text-primary)" }}
        >
          {studio.name}
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {studio.scene_count} videos
          {studio.parent_studio && ` · ${studio.parent_studio.name}`}
        </p>
      </div>
    </Link>
  );
}
