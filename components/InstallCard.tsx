"use client";

import { useState } from "react";

import { useInstallPrompt } from "@/hooks/useInstallPrompt";

/**
 * The "install this app" nudge on the pre-join screen. Renders nothing once the
 * app is installed (standalone) or after the user dismisses it. Android/Chromium
 * get a one-tap native prompt; iOS Safari gets step-by-step Add-to-Home-Screen
 * instructions (it has no install API).
 */
export default function InstallCard() {
  const { installed, ios, canPrompt, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);

  // nothing to offer: installed, dismissed, or a browser with neither a native
  // prompt nor iOS instructions to give (e.g. desktop Firefox)
  if (installed || dismissed || (!canPrompt && !ios)) return null;

  return (
    <div className="panel relative flex w-full max-w-md flex-col gap-3 rounded-[1.75rem] p-5 text-petal-light">
      <button
        onClick={() => setDismissed(true)}
        aria-label="dismiss install"
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-petal/50 transition hover:bg-blush/15 hover:text-petal active:scale-90"
      >
        ✕
      </button>

      <div className="flex items-center gap-3 pr-6">
        <span className="text-2xl" aria-hidden>
          🪷
        </span>
        <div>
          <p className="font-semibold">install yappinourholes</p>
          <p className="text-sm text-petal/70">pop it on your home screen so it opens like a real app 🩷</p>
        </div>
      </div>

      {ios ? (
        showIosSteps ? (
          <ol className="flex flex-col gap-2 rounded-2xl bg-night-2 p-4 text-sm text-petal-light ring-1 ring-petal/10">
            <li>
              1. tap the <strong>Share</strong> button{" "}
              <span aria-label="share" role="img">
                ⎋
              </span>{" "}
              at the bottom of Safari
            </li>
            <li>
              2. scroll down and tap <strong>Add to Home Screen</strong>{" "}
              <span aria-label="plus" role="img">
                ➕
              </span>
            </li>
            <li>
              3. tap <strong>Add</strong> — Herman lands on your home screen 🕊️
            </li>
          </ol>
        ) : (
          <button className="cute-btn px-5 py-2.5 text-sm" onClick={() => setShowIosSteps(true)}>
            how do I install? 📲
          </button>
        )
      ) : (
        <button
          className="cute-btn px-5 py-2.5 text-sm"
          onClick={async () => {
            const accepted = await promptInstall();
            if (accepted) setDismissed(true);
          }}
        >
          install app 📲
        </button>
      )}
    </div>
  );
}
