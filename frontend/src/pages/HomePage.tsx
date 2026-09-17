// Home page - shows a random unwatched discovery feed, most watched, top rated
// scenes, popular tags, and top performers. All sections fetch in parallel via
// React Query. Discover prioritises unwatched scenes and only backfills with
// watched ones when there are not enough unwatched to fill the grid.

import { Link } from "react-router-dom";
import { TrendingUp, Shuffle, Star, Video, Users, Clapperboard, Tag, HardDrive, Timer } from "lucide-react";

import { SceneGrid } from "@/components/scene/SceneGrid";
import { PerformerCard } from "@/components/performer/PerformerCard";
import { TagBadge } from "@/components/tag/TagBadge";
import { formatFileSize, formatTotalDuration } from "@/lib/utils";
import { useConfig } from "@/contexts/ConfigContext";
import { usePerformers, useScenes, useStats, useTags } from "@/lib/queries";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

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
        to={href}
        className="text-xs font-semibold px-3 py-1 rounded transition-colors"
        style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
      >
        View All
      </Link>
    </div>
  );
}

export default function HomePage() {
  useDocumentTitle();
  const { pageSize } = useConfig();

  // Random unwatched scenes (play_count = 0).
  const { data: unwatchedData, isLoading: unwatchedLoading } = useScenes({
    sort: "random",
    per_page: pageSize,
    page: 1,
    played: false,
  });

  // Random watched scenes fetched in parallel to backfill the Discover grid.
  const { data: watchedFillData, isLoading: watchedFillLoading } = useScenes({
    sort: "random",
    per_page: pageSize,
    page: 1,
    played: true,
  });

  // Combine: fill with unwatched first, then append watched scenes only if needed.
  const unwatchedScenes = unwatchedData?.scenes ?? [];
  const watchedScenes = watchedFillData?.scenes ?? [];
  const discoverScenes =
    unwatchedScenes.length >= pageSize
      ? unwatchedScenes.slice(0, pageSize)
      : [...unwatchedScenes, ...watchedScenes.slice(0, pageSize - unwatchedScenes.length)];
  const discoverLoading = unwatchedLoading || (unwatchedScenes.length < pageSize && watchedFillLoading);

  const { data: popularData, isLoading: popularLoading } = useScenes({
    sort: "play_count",
    dir: "DESC",
    per_page: 10,
    page: 1,
  });

  const { data: topRatedData, isLoading: topRatedLoading } = useScenes({
    sort: "rating",
    dir: "DESC",
    per_page: 10,
    page: 1,
    min_rating: 1,
  });

  const { data: performersData } = usePerformers({ sort: "random", per_page: 12, page: 1 });
  const { data: tagsData } = useTags({ sort: "random", per_page: 30, page: 1 });
  const { data: stats } = useStats();

  return (
    <div className="py-6">
      {/* Discover - random, unwatched-first */}
      <section className="mb-10">
        <SectionHeader title="Discover" href="/scenes?sort=random" icon={Shuffle} />
        <SceneGrid scenes={discoverScenes} loading={discoverLoading} />
      </section>

      {/* Most Watched */}
      {(popularData?.scenes.length ?? 0) > 0 && (
        <section className="mb-10">
          <SectionHeader title="Most Watched" href="/scenes?sort=play_count&dir=DESC" icon={TrendingUp} />
          <SceneGrid scenes={popularData?.scenes ?? []} loading={popularLoading} />
        </section>
      )}

      {/* Top Rated */}
      {(topRatedData?.scenes.length ?? 0) > 0 && (
        <section className="mb-10">
          <SectionHeader title="Top Rated" href="/scenes?sort=rating&dir=DESC" icon={Star} />
          <SceneGrid scenes={topRatedData?.scenes ?? []} loading={topRatedLoading} />
        </section>
      )}

      {/* Tags - random selection */}
      {tagsData?.tags.length ? (
        <section className="mb-10">
          <SectionHeader title="Discover Tags" href="/tags" icon={Shuffle} />
          <div className="flex flex-wrap gap-2">
            {tagsData.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Performers - random selection */}
      {performersData?.performers.length ? (
        <section className="mb-10">
          <SectionHeader title="Discover Performers" href="/performers" icon={Shuffle} />
          <div className="grid gap-4 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
            {performersData.performers.map((p) => (
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
            { label: "Total Duration", value: formatTotalDuration(stats.scenes_duration), icon: Timer },
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
              <span className="text-xl font-bold leading-none whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
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
