"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Video, VideoOff, Mic, MicOff, PhoneOff, MessageCircle, Maximize, Minimize } from "lucide-react"
import type { Profile } from "@/lib/types"

interface VideoRoomProps {
  matchId: string
  userId: string
  userProfile: Profile
  partner: Profile
  youTeach: string
  youLearn: string
}

export function VideoRoom({ matchId, userProfile, partner, youTeach, youLearn }: VideoRoomProps) {
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [noDevices, setNoDevices] = useState(false)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const partnerInitials = partner.display_name?.slice(0, 2).toUpperCase() || "??"
  const userInitials = userProfile?.display_name?.slice(0, 2).toUpperCase() || "??"

  useEffect(() => {
    const initMedia = async () => {
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
          video: hasVideo,
          audio: hasAudio,
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        setStream(mediaStream)

        setIsVideoOn(hasVideo)
        setIsAudioOn(hasAudio)

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream
        }
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
        console.error("Media error:", mediaError.name, mediaError.message)
      }
    }

    initMedia()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOn(videoTrack.enabled)
      }
    }
  }

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0]
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
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
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
            {/* Partner Video (Main) - Placeholder for WebRTC peer connection */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Avatar className="h-32 w-32 mx-auto">
                  <AvatarFallback className="bg-primary/10 text-primary text-4xl">{partnerInitials}</AvatarFallback>
                </Avatar>
                <p className="mt-4 text-lg font-medium">{partner.display_name}</p>
                <p className="text-sm text-muted-foreground">Waiting for {partner.display_name} to join...</p>
                <Badge variant="outline" className="mt-2">
                  Video calling demo - WebRTC peer connection would go here
                </Badge>
              </div>
            </div>

            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute bottom-4 right-4 w-48 aspect-video rounded-lg overflow-hidden border-2 border-background shadow-lg">
              {isVideoOn ? (
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
