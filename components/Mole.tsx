"use client";

/**
 * A suited mole checking his wristwatch, briefcase on the floor beside him.
 * Fully isolated: all geometry + the idle fidget loop (breathe, blink, check
 * watch, foot tap) live here behind `mole-` prefixed names, so iterating on the
 * art touches nothing else in the app. Hand-authored SVG, no Lottie.
 */
export default function Mole({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <style>{moleCss}</style>
      <svg viewBox="0 0 260 280" className="mole-svg h-full w-full" role="img" aria-label="a mole in a suit checking his watch">
        {/* ground shadow */}
        <ellipse cx="132" cy="270" rx="92" ry="12" fill="#000" opacity="0.22" />

        {/* briefcase on the floor */}
        <g className="mole-case">
          <rect x="20" y="214" width="64" height="46" rx="9" fill="#33264d" stroke="#4a3a6b" strokeWidth="2" />
          <path d="M38 214 q14 -16 28 0" fill="none" stroke="#4a3a6b" strokeWidth="4" strokeLinecap="round" />
          <rect x="44" y="232" width="16" height="10" rx="2" fill="#ff5fa2" />
        </g>

        {/* feet */}
        <ellipse id="mole-foot-l" cx="106" cy="258" rx="20" ry="11" fill="#6f5f80" />
        <ellipse id="mole-foot-r" cx="160" cy="258" rx="20" ry="11" fill="#6f5f80" />

        {/* breathing body */}
        <g id="mole-body">
          {/* ears */}
          <circle cx="74" cy="92" r="17" fill="#6f5f80" />
          <circle cx="190" cy="92" r="17" fill="#6f5f80" />
          <circle cx="74" cy="92" r="8" fill="#ffa6d5" opacity="0.7" />
          <circle cx="190" cy="92" r="8" fill="#ffa6d5" opacity="0.7" />

          {/* head + body blob */}
          <ellipse cx="132" cy="150" rx="80" ry="84" fill="#8b7a9b" />

          {/* suit jacket */}
          <path d="M70 196 Q132 176 194 196 L206 250 Q132 268 58 250 Z" fill="#241a38" />
          {/* shirt + lapels */}
          <path d="M132 188 L150 210 L132 244 L114 210 Z" fill="#fbeef6" />
          <path d="M132 188 L114 210 L96 200 Q108 188 132 188 Z" fill="#2f2347" />
          <path d="M132 188 L150 210 L168 200 Q156 188 132 188 Z" fill="#2f2347" />
          {/* tie */}
          <path d="M132 196 l7 9 -7 30 -7 -30 Z" fill="#ff5fa2" />
          <circle cx="132" cy="196" r="4" fill="#ff7ab8" />

          {/* muzzle */}
          <ellipse cx="132" cy="166" rx="34" ry="26" fill="#b9a7c9" />

          {/* cheeks */}
          <ellipse cx="86" cy="158" rx="15" ry="10" fill="#ff8fc7" opacity="0.45" />
          <ellipse cx="178" cy="158" rx="15" ry="10" fill="#ff8fc7" opacity="0.45" />

          {/* eyes (blink) */}
          <g className="mole-eye">
            <ellipse cx="106" cy="138" rx="9" ry="12" fill="#2a2036" />
            <circle cx="103" cy="133" r="3.2" fill="#fff0f7" />
          </g>
          <g className="mole-eye mole-eye-2">
            <ellipse cx="158" cy="138" rx="9" ry="12" fill="#2a2036" />
            <circle cx="155" cy="133" r="3.2" fill="#fff0f7" />
          </g>

          {/* nose + smile + whiskers */}
          <path d="M132 156 q9 2 6 9 q-6 7 -6 7 q0 0 -6 -7 q-3 -7 6 -9 Z" fill="#ff5fa2" />
          <path d="M120 180 q12 11 24 0" fill="none" stroke="#5a4a6b" strokeWidth="2.4" strokeLinecap="round" />
          <g stroke="#b9a7c9" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
            <line x1="98" y1="168" x2="70" y2="162" />
            <line x1="98" y1="174" x2="70" y2="176" />
            <line x1="166" y1="168" x2="194" y2="162" />
            <line x1="166" y1="174" x2="194" y2="176" />
          </g>

          {/* resting right arm */}
          <path d="M196 200 q22 10 18 36 q-3 12 -16 12 q-12 0 -12 -12" fill="#8b7a9b" />
          <circle cx="190" cy="246" r="12" fill="#b9a7c9" />

          {/* watch-checking left arm */}
          <g id="mole-arm">
            <path d="M70 198 q-30 8 -24 40 q4 18 26 16 q16 -2 14 -18" fill="#8b7a9b" />
            {/* paw */}
            <circle cx="92" cy="232" r="13" fill="#b9a7c9" />
            {/* wristwatch */}
            <rect x="74" y="216" width="10" height="26" rx="4" fill="#1c1530" transform="rotate(20 79 229)" />
            <circle cx="86" cy="222" r="9" fill="#1c1530" />
            <circle cx="86" cy="222" r="6.5" fill="#fff0f7" />
            <line x1="86" y1="222" x2="86" y2="218" stroke="#ff5fa2" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="86" y1="222" x2="89" y2="223" stroke="#ff5fa2" strokeWidth="1.5" strokeLinecap="round" />
            {/* twinkle off the watch */}
            <g className="mole-twinkle" transform="translate(100 210)">
              <path d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z" fill="#ffd9ee" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

const moleCss = `
.mole-svg { overflow: visible; }
#mole-body {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: mole-breathe 3.6s ease-in-out infinite;
}
.mole-eye {
  transform-box: fill-box;
  transform-origin: 50% 50%;
  animation: mole-blink 4.2s ease-in-out infinite;
}
.mole-eye-2 { animation-delay: 0.04s; }
#mole-arm {
  transform-box: fill-box;
  transform-origin: 85% 8%;
  animation: mole-check 5.6s ease-in-out infinite;
}
#mole-foot-r {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: mole-tap 2.9s ease-in-out infinite;
}
.mole-case {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: mole-breathe 3.6s ease-in-out infinite 0.6s;
}
.mole-twinkle {
  transform-box: fill-box;
  transform-origin: 50% 50%;
  animation: mole-twinkle 5.6s ease-in-out infinite;
}
@keyframes mole-breathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-3px) scale(1.025); }
}
@keyframes mole-blink {
  0%, 90%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.12); }
}
@keyframes mole-check {
  0%, 38%, 100% { transform: rotate(0deg); }
  55%, 80% { transform: rotate(-38deg); }
}
@keyframes mole-tap {
  0%, 68%, 100% { transform: translateY(0); }
  78% { transform: translateY(-4px); }
}
@keyframes mole-twinkle {
  0%, 45%, 100% { opacity: 0; transform: scale(0); }
  62% { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  #mole-body, .mole-eye, #mole-arm, #mole-foot-r, .mole-case, .mole-twinkle { animation: none; }
}
`;
