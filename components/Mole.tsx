"use client";

/**
 * Herman — the suited, watch-checking mole on the waiting screen.
 * Two illustrated frames (foot up / foot down), registered onto a shared canvas,
 * hard-flipped to tap his foot. Hovering reveals an engraved brass nameplate below
 * him. Isolated: swapping the art only touches this file.
 */
export default function Mole({ className = "" }: { className?: string }) {
  return (
    <div className={`mole-root relative ${className}`}>
      <style>{moleCss}</style>
      <img
        src="/herman.png"
        alt="Herman the mole, in a little suit, checking his wristwatch"
        className="mole-frame mole-up"
        draggable={false}
      />
      <img src="/herman2.png" alt="" aria-hidden className="mole-frame mole-down" draggable={false} />

      <div className="mole-plaque" aria-hidden>
        <span className="mole-plaque-text">Mr. Herman S Sherman</span>
        <i className="mole-screw" style={{ top: 5, left: 6 }} />
        <i className="mole-screw" style={{ top: 5, right: 6 }} />
        <i className="mole-screw" style={{ bottom: 5, left: 6 }} />
        <i className="mole-screw" style={{ bottom: 5, right: 6 }} />
      </div>
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
.mole-up { animation: herman-up 0.6s steps(1, end) infinite; }
.mole-down { animation: herman-down 0.6s steps(1, end) infinite; }
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

/* ── engraved brass nameplate, revealed on hover ── */
.mole-plaque {
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translate(-50%, 4px) scale(0.96);
  opacity: 0;
  pointer-events: none;
  z-index: 20;
  white-space: nowrap;
  padding: 9px 26px;
  border-radius: 6px;
  border: 2px solid #6f5314;
  background:
    linear-gradient(180deg,
      #f7e7ab 0%, #eccf78 16%, #cda240 48%,
      #b8901f 58%, #cda445 78%, #e6c873 100%);
  box-shadow:
    inset 0 1px 1px rgba(255, 252, 230, 0.8),
    inset 0 -2px 3px rgba(80, 55, 8, 0.5),
    inset 2px 0 3px rgba(255, 250, 220, 0.25),
    0 7px 16px rgba(80, 50, 10, 0.38);
  transition: opacity 0.22s ease, transform 0.24s cubic-bezier(0.2, 1.4, 0.4, 1);
}
.mole-root:hover .mole-plaque {
  opacity: 1;
  transform: translate(-50%, 14px) scale(1);
}
.mole-plaque-text {
  font-family: var(--font-cinzel), Georgia, "Times New Roman", serif;
  font-weight: 700;
  letter-spacing: 0.09em;
  font-size: 0.92rem;
  line-height: 1;
  color: #463506;
  text-shadow: 0 -1px 0 rgba(60, 40, 6, 0.35), 0 1px 0 rgba(255, 248, 214, 0.65);
}
/* brass corner screws */
.mole-screw {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, #fff3c4 0%, #b89530 62%, #6f5413 100%);
  box-shadow: inset 0 0 0 1px rgba(70, 48, 8, 0.55), 0 1px 1px rgba(60, 40, 6, 0.4);
}
.mole-screw::after {
  content: "";
  position: absolute;
  inset: 0;
  margin: auto;
  width: 4px;
  height: 1px;
  background: rgba(60, 42, 8, 0.75);
  border-radius: 1px;
  transform: rotate(45deg);
}
`;
