/**
 * The one and only data-channel message protocol — a discriminated union so every
 * message kind (handshake, heartbeat, emoji, names, share state) is defined in one
 * place and exhaustively type-checked at both ends.
 */

/** A single person's name + the wall-clock time it was last written (for LWW). */
export type NameEntry = { name: string; ts: number };

/** deviceId → name entry. Both browsers keep this and reconcile it via LWW. */
export type NameMap = Record<string, NameEntry>;

export type DataMessage =
  // initiator → responder, first thing sent once the channel opens
  | { t: "hello"; token: string; deviceId: string; names: NameMap }
  // responder → initiator, after a valid token
  | { t: "ack"; deviceId: string; names: NameMap }
  // heartbeat (M6)
  | { t: "ping"; seq: number }
  | { t: "pong"; seq: number }
  // a flying reaction — seed drives identical randomized drift on both screens
  | { t: "emoji"; glyph: string; id: string; seed: number }
  // a name was set (either your own, or a rename of the other person)
  | { t: "name-update"; deviceId: string; name: string; ts: number }
  // sharer announces start/stop so both sides flip into/out of movie-mode
  | { t: "share-state"; sharing: boolean };

export type EmojiMessage = Extract<DataMessage, { t: "emoji" }>;
