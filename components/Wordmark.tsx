"use client";

/** The yappinourholes wordmark: gradient pink text with a glow and a bobbing heart. */
export default function Wordmark({
  className = "",
  size = "text-5xl sm:text-6xl",
}: {
  className?: string;
  size?: string;
}) {
  return (
    <h1 className={`flex items-center gap-2 font-bold ${size} ${className}`}>
      <span className="animate-float-slow inline-block bg-gradient-to-r from-petal via-blush to-lilac bg-clip-text text-transparent text-glow">
        yappinourholes
      </span>
      <span className="animate-bob inline-block" aria-hidden>
        🩷
      </span>
    </h1>
  );
}
