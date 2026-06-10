import type { Seat } from "@/lib/config";

export type { Seat };

export type ConnectionStatus =
  | "idle" // before joining (pre-join screen)
  | "connecting" // acquiring media + claiming a seat
  | "waiting" // in the room, signaling up, but alone
  | "connected" // partner present, media flowing
  | "reconnecting" // lost the partner or signaling, recovering
  | "room-full" // both seats taken by other people
  | "error"; // fatal (e.g. camera/mic denied)

/**
 * The immutable snapshot React reads via useSyncExternalStore. The RoomManager
 * replaces this object wholesale on every change, so reference equality drives
 * re-renders. Streams are included by reference — a new stream = a new snapshot.
 */
export type RoomSnapshot = {
  status: ConnectionStatus;
  seat: Seat | null;
  deviceId: string;

  // resolved display names
  selfName: string;
  peerName: string;
  peerPresent: boolean;

  // local media toggles
  micEnabled: boolean;
  camEnabled: boolean;

  // sharing
  sharing: boolean; // I am sharing
  peerSharing: boolean; // partner is sharing

  // per-remote volumes (0..1)
  voiceVolume: number;
  showVolume: number;

  // streams
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  remoteCameraStream: MediaStream | null;
  remoteScreenStream: MediaStream | null;
};

export const INITIAL_SNAPSHOT: RoomSnapshot = {
  status: "idle",
  seat: null,
  deviceId: "",
  selfName: "cutie",
  peerName: "your person",
  peerPresent: false,
  micEnabled: false,
  camEnabled: false,
  sharing: false,
  peerSharing: false,
  voiceVolume: 1,
  showVolume: 1,
  localStream: null,
  localScreenStream: null,
  remoteCameraStream: null,
  remoteScreenStream: null,
};

/** Discrete fire-and-forget events the UI subscribes to (confetti, emoji bursts). */
export type RoomEventMap = {
  "peer-joined": void;
  "peer-left": void;
  emoji: { glyph: string; id: string; seed: number };
  toast: string;
};
