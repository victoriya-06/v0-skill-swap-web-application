-- Create skill_levels enum type
DO $$ BEGIN
  CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Skills that users can teach
CREATE TABLE IF NOT EXISTS public.teach_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  level skill_level NOT NULL DEFAULT 'beginner',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_name)
);

-- Skills that users want to learn
CREATE TABLE IF NOT EXISTS public.learn_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  level skill_level NOT NULL DEFAULT 'beginner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_name)
);

-- Enable RLS
ALTER TABLE public.teach_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learn_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teach_skills
CREATE POLICY "teach_skills_select_all" ON public.teach_skills FOR SELECT USING (true);
CREATE POLICY "teach_skills_insert_own" ON public.teach_skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "teach_skills_update_own" ON public.teach_skills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "teach_skills_delete_own" ON public.teach_skills FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for learn_skills
CREATE POLICY "learn_skills_select_all" ON public.learn_skills FOR SELECT USING (true);
CREATE POLICY "learn_skills_insert_own" ON public.learn_skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "learn_skills_update_own" ON public.learn_skills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "learn_skills_delete_own" ON public.learn_skills FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for efficient matching queries
CREATE INDEX IF NOT EXISTS idx_teach_skills_name ON public.teach_skills(skill_name);
CREATE INDEX IF NOT EXISTS idx_learn_skills_name ON public.learn_skills(skill_name);
CREATE INDEX IF NOT EXISTS idx_teach_skills_user ON public.teach_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_learn_skills_user ON public.learn_skills(user_id);
