import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Sparkles, Users, MessageCircle, Video, ArrowRight, Plus } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "there"

  // Fetch user's teach skills
  const { data: teachSkills } = await supabase.from("teach_skills").select("*").eq("user_id", user!.id).limit(5)

  // Fetch user's learn skills
  const { data: learnSkills } = await supabase.from("learn_skills").select("*").eq("user_id", user!.id).limit(5)

  // Fetch pending matches
  const { data: pendingMatches } = await supabase
    .from("matches")
    .select("*")
    .or(`requester_id.eq.${user!.id},responder_id.eq.${user!.id}`)
    .eq("status", "pending")
    .limit(3)

  // Fetch accepted matches
  const { data: acceptedMatches } = await supabase
    .from("matches")
    .select("*")
    .or(`requester_id.eq.${user!.id},responder_id.eq.${user!.id}`)
    .eq("status", "accepted")
    .limit(3)

  const hasSkills = (teachSkills && teachSkills.length > 0) || (learnSkills && learnSkills.length > 0)

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {displayName}</h1>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your skill exchanges.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/skills" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Skills
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(teachSkills?.length || 0) + (learnSkills?.length || 0)}</p>
              <p className="text-sm text-muted-foreground">Total Skills</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
              <Users className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{acceptedMatches?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Active Matches</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
              <MessageCircle className="h-6 w-6 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingMatches?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Pending Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Video className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Sessions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Skills Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Skills</CardTitle>
              <CardDescription>Skills you teach and want to learn</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/skills" className="gap-1">
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!hasSkills ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">No skills added yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add skills you can teach and want to learn to start matching.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/skills">Add Your First Skill</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {teachSkills && teachSkills.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-muted-foreground">Teaching</h4>
                    <div className="flex flex-wrap gap-2">
                      {teachSkills.map((skill) => (
                        <Badge key={skill.id} variant="secondary">
                          {skill.skill_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {learnSkills && learnSkills.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-muted-foreground">Learning</h4>
                    <div className="flex flex-wrap gap-2">
                      {learnSkills.map((skill) => (
                        <Badge key={skill.id} variant="outline">
                          {skill.skill_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity / Matches */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Matches</CardTitle>
              <CardDescription>People to exchange skills with</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/matches" className="gap-1">
                Find Matches
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!hasSkills ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">Add skills to find matches</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Once you add skills, we&apos;ll suggest people to exchange with.
                </p>
              </div>
            ) : (pendingMatches?.length || 0) + (acceptedMatches?.length || 0) === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">No matches yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">Find people who want to exchange skills with you.</p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/matches">Browse Matches</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {acceptedMatches?.map((match) => (
                  <div key={match.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {match.requester_teaches.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {match.requester_teaches} ↔ {match.requester_learns}
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          Active
                        </Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/chat/${match.id}`}>Chat</Link>
                    </Button>
                  </div>
                ))}
                {pendingMatches?.map((match) => (
                  <div key={match.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {match.requester_teaches.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {match.requester_teaches} ↔ {match.requester_learns}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          Pending
                        </Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/dashboard/matches">View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
