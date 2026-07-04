"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";

import { getRoomManager } from "@/lib/useRoom";

/**
 * TikTok-live style flying reactions. Each emoji rises at a steady (linear) pace
 * with randomized drift/rotation derived from the shared `seed`, so both screens
 * animate identically. Spam-friendly. Intentionally NOT paused in movie-mode —
 * but the viewer can hide the flyers entirely (sending still works; incoming
 * reactions simply don't render while hidden).
 */

type Flyer = { id: string; glyph: string; seed: number };

const MAX_ON_SCREEN = 160;
const BASE_DUR = 3.8; // seconds
const DUR_RANGE = 1.4;
const REMOVE_AFTER = (BASE_DUR + DUR_RANGE + 0.8) * 1000;

// several deterministic values from one seed
function spread(seed: number, n: number) {
  const x = Math.sin(seed * 1000 + n * 13.73) * 43758.5453;
  return x - Math.floor(x);
}

export default function EmojiLayer({ hidden = false }: { hidden?: boolean }) {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hiddenRef = useRef(hidden);

  useEffect(() => {
    hiddenRef.current = hidden;
    if (hidden) setFlyers([]);
  }, [hidden]);

  useEffect(() => {
    const off = getRoomManager().on("emoji", ({ glyph, id, seed }) => {
      if (hiddenRef.current) return;
      setFlyers((f) => {
        const next = [...f, { id, glyph, seed }];
        return next.length > MAX_ON_SCREEN ? next.slice(next.length - MAX_ON_SCREEN) : next;
      });
      const t = setTimeout(() => setFlyers((f) => f.filter((x) => x.id !== id)), REMOVE_AFTER);
      timers.current.push(t);
    });
    const pending = timers.current;
    return () => {
      off();
      pending.forEach(clearTimeout);
    };
  }, []);

  if (hidden) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[55] overflow-hidden" aria-hidden>
      <style>{emojiCss}</style>
      {flyers.map((f) => {
        const left = 8 + spread(f.seed, 1) * 80;
        const drift = (spread(f.seed, 2) - 0.5) * 160;
        const rot = (spread(f.seed, 3) - 0.5) * 70;
        const dur = BASE_DUR + spread(f.seed, 4) * DUR_RANGE;
        const style: CSSProperties = {
          left: `${left}%`,
          fontSize: "2.2rem",
          animationDuration: `${dur}s`,
          ["--drift" as string]: `${drift}px`,
          ["--rot" as string]: `${rot}deg`,
        };
        return (
          <span key={f.id} className="emoji-flyer" style={style}>
            {f.glyph}
          </span>
        );
      })}
    </div>
  );
}

const emojiCss = `
.emoji-flyer {
  position: absolute;
  bottom: 8%;
  will-change: transform, opacity;
  animation-name: emoji-rise;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
/* constant-speed rise (no easing/pause); quick pop-in, fade out near the top */
@keyframes emoji-rise {
  0%   { transform: translateY(0) scale(0.6); opacity: 0; }
  10%  { transform: translateY(-10vh) scale(1); opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translateY(-100vh) translateX(var(--drift)) rotate(var(--rot)) scale(1); opacity: 0; }
}
`;
