import type { Metadata, Viewport } from "next";
import { Cinzel, Quicksand } from "next/font/google";
import "./globals.css";
import ServiceWorker from "@/components/ServiceWorker";

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
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

// viewport-fit=cover lets the movie stage bleed under phone notches; the bars
// pad themselves back out with env(safe-area-inset-*)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fad2dd",
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
