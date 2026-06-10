"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";

import { SPECIAL_EMOJI } from "@/lib/config";
import { getRoomManager } from "@/lib/useRoom";

/**
 * TikTok-live style flying reactions. Each emoji rises with randomized drift and
 * rotation derived from the shared `seed`, so both screens animate identically.
 * Spam-friendly (20 taps = 20 emojis). ❤️ is special: bigger, glowing, with a
 * sparkle trail. Intentionally NOT paused in movie-mode — reactions keep flying.
 */

type Flyer = { id: string; glyph: string; seed: number };

const MAX_ON_SCREEN = 160;

// several deterministic values from one seed
function spread(seed: number, n: number) {
  const x = Math.sin(seed * 1000 + n * 13.73) * 43758.5453;
  return x - Math.floor(x);
}

export default function EmojiLayer() {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const off = getRoomManager().on("emoji", ({ glyph, id, seed }) => {
      setFlyers((f) => {
        const next = [...f, { id, glyph, seed }];
        return next.length > MAX_ON_SCREEN ? next.slice(next.length - MAX_ON_SCREEN) : next;
      });
      const t = setTimeout(() => setFlyers((f) => f.filter((x) => x.id !== id)), 3600);
      timers.current.push(t);
    });
    const pending = timers.current;
    return () => {
      off();
      pending.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-[55] overflow-hidden" aria-hidden>
      <style>{emojiCss}</style>
      {flyers.map((f) => {
        const special = f.glyph === SPECIAL_EMOJI;
        const left = 8 + spread(f.seed, 1) * 80;
        const drift = (spread(f.seed, 2) - 0.5) * 160;
        const rot = (spread(f.seed, 3) - 0.5) * 70;
        const dur = 2.4 + spread(f.seed, 4) * 1.1;
        const style: CSSProperties = {
          left: `${left}%`,
          fontSize: special ? "3.4rem" : "2.2rem",
          animationDuration: `${dur}s`,
          ["--drift" as string]: `${drift}px`,
          ["--rot" as string]: `${rot}deg`,
        };
        return (
          <span key={f.id} className={`emoji-flyer ${special ? "emoji-special" : ""}`} style={style}>
            {f.glyph}
            {special && (
              <>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="emoji-spark"
                    style={{
                      left: `${spread(f.seed, 10 + i) * 100}%`,
                      animationDelay: `${spread(f.seed, 20 + i) * 0.6}s`,
                    }}
                  >
                    ✨
                  </span>
                ))}
              </>
            )}
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
  animation-timing-function: cubic-bezier(0.25, 0.6, 0.4, 1);
  animation-fill-mode: forwards;
}
.emoji-special {
  filter: drop-shadow(0 0 10px rgba(255, 95, 162, 0.85)) drop-shadow(0 0 22px rgba(255, 46, 136, 0.5));
}
.emoji-spark {
  position: absolute;
  top: 60%;
  font-size: 0.42em;
  animation: emoji-trail 1s ease-in infinite;
}
@keyframes emoji-rise {
  0% { transform: translateY(0) translateX(0) rotate(0deg) scale(0.4); opacity: 0; }
  14% { opacity: 1; transform: translateY(-8vh) scale(1.1); }
  100% { transform: translateY(-92vh) translateX(var(--drift)) rotate(var(--rot)) scale(1); opacity: 0; }
}
@keyframes emoji-trail {
  0% { transform: translateY(0) scale(0.9); opacity: 0.9; }
  100% { transform: translateY(26px) scale(0.2); opacity: 0; }
}
`;
