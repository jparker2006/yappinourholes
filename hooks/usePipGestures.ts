"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";

import { PIP } from "@/lib/config";

export type Corner = "tl" | "tr" | "bl" | "br";

/** PiP bubbles are locked to 16:9 (Tailwind `aspect-video`). */
const ASPECT = 16 / 9;

type Point = { x: number; y: number };
type Frac = { fx: number; fy: number };

// Every gesture snapshots the container rect at its start (`rect`) so
// pointermoves never force a layout read; the ResizeObserver below covers the
// rare container resize.
type Gesture =
  | { mode: "drag"; rect: DOMRect; pointerId: number; grab: Point }
  | { mode: "pinch"; rect: DOMRect; ids: [number, number]; startDist: number; startCentroid: Point; startPos: Point; startW: number }
  | { mode: "grip"; rect: DOMRect; pointerId: number; start: Point; startW: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

/** Largest width a bubble may take inside the container — viewport-relative so
 *  a bubble never dominates a phone screen. */
function maxWidthFor(bw: number, bh: number) {
  return Math.max(
    PIP.MIN_W,
    Math.min(PIP.MAX_W, bw * PIP.MAX_STAGE_W, bh * PIP.MAX_STAGE_H * ASPECT, bw - 2 * PIP.MARGIN),
  );
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * All PiP bubble gestures in one place, driven by Pointer Events on the bubble
 * plus window-level listeners while a gesture is live (so drags/pinches survive
 * the pointer leaving the bubble):
 *
 *  - one pointer on the bubble  → free drag, clamped inside the container
 *  - a second pointer landing on this same bubble (touch) → pinch-to-resize
 *  - the corner grip (mouse/pen only) → diagonal resize; a touch on the grip
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
  const [mode, setMode] = useState<Gesture["mode"] | null>(null);

  const posRef = useRef<Point | null>(null);
  const widthRef = useRef(defaultWidth);
  // remembers the bubble's relative spot as of the last user gesture — the
  // ResizeObserver re-derives pixels from this, NOT the other way around, so a
  // rotation keeps "top right-ish" instead of clamping to wherever pixels land
  const fracRef = useRef<Frac>({ fx: 0.5, fy: 0.5 });
  const elRef = useRef<HTMLElement | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const listening = useRef(false);

  const bounds = useCallback(() => boundsRef.current?.getBoundingClientRect() ?? null, [boundsRef]);

  const clampW = (w: number, r: DOMRect) => clamp(Math.round(w), PIP.MIN_W, maxWidthFor(r.width, r.height));
  const clampPos = (p: Point, w: number, r: DOMRect): Point => ({
    x: Math.max(PIP.MARGIN, Math.min(p.x, r.width - w - PIP.MARGIN)),
    y: Math.max(PIP.MARGIN, Math.min(p.y, r.height - w / ASPECT - PIP.MARGIN)),
  });

  const setWidth = (w: number) => {
    widthRef.current = w;
    setWidthState(w);
  };
  const toFrac = (p: Point, w: number, r: DOMRect): Frac => ({
    fx: (p.x - PIP.MARGIN) / Math.max(1, r.width - w - 2 * PIP.MARGIN),
    fy: (p.y - PIP.MARGIN) / Math.max(1, r.height - w / ASPECT - 2 * PIP.MARGIN),
  });
  const fromFrac = (f: Frac, w: number, r: DOMRect): Point => ({
    x: PIP.MARGIN + f.fx * Math.max(0, r.width - w - 2 * PIP.MARGIN),
    y: PIP.MARGIN + f.fy * Math.max(0, r.height - w / ASPECT - 2 * PIP.MARGIN),
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
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    // self-heal a drag whose pointerup we never saw (context menu, alt-tab)
    if (e.pointerType === "mouse" && e.buttons === 0) {
      endGesture();
      return;
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = g.rect;

    if (g.mode === "drag" && e.pointerId === g.pointerId) {
      const p = { x: e.clientX - r.left - g.grab.x, y: e.clientY - r.top - g.grab.y };
      setPos(clampPos(p, widthRef.current, r), widthRef.current, r);
    } else if (g.mode === "pinch") {
      const a = pointers.current.get(g.ids[0]);
      const b = pointers.current.get(g.ids[1]);
      if (!a || !b) return;
      const w = clampW(g.startW * (dist(a, b) / g.startDist), r);
      const c = mid(a, b);
      // grow/shrink around the fingers: follow the centroid, recenter for the size delta
      const p = {
        x: g.startPos.x + (c.x - g.startCentroid.x) - (w - g.startW) / 2,
        y: g.startPos.y + (c.y - g.startCentroid.y) - (w - g.startW) / ASPECT / 2,
      };
      setWidth(w);
      setPos(clampPos(p, w, r), w, r);
    } else if (g.mode === "grip" && e.pointerId === g.pointerId) {
      const p = posRef.current;
      if (!p) return;
      // diagonal-aware: horizontal and vertical travel both grow the bubble
      const dw = (e.clientX - g.start.x + (e.clientY - g.start.y) * ASPECT) / 2;
      let w = clampW(g.startW + dw, r);
      // top-left stays put while grip-resizing, so also fit the remaining space
      w = Math.round(clamp(w, PIP.MIN_W, Math.min(r.width - p.x - PIP.MARGIN, (r.height - p.y - PIP.MARGIN) * ASPECT)));
      setWidth(w);
      // keep the persisted fraction consistent with the new size, or the bubble
      // would jump on the next rotation/reload
      setPos(clampPos(p, w, r), w, r);
    }
  }, [endGesture]);

  const onWindowUp = useCallback((e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) return;
    if (g.mode === "pinch") {
      if (!g.ids.includes(e.pointerId)) return;
      // one finger lifted mid-pinch → keep following the other as a drag
      const remainingId = g.ids[0] === e.pointerId ? g.ids[1] : g.ids[0];
      const pt = pointers.current.get(remainingId);
      const p = posRef.current;
      if (pt && p) {
        gesture.current = {
          mode: "drag",
          rect: g.rect,
          pointerId: remainingId,
          grab: { x: pt.x - g.rect.left - p.x, y: pt.y - g.rect.top - p.y },
        };
        setMode("drag");
      } else {
        endGesture();
      }
      return;
    }
    if (g.pointerId === e.pointerId) endGesture();
  }, [endGesture]);

  // a second finger landing on THIS bubble while dragging starts a pinch.
  // Anywhere else (the other bubble, the controls, a bubble's buttons) must
  // never join the gesture — that's how taps used to hijack a drag into a
  // surprise resize.
  const onWindowDown = useCallback((e: PointerEvent) => {
    const g = gesture.current;
    const el = elRef.current;
    const target = e.target instanceof Element ? e.target : null;
    if (!g || g.mode !== "drag" || !el || !target) return;
    if (!el.contains(target) || target.closest("button")) return;
    addPointer(e.pointerId, { x: e.clientX, y: e.clientY });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // while a gesture is live, keep the page from scrolling/zooming under it
  const onTouchMove = useCallback((e: TouchEvent) => {
    if (gesture.current) e.preventDefault();
  }, []);

  const onWindowBlur = useCallback(() => {
    if (gesture.current) endGesture();
  }, [endGesture]);

  const startListening = useCallback(() => {
    if (listening.current) return;
    listening.current = true;
    window.addEventListener("pointermove", onWindowMove);
    window.addEventListener("pointerup", onWindowUp);
    window.addEventListener("pointercancel", onWindowUp);
    window.addEventListener("pointerdown", onWindowDown);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("blur", onWindowBlur);
  }, [onWindowMove, onWindowUp, onWindowDown, onTouchMove, onWindowBlur]);

  const stopListening = useCallback(() => {
    if (!listening.current) return;
    listening.current = false;
    window.removeEventListener("pointermove", onWindowMove);
    window.removeEventListener("pointerup", onWindowUp);
    window.removeEventListener("pointercancel", onWindowUp);
    window.removeEventListener("pointerdown", onWindowDown);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("blur", onWindowBlur);
  }, [onWindowMove, onWindowUp, onWindowDown, onTouchMove, onWindowBlur]);

  const addPointer = useCallback((id: number, pt: Point) => {
    const g = gesture.current;
    if (!g || pointers.current.has(id)) return;
    pointers.current.set(id, pt);
    if (g.mode === "drag" && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.entries()];
      const p = posRef.current;
      if (!p) return;
      gesture.current = {
        mode: "pinch",
        rect: g.rect,
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
      // secondary mouse buttons never drag — a context menu would swallow the
      // pointerup and leave the bubble glued to the cursor
      if (gesture.current || !posRef.current || (e.pointerType === "mouse" && e.button !== 0)) return;
      const r = bounds();
      if (!r) return;
      elRef.current = e.currentTarget as HTMLElement;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      gesture.current = {
        mode: "drag",
        rect: r,
        pointerId: e.pointerId,
        grab: { x: e.clientX - r.left - posRef.current.x, y: e.clientY - r.top - posRef.current.y },
      };
      setMode("drag");
      startListening();
    },
    [bounds, startListening],
  );

  const onGripPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // touch never grips: it falls through to the bubble and drags (pinch
      // resizes). Must stay in sync with the grip's `pointer-fine:` visibility
      // class in PipBubble — CSS hides it from touch-first devices, this guard
      // covers fine-pointer devices that also have a touchscreen.
      if (e.pointerType === "touch" || e.button !== 0 || gesture.current) return;
      e.stopPropagation();
      const r = bounds();
      if (!r) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      gesture.current = {
        mode: "grip",
        rect: r,
        pointerId: e.pointerId,
        start: { x: e.clientX, y: e.clientY },
        startW: widthRef.current,
      };
      setMode("grip");
      startListening();
    },
    [bounds, startListening],
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
        frac = { fx: clamp(savedPos.fx, 0, 1), fy: clamp(savedPos.fy, 0, 1) };
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
      // derive pixels from the remembered fraction (not by clamping stale
      // pixels), so rotation preserves the bubble's relative placement
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
