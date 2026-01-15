"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MessageCircle,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
} from "lucide-react"
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
  const [showStats, setShowStats] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [noDevices, setNoDevices] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const [debugLog, setDebugLog] = useState<string[]>([])

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const signalSubscriptionRef = useRef<any>(null)

  const partnerInitials = partner.display_name?.slice(0, 2).toUpperCase() || "??"
  const userInitials = userProfile?.display_name?.slice(0, 2).toUpperCase() || "??"
  const isOfferPeer = userId < partner.id

  const addDebug = (message: string) => {
    console.log("[v0]", message)
    setDebugLog((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const initWebRTC = async () => {
      try {
        addDebug(`Initializing WebRTC (${isOfferPeer ? "offer" : "answer"} peer)`)

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setNoDevices(true)
          setError("Your browser doesn't support video calls.")
          addDebug("Browser doesn't support mediaDevices")
          return
        }

        let mediaStream: MediaStream | null = null
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            },
          })
          addDebug(
            `Media acquired - Video: ${mediaStream.getVideoTracks().length}, Audio: ${mediaStream.getAudioTracks().length}`,
          )
        } catch (err) {
          const mediaError = err as DOMException
          addDebug(`getUserMedia error: ${mediaError.name} - ${mediaError.message}`)

          if (mediaError.name === "NotFoundError" || mediaError.name === "DevicesNotFoundError") {
            addDebug("Camera not found, trying audio only...")
            try {
              mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
              addDebug(`Fallback: Audio only - Audio tracks: ${mediaStream.getAudioTracks().length}`)
            } catch (audioErr) {
              const audioError = audioErr as DOMException
              setNoDevices(true)
              setError(`No devices found: ${audioError.message}`)
              addDebug(`No audio device found either: ${audioError.message}`)
              return
            }
          } else if (mediaError.name === "NotAllowedError" || mediaError.name === "PermissionDeniedError") {
            setError("Camera/microphone access was denied. Please allow access in your browser settings.")
            addDebug("Permission denied error")
            return
          } else {
            setNoDevices(true)
            setError(`Unable to access media: ${mediaError.message}`)
            addDebug(`Unexpected media error: ${mediaError.message}`)
            return
          }
        }

        if (!mediaStream) {
          setError("Failed to get media stream")
          return
        }

        setLocalStream(mediaStream)
        setIsVideoOn(mediaStream.getVideoTracks().length > 0)
        setIsAudioOn(mediaStream.getAudioTracks().length > 0)

        if (localVideoRef.current && mediaStream.getVideoTracks().length > 0) {
          localVideoRef.current.srcObject = mediaStream
          localVideoRef.current.play().catch((err) => {
            addDebug(`Error playing local video: ${err.message}`)
          })
        }

        const peerConnection = new RTCPeerConnection({
          iceServers: [
            {
              urls: [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
                "stun:stun3.l.google.com:19302",
                "stun:stun4.l.google.com:19302",
              ],
            },
          ],
          iceCandidatePoolSize: 10,
        })

        peerConnectionRef.current = peerConnection
        addDebug("RTCPeerConnection created")

        mediaStream.getTracks().forEach((track) => {
          addDebug(`Adding ${track.kind} track to peer connection`)
          try {
            peerConnection.addTrack(track, mediaStream)
          } catch (err) {
            addDebug(`Error adding ${track.kind} track: ${err}`)
          }
        })

        peerConnection.ontrack = (event) => {
          addDebug(`Remote ${event.track.kind} track received`)
          if (event.streams[0]) {
            setRemoteStream(event.streams[0])
            if (remoteVideoRef.current && event.track.kind === "video") {
              remoteVideoRef.current.srcObject = event.streams[0]
              addDebug("Remote stream assigned to video element")
            }
          }
        }

        peerConnection.onconnectionstatechange = () => {
          addDebug(`Connection state: ${peerConnection.connectionState}`)
          if (peerConnection.connectionState === "connected") {
            setConnectionStatus("connected")
          } else if (peerConnection.connectionState === "disconnected" || peerConnection.connectionState === "failed") {
            setConnectionStatus("disconnected")
          }
        }

        peerConnection.onicegatheringstatechange = () => {
          addDebug(`ICE gathering state: ${peerConnection.iceGatheringState}`)
        }

        peerConnection.oniceconnectionstatechange = () => {
          addDebug(`ICE connection state: ${peerConnection.iceConnectionState}`)
        }

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            addDebug(`Sending ICE candidate`)
            sendSignal("ice-candidate", event.candidate)
          }
        }

        if (isOfferPeer) {
          addDebug("Creating offer...")
          const offer = await peerConnection.createOffer()
          await peerConnection.setLocalDescription(offer)
          addDebug("Sending offer")
          sendSignal("offer", offer)
        } else {
          addDebug("Waiting for offer from peer...")
        }

        setConnectionStatus("connecting")
      } catch (err) {
        const unknownError = err as any
        addDebug(`Unexpected error in initWebRTC: ${unknownError.message}`)
        setError("An unexpected error occurred. Please try again.")
      }
    }

    initWebRTC()

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
        addDebug("Local media stream stopped")
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
      addDebug(`Signal sent: ${type}`)
    } catch (err) {
      addDebug(`Error sending signal: ${err}`)
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
      .subscribe((status) => {
        addDebug(`Subscription status: ${status}`)
      })

    signalSubscriptionRef.current = channel
    addDebug("Signal subscription created")

    return () => {
      if (signalSubscriptionRef.current) {
        supabase.removeChannel(signalSubscriptionRef.current)
        addDebug("Signal subscription closed")
      }
    }
  }, [matchId, partner.id, userId])

  const handleSignal = async (signal: any) => {
    try {
      const peerConnection = peerConnectionRef.current
      if (!peerConnection) {
        addDebug("Peer connection not ready")
        return
      }

      addDebug(`Received signal: ${signal.signal_type}`)

      if (signal.signal_type === "offer") {
        addDebug("Setting remote description (offer)")
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.signal_data))
        addDebug("Creating answer")
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)
        addDebug("Sending answer")
        sendSignal("answer", answer)
      } else if (signal.signal_type === "answer") {
        addDebug("Setting remote description (answer)")
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.signal_data))
      } else if (signal.signal_type === "ice-candidate") {
        try {
          addDebug("Adding ICE candidate")
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.signal_data))
        } catch (e) {
          addDebug(`Error adding ICE candidate: ${e}`)
        }
      }
    } catch (err) {
      addDebug(`Error handling signal: ${err}`)
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
    <div ref={containerRef} className="flex h-[calc(100vh-2rem)] flex-col bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/50 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="hover:bg-slate-700" asChild>
            <Link href={`/dashboard/chat/${matchId}`}>
              <ArrowLeft className="h-5 w-5 text-slate-200" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-slate-600">
              <AvatarFallback className="bg-gradient-to-br from-primary to-pink-400 text-white font-semibold">
                {partnerInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-slate-100">{partner.display_name}</p>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-slate-700 text-slate-200 border-slate-600 text-xs h-5 hover:bg-slate-700"
                >
                  {youTeach}
                </Badge>
                <span className="text-xs text-slate-400">↔</span>
                <Badge
                  variant="outline"
                  className="bg-slate-700 text-slate-200 border-slate-600 text-xs h-5 hover:bg-slate-700"
                >
                  {youLearn}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={connectionStatus === "connected" ? "default" : "secondary"}
            className={`text-xs font-medium ${
              connectionStatus === "connected"
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-slate-700 text-slate-200 hover:bg-slate-600"
            }`}
          >
            {connectionStatus === "connected" ? "●" : "○"}{" "}
            {connectionStatus === "connected" ? "Connected" : "Connecting..."}
          </Badge>
        </div>
      </div>

      <div className="flex-1 relative bg-slate-950 overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-slate-800 rounded-2xl p-8 text-center max-w-md border border-slate-700">
              <VideoOff className="mx-auto h-16 w-16 text-slate-400 mb-4" />
              <p className="font-semibold text-slate-100 text-lg mb-2">
                {noDevices ? "No Camera Available" : "Camera Access Required"}
              </p>
              <p className="text-slate-400 text-sm mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                {!noDevices && (
                  <Button onClick={() => window.location.reload()} className="bg-primary hover:bg-primary/90">
                    Try Again
                  </Button>
                )}
                <Button variant="outline" className="border-slate-600 hover:bg-slate-800 bg-transparent" asChild>
                  <Link href={`/dashboard/chat/${matchId}`} className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Use Chat
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Remote video - Main/Speaker view */}
            <div className="absolute inset-0">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                  onPlay={() => addDebug("Remote video playing")}
                  onError={(e) => addDebug(`Remote video error: ${(e.target as HTMLVideoElement).error?.message}`)}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
                  <div className="text-center">
                    <Avatar className="h-40 w-40 mx-auto mb-6 border-4 border-slate-700">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-pink-400 text-white text-5xl font-semibold">
                        {partnerInitials}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-2xl font-semibold text-slate-100 mb-2">{partner.display_name}</p>
                    <p className="text-slate-400">Waiting for video stream...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Local video - Picture-in-Picture corner */}
            <div className="absolute bottom-24 right-4 w-56 aspect-video rounded-2xl overflow-hidden border-2 border-slate-600 shadow-2xl bg-slate-800 hover:shadow-primary/20 transition-shadow">
              {isVideoOn && localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                  onPlay={() => addDebug("Local video playing")}
                  onError={(e) => addDebug(`Video error: ${(e.target as HTMLVideoElement).error?.message}`)}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-pink-400 text-white text-2xl font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-6 px-4">
        <div className="bg-slate-800/95 backdrop-blur-md rounded-full px-6 py-3 flex items-center gap-4 border border-slate-700 shadow-2xl">
          {/* Audio Toggle */}
          <Button
            variant={isAudioOn ? "ghost" : "destructive"}
            size="lg"
            className={`h-12 w-12 rounded-full transition-all ${
              isAudioOn
                ? "hover:bg-slate-700 text-slate-200 hover:text-slate-100"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
            onClick={toggleAudio}
            title={isAudioOn ? "Mute microphone (Ctrl+M)" : "Unmute microphone"}
          >
            {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          {/* Video Toggle */}
          <Button
            variant={isVideoOn ? "ghost" : "destructive"}
            size="lg"
            className={`h-12 w-12 rounded-full transition-all ${
              isVideoOn
                ? "hover:bg-slate-700 text-slate-200 hover:text-slate-100"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
            onClick={toggleVideo}
            title={isVideoOn ? "Turn off camera (Ctrl+E)" : "Turn on camera"}
          >
            {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <div className="w-px h-8 bg-slate-600"></div>

          {/* End Call - Red button */}
          <Button
            variant="destructive"
            size="lg"
            className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-600/50 transition-all"
            onClick={endCall}
            title="End call (Escape)"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>

          <div className="w-px h-8 bg-slate-600"></div>

          {/* More Options */}
          <Button
            variant="ghost"
            size="lg"
            className="h-12 w-12 rounded-full hover:bg-slate-700 text-slate-200 hover:text-slate-100 transition-all"
            onClick={() => setShowStats(!showStats)}
            title="Show connection stats"
          >
            {showStats ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="h-12 w-12 rounded-full hover:bg-slate-700 text-slate-200 hover:text-slate-100 transition-all"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {showStats && (
        <div className="absolute top-20 left-4 bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-lg p-3 text-xs text-slate-300 max-w-sm font-mono z-10">
          <p className="font-semibold text-slate-100 mb-2">Connection Stats</p>
          {debugLog.slice(-5).map((log, i) => (
            <p key={i} className="text-slate-400">
              {log}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
