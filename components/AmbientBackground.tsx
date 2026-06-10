"use client";

/**
 * The background is now a plain baby-pink (set on <body> in globals.css), so there
 * are no drifting blobs / floating hearts to render. Kept as a no-op with the same
 * signature so callers don't need to change — and so decorative ambient could be
 * reintroduced here later without touching the rest of the app.
 */
export default function AmbientBackground(_props: { paused?: boolean }) {
  return null;
}
