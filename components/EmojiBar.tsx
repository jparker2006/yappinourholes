"use client";

import { EMOJIS } from "@/lib/config";
import { getRoomManager } from "@/lib/useRoom";

/**
 * The fixed reaction row. Mash away — each tap launches one flyer on both screens.
 * Scrolls horizontally when the screen is too narrow for the whole set; the eye
 * toggle at the end hides/shows the flying reactions on this screen only.
 */
export default function EmojiBar({
  reactionsHidden,
  onToggleReactions,
}: {
  reactionsHidden: boolean;
  onToggleReactions: () => void;
}) {
  const manager = getRoomManager();

  return (
    <div className="panel flex max-w-[min(94vw,32rem)] items-center rounded-full px-1.5 py-1.5">
      <div className="scrollbar-none flex items-center gap-1 overflow-x-auto px-1">
        {EMOJIS.map((glyph) => (
          <button
            key={glyph}
            onClick={() => manager.sendEmoji(glyph)}
            className="grid h-10 w-10 flex-none place-items-center rounded-full text-xl transition-transform duration-100 hover:scale-125 hover:bg-blush/15 active:scale-90"
            aria-label={`react ${glyph}`}
          >
            {glyph}
          </button>
        ))}
      </div>

      <span className="mx-1 h-6 w-px flex-none bg-petal/15" />

      <button
        onClick={onToggleReactions}
        aria-pressed={reactionsHidden}
        title={reactionsHidden ? "show reactions" : "hide reactions"}
        aria-label={reactionsHidden ? "show reactions" : "hide reactions"}
        className={`grid h-10 w-10 flex-none place-items-center rounded-full text-lg transition active:scale-90 ${
          reactionsHidden
            ? "bg-blush/25 text-petal-light ring-1 ring-blush/50"
            : "opacity-70 hover:bg-blush/15 hover:opacity-100"
        }`}
      >
        {reactionsHidden ? "🙈" : "👁️"}
      </button>
    </div>
  );
}
