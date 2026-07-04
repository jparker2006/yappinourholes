"use client";

import { useEffect } from "react";

/**
 * Registers the app-shell service worker (public/sw.js). Renders nothing.
 *
 * Only registers in production over a secure context — a dev-mode SW would
 * serve stale HMR chunks, and browsers only allow SWs on https/localhost.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    let cancelled = false;
    const register = () => {
      if (cancelled) return;
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          /* registration is best-effort; the app works without it */
        });
    };

    // wait for load so the SW install never competes with first paint
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
