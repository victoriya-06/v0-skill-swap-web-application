-- WebRTC Signaling table for managing peer connections
CREATE TABLE IF NOT EXISTS public.webrtc_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies - only users in the match can access
CREATE POLICY "webrtc_signals_select" ON public.webrtc_signals 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = webrtc_signals.match_id 
      AND (matches.requester_id = auth.uid() OR matches.responder_id = auth.uid())
    )
  );

CREATE POLICY "webrtc_signals_insert" ON public.webrtc_signals 
  FOR INSERT WITH CHECK (
    auth.uid() = from_user_id AND
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = webrtc_signals.match_id 
      AND (matches.requester_id = auth.uid() OR matches.responder_id = auth.uid())
      AND matches.status = 'accepted'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_match ON public.webrtc_signals(match_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_from_user ON public.webrtc_signals(from_user_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_created ON public.webrtc_signals(created_at);
