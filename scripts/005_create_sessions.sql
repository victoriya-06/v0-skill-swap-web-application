-- Session status enum
DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Learning sessions between matched users
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  status session_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions
CREATE POLICY "sessions_select_match_members" ON public.sessions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = sessions.match_id 
      AND (matches.requester_id = auth.uid() OR matches.responder_id = auth.uid())
    )
  );

CREATE POLICY "sessions_insert_match_members" ON public.sessions 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = sessions.match_id 
      AND (matches.requester_id = auth.uid() OR matches.responder_id = auth.uid())
      AND matches.status = 'accepted'
    )
  );

CREATE POLICY "sessions_update_match_members" ON public.sessions 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = sessions.match_id 
      AND (matches.requester_id = auth.uid() OR matches.responder_id = auth.uid())
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_match ON public.sessions(match_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled ON public.sessions(scheduled_at);
