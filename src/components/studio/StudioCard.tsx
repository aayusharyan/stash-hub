"use client";

// Studio logo card that links to the studio detail page.
// Shows the studio's image at a 16:7 aspect ratio with a text fallback
// when no image is available, and displays the video count below.

import Link from "next/link";
import Image from "next/image";
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

  return (
    <Link
      href={`/studios/${studio.id}`}
      className={cn(
        "group flex flex-col rounded overflow-hidden transition-transform hover:scale-105",
        className
      )}
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {/* Logo area */}
      <div
        className="relative flex items-center justify-center"
        style={{ aspectRatio: "16/7", backgroundColor: "#111" }}
      >
        {studio.image_path && !imgError ? (
          <Image
            src={toProxyUrl(studio.image_path)!}
            alt={studio.name}
            fill
            className="object-contain p-3"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <span className="text-lg font-bold text-center px-3" style={{ color: "#555" }}>
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
