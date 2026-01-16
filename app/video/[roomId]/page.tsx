"use client";

export default function VideoPage({
  params,
}: {
  params: { roomId: string };
}) {
  const roomId = params.roomId;

  return (
    <div className="fixed inset-0 bg-black">
      <iframe
        src={`https://meet.jit.si/${roomId}?config.prejoinPageEnabled=false&config.enableLobby=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`}
        allow="camera; microphone; fullscreen; display-capture"
        allowFullScreen
        className="w-full h-full border-0"
      />

      <div className="absolute top-4 right-4 bg-pink-600 text-white text-sm px-3 py-1 rounded-full z-10">
        100% Free Skill Exchange
      </div>
    </div>
  );
}
