"use client";

// Scene detail page. Fetches full scene metadata, renders the Plyr/HLS video player,
// interactive o_counter (like/dislike), scene markers, and a sidebar of related videos.
// Related videos primary source: same performer. Falls back to shared-tag matching when
// fewer than MIN_RELATED scenes are found via performer. Supports Normal and Cinema layout modes.

import { useQuery, useLazyQuery, useMutation } from "@apollo/client/react";
import { useParams } from "next/navigation";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Eye, Play, ExternalLink, ThumbsUp, ThumbsDown, Pencil, Star } from "lucide-react";
import { FIND_SCENE, FIND_SCENES, SCENE_INCREMENT_O, SCENE_DECREMENT_O, SCENE_ADD_PLAY, SCENE_UPDATE } from "@/lib/graphql/scene-queries";
import { VideoPlayer, type VideoPlayerHandle, type PlayerMode } from "@/components/scene/VideoPlayer";
import { SceneMarkers } from "@/components/scene/SceneMarkers";
import { SceneCard } from "@/components/scene/SceneCard";
import { TagBadge } from "@/components/tag/TagBadge";
import { formatDuration, formatFileSize, formatViews, getResolution, toProxyUrl, cn } from "@/lib/utils";
import { TimeAgo } from "@/components/ui/TimeAgo";
import type { Scene, FindScenesResult } from "@/types/stash";


// Interactive 5-star rating widget. Hovering previews the target rating; clicking commits it.
// `value` is 0–100 (Stash's rating100 scale); `onChange` receives the same scale.
// Clicking an already-selected star clears the rating (sets it to 0).
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

  // Convert rating100 (0–100) to whole stars (0–5).
  const stars = Math.round(value / 20);
  // The star count being previewed, or the committed value when not hovering.
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
            style={{ color: filled ? "#ffd700" : "var(--border)" }}
          >
            <Star size={20} fill={filled ? "#ffd700" : "none"} />
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

export default function ScenePage() {
  const { id } = useParams<{ id: string }>();
  const playerRef = useRef<VideoPlayerHandle>(null);
  const [playerMode, setPlayerMode] = useState<PlayerMode>("normal");
  // Ref mirror of playerMode used in the fullscreenchange listener to avoid stale closures.
  const playerModeRef = useRef<PlayerMode>("normal");
  // Stores the mode that was active before the user entered browser fullscreen.
  const prevModeRef = useRef<PlayerMode>("normal");

  // Keep the ref in sync with state so the fullscreenchange handler always reads the latest mode.
  useEffect(() => { playerModeRef.current = playerMode; }, [playerMode]);

  // Local o_counter state - initialized from the query result and kept in sync after mutations.
  const [oCount, setOCount] = useState<number | null>(null);

  // Local play_count updated optimistically when the mutation fires.
  const [playCount, setPlayCount] = useState<number | null>(null);

  // Local rating100 state - mirrors the server value and updated optimistically on save.
  const [rating100, setRating100] = useState<number | null>(null);

  const { data, loading, error } = useQuery<{ findScene: Scene }>(FIND_SCENE, {
    variables: { id },
  });

  // Sync local state from server data on first load.
  useEffect(() => {
    if (data?.findScene?.o_counter != null) {
      setOCount(data.findScene.o_counter);
    }
    if (data?.findScene?.play_count != null) {
      setPlayCount(data.findScene.play_count);
    }
    if (data?.findScene?.rating100 != null) {
      setRating100(data.findScene.rating100);
    }
  }, [data?.findScene?.o_counter, data?.findScene?.play_count, data?.findScene?.rating100]);

  const [incrementO, { loading: liking }] = useMutation<{ sceneIncrementO: number }>(SCENE_INCREMENT_O, {
    variables: { id },
    onCompleted: (res) => setOCount(res.sceneIncrementO),
  });

  const [decrementO, { loading: disliking }] = useMutation<{ sceneDecrementO: number }>(SCENE_DECREMENT_O, {
    variables: { id },
    onCompleted: (res) => setOCount(res.sceneDecrementO),
  });

  const [updateScene, { loading: savingRating }] = useMutation<
    { sceneUpdate: { id: string; rating100: number } },
    { input: { id: string; rating100: number } }
  >(SCENE_UPDATE, {
    onCompleted: (res) => setRating100(res.sceneUpdate.rating100),
  });

  // Applies the new star rating optimistically, then persists it to Stash.
  const handleRatingChange = useCallback(
    (newRating100: number) => {
      setRating100(newRating100);
      updateScene({ variables: { input: { id, rating100: newRating100 } } });
    },
    [id, updateScene],
  );

  // Fired at most once per page mount - when the video actually starts playing
  // for the first time. Optimistically bumps the displayed counter immediately.
  const [addPlay] = useMutation<{ sceneAddPlay: { count: number } }>(SCENE_ADD_PLAY, {
    variables: { id },
    onCompleted: (res) => setPlayCount(res.sceneAddPlay.count),
  });

  const handleFirstPlay = useCallback(() => {
    setPlayCount((prev) => (prev != null ? prev + 1 : prev));
    addPlay();
  }, [addPlay]);

  const scene = data?.findScene;

  // Minimum performer-matched scenes required before the tag-based fallback fires.
  const MIN_RELATED = 6;
  // How many scenes to fetch on every request (initial + load more).
  const PAGE_SIZE = 16;
  const LOAD_MORE_SIZE = 12;

  const firstPerformerId = scene?.performers?.[0]?.id;
  const { data: relatedByPerformer } = useQuery<{ findScenes: FindScenesResult }>(FIND_SCENES, {
    variables: firstPerformerId
      ? {
          filter: { per_page: PAGE_SIZE, sort: "date", direction: "DESC" },
          scene_filter: { performers: { value: [firstPerformerId], modifier: "INCLUDES" } },
        }
      : undefined,
    skip: !firstPerformerId,
  });

  const performerScenes = (relatedByPerformer?.findScenes.scenes ?? []).filter((s) => s.id !== id);

  // Stable array of tag IDs for the current scene.
  const tagIds = useMemo(() => scene?.tags?.map((t) => t.id) ?? [], [scene?.tags]);

  // Only fire the tag fallback after the performer query has returned and is still too small.
  const needsTagFallback = tagIds.length > 0 && (
    !firstPerformerId ||
    (relatedByPerformer !== undefined && performerScenes.length < MIN_RELATED)
  );
  const { data: relatedByTag } = useQuery<{ findScenes: FindScenesResult }>(FIND_SCENES, {
    variables: needsTagFallback
      ? {
          filter: { per_page: PAGE_SIZE, sort: "date", direction: "DESC" },
          // INCLUDES returns scenes sharing any of the tag IDs.
          scene_filter: { tags: { value: tagIds, modifier: "INCLUDES" } },
        }
      : undefined,
    skip: !needsTagFallback,
  });

  // Extra scenes appended by the "Load more" button.
  const [extraScenes, setExtraScenes] = useState<Scene[]>([]);
  const [loadMorePage, setLoadMorePage] = useState(2);
  const [hasMore, setHasMore] = useState(true);

  // The scene_filter used for both the initial query and load-more pagination.
  // Prefers performer; falls back to tags.
  const primarySceneFilter = useMemo(() => {
    if (firstPerformerId) return { performers: { value: [firstPerformerId], modifier: "INCLUDES" } };
    if (tagIds.length > 0) return { tags: { value: tagIds, modifier: "INCLUDES" } };
    return null;
  }, [firstPerformerId, tagIds]);

  const [fetchMoreScenes, { loading: loadingMore }] = useLazyQuery<{ findScenes: FindScenesResult }>(FIND_SCENES);

  // Merge performer + tag scenes + load-more extras; deduplicate and exclude the current scene.
  const relatedScenes = useMemo(() => {
    const seen = new Set<string>();
    const merged: Scene[] = [];
    for (const s of [
      ...performerScenes,
      ...(relatedByTag?.findScenes.scenes ?? []),
      ...extraScenes,
    ]) {
      if (s.id !== id && !seen.has(s.id)) {
        seen.add(s.id);
        merged.push(s);
      }
    }
    return merged;
  }, [performerScenes, relatedByTag, extraScenes, id]);

  // Fetches the next page of results and appends unique scenes to the list.
  const handleLoadMore = useCallback(async () => {
    if (!primarySceneFilter) return;
    const currentIds = new Set(relatedScenes.map((s) => s.id));
    const result = await fetchMoreScenes({
      variables: {
        filter: { per_page: LOAD_MORE_SIZE, page: loadMorePage, sort: "date", direction: "DESC" },
        scene_filter: primarySceneFilter,
      },
    });
    const raw = result.data?.findScenes.scenes ?? [];
    const fresh = raw.filter((s) => s.id !== id && !currentIds.has(s.id));
    setExtraScenes((prev) => [...prev, ...fresh]);
    setLoadMorePage((prev) => prev + 1);
    // If the server returned a full page, there may be more; otherwise we've reached the end.
    if (raw.length < LOAD_MORE_SIZE) setHasMore(false);
  }, [primarySceneFilter, relatedScenes, loadMorePage, fetchMoreScenes, id]);

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

  // Sync playerMode with the browser's native fullscreen state. This handles all
  // fullscreen entry/exit paths: Vidstack's button, the `f` shortcut, and Escape.
  // Uses refs to avoid stale-closure issues so the effect runs only once.
  useEffect(() => {
    function onFsChange() {
      if (document.fullscreenElement) {
        // Entering fullscreen - save current mode so we can restore it on exit.
        prevModeRef.current = playerModeRef.current;
        setPlayerMode("fullscreen");
      } else if (playerModeRef.current === "fullscreen") {
        // Exiting fullscreen - restore whichever mode was active before.
        setPlayerMode(prevModeRef.current === "fullscreen" ? "normal" : prevModeRef.current);
      }
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []); // intentionally empty - reads state exclusively through refs

  // Called only by the Normal / Cinema slot buttons inside VideoPlayer.
  // Exits browser fullscreen first if needed, then applies the requested layout mode.
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
        <Link href="/" style={{ color: "var(--primary)" }}>← Back to home</Link>
      </div>
    );
  }

  const file = scene.files?.[0];
  const resolution = getResolution(file?.width, file?.height);
  const duration = file?.duration ?? 0;
  const isCinema = playerMode === "cinema";

  // Shared scene info block rendered in the left/main column
  const sceneInfo = (
    <>
      <div className="flex items-start gap-2">
        <h1
          className="flex-1 text-lg md:text-xl font-bold leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {scene.title || `Scene ${scene.id}`}
        </h1>
        {/* Opens the scene's edit form directly in Stash */}
        <a
          href={`${process.env.NEXT_PUBLIC_STASH_EXTERNAL_URL}/scenes/${id}/edit`}
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
          <span
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{ backgroundColor: "var(--primary)", color: "black" }}
          >
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

      {/* Like / Dislike buttons tied to the Stash o_counter field */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => incrementO()}
          disabled={liking || disliking}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold transition-all disabled:opacity-50"
          style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          title="Like (increment o)"
        >
          <ThumbsUp size={15} />
        </button>

        <span
          className="text-sm font-bold tabular-nums min-w-[2ch] text-center"
          style={{ color: "var(--text-primary)" }}
        >
          {oCount ?? scene.o_counter ?? 0}
        </span>

        <button
          onClick={() => decrementO()}
          disabled={liking || disliking || (oCount ?? scene.o_counter ?? 0) <= 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold transition-all disabled:opacity-50"
          style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          title="Dislike (decrement o)"
        >
          <ThumbsDown size={15} />
        </button>
      </div>

      {/* Interactive star rating - always visible so users can set a rating even if none exists yet */}
      <div className="mt-3">
        <StarRating
          value={rating100 ?? scene.rating100 ?? 0}
          onChange={handleRatingChange}
          disabled={savingRating}
        />
      </div>

      <div className="my-4" style={{ borderBottom: "1px solid var(--border)" }} />

      {/* Studio + Performers */}
      <div className="flex flex-wrap gap-6">
        {scene.studio && (
          <div>
            <p className="text-xs uppercase font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Studio</p>
            <Link href={`/studios/${scene.studio.id}`} className="flex items-center gap-2 group">
              {scene.studio.image_path && (
                <Image
                  src={toProxyUrl(scene.studio.image_path)!}
                  alt={scene.studio.name}
                  width={40}
                  height={20}
                  className="object-contain rounded"
                  style={{ backgroundColor: "#111" }}
                  unoptimized
                />
              )}
              <span
                className="text-sm font-semibold group-hover:text-primary transition-colors"
                style={{ color: "var(--primary)" }}
              >
                {scene.studio.name}
              </span>
            </Link>
          </div>
        )}

        {scene.performers?.length > 0 && (
          <div>
            <p className="text-xs uppercase font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Performers</p>
            <div className="flex flex-wrap gap-3">
              {scene.performers.map((p) => (
                <Link key={p.id} href={`/performers/${p.id}`} className="flex items-center gap-2 group">
                  {p.image_path && (
                    <Image
                      src={toProxyUrl(p.image_path)!}
                      alt={p.name}
                      width={32}
                      height={32}
                      className="rounded-full object-cover object-top"
                      unoptimized
                    />
                  )}
                  <span
                    className="text-sm font-semibold group-hover:text-primary transition-colors"
                    style={{ color: "var(--text-primary)" }}
                  >
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
            { label: "Duration",   value: formatDuration(file.duration)  },
            { label: "Size",       value: formatFileSize(file.size)       },
            { label: "Video",      value: file.video_codec?.toUpperCase() },
            { label: "Audio",      value: file.audio_codec?.toUpperCase() },
            { label: "Bitrate",    value: file.bit_rate ? `${Math.round(file.bit_rate / 1000)} kbps` : undefined },
            { label: "FPS",        value: file.frame_rate ? `${Math.round(file.frame_rate)} fps` : undefined },
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
  // Cinema shows all scenes; normal shows everything after the sidebar 3.
  const gridScenes = isCinema ? relatedScenes : relatedScenes.slice(3);

  // Shared "Load more" button and grid, reused in both normal and cinema modes.
  const relatedGrid = gridScenes.length > 0 && (
    <section className="mt-8">
      <h3
        className="text-sm font-bold uppercase tracking-wide mb-4"
        style={{ color: "var(--text-secondary)" }}
      >
        More Like This
      </h3>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {gridScenes.map((s) => <SceneCard key={s.id} scene={s} />)}
      </div>
      {hasMore && primarySceneFilter && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-2 rounded text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </section>
  );

  // Single unified render tree so VideoPlayer always sits at the same position
  // in the component tree regardless of mode. Moving it would cause React to
  // unmount and remount the player, resetting playback and firing a fresh play
  // event that would incorrectly increment the play count.
  return (
    <div
      className={cn(
        "transition-colors duration-300",
        isCinema ? "bg-black" : "px-3 md:px-6 pt-4 pb-10"
      )}
    >
      {/* Flex row in normal mode (player + sidebar); single column in cinema mode. */}
      <div className={cn("flex flex-col gap-6", !isCinema && "lg:flex-row")}>

        {/* Left column - VideoPlayer is always the first child here so React never remounts it. */}
        <div className={cn(!isCinema && "flex-1 min-w-0")}>
          <VideoPlayer
            ref={playerRef}
            scene={scene}
            mode={playerMode}
            onModeChange={handleModeChange}
            onFirstPlay={handleFirstPlay}
          />
          <div
            className={cn(
              "mt-4",
              isCinema && "max-w-4xl px-3 md:px-6 pt-5"
            )}
          >
            {sceneInfo}
          </div>
        </div>

        {/* Right column: sticky sidebar with the top 3 related scenes, normal mode only. */}
        {!isCinema && sidebarScenes.length > 0 && (
          <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <div className="lg:sticky lg:top-4">
              <h3
                className="text-sm font-bold uppercase tracking-wide mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                Related Videos
              </h3>
              <div className="flex flex-col gap-3">
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
