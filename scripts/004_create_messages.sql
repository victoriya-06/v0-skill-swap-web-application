-- Messages for chat between matched users
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages (only users in the match can access)
CREATE POLICY "messages_select_match_members" ON public.messages 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = messages.match_id 
      AND (matches.requester_id = auth.uid() OR matches.responder_id = auth.uid())
    )
  );

CREATE POLICY "messages_insert_match_members" ON public.messages 
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = messages.match_id 
      AND (matches.requester_id = auth.uid() OR matches.responder_id = auth.uid())
      AND matches.status = 'accepted'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_match ON public.messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);
