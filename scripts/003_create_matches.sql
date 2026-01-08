-- Match status enum
DO $$ BEGIN
  CREATE TYPE match_status AS ENUM ('pending', 'accepted', 'declined', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Matches between users for skill exchange
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_teaches TEXT NOT NULL,
  requester_learns TEXT NOT NULL,
  status match_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, responder_id, requester_teaches, requester_learns)
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for matches
CREATE POLICY "matches_select_involved" ON public.matches 
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = responder_id);

CREATE POLICY "matches_insert_requester" ON public.matches 
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "matches_update_involved" ON public.matches 
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = responder_id);

CREATE POLICY "matches_delete_requester" ON public.matches 
  FOR DELETE USING (auth.uid() = requester_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_requester ON public.matches(requester_id);
CREATE INDEX IF NOT EXISTS idx_matches_responder ON public.matches(responder_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
