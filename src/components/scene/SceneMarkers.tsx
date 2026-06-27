"use client";

// Horizontal scrollable strip of clickable scene markers.
// Each marker shows a thumbnail screenshot and its timestamp; clicking it
// fires the onSeek callback so the video player jumps to that position.

import Image from "next/image";
import type { SceneMarker } from "@/types/stash";
import { formatDuration, toProxyUrl } from "@/lib/utils";

interface Props {
  markers: SceneMarker[];
  onSeek?: (seconds: number) => void;
}

// Returns null when there are no markers to avoid rendering an empty section.
export function SceneMarkers({ markers, onSeek }: Props) {
  if (!markers?.length) return null;

  return (
    <section className="mt-6">
      <h3 className="text-base font-bold mb-3" style={{ color: "var(--text-primary)" }}>
        Scene Markers
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {markers.map((marker) => (
          <button
            key={marker.id}
            onClick={() => onSeek?.(marker.seconds)}
            className="flex-shrink-0 w-32 text-left rounded overflow-hidden transition-transform hover:scale-105"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="relative" style={{ aspectRatio: "16/9" }}>
              <Image
                src={toProxyUrl(marker.screenshot)!}
                alt={marker.title}
                fill
                className="object-cover"
                unoptimized
              />
              <span
                className="absolute bottom-1 right-1 text-xs font-bold px-1 rounded"
                style={{ backgroundColor: "rgba(0,0,0,0.8)", color: "white" }}
              >
                {formatDuration(marker.seconds)}
              </span>
            </div>
            <p className="text-xs px-2 py-1.5 font-medium truncate" style={{ color: "var(--text-secondary)" }}>
              {marker.primary_tag?.name || marker.title}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
