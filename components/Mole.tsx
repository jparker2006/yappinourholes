"use client";

/**
 * Herman — the suited, watch-checking mole on the waiting screen.
 * A single hand-illustrated PNG (public/herman.png) with an impatient CSS
 * foot-tap so he feels alive without a frame-by-frame rig. Fully isolated:
 * swapping the art or adding more frames only touches this file.
 *
 * To upgrade to a real fidget loop later, drop in extra pose PNGs and cross-fade
 * them here — nothing else in the app needs to change.
 */
export default function Mole({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <style>{moleCss}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/herman.png"
        alt="Herman the mole, in a little suit, checking his wristwatch"
        className="mole-img"
        draggable={false}
      />
    </div>
  );
}

const moleCss = `
.mole-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform-origin: 50% 100%;
  animation: herman-tap 0.68s ease-in-out infinite;
  filter: drop-shadow(0 14px 24px rgba(150, 80, 110, 0.32));
  user-select: none;
}
/* impatient foot-tap: a small lift, a quick tap-down with a squash, then a beat of rest */
@keyframes herman-tap {
  0%, 100% { transform: translateY(0) scaleY(1); }
  10% { transform: translateY(-2px); }
  22% { transform: translateY(4px) scaleY(0.985); }
  34% { transform: translateY(0) scaleY(1); }
}
@media (prefers-reduced-motion: reduce) {
  .mole-img { animation: none; }
}
`;
