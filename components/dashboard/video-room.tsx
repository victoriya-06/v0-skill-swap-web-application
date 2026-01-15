"use client"

import { useRef } from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, VideoOff, MessageCircle, Maximize2 } from "lucide-react"
import type { Profile } from "@/lib/types"

interface VideoRoomProps {
  matchId: string
  userId: string
  userProfile: Profile
  partner: Profile
  youTeach: string
  youLearn: string
}

export function VideoRoom({ matchId, userId, userProfile, partner, youTeach, youLearn }: VideoRoomProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [showStats, setShowStats] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const [debugLog, setDebugLog] = useState<string[]>([])

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const channelRef = useRef<any>(null)

  const partnerInitials = partner.display_name?.slice(0, 2).toUpperCase() || "??"
  const userInitials = userProfile?.display_name?.slice(0, 2).toUpperCase() || "??"
  const isOfferPeer = userId < partner.id

  const addDebug = (message: string) => {
    console.log("[v0]", message)
    setDebugLog((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const jitsiRoomId = `SkillSwap_${matchId.replace(/-/g, "_")}`

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://meet.jit.si/external_api.js"
    script.async = true
    document.body.appendChild(script)

    script.onload = () => {
      const jitsiContainer = document.getElementById("jitsi-container")
      if (!jitsiContainer || !(window as any).JitsiMeetExternalAPI) return

      const api = new (window as any).JitsiMeetExternalAPI("meet.jit.si", {
        roomName: jitsiRoomId,
        width: "100%",
        height: "100%",
        parentNode: jitsiContainer,
        userInfo: {
          displayName: userProfile.display_name || "User",
          email: userProfile.email,
        },
        configOverwrite: {
          defaultLanguage: "en",
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableSimulcast: false,
        },
        interfaceConfigOverwrite: {
          DEFAULT_BACKGROUND: "#1e293b",
          TOOLBAR_BUTTONS: ["microphone", "camera", "fullscreen", "hangup", "chat"],
          MOBILE_APP_PROMO: false,
          SHOW_WATERMARK: false,
        },
      })

      api.addEventListener("fullscreenChanged", (e: any) => {
        setIsFullscreen(e.fullscreen)
      })

      // Cleanup
      return () => {
        try {
          api.dispose()
        } catch (e) {
          console.error("Error disposing Jitsi API:", e)
        }
      }
    }

    return () => {
      script.remove()
    }
  }, [jitsiRoomId, userProfile])

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="bg-slate-800 rounded-2xl p-8 text-center max-w-md border border-slate-700">
          <VideoOff className="mx-auto h-16 w-16 text-slate-400 mb-4" />
          <p className="font-semibold text-slate-100 text-lg mb-2">Connection Error</p>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()} className="bg-primary hover:bg-primary/90">
              Try Again
            </Button>
            <Button variant="outline" className="border-slate-600 hover:bg-slate-800 bg-transparent" asChild>
              <Link href={`/dashboard/chat/${matchId}`} className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Use Chat
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-2rem)] flex-col bg-slate-900">
      {/* Header - only show when not fullscreen */}
      {!isFullscreen && (
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/50 px-4 py-3 backdrop-blur-sm z-50">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="hover:bg-slate-700" asChild>
              <Link href={`/dashboard/chat/${matchId}`}>
                <ArrowLeft className="h-5 w-5 text-slate-200" />
              </Link>
            </Button>
            <Avatar className="h-10 w-10 border-2 border-slate-600">
              <AvatarFallback className="bg-gradient-to-br from-primary to-pink-400 text-white font-semibold">
                {partnerInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-slate-100">{partner.display_name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-slate-700 text-slate-200 border-slate-600 text-xs h-5">
                  {youTeach}
                </Badge>
                <span className="text-xs text-slate-400">↔</span>
                <Badge variant="outline" className="bg-slate-700 text-slate-200 border-slate-600 text-xs h-5">
                  {youLearn}
                </Badge>
              </div>
            </div>
          </div>

          <Badge className="bg-gradient-to-r from-primary to-pink-400 text-white flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            100% Free
          </Badge>
        </div>
      )}

      {/* Video Area */}
      <div className="flex-1 relative bg-slate-950 overflow-hidden">
        {/* Jitsi Meet Container */}
        <div id="jitsi-container" className="w-full h-full" />

        {/* Fullscreen Helper Button */}
        {isFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 hover:bg-slate-700/50 text-slate-200 z-50"
            onClick={() => {
              try {
                if (document.fullscreenElement) {
                  document.exitFullscreen()
                } else {
                  document.documentElement.requestFullscreen()
                }
              } catch (e) {
                console.error("Fullscreen error:", e)
              }
            }}
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Free Badge for bottom display when fullscreen */}
      {isFullscreen && (
        <div className="absolute bottom-4 left-4 z-50">
          <Badge className="bg-gradient-to-r from-primary to-pink-400 text-white flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            100% Free Skill Exchange
          </Badge>
        </div>
      )}
    </div>
  )
}
