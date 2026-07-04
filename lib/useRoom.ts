"use client";

import { useEffect, useSyncExternalStore } from "react";
import { RoomManager } from "./room/RoomManager";

// One manager for the whole app. Created lazily; the constructor touches no
// browser APIs, so it's safe to instantiate during SSR of this client tree.
let _manager: RoomManager | null = null;

export function getRoomManager(): RoomManager {
  if (!_manager) {
    _manager = new RoomManager();
    // dev-only escape hatch so UI states (movie-mode etc.) can be driven from
    // the console / browser automation without a second peer
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__yohManager = _manager;
    }
  }
  return _manager;
}

/** Subscribe a component to the reactive room snapshot. */
export function useRoom() {
  const m = getRoomManager();
  const snapshot = useSyncExternalStore(m.subscribe, m.getSnapshot, m.getServerSnapshot);
  // hydrate localStorage identity once, after first paint (avoids SSR mismatch)
  useEffect(() => {
    m.hydrate();
  }, [m]);
  return snapshot;
}
