"use client";

// Studio detail page. Shows the studio logo, metadata, sub-studios, tags,
// and a paginated grid of the studio's scenes.

import { useQuery } from "@apollo/client/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Star, Pencil } from "lucide-react";
import { FIND_STUDIO } from "@/lib/graphql/studio-queries";
import { FIND_SCENES_BY_STUDIO } from "@/lib/graphql/scene-queries";
import { SceneGrid } from "@/components/scene/SceneGrid";
import { TagBadge } from "@/components/tag/TagBadge";
import { PaginationBar } from "@/components/ui/PaginationBar";
import type { Studio, FindScenesResult } from "@/types/stash";
import { toProxyUrl } from "@/lib/utils";

const PAGE_SIZE = parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE ?? "60");

export default function StudioPage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const [imgError, setImgError] = useState(false);

  const { data: studioData, loading: studioLoading } = useQuery<{ findStudio: Studio }>(FIND_STUDIO, {
    variables: { id },
  });

  const { data: scenesData, loading: scenesLoading } = useQuery<{ findScenes: FindScenesResult }>(FIND_SCENES_BY_STUDIO, {
    variables: { studio_id: id, page, per_page: PAGE_SIZE },
  });

  const studio = studioData?.findStudio;
  const total = scenesData?.findScenes.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (studioLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--primary)" }} />
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="flex flex-col items-center justify-center h-96" style={{ color: "var(--text-muted)" }}>
        <p className="text-xl mb-2">Studio not found</p>
        <Link href="/studios" style={{ color: "var(--primary)" }}>← Back to studios</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Full-bleed gradient header */}
      <div
        style={{
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          width: "100vw",
          background: "linear-gradient(to bottom, #111 0%, var(--bg-primary) 100%)",
          minHeight: 200,
        }}
      >
      <div className="mx-auto w-full max-w-screen-2xl px-3 md:px-6">
      <div className="py-8 flex flex-col sm:flex-row items-start gap-6">
        {/* Logo */}
        <div
          className="flex-shrink-0 rounded flex items-center justify-center overflow-hidden"
          style={{
            width: 160,
            height: 80,
            backgroundColor: "#1a1a1a",
            border: "1px solid var(--border)",
          }}
        >
          {studio.image_path && !imgError ? (
            <Image
              src={toProxyUrl(studio.image_path)!}
              alt={studio.name}
              width={160}
              height={80}
              className="object-contain"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <span className="text-sm font-bold text-center px-2" style={{ color: "#555" }}>
              {studio.name}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              {studio.name}
            </h1>
            {/* Opens the studio's edit form directly in Stash */}
            <a
              href={`${process.env.NEXT_PUBLIC_STASH_EXTERNAL_URL}/studios/${id}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              title="Edit in Stash"
              className="flex items-center justify-center rounded p-1 transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              <Pencil size={16} />
            </a>
          </div>

          {studio.aliases?.length > 0 && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Also known as: {studio.aliases.join(", ")}
            </p>
          )}

          {studio.parent_studio && (
            <p className="mt-1 text-sm">
              <span style={{ color: "var(--text-muted)" }}>Part of: </span>
              <Link href={`/studios/${studio.parent_studio.id}`} style={{ color: "var(--primary)" }}>
                {studio.parent_studio.name}
              </Link>
            </p>
          )}

          <div className="flex items-center gap-4 mt-3">
            <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>
              {total.toLocaleString()} videos
            </span>
            {studio.rating100 != null && (
              <span className="flex items-center gap-1 text-sm" style={{ color: "#ffd700" }}>
                <Star size={14} fill="#ffd700" />
                {(studio.rating100 / 20).toFixed(1)}
              </span>
            )}
            {studio.url && (
              <a
                href={studio.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm"
                style={{ color: "var(--primary)" }}
              >
                <ExternalLink size={14} /> Website
              </a>
            )}
          </div>

          {studio.details && (
            <p className="mt-3 text-sm leading-relaxed max-w-2xl" style={{ color: "var(--text-secondary)" }}>
              {studio.details}
            </p>
          )}
        </div>
      </div>
      </div>
      </div>

      <div className="py-6">
        {/* Child studios */}
        {studio.child_studios?.length > 0 && (
          <section className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
              Sub-Studios
            </h3>
            <div className="flex flex-wrap gap-2">
              {studio.child_studios.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/studios/${sub.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded transition-colors"
                  style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                >
                  {sub.image_path && (
                    <Image src={toProxyUrl(sub.image_path)!} alt={sub.name} width={32} height={16} className="object-contain" unoptimized />
                  )}
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{sub.name}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>({sub.scene_count})</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Tags */}
        {studio.tags?.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {studio.tags.map((t) => <TagBadge key={t.id} tag={t} size="sm" />)}
            </div>
          </div>
        )}

        {/* Scenes */}
        <h2 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          Videos ({total.toLocaleString()})
        </h2>
        <SceneGrid scenes={scenesData?.findScenes.scenes ?? []} loading={scenesLoading} />
        <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
