"use client";

import { CSSProperties, useMemo } from "react";

/**
 * Slowly shifting pink/lilac gradient + floating hearts + sparkles.
 * EXTRA in the lobby, invisible during the movie: pass `paused` and the whole
 * layer fades out and every child animation freezes (driven by movie-mode).
 *
 * Everything here is decorative and pointer-events:none, so it never interferes
 * with the UI. Heart configs are derived deterministically from the index so SSR
 * and client render identically (no hydration mismatch, no Math.random).
 */

const GLYPHS = ["🩷", "💗", "💕", "💖", "🌸", "✨"];

// deterministic pseudo-random in [0,1) — same on server and client
function rand(seed: number) {
  const x = Math.sin(seed * 99.13 + 7.7) * 43758.5453;
  return x - Math.floor(x);
}

type Heart = {
  glyph: string;
  style: CSSProperties;
};

function buildHearts(count: number): Heart[] {
  return Array.from({ length: count }, (_, i) => {
    const r = (n: number) => rand(i * 9.7 + n);
    const glyph = GLYPHS[Math.floor(r(1) * GLYPHS.length)];
    return {
      glyph,
      style: {
        left: `${Math.round(r(2) * 100)}%`,
        fontSize: `${(0.9 + r(3) * 1.9).toFixed(2)}rem`,
        animationDuration: `${(10 + r(4) * 11).toFixed(1)}s`,
        animationDelay: `${(-r(5) * 20).toFixed(1)}s`,
        // custom props consumed by the heart-rise keyframes
        ["--drift" as string]: `${Math.round((r(6) - 0.5) * 140)}px`,
        ["--rot" as string]: `${Math.round((r(7) - 0.5) * 110)}deg`,
        ["--o" as string]: (0.22 + r(8) * 0.4).toFixed(2),
        ["--s" as string]: (0.7 + r(9) * 0.85).toFixed(2),
      } as CSSProperties,
    };
  });
}

export default function AmbientBackground({ paused = false }: { paused?: boolean }) {
  const hearts = useMemo(() => buildHearts(18), []);

  return (
    <div
      aria-hidden
      data-paused={paused ? "true" : "false"}
      className="ambient-layer pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-100 transition-opacity duration-700 ease-out"
    >
      {/* static deep vignette so the dark never reads flat */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% -10%, #1e1334 0%, #0b0710 60%, #07040c 100%)",
        }}
      />

      {/* drifting color blobs */}
      <div
        className="absolute -left-[10vw] -top-[12vh] h-[55vh] w-[55vw] rounded-full blur-[90px]"
        style={{
          background: "radial-gradient(circle, rgba(255,95,162,0.45), transparent 65%)",
          animation: "blob-drift 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -right-[8vw] top-[20vh] h-[50vh] w-[48vw] rounded-full blur-[90px]"
        style={{
          background: "radial-gradient(circle, rgba(200,166,255,0.36), transparent 65%)",
          animation: "blob-drift 27s ease-in-out infinite 3s",
        }}
      />
      <div
        className="absolute bottom-[-15vh] left-[25vw] h-[48vh] w-[50vw] rounded-full blur-[100px]"
        style={{
          background: "radial-gradient(circle, rgba(255,46,136,0.3), transparent 65%)",
          animation: "blob-drift 25s ease-in-out infinite 6s",
        }}
      />

      {/* floating hearts */}
      {hearts.map((h, i) => (
        <span
          key={i}
          className="absolute bottom-[-6vh] select-none will-change-transform"
          style={{ ...h.style, animationName: "heart-rise", animationIterationCount: "infinite", animationTimingFunction: "linear" }}
        >
          {h.glyph}
        </span>
      ))}
    </div>
  );
}
