"use client";

// Video player built on Vidstack. Handles HLS and plain video streams,
// VTT thumbnail previews, custom keybindings (f=fullscreen, k/space=play,
// j/l=seek, m=mute), and the Normal/Cinema/Fullscreen resize overlay.

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Monitor, RectangleHorizontal, Maximize } from "lucide-react";
import {
  MediaPlayer,
  MediaProvider,
  Poster,
  type MediaPlayerInstance,
} from "@vidstack/react";
import { DefaultVideoLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import type { Scene } from "@/types/stash";
import { sceneStreamUrl, toProxyUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type PlayerMode = "normal" | "cinema" | "fullscreen";

export interface VideoPlayerHandle {
  requestFullscreen: () => void;
  seekTo: (seconds: number) => void;
}

interface Props {
  scene: Scene;
  mode: PlayerMode;
  onModeChange: (m: PlayerMode) => void;
  // Called at most once per mount - on the very first play event, not on pause/resume.
  onFirstPlay?: () => void;
}

const MODE_BUTTONS: { id: PlayerMode; icon: React.ElementType; label: string }[] = [
  { id: "normal",     icon: Monitor,             label: "Normal view" },
  { id: "cinema",     icon: RectangleHorizontal, label: "Cinema mode" },
  { id: "fullscreen", icon: Maximize,            label: "Fullscreen"  },
];

export const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(function VideoPlayer(
  { scene, mode, onModeChange, onFirstPlay },
  ref
) {
  const playerRef = useRef<MediaPlayerInstance>(null);
  // Flipped to true after the first play event so subsequent play events (after
  // pause) don't re-trigger the callback. Reset when the stream URL changes.
  const hasPlayedRef = useRef(false);

  const streamUrl = toProxyUrl(scene.paths?.stream) ?? sceneStreamUrl(scene.id);
  const vttUrl    = toProxyUrl(scene.paths?.vtt);
  const posterUrl = toProxyUrl(scene.paths?.screenshot) ?? undefined;

  // Reset the first-play guard whenever we switch to a different scene's stream.
  useEffect(() => {
    hasPlayedRef.current = false;
  }, [streamUrl]);

  // Expose requestFullscreen and seekTo so the parent page can trigger them imperatively.
  useImperativeHandle(ref, () => ({
    requestFullscreen() {
      playerRef.current?.enterFullscreen();
    },
    seekTo(seconds: number) {
      if (playerRef.current) {
        playerRef.current.currentTime = seconds;
        playerRef.current.paused && playerRef.current.play();
      }
    },
  }));

  // Fire onFirstPlay only once - on the very first play, not on resume after pause.
  const handlePlay = useCallback(() => {
    if (!hasPlayedRef.current) {
      hasPlayedRef.current = true;
      onFirstPlay?.();
    }
  }, [onFirstPlay]);

  return (
    // `group` enables the child hover utilities for the resize overlay.
    <div className="relative w-full group" style={{ backgroundColor: "#000" }}>
      <MediaPlayer
        ref={playerRef}
        src={streamUrl}
        crossOrigin
        playsInline
        onPlay={handlePlay}
        keyTarget="player"
        keyShortcuts={{
          togglePaused:     "k Space",
          toggleMuted:      "m",
          toggleFullscreen: "f",
          seekBackward:     "ArrowLeft j",
          seekForward:      "ArrowRight l",
          volumeUp:         "ArrowUp",
          volumeDown:       "ArrowDown",
        }}
        className="w-full"
      >
        <MediaProvider>
          {posterUrl && (
            <Poster
              src={posterUrl}
              alt={scene.title ?? `Scene ${scene.id}`}
              className="vds-poster"
            />
          )}
        </MediaProvider>

        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          thumbnails={vttUrl ?? undefined}
        />
      </MediaPlayer>

      {/* Resize overlay - fades in when the user hovers over the player,
          positioned top-right like YouTube's Theater / Fullscreen buttons.
          z-50 keeps it above Vidstack's own control bar (z-10). */}
      <div
        className={cn(
          "absolute top-3 right-3 z-50 flex items-center gap-1",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "pointer-events-none group-hover:pointer-events-auto"
        )}
      >
        {MODE_BUTTONS.map(({ id, icon: Icon, label }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              onClick={() => onModeChange(id)}
              title={label}
              aria-label={label}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded transition-all",
                active
                  ? "bg-white/25"
                  : "bg-black/50 hover:bg-black/70"
              )}
              style={{ color: active ? "var(--primary)" : "#fff" }}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );
});
