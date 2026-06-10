"use client";

import { RefObject, useEffect, useRef, useState } from "react";

import VideoTile from "@/components/VideoTile";
import { Corner, useDrag } from "@/hooks/useDrag";

const MIN_W = 120;
const MAX_W = 560;
const clamp = (w: number) => Math.max(MIN_W, Math.min(MAX_W, Math.round(w)));

/**
 * A camera feed shrunk to a bubble during a share. Free-drag anywhere on screen,
 * always visible, and resizable from the bottom-right corner (size is remembered
 * per bubble in localStorage). No corner snapping, no auto-hide.
 */
export default function PipBubble({
  stream,
  label,
  boundsRef,
  initialCorner,
  storageKey,
  defaultWidth = 220,
  muted = false,
  mirror = false,
  volume = 1,
}: {
  stream: MediaStream | null;
  label: string;
  boundsRef: RefObject<HTMLElement | null>;
  initialCorner: Corner;
  storageKey: string;
  defaultWidth?: number;
  muted?: boolean;
  mirror?: boolean;
  volume?: number;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const { pos, dragging, onPointerDown, onPointerMove, onPointerUp } = useDrag(
    boundsRef,
    elRef,
    initialCorner,
  );

  const [width, setWidth] = useState(defaultWidth);
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef({ x: 0, w: 0 });

  // remember the size across shares / reloads
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`yoh:pipw:${storageKey}`);
      if (saved) setWidth(clamp(parseInt(saved, 10)));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    resizeStart.current = { x: e.clientX, w: width };
    setResizing(true);
  };
  const moveResize = (e: React.PointerEvent) => {
    if (!resizing) return;
    e.stopPropagation();
    setWidth(clamp(resizeStart.current.w + (e.clientX - resizeStart.current.x)));
  };
  const endResize = (e: React.PointerEvent) => {
    if (!resizing) return;
    e.stopPropagation();
    setResizing(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      localStorage.setItem(`yoh:pipw:${storageKey}`, String(width));
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      ref={elRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        left: pos?.x ?? 0,
        top: pos?.y ?? 0,
        width,
        visibility: pos ? "visible" : "hidden",
      }}
      className={`group absolute z-30 aspect-video touch-none select-none overflow-hidden rounded-2xl ring-2 ring-blush/40 shadow-xl shadow-black/40 ${
        dragging ? "cursor-grabbing scale-[1.02]" : resizing ? "cursor-nwse-resize" : "cursor-grab transition-transform"
      }`}
    >
      <VideoTile stream={stream} muted={muted} mirror={mirror} volume={volume} />

      <span className="pointer-events-none absolute bottom-1 left-2 text-[11px] font-medium text-cream drop-shadow">
        {label}
      </span>

      {/* resize grip (bottom-right) */}
      <div
        onPointerDown={startResize}
        onPointerMove={moveResize}
        onPointerUp={endResize}
        title="drag to resize"
        className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize touch-none rounded-tl-md opacity-50 transition-opacity hover:opacity-100 group-hover:opacity-90"
        style={{
          background:
            "repeating-linear-gradient(135deg, transparent 0 2px, rgba(255,255,255,0.9) 2px 3.2px)",
        }}
      />
    </div>
  );
}
