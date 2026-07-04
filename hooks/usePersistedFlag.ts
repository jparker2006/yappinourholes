"use client";

import { useCallback, useState } from "react";

/**
 * A boolean UI preference persisted to localStorage ("1"/"0"). Reads
 * synchronously on first render, so use it only in components that never
 * server-render (everything inside Room qualifies) to avoid hydration
 * mismatches.
 */
export function usePersistedFlag(key: string, initial = false): [boolean, () => void] {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? initial : saved === "1";
    } catch {
      return initial;
    }
  });

  const toggle = useCallback(() => {
    setValue((v) => {
      try {
        localStorage.setItem(key, v ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !v;
    });
  }, [key]);

  return [value, toggle];
}
