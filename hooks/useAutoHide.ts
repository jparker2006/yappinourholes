"use client";

import { useEffect, useState } from "react";

/**
 * YouTube-style auto-hide. When `active` (i.e. a share is on), the controls and
 * unpinned PiP fade out after `delay` ms of stillness and reappear on any mouse
 * movement, tap, or key press (pointer events cover mouse and touch alike).
 * When inactive, nothing ever hides.
 */
export function useAutoHide(active: boolean, delay = 3000): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!active) {
      setHidden(false);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setHidden(false);
      clearTimeout(timer);
      timer = setTimeout(() => setHidden(true), delay);
    };
    wake();
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);
    window.addEventListener("touchstart", wake, { passive: true });
    window.addEventListener("keydown", wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("touchstart", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [active, delay]);

  return hidden;
}
