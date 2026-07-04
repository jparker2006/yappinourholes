"use client";

import { getRoomManager, useRoom } from "@/lib/useRoom";

/**
 * The two per-remote volume sliders. "voice" controls the partner's mic (their
 * camera/PiP element); "show" controls the tab audio (the share stage element).
 * Both are plain HTMLMediaElement.volume under the hood — no Web Audio.
 */
export default function VolumeSliders() {
  const room = useRoom();
  const manager = getRoomManager();

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <Slider
        icon="🗣️"
        title="their voice"
        value={room.voiceVolume}
        onChange={(v) => manager.setVoiceVolume(v)}
      />
      {room.peerSharing && (
        <Slider
          icon="🎬"
          title="the show"
          value={room.showVolume}
          onChange={(v) => manager.setShowVolume(v)}
        />
      )}
    </div>
  );
}

function Slider({
  icon,
  title,
  value,
  onChange,
}: {
  icon: string;
  title: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-2" title={title}>
      <button
        onClick={() => onChange(value > 0 ? 0 : 1)}
        className="grid h-9 w-9 flex-none place-items-center rounded-full text-base leading-none transition hover:bg-blush/15 active:scale-90"
        title={value > 0 ? "mute" : "unmute"}
      >
        {value === 0 ? "🔇" : icon}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-20 sm:w-24"
      />
    </label>
  );
}
