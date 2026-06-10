"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";

export type Corner = "tl" | "tr" | "bl" | "br";

/**
 * Hand-rolled Pointer Events drag, bounded to a container. No dnd dependency.
 * Returns the live position plus handlers; PipBubble layers pinning + corner snap
 * on top. Uses pointer capture so the drag survives the cursor leaving the bubble.
 */
export function useDrag(
  boundsRef: RefObject<HTMLElement | null>,
  elRef: RefObject<HTMLElement | null>,
  initialCorner: Corner,
  margin = 16,
) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const place = useCallback(
    (corner: Corner) => {
      const b = boundsRef.current?.getBoundingClientRect();
      const el = elRef.current;
      if (!b || !el) return;
      const x = corner === "tr" || corner === "br" ? b.width - el.offsetWidth - margin : margin;
      const y = corner === "bl" || corner === "br" ? b.height - el.offsetHeight - margin : margin;
      setPos({ x, y });
    },
    [boundsRef, elRef, margin],
  );

  // initial placement + keep inside bounds when the container resizes
  useEffect(() => {
    place(initialCorner);
    const b = boundsRef.current;
    if (!b) return;
    const ro = new ResizeObserver(() => {
      setPos((p) => {
        const rect = boundsRef.current?.getBoundingClientRect();
        const el = elRef.current;
        if (!p || !rect || !el) return p;
        return {
          x: Math.max(margin, Math.min(p.x, rect.width - el.offsetWidth - margin)),
          y: Math.max(margin, Math.min(p.y, rect.height - el.offsetHeight - margin)),
        };
      });
    });
    ro.observe(b);
    return () => ro.disconnect();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const b = boundsRef.current?.getBoundingClientRect();
      const el = elRef.current;
      if (!b || !el || !pos) return;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      offset.current = { x: e.clientX - b.left - pos.x, y: e.clientY - b.top - pos.y };
      setDragging(true);
    },
    [boundsRef, elRef, pos],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const b = boundsRef.current?.getBoundingClientRect();
      const el = elRef.current;
      if (!b || !el) return;
      const x = Math.max(margin, Math.min(e.clientX - b.left - offset.current.x, b.width - el.offsetWidth - margin));
      const y = Math.max(margin, Math.min(e.clientY - b.top - offset.current.y, b.height - el.offsetHeight - margin));
      setPos({ x, y });
    },
    [dragging, boundsRef, elRef, margin],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setDragging(false);
      try {
        elRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    },
    [dragging, elRef],
  );

  const nearestCorner = useCallback((): Corner => {
    const b = boundsRef.current?.getBoundingClientRect();
    const el = elRef.current;
    if (!b || !el || !pos) return initialCorner;
    const left = pos.x + el.offsetWidth / 2 < b.width / 2;
    const top = pos.y + el.offsetHeight / 2 < b.height / 2;
    return `${top ? "t" : "b"}${left ? "l" : "r"}` as Corner;
  }, [boundsRef, elRef, pos, initialCorner]);

  return { pos, dragging, onPointerDown, onPointerMove, onPointerUp, place, nearestCorner };
}
