"use client"

import { useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"

interface JitsiMeetProps {
  roomId: string
  displayName?: string
}

export function JitsiMeet({ roomId, displayName = "SkillSwap User" }: JitsiMeetProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Load Jitsi Meet script dynamically
    const script = document.createElement("script")
    script.src = "https://meet.jit.si/external_api.js"
    script.async = true

    script.onload = () => {
      if (window.JitsiMeetExternalAPI) {
        const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
          roomName: roomId,
          width: "100%",
          height: "100%",
          parentNode: containerRef.current,
          configOverwrite: {
            prejoinPageEnabled: false,
            enableLobby: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableModeratorIndicator: true,
            enableWelcomePage: false,
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
            SHOW_JITSI_WATERMARK: false,
            DEFAULT_BACKGROUND: "#1a1a1a",
          },
          userInfo: {
            displayName: displayName,
          },
        })

        return () => {
          api.dispose()
        }
      }
    }

    document.body.appendChild(script)

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [roomId, displayName])

  return (
    <div className="relative w-full h-screen bg-slate-900">
      {/* Badge */}
      <div className="absolute top-6 right-6 z-50">
        <Badge className="gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90">
          <Sparkles className="h-3.5 w-3.5" />
          100% Free Skill Exchange
        </Badge>
      </div>

      {/* Jitsi Meet container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
