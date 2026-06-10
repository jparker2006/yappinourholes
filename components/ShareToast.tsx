"use client";

import { useEffect, useState } from "react";
import { getRoomManager } from "@/lib/useRoom";

/** Small transient messages from the manager (tab-audio reminder, share take-over). */
export default function ShareToast() {
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);

  useEffect(() => {
    return getRoomManager().on("toast", (msg) => {
      const id = crypto.randomUUID();
      setToasts((t) => [...t, { id, msg }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-[60] flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-pop-in panel max-w-sm rounded-full px-5 py-2.5 text-center text-sm text-petal-light"
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
