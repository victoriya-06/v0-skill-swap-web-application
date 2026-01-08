import { createClient } from "@/lib/supabase/server"
import { MatchesView } from "@/components/dashboard/matches-view"
import type { PotentialMatch, Match } from "@/lib/types"

export default async function MatchesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch user's teach and learn skills
  const { data: myTeachSkills } = await supabase.from("teach_skills").select("skill_name").eq("user_id", user!.id)

  const { data: myLearnSkills } = await supabase.from("learn_skills").select("skill_name").eq("user_id", user!.id)

  // Fetch existing matches (to exclude already matched users)
  const { data: existingMatches } = await supabase
    .from("matches")
    .select("*")
    .or(`requester_id.eq.${user!.id},responder_id.eq.${user!.id}`)

  // Find potential matches - users who:
  // 1. Teach something I want to learn AND
  // 2. Want to learn something I teach
  const myTeachNames = myTeachSkills?.map((s) => s.skill_name) || []
  const myLearnNames = myLearnSkills?.map((s) => s.skill_name) || []

  const potentialMatches: PotentialMatch[] = []

  if (myTeachNames.length > 0 && myLearnNames.length > 0) {
    // Find users who teach what I want to learn
    const { data: usersWhoTeach } = await supabase
      .from("teach_skills")
      .select("user_id, skill_name")
      .in("skill_name", myLearnNames)
      .neq("user_id", user!.id)

    // Find users who want to learn what I teach
    const { data: usersWhoLearn } = await supabase
      .from("learn_skills")
      .select("user_id, skill_name")
      .in("skill_name", myTeachNames)
      .neq("user_id", user!.id)

    // Find intersection - users who appear in both lists
    const teachUserIds = new Set(usersWhoTeach?.map((u) => u.user_id) || [])
    const learnUserIds = new Set(usersWhoLearn?.map((u) => u.user_id) || [])
    const matchingUserIds = [...teachUserIds].filter((id) => learnUserIds.has(id))

    // Exclude users we already have matches with
    const existingMatchUserIds = new Set(
      existingMatches?.flatMap((m) => (m.requester_id === user!.id ? [m.responder_id] : [m.requester_id])) || [],
    )
    const filteredUserIds = matchingUserIds.filter((id) => !existingMatchUserIds.has(id))

    if (filteredUserIds.length > 0) {
      // Fetch profiles for matching users
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", filteredUserIds)

      // Build potential matches with skill details
      for (const profile of profiles || []) {
        const theyTeach = usersWhoTeach?.filter((u) => u.user_id === profile.id).map((u) => u.skill_name) || []
        const theyLearn = usersWhoLearn?.filter((u) => u.user_id === profile.id).map((u) => u.skill_name) || []

        // Find mutual exchanges (what they teach that I want AND what I teach that they want)
        const mutualExchanges: Array<{ youTeach: string; youLearn: string }> = []
        for (const skill of theyTeach) {
          for (const mySkill of theyLearn) {
            mutualExchanges.push({ youTeach: mySkill, youLearn: skill })
          }
        }

        potentialMatches.push({
          user: profile,
          theyTeach,
          theyLearn,
          youTeach: myTeachNames.filter((s) => theyLearn.includes(s)),
          youLearn: myLearnNames.filter((s) => theyTeach.includes(s)),
          mutualExchanges,
        })
      }
    }
  }

  // Fetch pending and active matches
  const { data: pendingReceived } = await supabase
    .from("matches")
    .select("*, requester:profiles!matches_requester_id_fkey(*)")
    .eq("responder_id", user!.id)
    .eq("status", "pending")

  const { data: pendingSent } = await supabase
    .from("matches")
    .select("*, responder:profiles!matches_responder_id_fkey(*)")
    .eq("requester_id", user!.id)
    .eq("status", "pending")

  const { data: activeMatches } = await supabase
    .from("matches")
    .select("*, requester:profiles!matches_requester_id_fkey(*), responder:profiles!matches_responder_id_fkey(*)")
    .or(`requester_id.eq.${user!.id},responder_id.eq.${user!.id}`)
    .eq("status", "accepted")

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Matches</h1>
        <p className="text-muted-foreground">Find people to exchange skills with.</p>
      </div>
      <MatchesView
        potentialMatches={potentialMatches}
        pendingReceived={(pendingReceived as Match[]) || []}
        pendingSent={(pendingSent as Match[]) || []}
        activeMatches={(activeMatches as Match[]) || []}
        userId={user!.id}
        hasSkills={myTeachNames.length > 0 && myLearnNames.length > 0}
      />
    </div>
  )
}
