import type { RoomManager } from "./room/RoomManager";

/**
 * Sound seam for v1 (intentionally silent). The RoomManager already emits the
 * discrete events we'd want sounds for — join chimes, emoji pops — so adding audio
 * later is just: drop files in /public/sounds, flip SOUNDS_ENABLED, and fill in the
 * map below. Wire it by calling attachSounds(getRoomManager()) once after mount.
 */

const SOUNDS_ENABLED = false;

const SOUND_SRC = {
  join: "", // e.g. "/sounds/join.mp3"
  emoji: "", // e.g. "/sounds/pop.mp3"
} as const;

function play(src: string) {
  if (!SOUNDS_ENABLED || !src) return;
  try {
    const a = new Audio(src);
    a.volume = 0.5;
    void a.play();
  } catch {
    /* autoplay/codec — ignore */
  }
}

/** Subscribe sounds to room events. No-op while SOUNDS_ENABLED is false. */
export function attachSounds(manager: RoomManager): () => void {
  const offJoin = manager.on("peer-joined", () => play(SOUND_SRC.join));
  const offEmoji = manager.on("emoji", () => play(SOUND_SRC.emoji));
  return () => {
    offJoin();
    offEmoji();
  };
}
