-- ============================================================================
-- SMSV2 — Phase 1 AI settings (admin-managed OpenAI key + model)
-- Hugo's call: no DEEPGRAM_API_KEY env var. OpenAI for everything (Whisper
-- batch + Realtime live coach). Admin sets key/model from /smsv2/settings.
-- ============================================================================

CREATE TABLE IF NOT EXISTS wk_ai_settings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Singleton row pattern — only one row, identified by name='default'
  name               text NOT NULL UNIQUE DEFAULT 'default',
  openai_api_key     text,                        -- nullable until admin sets
  -- Models for each AI surface — admin can override defaults
  postcall_model     text NOT NULL DEFAULT 'gpt-4o-mini',
  live_coach_model   text NOT NULL DEFAULT 'gpt-4o-realtime-preview',
  whisper_model      text NOT NULL DEFAULT 'whisper-1',
  -- Master kill switch for all AI features
  ai_enabled         boolean NOT NULL DEFAULT true,
  live_coach_enabled boolean NOT NULL DEFAULT true,
  -- System prompts (markdown). Admin can edit.
  postcall_system_prompt text NOT NULL DEFAULT
    'You are a sales call analyst. Given a phone-call transcript, return strict JSON with these keys: summary (2-3 sentences), sentiment (positive|neutral|negative|mixed), talk_ratio (0-1, agent share), objections (array of strings), next_steps (array of strings). No prose outside the JSON.',
  live_coach_system_prompt text NOT NULL DEFAULT
    'You are a real-time sales coach for a UK property rent-to-rent broker. Listen to the live transcript. When the prospect raises an objection, respond with a single short rebuttal under 20 words. When the agent is talking too much (over 65% talk ratio), suggest one open question. Output exactly one suggestion or stay silent. Keep it natural.',
  updated_by         uuid REFERENCES profiles(id),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Seed singleton row
INSERT INTO wk_ai_settings (name)
VALUES ('default')
ON CONFLICT (name) DO NOTHING;

-- RLS: only admins can read or write. Keys never exposed to agents.
ALTER TABLE wk_ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wk_ai_settings_admin_all ON wk_ai_settings;
CREATE POLICY wk_ai_settings_admin_all ON wk_ai_settings
  FOR ALL TO authenticated
  USING (wk_is_admin())
  WITH CHECK (wk_is_admin());

-- updated_at trigger
DROP TRIGGER IF EXISTS wk_ai_settings_updated_at ON wk_ai_settings;
CREATE TRIGGER wk_ai_settings_updated_at
  BEFORE UPDATE ON wk_ai_settings
  FOR EACH ROW EXECUTE FUNCTION wk_set_updated_at();

-- Helper for edge functions: read settings via service role (bypasses RLS).
-- Returns NULL if AI is disabled or key missing — caller must handle gracefully.
CREATE OR REPLACE FUNCTION wk_get_ai_settings()
RETURNS TABLE (
  openai_api_key text,
  postcall_model text,
  live_coach_model text,
  whisper_model text,
  postcall_system_prompt text,
  live_coach_system_prompt text,
  ai_enabled boolean,
  live_coach_enabled boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT openai_api_key, postcall_model, live_coach_model, whisper_model,
         postcall_system_prompt, live_coach_system_prompt,
         ai_enabled, live_coach_enabled
    FROM wk_ai_settings
   WHERE name = 'default'
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION wk_get_ai_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_get_ai_settings() TO service_role;
