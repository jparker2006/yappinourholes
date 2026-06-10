"use client";

import { RefObject, useRef, useState } from "react";

import VideoTile from "@/components/VideoTile";
import { Corner, useDrag } from "@/hooks/useDrag";

/**
 * A camera feed shrunk to a draggable bubble during a share. Drag anywhere; when
 * "pinned" (default) it snaps to the nearest corner on release and stays visible
 * through the auto-hide. Unpinned, it floats freely and fades with the controls.
 */
export default function PipBubble({
  stream,
  label,
  boundsRef,
  initialCorner,
  controlsHidden,
  muted = false,
  mirror = false,
  volume = 1,
  small = false,
}: {
  stream: MediaStream | null;
  label: string;
  boundsRef: RefObject<HTMLElement | null>;
  initialCorner: Corner;
  controlsHidden: boolean;
  muted?: boolean;
  mirror?: boolean;
  volume?: number;
  small?: boolean;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const { pos, dragging, onPointerDown, onPointerMove, onPointerUp, place, nearestCorner } = useDrag(
    boundsRef,
    elRef,
    initialCorner,
  );
  const [pinned, setPinned] = useState(true);

  const hidden = controlsHidden && !pinned;

  return (
    <div
      ref={elRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => {
        onPointerUp(e);
        if (pinned) place(nearestCorner());
      }}
      style={{
        left: pos?.x ?? 0,
        top: pos?.y ?? 0,
        visibility: pos ? "visible" : "hidden",
      }}
      className={`group absolute z-30 ${small ? "w-36" : "w-52"} aspect-video touch-none select-none overflow-hidden rounded-2xl ring-2 ring-blush/40 shadow-xl shadow-black/50 ${
        dragging ? "cursor-grabbing scale-[1.02]" : "cursor-grab transition-all duration-300 ease-out"
      } ${hidden ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <VideoTile stream={stream} muted={muted} mirror={mirror} volume={volume} />

      <span className="pointer-events-none absolute bottom-1 left-2 text-[11px] font-medium text-cream drop-shadow">
        {label}
      </span>

      <button
        title={pinned ? "unpin (float freely)" : "pin to corner"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          const next = !pinned;
          setPinned(next);
          if (next) place(nearestCorner());
        }}
        className={`absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full text-xs transition ${
          pinned
            ? "bg-blush/80 text-cream"
            : "bg-night/70 text-petal/70 opacity-0 group-hover:opacity-100"
        }`}
      >
        📌
      </button>
    </div>
  );
}
