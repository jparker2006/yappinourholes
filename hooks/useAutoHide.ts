"use client";

import { useEffect, useState } from "react";

/**
 * YouTube-style auto-hide. When `active` (i.e. a share is on), the controls and
 * unpinned PiP fade out after `delay` ms of mouse stillness and reappear on any
 * movement. When inactive, nothing ever hides.
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
    window.addEventListener("mousemove", wake);
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [active, delay]);

  return hidden;
}
