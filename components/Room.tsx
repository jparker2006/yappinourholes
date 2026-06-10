"use client";

import { useRef } from "react";

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
              controlsHidden={hidden}
            />
          )}
          <PipBubble
            stream={room.localStream}
            label={`${room.selfName} (you)`}
            boundsRef={stageRef}
            initialCorner="br"
            controlsHidden={hidden}
            muted
            mirror
            small
          />
        </>
      )}

      {/* top bar */}
      <header
        className={`absolute left-4 top-4 z-40 flex items-center gap-3 transition-opacity duration-300 ${
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

      {/* reactions fly over everything, even during the movie */}
      <EmojiLayer />

      <Controls hidden={movie && hidden} fullscreen={fullscreen} onToggleFullscreen={toggleFullscreen} />
    </main>
  );
}
