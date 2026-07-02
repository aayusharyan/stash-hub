"use client";

// Video player built on Vidstack. Handles HLS and plain video streams,
// VTT thumbnail previews, custom keybindings (f=fullscreen, k/space=play,
// j/l=seek, m=mute), and Normal/Cinema mode buttons injected directly into
// the Vidstack control bar so they appear in fullscreen as well.

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Monitor, RectangleHorizontal } from "lucide-react";
import {
  MediaPlayer,
  MediaProvider,
  Poster,
  type MediaPlayerInstance,
} from "@vidstack/react";
import { DefaultVideoLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import type { Scene } from "@/types/stash";
import { sceneStreamUrl, toProxyUrl } from "@/lib/utils";

export type PlayerMode = "normal" | "cinema" | "fullscreen";

export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
}

interface Props {
  scene: Scene;
  mode: PlayerMode;
  onModeChange: (m: PlayerMode) => void;
  // Called at most once per mount - on the very first play event, not on pause/resume.
  onFirstPlay?: () => void;
}

// Only Normal and Cinema are offered; Vidstack already provides a native fullscreen button.
const VIEW_MODE_BUTTONS: { id: "normal" | "cinema"; icon: React.ElementType; label: string }[] = [
  { id: "normal", icon: Monitor,             label: "Normal view" },
  { id: "cinema", icon: RectangleHorizontal, label: "Cinema mode" },
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

  // Expose seekTo so the parent can drive seek imperatively (e.g. from scene markers).
  useImperativeHandle(ref, () => ({
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

  // Normal / Cinema toggle buttons rendered inside the Vidstack control bar, placed
  // just before the native fullscreen button so they appear even in native fullscreen.
  const modeButtonsSlot = (
    <div className="flex items-center">
      {VIEW_MODE_BUTTONS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onModeChange(id)}
          title={label}
          aria-label={label}
          className="vds-button"
          style={{ color: mode === id ? "var(--primary)" : undefined }}
        >
          <Icon data-class="vds-icon" size={20} />
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative w-full" style={{ backgroundColor: "#000" }}>
      <MediaPlayer
        ref={playerRef}
        src={{ src: streamUrl, type: "video/mp4" }}
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
          slots={{
            // Normal/Cinema mode buttons sit inside the control bar before the fullscreen button.
            beforeFullscreenButton: modeButtonsSlot,
            // Remove the settings gear, AirPlay and Google Cast buttons - not applicable here.
            settingsMenu: null,
            airPlayButton: null,
            googleCastButton: null,
          }}
        />
      </MediaPlayer>
    </div>
  );
});
