"use client";

import { useEffect, useState } from "react";

import VideoTile from "@/components/VideoTile";
import Wordmark from "@/components/Wordmark";
import { NameInput, RoundToggle } from "@/components/ui";
import { getRoomManager, useRoom } from "@/lib/useRoom";

/**
 * Camera + mic preview before joining. Both must be enabled to join (which also
 * satisfies Chrome's autoplay gesture requirement). Acquiring the preview here
 * means the manager already owns the stream when join() is pressed.
 */
export default function PreJoin() {
  const room = useRoom();
  const manager = getRoomManager();
  const [preview, setPreview] = useState<"loading" | "ready" | "denied">(
    room.localStream ? "ready" : "loading",
  );

  useEffect(() => {
    if (room.localStream) {
      setPreview("ready");
      return;
    }
    let alive = true;
    manager.ensurePreview().then((ok) => {
      if (alive) setPreview(ok ? "ready" : "denied");
    });
    return () => {
      alive = false;
    };
  }, [manager, room.localStream]);

  const joining = room.status === "connecting";
  const ready = preview === "ready" && room.micEnabled && room.camEnabled;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-7 px-6 py-10">
      <Wordmark />

      <div className="panel flex w-full max-w-md flex-col items-center gap-5 rounded-[2rem] p-6">
        {/* preview */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-night-2 ring-1 ring-petal/15">
          {preview === "ready" && room.camEnabled ? (
            <VideoTile stream={room.localStream} muted mirror />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-petal/60">
              {preview === "loading" && <p className="animate-pulse">waking the camera… 📷</p>}
              {preview === "denied" && (
                <>
                  <p>need camera + mic to come in 🥺</p>
                  <button
                    className="cute-btn px-4 py-2 text-sm"
                    onClick={() => {
                      setPreview("loading");
                      manager.ensurePreview().then((ok) => setPreview(ok ? "ready" : "denied"));
                    }}
                  >
                    allow & retry
                  </button>
                </>
              )}
              {preview === "ready" && !room.camEnabled && <p>camera is off 🚫</p>}
            </div>
          )}
        </div>

        {/* toggles */}
        <div className="flex items-center gap-3">
          <RoundToggle
            active={room.micEnabled}
            onClick={() => manager.setMicEnabled(!room.micEnabled)}
            title="toggle mic"
          >
            {room.micEnabled ? "🎙️ mic" : "🔇 mic"}
          </RoundToggle>
          <RoundToggle
            active={room.camEnabled}
            onClick={() => manager.setCamEnabled(!room.camEnabled)}
            title="toggle camera"
          >
            {room.camEnabled ? "📷 cam" : "🚫 cam"}
          </RoundToggle>
        </div>

        {/* name */}
        <label className="flex items-center gap-2 text-sm text-petal/70">
          you are
          <NameInput value={room.selfName} onSave={(v) => manager.setSelfName(v)} className="w-36 text-center" />
        </label>

        {/* join */}
        <button
          className="cute-btn w-full px-8 py-4 text-xl"
          disabled={!ready || joining}
          onClick={() => manager.join()}
        >
          {joining ? "going in… 🩷" : "join 🩷"}
        </button>

        {!ready && preview === "ready" && (
          <p className="text-xs text-petal/45">turn on both mic & cam to join 🫶</p>
        )}
      </div>
    </main>
  );
}
