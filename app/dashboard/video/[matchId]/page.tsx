import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { VideoRoom } from "@/components/dashboard/video-room"
import type { Profile } from "@/lib/types"

export default async function VideoPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch match with profiles
  const { data: match, error } = await supabase
    .from("matches")
    .select("*, requester:profiles!matches_requester_id_fkey(*), responder:profiles!matches_responder_id_fkey(*)")
    .eq("id", matchId)
    .single()

  if (error || !match) {
    notFound()
  }

  // Verify user is part of this match
  if (match.requester_id !== user.id && match.responder_id !== user.id) {
    notFound()
  }

  const partner: Profile = match.requester_id === user.id ? (match.responder as Profile) : (match.requester as Profile)
  const youTeach = match.requester_id === user.id ? match.requester_teaches : match.requester_learns
  const youLearn = match.requester_id === user.id ? match.requester_learns : match.requester_teaches

  // Fetch user's profile
  const { data: userProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return (
    <VideoRoom
      matchId={matchId}
      userId={user.id}
      userProfile={userProfile as Profile}
      partner={partner}
      youTeach={youTeach}
      youLearn={youLearn}
    />
  )
}
