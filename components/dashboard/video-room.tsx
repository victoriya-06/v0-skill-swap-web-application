"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Video, VideoOff, Mic, MicOff, PhoneOff, MessageCircle, Eye, EyeOff } from "lucide-react"
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

  useEffect(() => {
    const initWebRTC = async () => {
      try {
        addDebug(`Initializing WebRTC (${isOfferPeer ? "offer" : "answer"} peer)`)

        // Request media with fallback to audio-only
        let mediaStream: MediaStream | null = null
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          })
          addDebug(
            `Media acquired - Video: ${mediaStream.getVideoTracks().length}, Audio: ${mediaStream.getAudioTracks().length}`,
          )
        } catch (err) {
          const mediaError = err as DOMException
          addDebug(`Camera error (${mediaError.name}), falling back to audio only...`)
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
            addDebug(`Audio-only fallback - Audio tracks: ${mediaStream.getAudioTracks().length}`)
          } catch (audioErr) {
            const audioError = audioErr as DOMException
            setError(`No media devices available: ${audioError.message}`)
            addDebug(`Fatal error: ${audioError.message}`)
            return
          }
        }

        if (!mediaStream) return
        localStreamRef.current = mediaStream
        setLocalStream(mediaStream)
        setIsVideoOn(mediaStream.getVideoTracks().length > 0)
        setIsAudioOn(mediaStream.getAudioTracks().length > 0)

        // Display local video if available
        if (localVideoRef.current && mediaStream.getVideoTracks().length > 0) {
          localVideoRef.current.srcObject = mediaStream
        }

        // Create peer connection
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            {
              urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
            },
          ],
          iceCandidatePoolSize: 20,
        })

        peerConnectionRef.current = peerConnection
        addDebug("RTCPeerConnection created")

        // Add local tracks
        mediaStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, mediaStream)
          addDebug(`Added ${track.kind} track`)
        })

        // Handle remote tracks
        peerConnection.ontrack = (event) => {
          addDebug(`Received ${event.track.kind} track`)
          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream()
            setRemoteStream(remoteStreamRef.current)
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStreamRef.current
            }
          }
          remoteStreamRef.current?.addTrack(event.track)
        }

        // Handle connection state
        peerConnection.onconnectionstatechange = () => {
          const state = peerConnection.connectionState
          addDebug(`Connection state: ${state}`)
          if (state === "connected") {
            setConnectionStatus("connected")
          } else if (state === "failed" || state === "disconnected") {
            setConnectionStatus("disconnected")
          }
        }

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignal("ice-candidate", event.candidate)
          }
        }

        // Set up signaling channel
        const supabase = createClient()
        const channel = supabase
          .channel(`video:${matchId}`)
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
              if (signal.from_user_id !== userId) {
                await handleSignal(signal, peerConnection)
              }
            },
          )
          .subscribe((status) => {
            addDebug(`Channel status: ${status}`)
          })

        channelRef.current = channel
        addDebug("Signaling channel ready")

        // Create offer if this is the offer peer
        if (isOfferPeer) {
          addDebug("Creating offer...")
          const offer = await peerConnection.createOffer()
          await peerConnection.setLocalDescription(offer)
          addDebug("Offer created, sending...")
          sendSignal("offer", offer)
        } else {
          addDebug("Waiting for offer from peer...")
        }

        setConnectionStatus("connecting")
      } catch (err) {
        const unknownError = err as Error
        setError(unknownError.message)
        addDebug(`Fatal error: ${unknownError.message}`)
      }
    }

    initWebRTC()

    // Cleanup
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
        addDebug("Local stream stopped")
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        addDebug("Peer connection closed")
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        addDebug("Channel unsubscribed")
      }
    }
  }, [isOfferPeer, userId])

  const handleSignal = async (signal: any, peerConnection: RTCPeerConnection) => {
    try {
      addDebug(`Received ${signal.signal_type}`)

      if (signal.signal_type === "offer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.signal_data))
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)
        sendSignal("answer", answer)
        addDebug("Answer sent")
      } else if (signal.signal_type === "answer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.signal_data))
        addDebug("Answer received")
      } else if (signal.signal_type === "ice-candidate") {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.signal_data))
        } catch (e) {
          addDebug(`ICE error: ${e}`)
        }
      }
    } catch (err) {
      addDebug(`Signal error: ${err}`)
    }
  }

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
      addDebug(`${type} sent`)
    } catch (err) {
      addDebug(`Send error: ${err}`)
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOn(videoTrack.enabled)
      }
    }
  }

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioOn(audioTrack.enabled)
      }
    }
  }

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
    window.history.back()
  }

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
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/50 px-4 py-3 backdrop-blur-sm">
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

        <Badge
          variant={connectionStatus === "connected" ? "default" : "secondary"}
          className={connectionStatus === "connected" ? "bg-green-600" : "bg-slate-700"}
        >
          {connectionStatus === "connected" ? "● Connected" : "○ Connecting..."}
        </Badge>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-slate-950 overflow-hidden">
        {/* Remote video - Main area */}
        <div className="absolute inset-0">
          {remoteStream ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
              <div className="text-center">
                <Avatar className="h-40 w-40 mx-auto mb-6 border-4 border-slate-700">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-pink-400 text-white text-5xl font-semibold">
                    {partnerInitials}
                  </AvatarFallback>
                </Avatar>
                <p className="text-2xl font-semibold text-slate-100">{partner.display_name}</p>
                <p className="text-slate-400 text-sm mt-2">
                  {connectionStatus === "connected" ? "Connected" : "Waiting for connection..."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Local video - PiP */}
        {isVideoOn && localStream && (
          <div className="absolute bottom-24 right-4 w-56 aspect-video rounded-2xl overflow-hidden border-2 border-slate-600 shadow-2xl bg-slate-800">
            <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          </div>
        )}

        {/* Local avatar when no video */}
        {!isVideoOn && localStream && (
          <div className="absolute bottom-24 right-4 w-56 aspect-video rounded-2xl overflow-hidden border-2 border-slate-600 shadow-2xl bg-slate-800 flex items-center justify-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-pink-400 text-white text-2xl font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-6 px-4">
        <div className="bg-slate-800/95 backdrop-blur-md rounded-full px-6 py-3 flex items-center gap-4 border border-slate-700 shadow-2xl">
          <Button
            variant={isAudioOn ? "ghost" : "destructive"}
            size="lg"
            className={`h-12 w-12 rounded-full ${isAudioOn ? "hover:bg-slate-700 text-slate-200" : "bg-red-600 hover:bg-red-700 text-white"}`}
            onClick={toggleAudio}
          >
            {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            variant={isVideoOn ? "ghost" : "destructive"}
            size="lg"
            className={`h-12 w-12 rounded-full ${isVideoOn ? "hover:bg-slate-700 text-slate-200" : "bg-red-600 hover:bg-red-700 text-white"}`}
            onClick={toggleVideo}
          >
            {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <div className="w-px h-8 bg-slate-600"></div>

          <Button
            variant="destructive"
            size="lg"
            className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-600/50"
            onClick={endCall}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>

          <div className="w-px h-8 bg-slate-600"></div>

          <Button
            variant="ghost"
            size="lg"
            className="h-12 w-12 rounded-full hover:bg-slate-700 text-slate-200"
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Debug Log */}
      {showStats && (
        <div className="absolute bottom-32 right-4 bg-slate-800 border border-slate-700 rounded-lg p-4 text-xs text-slate-300 max-h-40 overflow-auto font-mono">
          {debugLog.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}
    </div>
  )
}
