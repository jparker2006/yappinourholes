"use client";

/** Both seats are taken — a third visitor lands here. */
export default function RoomFull() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="panel rounded-[2rem] px-12 py-10">
        <p className="text-5xl">🫶</p>
        <p className="mt-3 text-2xl font-semibold text-petal-light">room&apos;s full</p>
        <p className="mt-1 text-sm text-petal/55">two hearts already in here 🩷</p>
      </div>
    </main>
  );
}
