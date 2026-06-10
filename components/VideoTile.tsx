"use client";

import { useEffect, useRef } from "react";

/**
 * Attaches a MediaStream to a <video> and keeps muted/volume in sync. Used for the
 * local preview, the camera tiles, the PiP bubbles, and the main share stage.
 *
 * `volume` only matters for unmuted remote tiles — it's how the two per-remote
 * sliders (voice vs show) control audio without any Web Audio graph.
 */
export default function VideoTile({
  stream,
  muted = false,
  volume = 1,
  mirror = false,
  className = "",
  objectFit = "cover",
}: {
  stream: MediaStream | null;
  muted?: boolean;
  volume?: number;
  mirror?: boolean;
  className?: string;
  objectFit?: "cover" | "contain";
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = muted;
    el.volume = Math.max(0, Math.min(1, volume));
  }, [muted, volume]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={className}
      style={{
        objectFit,
        transform: mirror ? "scaleX(-1)" : undefined,
        width: "100%",
        height: "100%",
      }}
    />
  );
}
