"use client";

import { RefObject, useCallback, useEffect, useState } from "react";

/**
 * Fullscreen toggle for a container element. We fullscreen the whole stage
 * container (share video + PiP + emoji + controls) so everything stays visible —
 * the Fullscreen API only renders the fullscreened subtree.
 */
export function useFullscreen(
  ref: RefObject<HTMLElement | null>,
): [boolean, () => void] {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [ref]);

  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, [ref]);

  return [isFullscreen, toggle];
}
