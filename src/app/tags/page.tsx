"use client";

// Paginated, sortable tag grid. Each tag renders as an image tile with a gradient
// overlay. Sort and page are stored in URL params for shareability.

import { useQuery } from "@apollo/client/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Tag as TagIcon } from "lucide-react";
import { FIND_TAGS } from "@/lib/graphql/tag-queries";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { SortSelect } from "@/components/ui/SortSelect";
import type { FindTagsResult } from "@/types/stash";
import { toProxyUrl } from "@/lib/utils";

const PAGE_SIZE = parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE ?? "60");

const SORT_OPTIONS = [
  { value: "random", label: "Random" },
  { value: "scenes_count_DESC", label: "Most Videos" },
  { value: "name_ASC", label: "Name A-Z" },
  { value: "name_DESC", label: "Name Z-A" },
  { value: "performer_count_DESC", label: "Most Performers" },
];

// Individual tag card with its own image-error state so it can fall back to an icon.
function TagCard({ tag }: { tag: { id: string; name: string; scene_count: number; image_path?: string | null } }) {
  const [imgError, setImgError] = useState(false);
  const showImage = !!tag.image_path && !imgError;

  return (
    <Link
      href={`/tags/${tag.id}`}
      className="group relative flex items-end rounded overflow-hidden transition-transform hover:scale-105"
      style={{
        aspectRatio: "1/1",
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border)",
      }}
    >
      {showImage ? (
        <Image
          src={toProxyUrl(tag.image_path!)!}
          alt={tag.name}
          fill
          className="object-cover opacity-40 group-hover:opacity-60 transition-opacity"
          onError={() => setImgError(true)}
          unoptimized
        />
      ) : (
        // Fallback icon centered in the card when no image is available.
        <div className="absolute inset-0 flex items-center justify-center" style={{ color: "var(--text-muted)", opacity: 0.25 }}>
          <TagIcon size={40} />
        </div>
      )}
      <div className="relative w-full p-2" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)" }}>
        <p className="text-xs font-bold truncate" style={{ color: "white" }}>
          {tag.name}
        </p>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {tag.scene_count} videos
        </p>
      </div>
    </Link>
  );
}

// Inner component that reads URL params; must be wrapped in Suspense.
function TagsContent() {
  const router = useRouter();
  const params = useSearchParams();

  const sort = params.get("sort") ?? "scenes_count";
  const dir = (params.get("dir") ?? "DESC") as "ASC" | "DESC";
  const page = parseInt(params.get("page") ?? "1");
  // Random has no direction concept, so its option value is just "random".
  const sortKey = sort === "random" ? "random" : `${sort}_${dir}`;

  const { data, loading } = useQuery<{ findTags: FindTagsResult }>(FIND_TAGS, {
    variables: { filter: { sort, direction: dir, per_page: PAGE_SIZE, page } },
  });

  const total = data?.findTags.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function updateSort(value: string) {
    const p = new URLSearchParams(params.toString());
    p.delete("page");
    if (value === "random") {
      p.set("sort", "random");
      p.delete("dir");
    } else {
      const parts = value.split("_");
      const d = parts.pop()!;
      const s = parts.join("_");
      p.set("sort", s);
      p.set("dir", d);
    }
    router.push(`/tags?${p.toString()}`);
  }

  function setPage(p: number) {
    const q = new URLSearchParams(params.toString());
    q.set("page", String(p));
    router.push(`/tags?${q.toString()}`);
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Tags</h1>
          {total > 0 && <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{total.toLocaleString()} tags</p>}
        </div>
        <SortSelect value={sortKey} options={SORT_OPTIONS} onChange={updateSort} label="Sort" />
      </div>

      {loading ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded h-16" style={{ backgroundColor: "#2b2b2b" }} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {data?.findTags.tags.map((tag) => (
            <TagCard key={tag.id} tag={tag} />
          ))}
        </div>
      )}

      <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

export default function TagsPage() {
  return (
    <Suspense>
      <TagsContent />
    </Suspense>
  );
}
