"use client";

// Home page - shows a random unwatched discovery feed, most watched, top rated scenes,
// popular tags, and top performers. All sections are fetched in parallel via Apollo.
// The Discover section prioritises unwatched scenes and only backfills with watched
// ones when there are not enough unwatched to fill the grid.

import { useQuery } from "@apollo/client/react";
import Link from "next/link";
import { TrendingUp, Shuffle, Star, Film, Video, Users, Clapperboard, Tag, HardDrive, Timer } from "lucide-react";
import { FIND_SCENES } from "@/lib/graphql/scene-queries";
import { FIND_PERFORMERS } from "@/lib/graphql/performer-queries";
import { FIND_TAGS } from "@/lib/graphql/tag-queries";
import { GET_STATS } from "@/lib/graphql/stats-queries";
import { SceneGrid } from "@/components/scene/SceneGrid";
import { PerformerCard } from "@/components/performer/PerformerCard";
import { TagBadge } from "@/components/tag/TagBadge";
import { formatFileSize, formatDuration } from "@/lib/utils";
import type { FindScenesResult, FindPerformersResult, FindTagsResult, StatsResult } from "@/types/stash";

const PAGE_SIZE = parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE ?? "60");

// Reusable section header with an icon, title, and a "View All" link.
function SectionHeader({ title, href, icon: Icon }: { title: string; href: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon size={18} style={{ color: "var(--primary)" }} />
        <h2 className="text-base font-bold uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
      </div>
      <Link
        href={href}
        className="text-xs font-semibold px-3 py-1 rounded transition-colors"
        style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
      >
        View All
      </Link>
    </div>
  );
}

export default function HomePage() {
  // Fetch a random selection of unwatched scenes (play_count = 0).
  const { data: unwatchedData, loading: unwatchedLoading } = useQuery<{ findScenes: FindScenesResult }>(FIND_SCENES, {
    variables: {
      filter: { sort: "random", per_page: PAGE_SIZE, page: 1 },
      scene_filter: { play_count: { value: 1, modifier: "LESS_THAN" } },
    },
  });

  // Always fetch a random selection of watched scenes in parallel so we can
  // backfill the Discover grid if there are fewer unwatched than PAGE_SIZE.
  const { data: watchedFillData, loading: watchedFillLoading } = useQuery<{ findScenes: FindScenesResult }>(FIND_SCENES, {
    variables: {
      filter: { sort: "random", per_page: PAGE_SIZE, page: 1 },
      scene_filter: { play_count: { value: 0, modifier: "GREATER_THAN" } },
    },
  });

  // Combine: fill with unwatched first, then append watched scenes only if needed.
  const unwatchedScenes = unwatchedData?.findScenes.scenes ?? [];
  const watchedScenes = watchedFillData?.findScenes.scenes ?? [];
  const discoverScenes =
    unwatchedScenes.length >= PAGE_SIZE
      ? unwatchedScenes.slice(0, PAGE_SIZE)
      : [...unwatchedScenes, ...watchedScenes.slice(0, PAGE_SIZE - unwatchedScenes.length)];
  // Show loading state while fetching; if we still need filler, wait for that too.
  const discoverLoading = unwatchedLoading || (unwatchedScenes.length < PAGE_SIZE && watchedFillLoading);

  const { data: popularData, loading: popularLoading } = useQuery<{ findScenes: FindScenesResult }>(FIND_SCENES, {
    variables: { filter: { sort: "play_count", direction: "DESC", per_page: 10, page: 1 } },
  });

  const { data: topRatedData, loading: topRatedLoading } = useQuery<{ findScenes: FindScenesResult }>(FIND_SCENES, {
    variables: {
      filter: { sort: "rating100", direction: "DESC", per_page: 10, page: 1 },
      scene_filter: { rating100: { value: 1, modifier: "GREATER_THAN" } },
    },
  });

  // Fetch a random selection of performers and tags for homepage discovery.
  const { data: performersData } = useQuery<{ findPerformers: FindPerformersResult }>(FIND_PERFORMERS, {
    variables: { filter: { sort: "random", per_page: 12, page: 1 } },
  });

  const { data: tagsData } = useQuery<{ findTags: FindTagsResult }>(FIND_TAGS, {
    variables: { filter: { sort: "random", per_page: 30, page: 1 } },
  });

  const { data: statsData } = useQuery<{ stats: StatsResult }>(GET_STATS);

  const stats = statsData?.stats;

  return (
    <div className="py-6">
      {/* Discover - random, unwatched-first */}
      <section className="mb-10">
        <SectionHeader title="Discover" href="/scenes?sort=random" icon={Shuffle} />
        <SceneGrid scenes={discoverScenes} loading={discoverLoading} />
      </section>

      {/* Most Watched */}
      {(popularData?.findScenes.scenes.length ?? 0) > 0 && (
        <section className="mb-10">
          <SectionHeader title="Most Watched" href="/scenes?sort=play_count&dir=DESC" icon={TrendingUp} />
          <SceneGrid scenes={popularData?.findScenes.scenes ?? []} loading={popularLoading} />
        </section>
      )}

      {/* Top Rated */}
      {(topRatedData?.findScenes.scenes.length ?? 0) > 0 && (
        <section className="mb-10">
          <SectionHeader title="Top Rated" href="/scenes?sort=rating100&dir=DESC" icon={Star} />
          <SceneGrid scenes={topRatedData?.findScenes.scenes ?? []} loading={topRatedLoading} />
        </section>
      )}

      {/* Tags - random selection */}
      {tagsData?.findTags.tags.length ? (
        <section className="mb-10">
          <SectionHeader title="Discover Tags" href="/tags" icon={Shuffle} />
          <div className="flex flex-wrap gap-2">
            {tagsData.findTags.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Performers - random selection */}
      {performersData?.findPerformers.performers.length ? (
        <section className="mb-10">
          <SectionHeader title="Discover Performers" href="/performers" icon={Shuffle} />
          <div className="grid gap-4 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
            {performersData.findPerformers.performers.map((p) => (
              <PerformerCard key={p.id} performer={p} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Stats banner */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 mb-8">
          {[
            { label: "Videos", value: stats.scene_count.toLocaleString(), icon: Video },
            { label: "Performers", value: stats.performer_count.toLocaleString(), icon: Users },
            { label: "Studios", value: stats.studio_count.toLocaleString(), icon: Clapperboard },
            { label: "Tags", value: stats.tag_count.toLocaleString(), icon: Tag },
            { label: "Total Size", value: formatFileSize(stats.scenes_size), icon: HardDrive },
            { label: "Total Duration", value: formatDuration(stats.scenes_duration), icon: Timer },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex flex-col gap-2 p-4 rounded-lg"
              style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-md"
                style={{ backgroundColor: "var(--primary-dim)" }}
              >
                <Icon size={15} style={{ color: "var(--primary)" }} />
              </div>
              <span className="text-xl font-bold leading-none" style={{ color: "var(--text-primary)" }}>
                {value}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
