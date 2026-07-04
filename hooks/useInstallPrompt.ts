"use client";

import { useEffect, useState } from "react";

// Chrome/Android fire this before showing their install banner; capturing it
// lets us defer the prompt to our own button. Not in lib.dom yet.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState = {
  /** installed / running as a standalone app → hide all install UI */
  installed: boolean;
  /** iOS Safari, which has no beforeinstallprompt → show manual instructions */
  ios: boolean;
  /** a native prompt is captured and ready to fire (Android/Chromium) */
  canPrompt: boolean;
  /** fire the captured native prompt; resolves true if the user accepted */
  promptInstall: () => Promise<boolean>;
};

function standalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's non-standard flag
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Cross-platform install affordance. Android/Chromium expose a deferrable
 * `beforeinstallprompt`; iOS Safari exposes nothing, so callers fall back to
 * manual "Add to Home Screen" instructions when `ios` is true.
 */
export function useInstallPrompt(): InstallState {
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setInstalled(standalone());
    const ua = window.navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports as a Mac but has touch
      (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
    setIos(isIOS && isSafari);

    const onBeforePrompt = (e: Event) => {
      e.preventDefault(); // stop the mini-infobar; we drive the prompt ourselves
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    const mq = window.matchMedia("(display-mode: standalone)");
    const onDisplayChange = () => setInstalled(standalone());

    window.addEventListener("beforeinstallprompt", onBeforePrompt);
    window.addEventListener("appinstalled", onInstalled);
    mq.addEventListener("change", onDisplayChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforePrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mq.removeEventListener("change", onDisplayChange);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null); // a captured prompt can only be used once
    return outcome === "accepted";
  };

  return { installed, ios, canPrompt: deferred !== null, promptInstall };
}
