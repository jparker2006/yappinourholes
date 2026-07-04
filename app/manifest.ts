import type { MetadataRoute } from "next";

import { BRAND_PINK } from "@/lib/config";

// Served at /manifest.webmanifest. Static (no request-time APIs), so Next
// caches it. Herman + the blush-pink theme make it feel like the real app once
// installed to a home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "yappinourholes.",
    short_name: "yoh",
    description: "our little room 🩷 — a private two-person watch-together",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: BRAND_PINK,
    theme_color: BRAND_PINK,
    categories: ["social", "entertainment"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
