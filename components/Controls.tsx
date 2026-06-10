"use client";

import { useState } from "react";

import EmojiBar from "@/components/EmojiBar";
import VolumeSliders from "@/components/VolumeSliders";
import { NameInput, RoundToggle } from "@/components/ui";
import { getRoomManager, useRoom } from "@/lib/useRoom";

/**
 * The floating control bar: mic, cam, share/stop, per-remote volume, names, and
 * fullscreen. Fades out with the auto-hide during a share.
 */
export default function Controls({
  hidden,
  fullscreen,
  onToggleFullscreen,
}: {
  hidden: boolean;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const room = useRoom();
  const manager = getRoomManager();
  const [namesOpen, setNamesOpen] = useState(false);
  const movie = room.sharing || room.peerSharing;

  return (
    <div
      className={`absolute inset-x-0 bottom-5 z-40 flex flex-col items-center gap-2 transition-opacity duration-300 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* reactions */}
      <EmojiBar />

      {/* names popover */}
      {namesOpen && (
        <div className="panel flex items-center gap-4 rounded-2xl px-4 py-3 text-xs text-petal/70">
          <label className="flex items-center gap-1.5">
            you
            <NameInput value={room.selfName} onSave={(v) => manager.setSelfName(v)} className="w-28 text-sm" />
          </label>
          <label className="flex items-center gap-1.5">
            them
            <NameInput value={room.peerName} onSave={(v) => manager.setPeerName(v)} className="w-28 text-sm" />
          </label>
        </div>
      )}

      <div className="panel flex items-center gap-2.5 rounded-full px-3 py-2.5">
        <RoundToggle active={room.micEnabled} onClick={() => manager.setMicEnabled(!room.micEnabled)} title="mic">
          {room.micEnabled ? "🎙️" : "🔇"}
        </RoundToggle>
        <RoundToggle active={room.camEnabled} onClick={() => manager.setCamEnabled(!room.camEnabled)} title="camera">
          {room.camEnabled ? "📷" : "🚫"}
        </RoundToggle>

        <span className="mx-1 h-6 w-px bg-petal/15" />

        {room.sharing ? (
          <button
            onClick={() => manager.stopShare()}
            className="rounded-full bg-blush/90 px-4 py-2 text-sm font-semibold text-cream transition active:scale-95"
          >
            ⏹ stop sharing
          </button>
        ) : (
          <button
            onClick={() => manager.startShare()}
            title="pick a Chrome tab and tick 'share tab audio'"
            className="cute-btn px-4 py-2 text-sm"
          >
            ▶ share a tab
          </button>
        )}

        {movie && (
          <>
            <span className="mx-1 h-6 w-px bg-petal/15" />
            <VolumeSliders />
          </>
        )}

        <span className="mx-1 h-6 w-px bg-petal/15" />

        <RoundToggle active={namesOpen} onClick={() => setNamesOpen((v) => !v)} title="names">
          ✏️
        </RoundToggle>
        <RoundToggle active={fullscreen} onClick={onToggleFullscreen} title="fullscreen">
          {fullscreen ? "🡸" : "⛶"}
        </RoundToggle>
      </div>

      {!movie && (
        <p className="text-[11px] text-petal/70">💡 share a Chrome tab &amp; tick “share tab audio” to watch together</p>
      )}
    </div>
  );
}
