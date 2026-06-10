"use client";

import { EMOJIS } from "@/lib/config";
import { getRoomManager } from "@/lib/useRoom";

/** The fixed reaction row. Mash away — each tap launches one flyer on both screens. */
export default function EmojiBar() {
  const manager = getRoomManager();

  return (
    <div className="panel flex items-center gap-1 rounded-full px-2.5 py-1.5">
      {EMOJIS.map((glyph) => (
        <button
          key={glyph}
          onClick={() => manager.sendEmoji(glyph)}
          className="grid h-9 w-9 place-items-center rounded-full text-xl transition-transform duration-100 hover:scale-125 hover:bg-blush/15 active:scale-90"
          aria-label={`react ${glyph}`}
        >
          {glyph}
        </button>
      ))}
    </div>
  );
}
