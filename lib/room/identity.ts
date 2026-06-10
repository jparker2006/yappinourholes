import type { Seat } from "@/lib/config";
import type { NameMap } from "./protocol";

/**
 * Browser-local identity + name persistence. Each browser gets a stable random
 * deviceId; names are stored as a deviceId→{name,ts} map and reconciled by
 * last-write-wins. All functions are no-ops / safe defaults outside the browser.
 */

const DEVICE_KEY = "yoh:deviceId";
const NAMES_KEY = "yoh:names";
const PEER_KEY = "yoh:peerDeviceId";
const SEAT_KEY = "yoh:lastSeat";

function hasWindow() {
  return typeof window !== "undefined";
}

export function getDeviceId(): string {
  if (!hasWindow()) return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function loadNames(): NameMap {
  if (!hasWindow()) return {};
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    return raw ? (JSON.parse(raw) as NameMap) : {};
  } catch {
    return {};
  }
}

export function saveNames(map: NameMap): void {
  if (!hasWindow()) return;
  try {
    localStorage.setItem(NAMES_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode — names just won't persist */
  }
}

/** Last known partner deviceId, so the other person can be renamed while offline. */
export function loadPeerDeviceId(): string | null {
  if (!hasWindow()) return null;
  return localStorage.getItem(PEER_KEY);
}

export function savePeerDeviceId(id: string): void {
  if (!hasWindow()) return;
  try {
    localStorage.setItem(PEER_KEY, id);
  } catch {
    /* ignore */
  }
}

/** The seat we last held, so we can prefer reclaiming it (zombie-tolerant) on rejoin. */
export function loadLastSeat(): Seat | null {
  if (!hasWindow()) return null;
  const v = localStorage.getItem(SEAT_KEY);
  return v === "a" || v === "b" ? v : null;
}

export function saveLastSeat(seat: Seat): void {
  if (!hasWindow()) return;
  try {
    localStorage.setItem(SEAT_KEY, seat);
  } catch {
    /* ignore */
  }
}

/**
 * Last-write-wins merge of `incoming` into `base`. Returns a new map and whether
 * anything actually changed (so callers can skip needless re-renders).
 */
export function mergeNames(
  base: NameMap,
  incoming: NameMap,
): { merged: NameMap; changed: boolean } {
  const merged: NameMap = { ...base };
  let changed = false;
  for (const [deviceId, entry] of Object.entries(incoming)) {
    const cur = merged[deviceId];
    if (!cur || entry.ts > cur.ts) {
      merged[deviceId] = entry;
      changed = true;
    }
  }
  return { merged, changed };
}
