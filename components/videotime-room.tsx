"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

interface VideoTimeRoomProps {
  roomId: string
}

export function VideoTimeRoom({ roomId }: VideoTimeRoomProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const VIDEO_SERVER_DOMAIN = process.env.NEXT_PUBLIC_VIDEO_SERVER_DOMAIN || "meet.jit.si"

    // Build iframe URL with configuration options to disable lobby and prejoin
    const iframeUrl = new URL(`https://${VIDEO_SERVER_DOMAIN}/${roomId}`)
    iframeUrl.searchParams.append("config.prejoinPageEnabled", "false")
    iframeUrl.searchParams.append("config.enableLobby", "false")
    iframeUrl.searchParams.append("config.startWithAudioMuted", "false")
    iframeUrl.searchParams.append("config.startWithVideoMuted", "false")

    if (iframeRef.current) {
      iframeRef.current.src = iframeUrl.toString()
      setIsLoading(false)
    }
  }, [roomId])

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
            <p className="text-white text-sm font-medium">Connecting to VideoTime...</p>
          </div>
        </div>
      )}

      {/* Video iframe - fullscreen embedded video conference */}
      <iframe
        ref={iframeRef}
        allow="camera; microphone; fullscreen; display-capture"
        className="w-full h-full border-0"
        title="VideoTime Video Conference"
      />

      {/* Top-right badge with VideoTime branding */}
      <div className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/10">
        <p className="text-white text-xs font-medium tracking-tight">
          VideoTime <span className="text-pink-400 mx-1">•</span> 100% Free Skill Exchange
        </p>
      </div>
    </div>
  )
}
