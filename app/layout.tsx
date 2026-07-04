import type { Metadata, Viewport } from "next";
import { Cinzel, Quicksand } from "next/font/google";
import "./globals.css";
import ServiceWorker from "@/components/ServiceWorker";
import { BRAND_PINK } from "@/lib/config";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// engraved Roman serif for Herman's brass nameplate
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "yappinourholes.",
  description: "our little room 🩷",
  applicationName: "yappinourholes.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "yoh",
    statusBarStyle: "black-translucent",
  },
  // favicon + apple-touch-icon come from the app/icon.png and app/apple-icon.png
  // file conventions automatically — don't also declare them here or the <head>
  // gets duplicate, out-of-sync <link> tags.
};

// viewport-fit=cover lets the movie stage bleed under phone notches; the bars
// pad themselves back out with env(safe-area-inset-*)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: BRAND_PINK,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${quicksand.variable} ${cinzel.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ServiceWorker />
        {children}
      </body>
    </html>
  );
}
