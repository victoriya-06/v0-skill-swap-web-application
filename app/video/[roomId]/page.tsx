import type { Metadata } from "next"
import { VideoTimeRoom } from "@/components/videotime-room"

export const metadata: Metadata = {
  title: "VideoTime | SkillSwap",
  description: "100% Free Skill Exchange Video Conference",
}

interface VideoPageProps {
  params: Promise<{ roomId: string }>
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { roomId } = await params

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <VideoTimeRoom roomId={roomId} />
    </div>
  )
}
