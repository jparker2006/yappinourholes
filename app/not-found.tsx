import Link from "next/link";

// On-brand 404 (replaces Next's default white page).
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="text-6xl">🕳️</p>
      <h1 className="text-2xl font-bold text-petal-light text-glow">lost in the burrow</h1>
      <p className="text-sm text-petal/60">that page wandered off somewhere…</p>
      <Link href="/" className="cute-btn px-6 py-3 text-base">
        take me home 🩷
      </Link>
    </main>
  );
}
