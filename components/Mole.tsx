"use client";

/**
 * Herman — the suited, watch-checking mole on the waiting screen.
 * Two illustrated frames (foot up / foot down), registered onto a shared canvas,
 * hard-flipped to tap his foot. Isolated: swapping the art only touches this file.
 */
export default function Mole({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <style>{moleCss}</style>
      <img
        src="/herman.png"
        alt="Herman the mole, in a little suit, checking his wristwatch"
        className="mole-frame mole-up"
        draggable={false}
      />
      <img src="/herman2.png" alt="" aria-hidden className="mole-frame mole-down" draggable={false} />
    </div>
  );
}

const moleCss = `
.mole-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 14px 24px rgba(150, 80, 110, 0.32));
  user-select: none;
}
/* counter-phase hard flip: foot-up shown, then foot-down (the tap), repeat */
.mole-up { animation: herman-up 0.46s steps(1, end) infinite; }
.mole-down { animation: herman-down 0.46s steps(1, end) infinite; }
@keyframes herman-up {
  0% { opacity: 1; }
  56% { opacity: 0; }
  100% { opacity: 0; }
}
@keyframes herman-down {
  0% { opacity: 0; }
  56% { opacity: 1; }
  100% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .mole-up { opacity: 1; animation: none; }
  .mole-down { opacity: 0; animation: none; }
}
`;
