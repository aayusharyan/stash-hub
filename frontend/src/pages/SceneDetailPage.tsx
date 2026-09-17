// Scene detail page. Fetches full scene metadata, renders the Vidstack video
// player, star rating, scene markers, and a sidebar/grid of related videos.
// Related videos come from the same performer first, falling back to shared-tag
// matching when too few are found. Supports Normal and Cinema modes. Both the
// related sidebar and the "More Like This" grid follow the global grid density.

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Calendar, Eye, Play, ExternalLink, Pencil, Star } from "lucide-react";

import { VideoPlayer, type VideoPlayerHandle, type PlayerMode } from "@/components/scene/VideoPlayer";
import { SceneMarkers } from "@/components/scene/SceneMarkers";
import { SceneCard } from "@/components/scene/SceneCard";
import { SceneGrid } from "@/components/scene/SceneGrid";
import { TagBadge } from "@/components/tag/TagBadge";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { formatDuration, formatFileSize, formatViews, getResolution, toProxyUrl, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useConfig } from "@/contexts/ConfigContext";
import { useView, SCENE_GRID_CLASS, type GridDensity } from "@/contexts/ViewContext";
import { useAddPlay, useRateScene, useScene, useScenes } from "@/lib/queries";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import type { Scene } from "@/types/stash";

// Compact studio credit. Custom logos render in the box; Stash's default
// placeholder URLs (`default=true`) and load failures fall back to the name.
function StudioCredit({
  id,
  name,
  imagePath,
}: {
  id: string;
  name: string;
  imagePath?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const hasCustomLogo = !!imagePath && !imagePath.includes("default=true") && !imgError;

  return (
    <Link to={`/studios/${id}`} className="flex items-center gap-2 group">
      <div
        className="flex-shrink-0 rounded flex items-center justify-center overflow-hidden"
        style={{
          width: 112,
          height: 48,
          backgroundColor: hasCustomLogo ? "#1a1a1a" : "var(--bg-secondary)",
          border: "1px solid var(--border)",
        }}
      >
        {hasCustomLogo ? (
          <img
            src={toProxyUrl(imagePath)!}
            alt={name}
            className="max-w-full max-h-full object-contain p-1"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-xs font-bold text-center px-2 leading-tight" style={{ color: "var(--text-muted)" }}>
            {name}
          </span>
        )}
      </div>
      <span className="text-sm font-semibold group-hover:text-primary transition-colors" style={{ color: "var(--primary)" }}>
        {name}
      </span>
    </Link>
  );
}

// Interactive 5-star rating widget. Hovering previews the target rating; clicking
// commits it. `value` is 0-100 (Stash's rating100 scale). Clicking an already
// selected star clears the rating (sets it to 0).
// Outlined stars always render all 5 slots; filled stars overlay the earned count.
function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (rating100: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const stars = Math.round(value / 20);
  const display = hovered ?? stars;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= display;
        return (
          <button
            key={star}
            disabled={disabled}
            onMouseEnter={() => setHovered(star)}
            onClick={() => {
              // Clicking the current rating clears it.
              onChange(star === stars ? 0 : star * 20);
            }}
            className="p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed"
            title={`Rate ${star} star${star !== 1 ? "s" : ""}`}
            style={{ color: "var(--text-muted)" }}
          >
            <span className="relative inline-flex">
              <Star size={20} fill="none" />
              {filled && (
                <Star
                  size={20}
                  fill="#ffd700"
                  stroke="#ffd700"
                  className="absolute inset-0"
                  aria-hidden
                />
              )}
            </span>
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-1 text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
          {(value / 20).toFixed(1)}
        </span>
      )}
    </div>
  );
}

// Minimum performer-matched scenes required before the tag-based fallback fires.
const MIN_RELATED = 6;
// How many scenes to fetch per related request.
const RELATED_PAGE_SIZE = 16;
const LOAD_MORE_SIZE = 12;

// Desktop sidebar width tracks grid density so related cards grow/shrink with the setting.
const SIDEBAR_WIDTH: Record<GridDensity, string> = {
  1: "lg:w-[28rem] xl:w-[32rem]",
  2: "lg:w-96 xl:w-[28rem]",
  3: "lg:w-80 xl:w-96",
  4: "lg:w-72 xl:w-80",
  5: "lg:w-64 xl:w-72",
};

export default function SceneDetailPage() {
  const { id = "" } = useParams();
  const { externalUrl } = useConfig();
  const { gridDensity } = useView();
  const playerRef = useRef<VideoPlayerHandle>(null);
  const [playerMode, setPlayerMode] = useState<PlayerMode>("normal");
  // Ref mirror of playerMode used in the fullscreenchange listener to avoid stale closures.
  const playerModeRef = useRef<PlayerMode>("normal");
  // Stores the mode active before the user entered browser fullscreen.
  const prevModeRef = useRef<PlayerMode>("normal");

  useEffect(() => { playerModeRef.current = playerMode; }, [playerMode]);

  // Local optimistic state initialised from the server result.
  const [playCount, setPlayCount] = useState<number | null>(null);
  const [rating100, setRating100] = useState<number | null>(null);

  const { data: scene, isLoading: loading, error } = useScene(id);

  useDocumentTitle(scene?.title || (scene ? `Scene ${scene.id}` : undefined));

  // Sync local state from server data on first load / when it changes.
  useEffect(() => {
    if (scene?.play_count != null) setPlayCount(scene.play_count);
    if (scene?.rating100 != null) setRating100(scene.rating100);
  }, [scene?.play_count, scene?.rating100]);

  const updateScene = useRateScene();
  const addPlay = useAddPlay();

  const savingRating = updateScene.isPending;

  // Applies the new star rating optimistically, then persists it.
  const handleRatingChange = useCallback(
    (newRating100: number) => {
      setRating100(newRating100);
      updateScene.mutate(
        { id, rating100: newRating100 },
        { onSuccess: (res) => setRating100(res.rating100) },
      );
    },
    [id, updateScene],
  );

  // Fired at most once per mount when playback first starts.
  const handleFirstPlay = useCallback(() => {
    setPlayCount((prev) => (prev != null ? prev + 1 : prev));
    addPlay.mutate(id, { onSuccess: (res) => setPlayCount(res.count) });
  }, [addPlay, id]);

  const firstPerformerId = scene?.performers?.[0]?.id;
  const relatedByPerformer = useScenes(
    { performer_id: firstPerformerId, per_page: RELATED_PAGE_SIZE, sort: "date", dir: "DESC" },
    { enabled: !!firstPerformerId },
  );

  const performerScenes = (relatedByPerformer.data?.scenes ?? []).filter((s) => s.id !== id);

  const tagIds = useMemo(() => scene?.tags?.map((t) => t.id) ?? [], [scene?.tags]);

  // Only fire the tag fallback after the performer query has resolved and is still too small.
  const needsTagFallback =
    tagIds.length > 0 &&
    (!firstPerformerId || (relatedByPerformer.isSuccess && performerScenes.length < MIN_RELATED));

  const relatedByTag = useScenes(
    { tags: tagIds.join(","), per_page: RELATED_PAGE_SIZE, sort: "date", dir: "DESC" },
    { enabled: needsTagFallback },
  );

  // Extra scenes appended by the "Load more" button.
  const [extraScenes, setExtraScenes] = useState<Scene[]>([]);
  const [loadMorePage, setLoadMorePage] = useState(2);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // The params used for both the initial query and load-more pagination.
  // Prefers performer; falls back to tags.
  const primaryParams = useMemo(() => {
    if (firstPerformerId) return { performer_id: firstPerformerId };
    if (tagIds.length > 0) return { tags: tagIds.join(",") };
    return null;
  }, [firstPerformerId, tagIds]);

  // Merge performer + tag scenes + load-more extras; deduplicate and exclude current.
  const relatedScenes = useMemo(() => {
    const seen = new Set<string>();
    const merged: Scene[] = [];
    for (const s of [...performerScenes, ...(relatedByTag.data?.scenes ?? []), ...extraScenes]) {
      if (s.id !== id && !seen.has(s.id)) {
        seen.add(s.id);
        merged.push(s);
      }
    }
    return merged;
  }, [performerScenes, relatedByTag.data, extraScenes, id]);

  // Fetches the next page of results and appends unique scenes to the list.
  const handleLoadMore = useCallback(async () => {
    if (!primaryParams) return;
    setLoadingMore(true);
    try {
      const currentIds = new Set(relatedScenes.map((s) => s.id));
      const result = await api.scenes({
        ...primaryParams,
        per_page: LOAD_MORE_SIZE,
        page: loadMorePage,
        sort: "date",
        dir: "DESC",
      });
      const raw = result.scenes ?? [];
      const fresh = raw.filter((s) => s.id !== id && !currentIds.has(s.id));
      setExtraScenes((prev) => [...prev, ...fresh]);
      setLoadMorePage((prev) => prev + 1);
      if (raw.length < LOAD_MORE_SIZE) setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [primaryParams, relatedScenes, loadMorePage, id]);

  // Darken the page body in cinema mode.
  useEffect(() => {
    const body = document.body;
    if (playerMode === "cinema") {
      body.style.backgroundColor = "#000";
    } else {
      body.style.backgroundColor = "";
    }
    return () => { body.style.backgroundColor = ""; };
  }, [playerMode]);

  // Sync playerMode with the browser's native fullscreen state, covering the
  // Vidstack button, the `f` shortcut, and Escape. Uses refs to run only once.
  useEffect(() => {
    function onFsChange() {
      if (document.fullscreenElement) {
        prevModeRef.current = playerModeRef.current;
        setPlayerMode("fullscreen");
      } else if (playerModeRef.current === "fullscreen") {
        setPlayerMode(prevModeRef.current === "fullscreen" ? "normal" : prevModeRef.current);
      }
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Called only by the Normal / Cinema slot buttons inside VideoPlayer.
  const handleModeChange = useCallback((next: PlayerMode) => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setPlayerMode(next);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--primary)" }} />
      </div>
    );
  }

  if (error || !scene) {
    return (
      <div className="flex flex-col items-center justify-center h-96" style={{ color: "var(--text-muted)" }}>
        <p className="text-xl mb-2">Scene not found</p>
        <Link to="/" style={{ color: "var(--primary)" }}>← Back to home</Link>
      </div>
    );
  }

  const file = scene.files?.[0];
  const resolution = getResolution(file?.width, file?.height);
  const duration = file?.duration ?? 0;
  const isCinema = playerMode === "cinema";

  const sceneInfo = (
    <>
      <div className="flex items-start gap-2">
        <h1 className="flex-1 text-lg md:text-xl font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
          {scene.title || `Scene ${scene.id}`}
        </h1>
        {/* Opens the scene's edit form directly in Stash */}
        <a
          href={`${externalUrl}/scenes/${id}/edit`}
          target="_blank"
          rel="noopener noreferrer"
          title="Edit in Stash"
          className="flex items-center justify-center rounded p-1 flex-shrink-0 mt-0.5 transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <Pencil size={15} />
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-2">
        {playCount != null && (
          <span className="flex items-center gap-1 text-sm" style={{ color: "var(--text-muted)" }}>
            <Eye size={14} /> {formatViews(playCount)}
          </span>
        )}
        {scene.date && (
          <span className="flex items-center gap-1 text-sm" style={{ color: "var(--text-muted)" }}>
            <Calendar size={14} /> <TimeAgo date={scene.date} />
          </span>
        )}
        {resolution && (
          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: "var(--primary)", color: "black" }}>
            {resolution}
          </span>
        )}
        {duration > 0 && (
          <span className="flex items-center gap-1 text-sm" style={{ color: "var(--text-muted)" }}>
            <Play size={14} /> {formatDuration(duration)}
          </span>
        )}
        {file?.size && (
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            {formatFileSize(file.size)}
          </span>
        )}
      </div>

      {/* Interactive star rating - always visible */}
      <div className="mt-3">
        <StarRating value={rating100 ?? scene.rating100 ?? 0} onChange={handleRatingChange} disabled={savingRating} />
      </div>

      <div className="my-4" style={{ borderBottom: "1px solid var(--border)" }} />

      {/* Studio + Performers */}
      <div className="flex flex-wrap gap-6">
        {scene.studio && (
          <div>
            <p className="text-xs uppercase font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Studio</p>
            <StudioCredit
              key={scene.studio.id}
              id={scene.studio.id}
              name={scene.studio.name}
              imagePath={scene.studio.image_path}
            />
          </div>
        )}

        {scene.performers?.length > 0 && (
          <div>
            <p className="text-xs uppercase font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Performers</p>
            <div className="flex flex-wrap gap-3">
              {scene.performers.map((p) => (
                <Link key={p.id} to={`/performers/${p.id}`} className="flex items-center gap-2 group">
                  {p.image_path && (
                    <img
                      src={toProxyUrl(p.image_path)!}
                      alt={p.name}
                      width={32}
                      height={32}
                      className="rounded-full object-cover object-top"
                      style={{ width: 32, height: 32 }}
                    />
                  )}
                  <span className="text-sm font-semibold group-hover:text-primary transition-colors" style={{ color: "var(--text-primary)" }}>
                    {p.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      {scene.tags?.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Tags</p>
          <div className="flex flex-wrap gap-2">
            {scene.tags.map((tag) => <TagBadge key={tag.id} tag={tag} size="sm" />)}
          </div>
        </div>
      )}

      {/* Description */}
      {scene.details && (
        <div className="mt-5">
          <p className="text-xs uppercase font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Description</p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {scene.details}
          </p>
        </div>
      )}

      {/* External link */}
      {scene.url && (
        <div className="mt-4">
          <a
            href={scene.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm"
            style={{ color: "var(--primary)" }}
          >
            <ExternalLink size={14} /> Source URL
          </a>
        </div>
      )}

      {/* File technical info */}
      {file && (
        <div
          className="mt-5 p-3 rounded text-xs grid grid-cols-2 sm:grid-cols-3 gap-2"
          style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          {[
            { label: "Resolution", value: `${file.width}×${file.height}` },
            { label: "Duration", value: formatDuration(file.duration) },
            { label: "Size", value: formatFileSize(file.size) },
            { label: "Video", value: file.video_codec?.toUpperCase() },
            { label: "Audio", value: file.audio_codec?.toUpperCase() },
            { label: "Bitrate", value: file.bit_rate ? `${Math.round(file.bit_rate / 1000)} kbps` : undefined },
            { label: "FPS", value: file.frame_rate ? `${Math.round(file.frame_rate)} fps` : undefined },
          ]
            .filter((i) => i.value)
            .map(({ label, value }) => (
              <div key={label}>
                <span style={{ color: "var(--text-muted)" }}>{label}: </span>
                <span style={{ color: "var(--text-primary)" }}>{value}</span>
              </div>
            ))}
        </div>
      )}

      <SceneMarkers
        markers={scene.scene_markers ?? []}
        onSeek={(seconds) => playerRef.current?.seekTo(seconds)}
      />
    </>
  );

  // In normal mode: first 3 in the sidebar, the rest in the full-width grid.
  const sidebarScenes = relatedScenes.slice(0, 3);
  const gridScenes = isCinema ? relatedScenes : relatedScenes.slice(3);

  const relatedGrid = gridScenes.length > 0 && (
    <section className="mt-8">
      <h3 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: "var(--text-secondary)" }}>
        More Like This
      </h3>
      <SceneGrid scenes={gridScenes} />
      {hasMore && primaryParams && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-2 rounded text-sm font-semibold transition-all disabled:opacity-50"
            style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </section>
  );

  // Single unified render tree so VideoPlayer always sits at the same tree
  // position regardless of mode, preventing an unmount/remount that would reset
  // playback and fire a spurious play event.
  return (
    <div className={cn("transition-colors duration-300", isCinema ? "bg-black" : "px-3 md:px-6 pt-4 pb-10")}>
      <div className={cn("flex flex-col gap-6", !isCinema && "lg:flex-row")}>
        {/* Left column - VideoPlayer is always the first child so React never remounts it. */}
        <div className={cn(!isCinema && "flex-1 min-w-0")}>
          <VideoPlayer
            ref={playerRef}
            scene={scene}
            mode={playerMode}
            onModeChange={handleModeChange}
            onFirstPlay={handleFirstPlay}
          />
          <div className={cn("mt-4", isCinema && "max-w-4xl px-3 md:px-6 pt-5")}>
            {sceneInfo}
          </div>
        </div>

        {/* Right column: sticky sidebar with the top 3 related scenes, normal mode only. */}
        {!isCinema && sidebarScenes.length > 0 && (
          <aside className={cn("w-full flex-shrink-0", SIDEBAR_WIDTH[gridDensity])}>
            <div className="lg:sticky lg:top-4">
              <h3 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: "var(--text-secondary)" }}>
                Related Videos
              </h3>
              {/* Density-aware grid on small screens; stacked list in the narrow desktop sidebar. */}
              <div className={cn(SCENE_GRID_CLASS[gridDensity], "lg:flex lg:flex-col lg:gap-3")}>
                {sidebarScenes.map((s) => <SceneCard key={s.id} scene={s} />)}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Full-width related grid below; extra padding closes out the cinema layout. */}
      <div className={cn(isCinema && "px-3 md:px-6 pb-10")}>
        {relatedGrid}
      </div>
    </div>
  );
}
