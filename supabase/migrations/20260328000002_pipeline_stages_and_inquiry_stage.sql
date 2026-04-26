-- Custom pipeline stage names (per user, per pipeline type)
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  pipeline_type TEXT CHECK (pipeline_type IN ('deals', 'leads')) NOT NULL,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pipeline_type)
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stages" ON public.pipeline_stages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add stage column to inquiries for lead pipeline tracking
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'New Leads';
