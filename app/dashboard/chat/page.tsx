import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { MessageCircle, ArrowRight } from "lucide-react"
import type { Profile, Match } from "@/lib/types"

export default async function ChatListPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch accepted matches with profiles
  const { data: matches } = await supabase
    .from("matches")
    .select("*, requester:profiles!matches_requester_id_fkey(*), responder:profiles!matches_responder_id_fkey(*)")
    .or(`requester_id.eq.${user!.id},responder_id.eq.${user!.id}`)
    .eq("status", "accepted")
    .order("updated_at", { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Chat</h1>
        <p className="text-muted-foreground">Message your skill exchange partners.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Conversations
          </CardTitle>
          <CardDescription>Your active skill exchange chats</CardDescription>
        </CardHeader>
        <CardContent>
          {!matches || matches.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-4 font-semibold">No conversations yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Accept match requests or find new matches to start chatting.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {matches.map((match: Match) => {
                const partner: Profile =
                  match.requester_id === user!.id ? (match.responder as Profile) : (match.requester as Profile)
                const youTeach = match.requester_id === user!.id ? match.requester_teaches : match.requester_learns
                const youLearn = match.requester_id === user!.id ? match.requester_learns : match.requester_teaches
                const initials = partner.display_name?.slice(0, 2).toUpperCase() || "??"

                return (
                  <Link
                    key={match.id}
                    href={`/dashboard/chat/${match.id}`}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{partner.display_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {youTeach}
                          </Badge>
                          <span className="text-xs text-muted-foreground">↔</span>
                          <Badge variant="outline" className="text-xs">
                            {youLearn}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
