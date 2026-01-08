"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, Video, Calendar } from "lucide-react"
import type { Profile, Message } from "@/lib/types"

interface ChatRoomProps {
  matchId: string
  userId: string
  partner: Profile
  youTeach: string
  youLearn: string
  initialMessages: Message[]
}

export function ChatRoom({ matchId, userId, partner, youTeach, youLearn, initialMessages }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const partnerInitials = partner.display_name?.slice(0, 2).toUpperCase() || "??"

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Subscribe to realtime messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          // Fetch the sender profile for the new message
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", payload.new.sender_id)
            .single()

          const newMsg: Message = {
            ...payload.new,
            sender: senderProfile,
          } as Message

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId, supabase])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    const messageContent = newMessage.trim()
    setNewMessage("")

    const { error } = await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: userId,
      content: messageContent,
    })

    if (error) {
      console.error("Failed to send message:", error)
      setNewMessage(messageContent) // Restore message on error
    }

    setIsSending(false)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return "Today"
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = []
  let currentDate = ""
  for (const msg of messages) {
    const msgDate = formatDate(msg.created_at)
    if (msgDate !== currentDate) {
      currentDate = msgDate
      groupedMessages.push({ date: msgDate, messages: [msg] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <Card className="rounded-b-none border-b-0">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard/chat">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary">{partnerInitials}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold">{partner.display_name}</h2>
                <div className="flex items-center gap-2">
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
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/sessions?match=${matchId}`} className="gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Schedule</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/video/${matchId}`} className="gap-2">
                  <Video className="h-4 w-4" />
                  <span className="hidden sm:inline">Video Call</span>
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1 overflow-hidden rounded-none border-b-0">
        <CardContent className="h-full overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground">No messages yet.</p>
                <p className="text-sm text-muted-foreground mt-1">Say hello to start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center justify-center mb-4">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{group.date}</span>
                  </div>
                  <div className="space-y-3">
                    {group.messages.map((message) => {
                      const isOwnMessage = message.sender_id === userId
                      return (
                        <div key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                              isOwnMessage
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}
                            >
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Input Area */}
      <Card className="rounded-t-none">
        <CardContent className="p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              disabled={isSending}
            />
            <Button type="submit" disabled={!newMessage.trim() || isSending}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
