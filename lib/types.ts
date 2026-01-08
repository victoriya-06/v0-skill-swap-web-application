export type SkillLevel = "beginner" | "intermediate" | "advanced"
export type MatchStatus = "pending" | "accepted" | "declined" | "completed"
export type SessionStatus = "scheduled" | "in_progress" | "completed" | "cancelled"

export interface Profile {
  id: string
  display_name: string
  bio: string | null
  location: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface TeachSkill {
  id: string
  user_id: string
  skill_name: string
  level: SkillLevel
  description: string | null
  created_at: string
}

export interface LearnSkill {
  id: string
  user_id: string
  skill_name: string
  level: SkillLevel
  created_at: string
}

export interface Match {
  id: string
  requester_id: string
  responder_id: string
  requester_teaches: string
  requester_learns: string
  status: MatchStatus
  created_at: string
  updated_at: string
  requester?: Profile
  responder?: Profile
}

export interface Message {
  id: string
  match_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
  sender?: Profile
}

export interface Session {
  id: string
  match_id: string
  scheduled_at: string
  duration_minutes: number
  status: SessionStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SessionFeedback {
  id: string
  session_id: string
  reviewer_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface PotentialMatch {
  user: Profile
  theyTeach: string[]
  theyLearn: string[]
  youTeach: string[]
  youLearn: string[]
  mutualExchanges: Array<{
    youTeach: string
    youLearn: string
  }>
}
