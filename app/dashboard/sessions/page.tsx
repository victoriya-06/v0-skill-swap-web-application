import { createClient } from "@/lib/supabase/server"
import { SessionsManager } from "@/components/dashboard/sessions-manager"
import type { Match, Session } from "@/lib/types"

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ match?: string }>
}) {
  const { match: preselectedMatchId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch accepted matches
  const { data: matches } = await supabase
    .from("matches")
    .select("*, requester:profiles!matches_requester_id_fkey(*), responder:profiles!matches_responder_id_fkey(*)")
    .or(`requester_id.eq.${user!.id},responder_id.eq.${user!.id}`)
    .eq("status", "accepted")

  // Fetch sessions for user's matches
  const matchIds = matches?.map((m) => m.id) || []

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .in("match_id", matchIds.length > 0 ? matchIds : [""])
    .order("scheduled_at", { ascending: true })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Sessions</h1>
        <p className="text-muted-foreground">Schedule and manage your skill exchange sessions.</p>
      </div>
      <SessionsManager
        matches={(matches as Match[]) || []}
        sessions={(sessions as Session[]) || []}
        userId={user!.id}
        preselectedMatchId={preselectedMatchId}
      />
    </div>
  )
}
