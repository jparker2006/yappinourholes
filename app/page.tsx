"use client";

import AmbientBackground from "@/components/AmbientBackground";
import Confetti from "@/components/Confetti";
import PreJoin from "@/components/PreJoin";
import Room from "@/components/Room";
import RoomFull from "@/components/RoomFull";
import ShareToast from "@/components/ShareToast";
import WaitingScreen from "@/components/WaitingScreen";
import { useRoom } from "@/lib/useRoom";

export default function Page() {
  const room = useRoom();

  let content: React.ReactNode;
  switch (room.status) {
    case "room-full":
      content = <RoomFull />;
      break;
    case "waiting":
      content = <WaitingScreen />;
      break;
    case "connected":
    case "reconnecting":
      content = <Room />;
      break;
    default: // idle, connecting, error → pre-join
      content = <PreJoin />;
  }

  return (
    <>
      {/* ambient pauses the instant anyone is sharing (movie-mode) */}
      <AmbientBackground paused={room.sharing || room.peerSharing} />
      <Confetti />
      <ShareToast />
      {content}
    </>
  );
}
