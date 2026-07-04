/**
 * All the knobs in one place. No env vars — this is a private two-person app and
 * everything here is intentionally baked into the client bundle.
 */

// ─── identity / room ───────────────────────────────────────────────
// Long, obscure, app-specific slug. The two seat IDs and the handshake token are
// derived from it, so strangers can't trivially collide with us on PeerJS's public
// broker. NOTE: this is obscurity, not security — anyone who reads the bundle can
// see it. The handshake token (below) is the real backstop against a leaked link.
export const APP_SLUG = "yoh-9f4c7a1e6b2d80553ce1";

export type Seat = "a" | "b";

// The two seats. First browser to arrive claims `a` (and becomes the caller),
// the second claims `b`. A third finds both taken → "room's full".
export const SEAT_IDS: Record<Seat, string> = {
  a: `${APP_SLUG}-a`,
  b: `${APP_SLUG}-b`,
};

// FNV-1a → hex, deterministic. Used to derive the handshake token from the slug so
// there's a single source of truth.
function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// Shared secret presented over the data channel on connect. A peer that doesn't
// present this exact token is silently dropped.
export const HANDSHAKE_TOKEN =
  fnv1aHex(APP_SLUG + "::handshake::v1") + fnv1aHex(APP_SLUG + "::salt::42");

// ─── ICE (STUN now; single seam for TURN later) ─────────────────────
// If we ever fail to connect (symmetric NAT / CGNAT), paste Cloudflare TURN
// credentials as additional entries here — nothing else needs to change.
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// ─── connection / reconnection timing (tunable) ─────────────────────
export const CONNECT = {
  /** seat A re-attempts the outbound connect to seat B on this cadence */
  RETRY_INTERVAL_MS: 2500,
  /** abandon a single connect attempt that hasn't opened in this long */
  ATTEMPT_TIMEOUT_MS: 6000,
  /** backoff for re-claiming a seat / reconnecting signaling */
  REJOIN_BASE_MS: 800,
  REJOIN_MAX_MS: 8000,
  /** when reclaiming our previous seat, tolerate our own lingering zombie id */
  RECLAIM_RETRIES: 5,
  RECLAIM_DELAY_MS: 1500,
  /** after losing the partner, fall back from "reconnecting 💔" to the mole */
  GIVEUP_TO_WAITING_MS: 15000,
};

// Heartbeat thresholds — tune sensitivity here without spelunking (wired in M6).
export const HEARTBEAT = {
  PING_INTERVAL_MS: 3000,
  /** consider the peer dead after this many consecutive missed pongs */
  MISSED_PONG_LIMIT: 2,
};

// ─── media constraints ──────────────────────────────────────────────
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: "user",
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

// Shared tab: cap at 1080p / 30fps. Tab audio only works when sharing a Chrome TAB.
export const SCREEN_CONSTRAINTS: DisplayMediaStreamOptions = {
  video: {
    width: { max: 1920 },
    height: { max: 1080 },
    frameRate: { ideal: 30, max: 30 },
  },
  audio: true,
};

// ─── movie-mode PiP bubbles ─────────────────────────────────────────
export const PIP = {
  /** bubble width bounds (px, 16:9 aspect) */
  MIN_W: 96,
  MAX_W: 560,
  /** gap kept between a bubble and the stage edge (px) */
  MARGIN: 12,
  /** a bubble may never exceed these fractions of the stage width/height */
  MAX_STAGE_W: 0.44,
  MAX_STAGE_H: 0.4,
};

// ─── reactions ──────────────────────────────────────────────────────
export const EMOJIS = ["😭", "😍", "🕊️", "😛", "😚", "😡", "❤️", "🔥", "👀", "🥺"] as const;
export const SPECIAL_EMOJI = "❤️"; // bigger + sparkle trail

// ─── names ──────────────────────────────────────────────────────────
export const DEFAULT_SELF_NAME = "cutie";
export const DEFAULT_PEER_NAME = "your person";
