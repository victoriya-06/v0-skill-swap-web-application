-- Reports for trust & safety
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Blocked users
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Session feedback/ratings
CREATE TABLE IF NOT EXISTS public.session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, reviewer_id)
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

-- RLS for reports
CREATE POLICY "reports_insert_own" ON public.reports 
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select_own" ON public.reports 
  FOR SELECT USING (auth.uid() = reporter_id);

-- RLS for blocked_users
CREATE POLICY "blocked_users_select_own" ON public.blocked_users 
  FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "blocked_users_insert_own" ON public.blocked_users 
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "blocked_users_delete_own" ON public.blocked_users 
  FOR DELETE USING (auth.uid() = blocker_id);

-- RLS for session_feedback
CREATE POLICY "feedback_select_session_members" ON public.session_feedback 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.matches m ON m.id = s.match_id
      WHERE s.id = session_feedback.session_id
      AND (m.requester_id = auth.uid() OR m.responder_id = auth.uid())
    )
  );
CREATE POLICY "feedback_insert_own" ON public.session_feedback 
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
