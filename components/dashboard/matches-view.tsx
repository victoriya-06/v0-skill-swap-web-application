"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Users, Search, Clock, Check, X, MessageCircle, ArrowRight, Sparkles } from "lucide-react"
import type { PotentialMatch, Match, Profile } from "@/lib/types"

interface MatchesViewProps {
  potentialMatches: PotentialMatch[]
  pendingReceived: Match[]
  pendingSent: Match[]
  activeMatches: Match[]
  userId: string
  hasSkills: boolean
}

export function MatchesView({
  potentialMatches,
  pendingReceived,
  pendingSent,
  activeMatches,
  userId,
  hasSkills,
}: MatchesViewProps) {
  const router = useRouter()

  return (
    <Tabs defaultValue="discover" className="space-y-6">
      <TabsList>
        <TabsTrigger value="discover" className="gap-2">
          <Search className="h-4 w-4" />
          Discover ({potentialMatches.length})
        </TabsTrigger>
        <TabsTrigger value="pending" className="gap-2">
          <Clock className="h-4 w-4" />
          Pending ({pendingReceived.length + pendingSent.length})
        </TabsTrigger>
        <TabsTrigger value="active" className="gap-2">
          <Users className="h-4 w-4" />
          Active ({activeMatches.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="discover">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Suggested Matches
            </CardTitle>
            <CardDescription>People who can exchange skills with you</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasSkills ? (
              <EmptyState
                icon={Search}
                title="Add skills to find matches"
                description="Add skills you teach and want to learn to discover people for skill exchange."
                action={
                  <Button asChild className="mt-4">
                    <Link href="/dashboard/skills">Add Skills</Link>
                  </Button>
                }
              />
            ) : potentialMatches.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No matches found yet"
                description="We couldn't find perfect skill matches right now. Try adding more skills or check back later!"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {potentialMatches.map((match) => (
                  <PotentialMatchCard
                    key={match.user.id}
                    match={match}
                    userId={userId}
                    onSuccess={() => router.refresh()}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pending">
        <div className="space-y-6">
          {/* Received requests */}
          <Card>
            <CardHeader>
              <CardTitle>Requests Received</CardTitle>
              <CardDescription>People who want to exchange skills with you</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingReceived.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No pending requests"
                  description="You don't have any incoming skill exchange requests."
                />
              ) : (
                <div className="space-y-3">
                  {pendingReceived.map((match) => (
                    <PendingReceivedCard
                      key={match.id}
                      match={match}
                      profile={match.requester as Profile}
                      onAction={() => router.refresh()}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sent requests */}
          <Card>
            <CardHeader>
              <CardTitle>Requests Sent</CardTitle>
              <CardDescription>Your pending skill exchange requests</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingSent.length === 0 ? (
                <EmptyState icon={Clock} title="No sent requests" description="You haven't sent any requests yet." />
              ) : (
                <div className="space-y-3">
                  {pendingSent.map((match) => (
                    <PendingSentCard key={match.id} match={match} profile={match.responder as Profile} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="active">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Active Exchanges
            </CardTitle>
            <CardDescription>Your ongoing skill exchange partnerships</CardDescription>
          </CardHeader>
          <CardContent>
            {activeMatches.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No active exchanges"
                description="Accept match requests or send new ones to start exchanging skills."
              />
            ) : (
              <div className="space-y-3">
                {activeMatches.map((match) => {
                  const partner = match.requester_id === userId ? match.responder : match.requester
                  const youTeach = match.requester_id === userId ? match.requester_teaches : match.requester_learns
                  const youLearn = match.requester_id === userId ? match.requester_learns : match.requester_teaches
                  return (
                    <ActiveMatchCard
                      key={match.id}
                      matchId={match.id}
                      partner={partner as Profile}
                      youTeach={youTeach}
                      youLearn={youLearn}
                    />
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <Icon className="mx-auto h-10 w-10 text-muted-foreground/50" />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  )
}

function PotentialMatchCard({
  match,
  userId,
  onSuccess,
}: {
  match: PotentialMatch
  userId: string
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [selectedExchange, setSelectedExchange] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const initials = match.user.display_name?.slice(0, 2).toUpperCase() || "??"

  const handleSendRequest = async () => {
    if (!selectedExchange) return
    setIsLoading(true)

    const [youTeach, youLearn] = selectedExchange.split("|")
    const supabase = createClient()

    await supabase.from("matches").insert({
      requester_id: userId,
      responder_id: match.user.id,
      requester_teaches: youTeach,
      requester_learns: youLearn,
    })

    setOpen(false)
    setIsLoading(false)
    onSuccess()
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{match.user.display_name}</h4>
            {match.user.location && <p className="text-xs text-muted-foreground truncate">{match.user.location}</p>}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">They teach</p>
            <div className="flex flex-wrap gap-1">
              {match.theyTeach.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {match.theyTeach.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{match.theyTeach.length - 3}
                </Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">They want</p>
            <div className="flex flex-wrap gap-1">
              {match.theyLearn.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {match.theyLearn.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{match.theyLearn.length - 3}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full mt-4 gap-2" size="sm">
              Request Exchange
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Skill Exchange</DialogTitle>
              <DialogDescription>Choose which skills to exchange with {match.user.display_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select exchange</Label>
                <Select value={selectedExchange} onValueChange={setSelectedExchange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose skills to exchange" />
                  </SelectTrigger>
                  <SelectContent>
                    {match.mutualExchanges.map((exchange) => (
                      <SelectItem
                        key={`${exchange.youTeach}|${exchange.youLearn}`}
                        value={`${exchange.youTeach}|${exchange.youLearn}`}
                      >
                        You teach {exchange.youTeach}, learn {exchange.youLearn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendRequest} disabled={!selectedExchange || isLoading}>
                {isLoading ? "Sending..." : "Send Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

function PendingReceivedCard({
  match,
  profile,
  onAction,
}: {
  match: Match
  profile: Profile
  onAction: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const initials = profile.display_name?.slice(0, 2).toUpperCase() || "??"

  const handleAction = async (status: "accepted" | "declined") => {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.from("matches").update({ status, updated_at: new Date().toISOString() }).eq("id", match.id)
    setIsLoading(false)
    onAction()
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{profile.display_name}</p>
          <p className="text-sm text-muted-foreground">
            Wants to exchange: <span className="font-medium">{match.requester_teaches}</span> for{" "}
            <span className="font-medium">{match.requester_learns}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => handleAction("declined")} disabled={isLoading}>
          <X className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={() => handleAction("accepted")} disabled={isLoading}>
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function PendingSentCard({ match, profile }: { match: Match; profile: Profile }) {
  const initials = profile.display_name?.slice(0, 2).toUpperCase() || "??"

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback className="bg-muted">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{profile.display_name}</p>
          <p className="text-sm text-muted-foreground">
            You teach: <span className="font-medium">{match.requester_teaches}</span>, Learn:{" "}
            <span className="font-medium">{match.requester_learns}</span>
          </p>
        </div>
      </div>
      <Badge variant="outline">
        <Clock className="mr-1 h-3 w-3" />
        Pending
      </Badge>
    </div>
  )
}

function ActiveMatchCard({
  matchId,
  partner,
  youTeach,
  youLearn,
}: {
  matchId: string
  partner: Profile
  youTeach: string
  youLearn: string
}) {
  const initials = partner.display_name?.slice(0, 2).toUpperCase() || "??"

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{partner.display_name}</p>
          <p className="text-sm text-muted-foreground">
            You teach <span className="font-medium text-foreground">{youTeach}</span>, learn{" "}
            <span className="font-medium text-foreground">{youLearn}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link href={`/dashboard/chat/${matchId}`} className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </Link>
        </Button>
      </div>
    </div>
  )
}
