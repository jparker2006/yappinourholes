"use client";

import { CSSProperties, useEffect, useState } from "react";
import { getRoomManager } from "@/lib/useRoom";

/**
 * Pastel rainbow confetti burst, fired whenever the partner joins. Self-contained:
 * subscribes to the manager's "peer-joined" event and cleans each burst up after it
 * finishes. No pieces are rendered until an event fires, so it's SSR-safe.
 */

const PASTELS = [
  "#ff8fc7",
  "#ffb3d9",
  "#ffd6ec",
  "#c8a6ff",
  "#a6c8ff",
  "#a6ffd8",
  "#fff3a6",
  "#ffc2a6",
];

type Piece = {
  id: string;
  style: CSSProperties;
  round: boolean;
};

function makeBurst(): Piece[] {
  return Array.from({ length: 96 }, (_, i) => {
    const r = Math.random;
    const size = 7 + r() * 9;
    return {
      id: `${i}-${r().toString(36).slice(2)}`,
      round: r() > 0.5,
      style: {
        left: `${50 + (r() - 0.5) * 28}%`,
        width: `${size}px`,
        height: `${size * (r() > 0.5 ? 1 : 0.5)}px`,
        background: PASTELS[Math.floor(r() * PASTELS.length)],
        animationDuration: `${(1.8 + r() * 1.5).toFixed(2)}s`,
        animationDelay: `${(r() * 0.25).toFixed(2)}s`,
        ["--dx" as string]: `${((r() - 0.5) * 130).toFixed(0)}vw`,
        ["--dy" as string]: `${(60 + r() * 60).toFixed(0)}vh`,
        ["--rot" as string]: `${((r() - 0.5) * 900).toFixed(0)}deg`,
      } as CSSProperties,
    };
  });
}

export default function Confetti() {
  const [bursts, setBursts] = useState<{ key: string; pieces: Piece[] }[]>([]);

  useEffect(() => {
    const manager = getRoomManager();
    return manager.on("peer-joined", () => {
      const key = crypto.randomUUID();
      setBursts((b) => [...b, { key, pieces: makeBurst() }]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.key !== key)), 3400);
    });
  }, []);

  if (bursts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      <style>{confettiCss}</style>
      {bursts.map((burst) =>
        burst.pieces.map((p) => (
          <span
            key={`${burst.key}-${p.id}`}
            className="confetti-piece absolute top-[-6vh]"
            style={{ ...p.style, borderRadius: p.round ? "9999px" : "2px" }}
          />
        )),
      )}
    </div>
  );
}

const confettiCss = `
.confetti-piece {
  animation-name: confetti-fall;
  animation-timing-function: cubic-bezier(0.3, 0.7, 0.5, 1);
  animation-fill-mode: forwards;
  will-change: transform, opacity;
}
@keyframes confetti-fall {
  0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; }
}
`;
