// One-off PWA icon generator. Composites the Herman mascot (public/herman.png,
// transparent) onto the blush-pink brand background at a few sizes.
//
//   npm run gen:icons
//
// BG below mirrors BRAND_PINK in lib/config.ts / --color-babypink in
// app/globals.css — keep them in sync (this is a plain Node script, so the hex
// is duplicated rather than imported from the TS module).
//
// Outputs (committed to the repo):
//   public/icon-192.png            192x192  "any"
//   public/icon-512.png            512x512  "any"
//   public/icon-maskable-512.png   512x512  "maskable" (Herman inside the
//                                  ~80% safe zone so Android's circle/squircle
//                                  masks never crop him)
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "public", "herman.png");
const BG = { r: 0xfa, g: 0xd2, b: 0xdd, alpha: 1 }; // --color-babypink

// Trim the transparent margin so scaling is driven by Herman himself, not the
// source's whitespace, then fit him into `content` px of a `size` px pink tile.
async function makeIcon(size, contentFrac, out) {
  const content = Math.round(size * contentFrac);
  const mascot = await sharp(SRC)
    .trim()
    .resize(content, content, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: mascot, gravity: "centre" }])
    .png()
    .toFile(join(root, "public", out));
  console.log("wrote", out, `${size}x${size}`, `content≈${content}px`);
}

// "any" icons: Herman fills most of the tile (small breathing margin).
await makeIcon(192, 0.84, "icon-192.png");
await makeIcon(512, 0.84, "icon-512.png");
// maskable: Herman kept inside the ~80% safe zone (10% inset each side).
await makeIcon(512, 0.66, "icon-maskable-512.png");
