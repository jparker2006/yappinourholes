import type { Metadata } from "next";
import { Cinzel, Quicksand } from "next/font/google";
import "./globals.css";

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
  title: "yappinourholes",
  description: "our little room 🩷",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${quicksand.variable} ${cinzel.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
