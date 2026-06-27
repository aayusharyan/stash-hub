"use client";

// Performer avatar card linking to the performer's detail page.
// Displays a portrait image (or a letter fallback), a favorite heart icon,
// and a hover overlay showing the video count.

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Heart } from "lucide-react";
import type { Performer } from "@/types/stash";
import { genderLabel, cn, toProxyUrl } from "@/lib/utils";

interface Props {
  performer: Performer;
  className?: string;
}

// Renders the card, falling back to an initial letter when the image is unavailable.
export function PerformerCard({ performer, className }: Props) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link href={`/performers/${performer.id}`} className={cn("group block text-center", className)}>
      {/* Avatar */}
      <div
        className="relative mx-auto rounded-full overflow-hidden transition-transform duration-200 group-hover:scale-105"
        style={{
          width: "100%",
          aspectRatio: "2/3",
          backgroundColor: "#1a1a1a",
          borderRadius: "8px",
          border: "2px solid var(--border)",
        }}
      >
        {performer.image_path && !imgError ? (
          <Image
            src={toProxyUrl(performer.image_path)!}
            alt={performer.name}
            fill
            className="object-cover object-top"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-4xl font-bold"
            style={{ color: "#444", backgroundColor: "#1a1a1a" }}
          >
            {performer.name.charAt(0).toUpperCase()}
          </div>
        )}

        {performer.favorite && (
          <div className="absolute top-2 right-2">
            <Heart size={14} fill="var(--primary)" color="var(--primary)" />
          </div>
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)" }}
        >
          <div className="w-full p-2">
            <p className="text-xs font-semibold text-primary">
              {performer.scene_count} videos
            </p>
          </div>
        </div>
      </div>

      {/* Name */}
      <div className="mt-2">
        <h3
          className="text-sm font-semibold truncate group-hover:text-primary transition-colors"
          style={{ color: "var(--text-primary)" }}
        >
          {performer.name}
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {genderLabel(performer.gender)} · {performer.scene_count} videos
        </p>
      </div>
    </Link>
  );
}
