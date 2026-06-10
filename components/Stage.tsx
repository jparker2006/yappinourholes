"use client";

import VideoTile from "@/components/VideoTile";
import { useRoom } from "@/lib/useRoom";

/**
 * The central media area. In movie-mode it's the shared screen, full-bleed and
 * letterboxed. Otherwise it's the two-camera grid. The cameras become PiP bubbles
 * (rendered by Room) during a share, so they're intentionally absent here then.
 */
export default function Stage() {
  const room = useRoom();
  const movie = room.sharing || room.peerSharing;

  if (movie) {
    // when I share, mute my own stage (I hear the real tab); the show volume slider
    // drives the partner's tab audio on the receiving end.
    const stream = room.sharing ? room.localScreenStream : room.remoteScreenStream;
    return (
      <div className="absolute inset-0 bg-black">
        {stream ? (
          <VideoTile stream={stream} muted={room.sharing} volume={room.showVolume} objectFit="contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-petal/50">
            waiting for the show… 🎬
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 grid grid-cols-1 content-center gap-3 p-4 pb-40 pt-20 lg:grid-cols-2">
      <GridTile stream={room.localStream} label={`${room.selfName} (you)`} muted mirror />
      {room.remoteCameraStream ? (
        <GridTile stream={room.remoteCameraStream} label={room.peerName} volume={room.voiceVolume} />
      ) : (
        <div className="panel flex aspect-video items-center justify-center rounded-2xl text-petal/50">
          reconnecting to {room.peerName} 💔
        </div>
      )}
    </div>
  );
}

function GridTile({
  stream,
  label,
  muted = false,
  mirror = false,
  volume = 1,
}: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  mirror?: boolean;
  volume?: number;
}) {
  return (
    <div className="panel relative aspect-video overflow-hidden rounded-2xl">
      <VideoTile stream={stream} muted={muted} mirror={mirror} volume={volume} />
      <span className="absolute bottom-2 left-2 rounded-full bg-night/70 px-3 py-1 text-xs text-petal-light backdrop-blur">
        {label}
      </span>
    </div>
  );
}
