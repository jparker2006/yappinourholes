"use client";

import Mole from "@/components/Mole";
import VideoTile from "@/components/VideoTile";
import { useRoom } from "@/lib/useRoom";

/** Shown when you're in the room but alone — the mole keeps you company. */
export default function WaitingScreen() {
  const room = useRoom();

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <Mole className="h-64 w-64 sm:h-80 sm:w-80" />

      <h2 className="flex items-baseline justify-center gap-0.5 text-2xl font-semibold text-petal-light">
        waiting for {room.peerName}
        <span className="dot" style={{ animationDelay: "0s" }}>.</span>
        <span className="dot" style={{ animationDelay: "0.2s" }}>.</span>
        <span className="dot" style={{ animationDelay: "0.4s" }}>.</span>
      </h2>
      <p className="text-sm text-petal/55">they&apos;ll pop in any sec 🩷</p>

      {/* your own little preview in the corner */}
      <div className="fixed bottom-5 right-5 aspect-video w-40 overflow-hidden rounded-2xl ring-2 ring-blush/40 shadow-lg shadow-black/40">
        <VideoTile stream={room.localStream} muted mirror />
        <span className="absolute bottom-1 left-2 text-[10px] text-cream/90 drop-shadow">
          {room.selfName} (you)
        </span>
      </div>

      <style>{`
        .dot {
          display: inline-block;
          animation: waiting-bob 1.2s ease-in-out infinite;
        }
        @keyframes waiting-bob {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </main>
  );
}
