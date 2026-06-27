"use client";

// Thumbnail card for a single scene. Shows a static screenshot at rest and
// switches to an animated webp or mp4 preview on hover/touch to mimic
// the behaviour of modern video-sharing platforms.

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import type { Scene } from "@/types/stash";
import { formatDuration, formatViews, getResolution, cn, toProxyUrl } from "@/lib/utils";
import { TimeAgo } from "@/components/ui/TimeAgo";

interface Props {
  scene: Scene;
  className?: string;
}

// Renders the card, choosing the correct media source based on hover state.
export function SceneCard({ scene, className }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  const file = scene.files?.[0];
  const duration = file?.duration ?? 0;
  const resolution = getResolution(file?.width, file?.height);
  // Static screenshot is always the resting thumbnail - animated webp must never
  // be the default because browsers autoplay it for every card on the page.
  const thumbnail = toProxyUrl(scene.paths?.screenshot);
  // Animated webp is preferred for hover; fall back to the mp4 preview clip.
  const hoverWebp = toProxyUrl(scene.paths?.webp);
  const hoverVideo = toProxyUrl(scene.paths?.preview);
  const title = scene.title || `Scene ${scene.id}`;
  const rating = scene.rating100 ? Math.round(scene.rating100) : null;

  const showPreview = hovered && (hoverWebp || hoverVideo);

  return (
    <Link
      href={`/scenes/${scene.id}`}
      className={cn("group block", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Touch devices have no hover events - toggle preview on touch start/end.
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
    >
      {/* Thumbnail */}
      {/* Ring highlight replaces the old dark overlay + play button on hover */}
      <div
        className="relative overflow-hidden rounded ring-0 group-hover:ring-2 ring-primary transition-all duration-200"
        style={{ aspectRatio: "16/9", backgroundColor: "#111" }}
      >
        {/* Static thumbnail always sits underneath so there's no flash on hover-out */}
        {!imgError && thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#444] text-3xl select-none">
            ▶
          </div>
        )}

        {/* Hover preview - mp4 clip is preferred (same quality as Stash's own UI);
            animated webp is only used when no mp4 preview has been generated. */}
        {showPreview && (
          hoverVideo ? (
            <video
              src={hoverVideo}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <Image
              src={hoverWebp!}
              alt={title}
              fill
              className="absolute inset-0 object-cover"
              unoptimized
            />
          )
        )}

        {/* Duration badge - hidden while previewing so the content stays clean */}
        {duration > 0 && (
          <span
            className="absolute bottom-1.5 right-1.5 text-xs font-bold px-1.5 py-0.5 rounded transition-opacity duration-200 group-hover:opacity-0"
            style={{ backgroundColor: "rgba(0,0,0,0.85)", color: "white" }}
          >
            {formatDuration(duration)}
          </span>
        )}

        {/* Resolution badge - hidden while previewing */}
        {resolution && (
          <span
            className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1 py-0.5 rounded transition-opacity duration-200 group-hover:opacity-0"
            style={{
              backgroundColor: resolution === "4K" || resolution === "HD" ? "var(--primary)" : "rgba(0,0,0,0.7)",
              color: resolution === "4K" || resolution === "HD" ? "black" : "white",
            }}
          >
            {resolution}
          </span>
        )}

        {/* Organized badge */}
        {scene.organized && (
          <span
            className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1 py-0.5 rounded"
            style={{ backgroundColor: "#00b300", color: "white" }}
          >
            ✓
          </span>
        )}
      </div>

      {/* Info */}
      <div className="mt-2 px-0.5">
        <h3
          className="text-sm font-semibold truncate leading-tight mb-1 group-hover:text-primary transition-colors"
          style={{ color: "var(--text-primary)" }}
          title={title}
        >
          {title}
        </h3>

        <div className="flex flex-col gap-0.5">
          {/* Studio - rendered as a span to avoid nesting <a> inside the card's <a> */}
          {scene.studio && (
            <span
              role="link"
              tabIndex={0}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/studios/${scene.studio!.id}`); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); router.push(`/studios/${scene.studio!.id}`); } }}
              className="text-xs font-semibold text-primary transition-colors hover:opacity-80 truncate block cursor-pointer"
              title={scene.studio.name}
            >
              {scene.studio.name}
            </span>
          )}

          {/* Performers */}
          {scene.performers?.length > 0 && (() => {
            const names = scene.performers.map((p) => p.name).join(", ");
            return (
              <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }} title={names}>
                {names}
              </p>
            );
          })()}

          {/* Meta row */}
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            {scene.play_count != null && (
              <span>{formatViews(scene.play_count)}</span>
            )}
            {scene.date && <TimeAgo date={scene.date} />}
            {rating && (
              <span className="flex items-center gap-0.5" style={{ color: "#ffd700" }}>
                <Star size={10} fill="#ffd700" />
                {(rating / 20).toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
