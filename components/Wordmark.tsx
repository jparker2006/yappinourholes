"use client";

/** The yappinourholes wordmark — static gradient text, ending in a period. */
export default function Wordmark({
  className = "",
  size = "text-5xl sm:text-6xl",
}: {
  className?: string;
  size?: string;
}) {
  return (
    <h1 className={`font-bold ${size} ${className}`}>
      <span className="bg-gradient-to-r from-blush-deep via-blush to-lilac bg-clip-text text-transparent text-glow">
        yappinourholes.
      </span>
    </h1>
  );
}
