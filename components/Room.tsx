"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Controls from "@/components/Controls";
import EmojiLayer from "@/components/EmojiLayer";
import PipBubble from "@/components/PipBubble";
import Stage from "@/components/Stage";
import Wordmark from "@/components/Wordmark";
import { useAutoHide } from "@/hooks/useAutoHide";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useRoom } from "@/lib/useRoom";

/**
 * Orchestrates the in-room experience. Holds the fullscreen container, drives the
 * auto-hide during movie-mode, and overlays the PiP bubbles + controls on the stage.
 */
export default function Room() {
  const room = useRoom();
  const movie = room.sharing || room.peerSharing;
  const stageRef = useRef<HTMLDivElement>(null);
  const hidden = useAutoHide(movie);
  const [fullscreen, toggleFullscreen] = useFullscreen(stageRef);

  // hide the flying reactions on this screen only (sending still works)
  const [emojisHidden, setEmojisHidden] = useState(false);
  useEffect(() => {
    try {
      setEmojisHidden(localStorage.getItem("yoh:emoji-hidden") === "1");
    } catch {
      /* ignore */
    }
  }, []);
  const toggleEmojis = useCallback(() => {
    setEmojisHidden((v) => {
      try {
        localStorage.setItem("yoh:emoji-hidden", v ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !v;
    });
  }, []);

  return (
    <main
      ref={stageRef}
      className={`relative h-dvh w-full overflow-hidden ${movie ? "bg-black" : ""} ${
        movie && hidden ? "cursor-none" : ""
      }`}
    >
      <Stage />

      {/* cameras become draggable bubbles during a share */}
      {movie && (
        <>
          {room.remoteCameraStream && (
            <PipBubble
              stream={room.remoteCameraStream}
              label={room.peerName}
              volume={room.voiceVolume}
              boundsRef={stageRef}
              initialCorner="tr"
              storageKey="remote"
              defaultWidth={240}
            />
          )}
          <PipBubble
            stream={room.localStream}
            label={`${room.selfName} (you)`}
            boundsRef={stageRef}
            initialCorner="br"
            storageKey="self"
            defaultWidth={160}
            muted
            mirror
          />
        </>
      )}

      {/* top bar */}
      <header
        className={`absolute left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] z-40 flex items-center gap-3 transition-opacity duration-300 ${
          movie && hidden ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <Wordmark size="text-xl" />
        {room.status === "reconnecting" && (
          <span className="animate-pulse rounded-full bg-blush/20 px-3 py-1 text-sm text-blush">
            reconnecting 💔
          </span>
        )}
      </header>

      {/* reactions fly over everything, even during the movie (unless hidden) */}
      <EmojiLayer hidden={emojisHidden} />

      <Controls
        hidden={movie && hidden}
        fullscreen={fullscreen}
        onToggleFullscreen={toggleFullscreen}
        emojisHidden={emojisHidden}
        onToggleEmojis={toggleEmojis}
      />
    </main>
  );
}
