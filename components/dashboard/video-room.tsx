"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Video, VideoOff, Mic, MicOff, PhoneOff, MessageCircle, Maximize, Minimize } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
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
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [noDevices, setNoDevices] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const partnerInitials = partner.display_name?.slice(0, 2).toUpperCase() || "??"
  const userInitials = userProfile?.display_name?.slice(0, 2).toUpperCase() || "??"

  useEffect(() => {
    const initWebRTC = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setNoDevices(true)
          setError("Your browser doesn't support video calls.")
          return
        }

        const devices = await navigator.mediaDevices.enumerateDevices()
        const hasVideo = devices.some((device) => device.kind === "videoinput")
        const hasAudio = devices.some((device) => device.kind === "audioinput")

        if (!hasVideo && !hasAudio) {
          setNoDevices(true)
          setError("No camera or microphone found on this device.")
          return
        }

        const constraints: MediaStreamConstraints = {
          video: hasVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
          audio: hasAudio ? { echoCancellation: true, noiseSuppression: true } : false,
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        setLocalStream(mediaStream)
        setIsVideoOn(hasVideo)
        setIsAudioOn(hasAudio)

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream
        }

        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
        })

        peerConnectionRef.current = peerConnection

        mediaStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, mediaStream)
        })

        peerConnection.ontrack = (event) => {
          console.log("[v0] Remote track received:", event.track.kind)
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0]
            setRemoteStream(event.streams[0])
          }
        }

        peerConnection.onconnectionstatechange = () => {
          console.log("[v0] Connection state:", peerConnection.connectionState)
          if (peerConnection.connectionState === "connected") {
            setConnectionStatus("connected")
          } else if (peerConnection.connectionState === "disconnected" || peerConnection.connectionState === "failed") {
            setConnectionStatus("disconnected")
          }
        }

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignal("ice-candidate", event.candidate)
          }
        }

        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)
        sendSignal("offer", offer)

        setConnectionStatus("connecting")
      } catch (err) {
        const mediaError = err as DOMException
        if (mediaError.name === "NotFoundError" || mediaError.name === "DevicesNotFoundError") {
          setNoDevices(true)
          setError("No camera or microphone found. You can still join audio-only or use chat.")
        } else if (mediaError.name === "NotAllowedError" || mediaError.name === "PermissionDeniedError") {
          setError("Camera/microphone access was denied. Please allow access in your browser settings.")
        } else {
          setNoDevices(true)
          setError("Unable to access camera/microphone. You can still use chat to communicate.")
        }
        console.error("[v0] Media error:", mediaError.name, mediaError.message)
      }
    }

    initWebRTC()

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const sendSignal = async (type: "offer" | "answer" | "ice-candidate", data: any) => {
    try {
      const supabase = createClient()
      await supabase.from("webrtc_signals").insert({
        match_id: matchId,
        from_user_id: userId,
        to_user_id: partner.id,
        signal_type: type,
        signal_data: data,
      })
    } catch (err) {
      console.error("[v0] Error sending signal:", err)
    }
  }

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`webrtc:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "webrtc_signals",
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          const signal = payload.new as any
          if (signal.from_user_id === partner.id) {
            await handleSignal(signal)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleSignal = async (signal: any) => {
    try {
      const peerConnection = peerConnectionRef.current
      if (!peerConnection) return

      console.log("[v0] Received signal:", signal.signal_type)

      if (signal.signal_type === "offer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.signal_data))
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)
        sendSignal("answer", answer)
      } else if (signal.signal_type === "answer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.signal_data))
      } else if (signal.signal_type === "ice-candidate") {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.signal_data))
        } catch (e) {
          console.error("[v0] Error adding ICE candidate:", e)
        }
      }
    } catch (err) {
      console.error("[v0] Error handling signal:", err)
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOn(videoTrack.enabled)
      }
    }
  }

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioOn(audioTrack.enabled)
      }
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
    window.history.back()
  }

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-8rem)] flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/chat/${matchId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">{partnerInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{partner.display_name}</p>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs h-5">
                  {youTeach}
                </Badge>
                <span className="text-xs text-muted-foreground">↔</span>
                <Badge variant="outline" className="text-xs h-5">
                  {youLearn}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connectionStatus === "connected" ? "default" : "secondary"} className="text-xs">
            {connectionStatus === "connected" ? "Connected" : "Connecting..."}
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/chat/${matchId}`} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-muted/50 overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="max-w-md">
              <CardContent className="p-6 text-center">
                <VideoOff className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 font-medium">{noDevices ? "No Camera Available" : "Camera Access Required"}</p>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                <div className="mt-4 flex gap-2 justify-center">
                  {!noDevices && <Button onClick={() => window.location.reload()}>Try Again</Button>}
                  <Button variant={noDevices ? "default" : "outline"} asChild>
                    <Link href={`/dashboard/chat/${matchId}`}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Use Chat Instead
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Remote Video (Main) */}
            <div className="absolute inset-0">
              {remoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <Avatar className="h-32 w-32 mx-auto">
                      <AvatarFallback className="bg-primary/10 text-primary text-4xl">{partnerInitials}</AvatarFallback>
                    </Avatar>
                    <p className="mt-4 text-lg font-medium">{partner.display_name}</p>
                    <p className="text-sm text-muted-foreground">Waiting for video stream...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute bottom-4 right-4 w-48 aspect-video rounded-lg overflow-hidden border-2 border-background shadow-lg">
              {isVideoOn && localStream ? (
                <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-muted flex items-center justify-center">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary/10 text-primary">{userInitials}</AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="border-t bg-background px-4 py-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={isAudioOn ? "outline" : "destructive"}
            size="lg"
            className="h-14 w-14 rounded-full"
            onClick={toggleAudio}
          >
            {isAudioOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
          <Button
            variant={isVideoOn ? "outline" : "destructive"}
            size="lg"
            className="h-14 w-14 rounded-full"
            onClick={toggleVideo}
          >
            {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
          <Button variant="destructive" size="lg" className="h-14 w-14 rounded-full" onClick={endCall}>
            <PhoneOff className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-14 w-14 rounded-full bg-transparent"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
