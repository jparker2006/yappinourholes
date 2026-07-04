"use client";

import { useState } from "react";

import { usePersistedFlag } from "@/hooks/usePersistedFlag";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

/**
 * The "install this app" nudge on the pre-join screen. Renders nothing once the
 * app is installed (standalone) or after the user dismisses it (persisted).
 * Android/Chromium get a one-tap native prompt; iOS Safari gets step-by-step
 * Add-to-Home-Screen instructions (it has no install API). If a native prompt
 * was offered but not taken, the card stays with a "use your browser menu" hint
 * rather than vanishing with no way back.
 */
export default function InstallCard() {
  const { installed, ios, canPrompt, everPromptable, promptInstall } = useInstallPrompt();
  const [dismissed, dismiss] = usePersistedFlag("yoh:install-dismissed");
  const [showIosSteps, setShowIosSteps] = useState(false);

  // nothing to offer: installed, dismissed, or a browser with no install path at
  // all (e.g. desktop Firefox that never fires beforeinstallprompt)
  if (installed || dismissed || (!canPrompt && !ios && !everPromptable)) return null;

  return (
    <div className="panel relative flex w-full max-w-md flex-col gap-3 rounded-[1.75rem] p-5 text-petal-light">
      <button
        onClick={dismiss}
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
      ) : canPrompt ? (
        <button
          className="cute-btn px-5 py-2.5 text-sm"
          onClick={async () => {
            const accepted = await promptInstall();
            if (accepted) dismiss();
          }}
        >
          install app 📲
        </button>
      ) : (
        // a prompt was offered earlier but consumed/declined — the browser won't
        // re-offer it soon, so point at its own install control
        <p className="rounded-2xl bg-night-2 p-3 text-sm text-petal/70 ring-1 ring-petal/10">
          you can still install from your browser menu — look for “Install app” or ⊕ in the address bar 🩷
        </p>
      )}
    </div>
  );
}
