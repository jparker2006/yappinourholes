"use client";

import { RefObject } from "react";

import VideoTile from "@/components/VideoTile";
import { usePersistedFlag } from "@/hooks/usePersistedFlag";
import { Corner, usePipGestures } from "@/hooks/usePipGestures";

const PILL_MARGIN = 8;
// ≈ pill height (py-1.5 + h-9 avatar ≈ 48px) + breathing room; keeps the
// bottom-pinned pill's tap target fully on screen
const PILL_CLEARANCE = 64;

/**
 * A camera feed shrunk to a bubble during a share. Drag from anywhere on the
 * bubble; pinch with two fingers to resize on touch; mouse/pen get a visible
 * corner grip instead. Can be minimized into a tiny pill at the screen edge
 * (the <video> stays mounted so the person's audio never drops). Size, spot,
 * and minimized state are remembered per bubble in localStorage.
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
  const { pos, width, mode, onPointerDown, onGripPointerDown } = usePipGestures(
    boundsRef,
    storageKey,
    initialCorner,
    defaultWidth,
  );

  const [minimized, togglePersistedMinimized] = usePersistedFlag(`yoh:pipmin:${storageKey}`);
  // ignore minimize taps mid-gesture — swapping to the pill while window
  // listeners are still driving the drag would leave the gesture orphaned
  const toggleMinimized = () => {
    if (!mode) togglePersistedMinimized();
  };

  // the pill pins to whichever screen edge the bubble was nearer (rect is read
  // only in pill mode: during a drag this renders every pointermove, and an
  // unconditional getBoundingClientRect would force a layout each frame)
  const rect = minimized ? boundsRef.current?.getBoundingClientRect() : undefined;
  const onLeft = rect && pos ? pos.x + width / 2 < rect.width / 2 : initialCorner.endsWith("l");
  const pillY = rect && pos ? Math.max(PILL_MARGIN, Math.min(pos.y, rect.height - PILL_CLEARANCE)) : PILL_MARGIN;

  const cursor =
    mode === "drag" ? "cursor-grabbing scale-[1.02]" : mode ? "" : "cursor-grab transition-transform";

  return (
    <div
      data-pip={storageKey}
      onPointerDown={minimized ? undefined : onPointerDown}
      onClick={minimized ? toggleMinimized : undefined}
      onKeyDown={
        minimized
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleMinimized();
              }
            }
          : undefined
      }
      role={minimized ? "button" : undefined}
      tabIndex={minimized ? 0 : undefined}
      aria-label={minimized ? `restore ${label}` : undefined}
      style={
        minimized
          ? {
              top: pillY,
              left: onLeft ? PILL_MARGIN : undefined,
              right: onLeft ? undefined : PILL_MARGIN,
              visibility: pos ? "visible" : "hidden",
            }
          : {
              left: pos?.x ?? 0,
              top: pos?.y ?? 0,
              width,
              visibility: pos ? "visible" : "hidden",
            }
      }
      className={
        minimized
          ? // z-[45]: the pill must stay tappable above the controls bar, or it could
            // get stranded behind it with no way to restore the camera
            "panel absolute z-[45] flex cursor-pointer select-none items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 shadow-lg shadow-black/30 active:scale-95"
          : `group absolute z-30 aspect-video touch-none select-none overflow-hidden rounded-2xl ring-2 ring-blush/40 shadow-xl shadow-black/40 ${cursor}`
      }
    >
      {/* same wrapper + VideoTile in both modes so the <video> (and its audio) never remounts */}
      <div
        className={
          minimized
            ? "h-9 w-9 flex-none overflow-hidden rounded-full ring-1 ring-blush/40"
            : "absolute inset-0"
        }
      >
        <VideoTile stream={stream} muted={muted} mirror={mirror} volume={volume} />
      </div>

      {minimized ? (
        <span className="max-w-28 truncate text-xs font-medium text-petal-light">{label}</span>
      ) : (
        <>
          <span className="pointer-events-none absolute bottom-1 left-2 text-[11px] font-medium text-cream drop-shadow">
            {label}
          </span>

          {/* minimize to a pill */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={toggleMinimized}
            aria-label={`minimize ${label}`}
            title="minimize"
            className="absolute right-0 top-0 grid h-9 w-9 place-items-center opacity-70 transition hover:opacity-100 active:scale-90"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-night/55 text-sm leading-none text-cream/90 backdrop-blur-sm">
              −
            </span>
          </button>

          {/* resize grip — mouse/pen only; touch pinches instead */}
          <div
            onPointerDown={onGripPointerDown}
            title="drag to resize"
            aria-hidden
            className="absolute bottom-0 right-0 hidden h-11 w-11 cursor-nwse-resize touch-none items-end justify-end p-1 opacity-60 transition-opacity hover:opacity-100 group-hover:opacity-90 pointer-fine:flex"
          >
            <span className="grid h-6 w-6 place-items-center rounded-br-xl rounded-tl-lg bg-night/55 backdrop-blur-sm">
              <svg viewBox="0 0 10 10" className="h-3.5 w-3.5 text-cream/90" fill="none">
                <path d="M9 1 1 9M9 5 5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
