"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Video, Plus, CheckCircle2, XCircle } from "lucide-react"
import type { Match, Session, Profile, SessionStatus } from "@/lib/types"

interface SessionsManagerProps {
  matches: Match[]
  sessions: Session[]
  userId: string
  preselectedMatchId?: string
}

const statusColors: Record<SessionStatus, string> = {
  scheduled: "bg-chart-1/10 text-chart-1 border-chart-1/30",
  in_progress: "bg-chart-2/10 text-chart-2 border-chart-2/30",
  completed: "bg-primary/10 text-primary border-primary/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
}

const statusLabels: Record<SessionStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
}

export function SessionsManager({ matches, sessions, userId, preselectedMatchId }: SessionsManagerProps) {
  const router = useRouter()

  const upcomingSessions = sessions.filter((s) => s.status === "scheduled" && new Date(s.scheduled_at) > new Date())
  const pastSessions = sessions.filter(
    (s) => s.status === "completed" || s.status === "cancelled" || new Date(s.scheduled_at) <= new Date(),
  )

  const getMatchInfo = (matchId: string) => {
    const match = matches.find((m) => m.id === matchId)
    if (!match) return null
    const partner: Profile = match.requester_id === userId ? (match.responder as Profile) : (match.requester as Profile)
    const youTeach = match.requester_id === userId ? match.requester_teaches : match.requester_learns
    const youLearn = match.requester_id === userId ? match.requester_learns : match.requester_teaches
    return { partner, youTeach, youLearn }
  }

  return (
    <Tabs defaultValue="upcoming" className="space-y-6">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="upcoming" className="gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming ({upcomingSessions.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            <Clock className="h-4 w-4" />
            Past ({pastSessions.length})
          </TabsTrigger>
        </TabsList>
        <ScheduleSessionDialog
          matches={matches}
          userId={userId}
          preselectedMatchId={preselectedMatchId}
          onSuccess={() => router.refresh()}
        />
      </div>

      <TabsContent value="upcoming">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Upcoming Sessions
            </CardTitle>
            <CardDescription>Your scheduled skill exchange sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">No upcoming sessions</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Schedule a session with your skill exchange partner.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingSessions.map((session) => {
                  const matchInfo = getMatchInfo(session.match_id)
                  if (!matchInfo) return null
                  return (
                    <SessionCard
                      key={session.id}
                      session={session}
                      partner={matchInfo.partner}
                      youTeach={matchInfo.youTeach}
                      youLearn={matchInfo.youLearn}
                      onUpdate={() => router.refresh()}
                    />
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="past">
        <Card>
          <CardHeader>
            <CardTitle>Past Sessions</CardTitle>
            <CardDescription>Your completed and cancelled sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {pastSessions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Clock className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">No past sessions</h3>
                <p className="mt-2 text-sm text-muted-foreground">Completed sessions will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pastSessions.map((session) => {
                  const matchInfo = getMatchInfo(session.match_id)
                  if (!matchInfo) return null
                  return (
                    <SessionCard
                      key={session.id}
                      session={session}
                      partner={matchInfo.partner}
                      youTeach={matchInfo.youTeach}
                      youLearn={matchInfo.youLearn}
                      isPast
                      onUpdate={() => router.refresh()}
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

function SessionCard({
  session,
  partner,
  youTeach,
  youLearn,
  isPast,
  onUpdate,
}: {
  session: Session
  partner: Profile
  youTeach: string
  youLearn: string
  isPast?: boolean
  onUpdate: () => void
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const initials = partner.display_name?.slice(0, 2).toUpperCase() || "??"

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  }

  const { date, time } = formatDateTime(session.scheduled_at)

  const handleStatusUpdate = async (newStatus: SessionStatus) => {
    setIsUpdating(true)
    const supabase = createClient()
    await supabase
      .from("sessions")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", session.id)
    setIsUpdating(false)
    onUpdate()
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{partner.display_name}</p>
            <Badge variant="outline" className={statusColors[session.status]}>
              {statusLabels[session.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {youTeach}
            </Badge>
            <span className="text-xs text-muted-foreground">↔</span>
            <Badge variant="outline" className="text-xs">
              {youLearn}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {time}
            </span>
            <span>{session.duration_minutes} min</span>
          </div>
          {session.notes && <p className="mt-2 text-sm text-muted-foreground">{session.notes}</p>}
        </div>
      </div>
      {!isPast && session.status === "scheduled" && (
        <div className="flex flex-col gap-2">
          <Button size="sm" asChild>
            <Link href={`/dashboard/video/${session.match_id}`} className="gap-2">
              <Video className="h-4 w-4" />
              Join
            </Link>
          </Button>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => handleStatusUpdate("completed")}
              disabled={isUpdating}
              title="Mark as completed"
            >
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => handleStatusUpdate("cancelled")}
              disabled={isUpdating}
              title="Cancel session"
            >
              <XCircle className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ScheduleSessionDialog({
  matches,
  userId,
  preselectedMatchId,
  onSuccess,
}: {
  matches: Match[]
  userId: string
  preselectedMatchId?: string
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(preselectedMatchId || "")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [duration, setDuration] = useState("60")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMatch || !date || !time) return

    setIsLoading(true)
    const supabase = createClient()

    const scheduledAt = new Date(`${date}T${time}`)

    await supabase.from("sessions").insert({
      match_id: selectedMatch,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: Number.parseInt(duration),
      notes: notes || null,
    })

    setSelectedMatch("")
    setDate("")
    setTime("")
    setDuration("60")
    setNotes("")
    setOpen(false)
    setIsLoading(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule a Session</DialogTitle>
          <DialogDescription>Plan a video call with your skill exchange partner.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Partner</Label>
            <Select value={selectedMatch} onValueChange={setSelectedMatch}>
              <SelectTrigger>
                <SelectValue placeholder="Select a partner" />
              </SelectTrigger>
              <SelectContent>
                {matches.map((match) => {
                  const partner: Profile =
                    match.requester_id === userId ? (match.responder as Profile) : (match.requester as Profile)
                  return (
                    <SelectItem key={match.id} value={match.id}>
                      {partner.display_name}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What will you cover in this session?"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedMatch || !date || !time || isLoading}>
              {isLoading ? "Scheduling..." : "Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
