"use client";

// Tag detail page. Shows the tag name, alias list, parent/child tag hierarchy,
// and a paginated grid of scenes tagged with it.

import { useQuery } from "@apollo/client/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Tag as TagIcon } from "lucide-react";
import { FIND_TAG } from "@/lib/graphql/tag-queries";
import { FIND_SCENES_BY_TAG } from "@/lib/graphql/scene-queries";
import { SceneGrid } from "@/components/scene/SceneGrid";
import { PaginationBar } from "@/components/ui/PaginationBar";
import type { Tag, FindScenesResult } from "@/types/stash";
import { toProxyUrl } from "@/lib/utils";

const PAGE_SIZE = parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE ?? "60");

export default function TagPage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const [imgError, setImgError] = useState(false);

  const { data: tagData, loading: tagLoading } = useQuery<{ findTag: Tag }>(FIND_TAG, {
    variables: { id },
  });

  const { data: scenesData, loading: scenesLoading } = useQuery<{ findScenes: FindScenesResult }>(FIND_SCENES_BY_TAG, {
    variables: { tag_id: id, page, per_page: PAGE_SIZE },
  });

  const tag = tagData?.findTag;
  const total = scenesData?.findScenes.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (tagLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--primary)" }} />
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="flex flex-col items-center justify-center h-96" style={{ color: "var(--text-muted)" }}>
        <p className="text-xl mb-2">Tag not found</p>
        <Link href="/tags" style={{ color: "var(--primary)" }}>← Back to tags</Link>
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
        {/* Tag logo box - shows the tag image or a fallback icon if none is set / fails to load */}
        <div
          className="flex-shrink-0 rounded flex items-center justify-center overflow-hidden"
          style={{
            width: 80,
            height: 80,
            backgroundColor: "#1a1a1a",
            border: "1px solid var(--border)",
          }}
        >
          {tag.image_path && !imgError ? (
            <Image
              src={toProxyUrl(tag.image_path)!}
              alt={tag.name}
              width={80}
              height={80}
              className="object-contain"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <TagIcon size={32} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            {tag.name}
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm" style={{ color: "var(--primary)" }}>
              {total.toLocaleString()} videos
            </span>
            {tag.performer_count != null && tag.performer_count > 0 && (
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                {tag.performer_count.toLocaleString()} performers
              </span>
            )}
          </div>
          {tag.aliases?.length > 0 && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Aliases: {tag.aliases.join(", ")}
            </p>
          )}
        </div>
      </div>
      </div>
      </div>

      <div className="py-6">
        {/* Parent / child tags */}
        {(tag.parents?.length > 0 || tag.children?.length > 0) && (
          <div className="flex flex-wrap gap-4 mb-6">
            {tag.parents?.length > 0 && (
              <div>
                <p className="text-xs uppercase font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Parent Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {tag.parents.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tags/${t.id}`}
                      className="text-xs px-2.5 py-1 rounded-full transition-colors"
                      style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                    >
                      {t.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {tag.children?.length > 0 && (
              <div>
                <p className="text-xs uppercase font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Sub-Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {tag.children.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tags/${t.id}`}
                      className="text-xs px-2.5 py-1 rounded-full transition-colors"
                      style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                    >
                      {t.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <SceneGrid scenes={scenesData?.findScenes.scenes ?? []} loading={scenesLoading} />
        <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
