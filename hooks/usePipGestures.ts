"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";

export type Corner = "tl" | "tr" | "bl" | "br";

/** PiP bubbles are locked to 16:9 (Tailwind `aspect-video`). */
export const PIP_ASPECT = 16 / 9;

const MIN_W = 96;
const MAX_W = 560;
const MARGIN = 12;

type Point = { x: number; y: number };
type Frac = { fx: number; fy: number };

type Gesture =
  | { mode: "drag"; pointerId: number; grab: Point }
  | { mode: "pinch"; ids: [number, number]; startDist: number; startCentroid: Point; startPos: Point; startW: number }
  | { mode: "grip"; pointerId: number; start: Point; startW: number };

export type PipGestureMode = Gesture["mode"];

/** Largest width a bubble may take inside the container — viewport-relative so a
 *  bubble never dominates a phone screen (caps at ~44% of the width and ~40% of
 *  the height, whichever bites first). */
function maxWidthFor(bw: number, bh: number) {
  return Math.max(MIN_W, Math.min(MAX_W, bw * 0.44, bh * 0.4 * PIP_ASPECT, bw - 2 * MARGIN));
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * All PiP bubble gestures in one place, driven by Pointer Events on the bubble
 * plus window-level listeners while a gesture is live (so drags/pinches survive
 * the pointer leaving the bubble — including a second pinch finger landing
 * anywhere on screen):
 *
 *  - one pointer on the bubble  → free drag, clamped inside the container
 *  - a second pointer (touch)   → pinch-to-resize around the fingers
 *  - the corner grip (mouse/pen only) → diagonal resize; touch on the grip
 *    falls through to a drag so the grip can never steal a touch drag
 *
 * Width and position (as a container-relative fraction, so it survives rotation
 * and window resizes) persist to localStorage per `storageKey`.
 */
export function usePipGestures(
  boundsRef: RefObject<HTMLElement | null>,
  storageKey: string,
  initialCorner: Corner,
  defaultWidth: number,
) {
  const [pos, setPosState] = useState<Point | null>(null);
  const [width, setWidthState] = useState(defaultWidth);
  const [mode, setMode] = useState<PipGestureMode | null>(null);

  const posRef = useRef<Point | null>(null);
  const widthRef = useRef(defaultWidth);
  const fracRef = useRef<Frac>({ fx: 0.5, fy: 0.5 });
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const listening = useRef(false);

  const bounds = useCallback(() => boundsRef.current?.getBoundingClientRect() ?? null, [boundsRef]);

  const clampW = (w: number, r: DOMRect) => Math.max(MIN_W, Math.min(Math.round(w), maxWidthFor(r.width, r.height)));
  const clampPos = (p: Point, w: number, r: DOMRect): Point => ({
    x: Math.max(MARGIN, Math.min(p.x, r.width - w - MARGIN)),
    y: Math.max(MARGIN, Math.min(p.y, r.height - w / PIP_ASPECT - MARGIN)),
  });

  const setWidth = (w: number) => {
    widthRef.current = w;
    setWidthState(w);
  };
  const toFrac = (p: Point, w: number, r: DOMRect): Frac => ({
    fx: (p.x - MARGIN) / Math.max(1, r.width - w - 2 * MARGIN),
    fy: (p.y - MARGIN) / Math.max(1, r.height - w / PIP_ASPECT - 2 * MARGIN),
  });
  const fromFrac = (f: Frac, w: number, r: DOMRect): Point => ({
    x: MARGIN + f.fx * Math.max(0, r.width - w - 2 * MARGIN),
    y: MARGIN + f.fy * Math.max(0, r.height - w / PIP_ASPECT - 2 * MARGIN),
  });
  const setPos = (p: Point, w: number, r: DOMRect) => {
    posRef.current = p;
    fracRef.current = toFrac(p, w, r);
    setPosState(p);
  };

  const persist = useCallback(() => {
    try {
      localStorage.setItem(`yoh:pipw:${storageKey}`, String(widthRef.current));
      localStorage.setItem(`yoh:pippos:${storageKey}`, JSON.stringify(fracRef.current));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  // ─── window-level gesture listeners (added only while a gesture is live) ───

  const endGesture = useCallback(() => {
    gesture.current = null;
    pointers.current.clear();
    setMode(null);
    persist();
    stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persist]);

  const onWindowMove = useCallback((e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const r = bounds();
    if (!g || !r) return;

    if (g.mode === "drag" && e.pointerId === g.pointerId) {
      const p = { x: e.clientX - r.left - g.grab.x, y: e.clientY - r.top - g.grab.y };
      setPos(clampPos(p, widthRef.current, r), widthRef.current, r);
    } else if (g.mode === "pinch") {
      const a = pointers.current.get(g.ids[0]);
      const b = pointers.current.get(g.ids[1]);
      if (!a || !b) return;
      const w = clampW(g.startW * (dist(a, b) / Math.max(1, g.startDist)), r);
      const c = mid(a, b);
      // grow/shrink around the fingers: follow the centroid, recenter for the size delta
      const p = {
        x: g.startPos.x + (c.x - g.startCentroid.x) - (w - g.startW) / 2,
        y: g.startPos.y + (c.y - g.startCentroid.y) - (w - g.startW) / PIP_ASPECT / 2,
      };
      setWidth(w);
      setPos(clampPos(p, w, r), w, r);
    } else if (g.mode === "grip" && e.pointerId === g.pointerId) {
      const p = posRef.current;
      if (!p) return;
      // diagonal-aware: horizontal and vertical travel both grow the bubble
      const dw = (e.clientX - g.start.x + (e.clientY - g.start.y) * PIP_ASPECT) / 2;
      let w = clampW(g.startW + dw, r);
      // top-left stays put while grip-resizing, so also fit the remaining space
      w = Math.max(MIN_W, Math.min(w, r.width - p.x - MARGIN, (r.height - p.y - MARGIN) * PIP_ASPECT));
      setWidth(Math.round(w));
    }
  }, [bounds]);

  const onWindowUp = useCallback((e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    const r = bounds();
    if (!g || !r) {
      if (pointers.current.size === 0) endGesture();
      return;
    }
    if (g.mode === "pinch" && g.ids.includes(e.pointerId)) {
      // one finger lifted mid-pinch → keep following the other as a drag
      const remainingId = g.ids[0] === e.pointerId ? g.ids[1] : g.ids[0];
      const pt = pointers.current.get(remainingId);
      const p = posRef.current;
      if (pt && p) {
        gesture.current = {
          mode: "drag",
          pointerId: remainingId,
          grab: { x: pt.x - r.left - p.x, y: pt.y - r.top - p.y },
        };
        setMode("drag");
        return;
      }
    }
    if (pointers.current.size === 0 || (g.mode !== "pinch" && "pointerId" in g && g.pointerId === e.pointerId)) {
      endGesture();
    }
  }, [bounds, endGesture]);

  // a second finger landing anywhere on screen while dragging starts a pinch
  const onWindowDown = useCallback((e: PointerEvent) => {
    addPointer(e.pointerId, { x: e.clientX, y: e.clientY });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // while a gesture is live, keep the page from scrolling/zooming under it
  const onTouchMove = useCallback((e: TouchEvent) => {
    if (gesture.current) e.preventDefault();
  }, []);

  const startListening = useCallback(() => {
    if (listening.current) return;
    listening.current = true;
    window.addEventListener("pointermove", onWindowMove);
    window.addEventListener("pointerup", onWindowUp);
    window.addEventListener("pointercancel", onWindowUp);
    window.addEventListener("pointerdown", onWindowDown);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
  }, [onWindowMove, onWindowUp, onWindowDown, onTouchMove]);

  const stopListening = useCallback(() => {
    if (!listening.current) return;
    listening.current = false;
    window.removeEventListener("pointermove", onWindowMove);
    window.removeEventListener("pointerup", onWindowUp);
    window.removeEventListener("pointercancel", onWindowUp);
    window.removeEventListener("pointerdown", onWindowDown);
    window.removeEventListener("touchmove", onTouchMove);
  }, [onWindowMove, onWindowUp, onWindowDown, onTouchMove]);

  const addPointer = useCallback((id: number, pt: Point) => {
    if (pointers.current.has(id)) {
      pointers.current.set(id, pt);
      return;
    }
    const g = gesture.current;
    if (!g) return;
    pointers.current.set(id, pt);
    if (g.mode === "drag" && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.entries()];
      const p = posRef.current;
      if (!p) return;
      gesture.current = {
        mode: "pinch",
        ids: [a[0], b[0]],
        startDist: Math.max(1, dist(a[1], b[1])),
        startCentroid: mid(a[1], b[1]),
        startPos: p,
        startW: widthRef.current,
      };
      setMode("pinch");
    }
  }, []);

  // ─── element handlers (spread onto the bubble / the grip) ───

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!posRef.current || gesture.current) {
        addPointer(e.pointerId, { x: e.clientX, y: e.clientY });
        return;
      }
      const r = bounds();
      if (!r) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      gesture.current = {
        mode: "drag",
        pointerId: e.pointerId,
        grab: { x: e.clientX - r.left - posRef.current.x, y: e.clientY - r.top - posRef.current.y },
      };
      setMode("drag");
      startListening();
    },
    [bounds, addPointer, startListening],
  );

  const onGripPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // touch never grips: it falls through to the bubble and drags (pinch resizes)
      if (e.pointerType === "touch" || gesture.current) return;
      e.stopPropagation();
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      gesture.current = {
        mode: "grip",
        pointerId: e.pointerId,
        start: { x: e.clientX, y: e.clientY },
        startW: widthRef.current,
      };
      setMode("grip");
      startListening();
    },
    [startListening],
  );

  // ─── initial placement + re-clamp on container resize / rotation ───

  useEffect(() => {
    const el = boundsRef.current;
    const r = bounds();
    if (!el || !r) return;

    let w = defaultWidth;
    let frac: Frac | null = null;
    try {
      const savedW = parseInt(localStorage.getItem(`yoh:pipw:${storageKey}`) ?? "", 10);
      if (Number.isFinite(savedW)) w = savedW;
      const savedPos = JSON.parse(localStorage.getItem(`yoh:pippos:${storageKey}`) ?? "null") as Frac | null;
      if (savedPos && typeof savedPos.fx === "number" && typeof savedPos.fy === "number") {
        frac = { fx: Math.max(0, Math.min(1, savedPos.fx)), fy: Math.max(0, Math.min(1, savedPos.fy)) };
      }
    } catch {
      /* ignore */
    }
    w = clampW(w, r);
    if (!frac) {
      frac = {
        fx: initialCorner === "tr" || initialCorner === "br" ? 1 : 0,
        fy: initialCorner === "bl" || initialCorner === "br" ? 1 : 0,
      };
    }
    setWidth(w);
    setPos(clampPos(fromFrac(frac, w, r), w, r), w, r);

    // keep the bubble's relative spot through rotations / window resizes
    const ro = new ResizeObserver(() => {
      const rect = bounds();
      if (!rect) return;
      const w2 = clampW(widthRef.current, rect);
      widthRef.current = w2;
      setWidthState(w2);
      const p = clampPos(fromFrac(fracRef.current, w2, rect), w2, rect);
      posRef.current = p;
      setPosState(p);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      stopListening();
    };
    // mount-only: storageKey/corner/default never change for a given bubble
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pos, width, mode, onPointerDown, onGripPointerDown };
}
