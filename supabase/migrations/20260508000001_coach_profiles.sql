-- ============================================================================
-- Coach Profiles — bundled AI coach configuration (Hugo 2026-05-08)
--
-- Why:
--   Hugo wants to create named coach setups ("Cold Calling", "Follow-up")
--   that bundle the agent script + style prompt + script prompt together.
--   A pipeline column picks ONE profile and everything switches at once.
--
-- Previously, call_script_id, coach_style_prompt, and coach_script_prompt
-- lived directly on wk_pipeline_columns. Now they're bundled into a
-- reusable profile. Pipeline columns + campaigns reference a profile_id.
--
-- Resolution chain (updated v17):
--   agent own script > column profile > campaign profile > workspace default profile
-- ============================================================================

-- ─── Part A: coach_profiles table ──────────────────────────────────

CREATE TABLE IF NOT EXISTS wk_coach_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  call_script_id uuid REFERENCES wk_call_scripts(id) ON DELETE SET NULL,
  coach_style_prompt text,
  coach_script_prompt text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wk_coach_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_profiles_read"
  ON wk_coach_profiles FOR SELECT USING (true);

CREATE POLICY "coach_profiles_write"
  ON wk_coach_profiles FOR ALL USING (true);

-- ─── Part B: add coach_profile_id to pipeline columns + campaigns ──

ALTER TABLE wk_pipeline_columns
  ADD COLUMN IF NOT EXISTS coach_profile_id uuid
    REFERENCES wk_coach_profiles(id) ON DELETE SET NULL;

ALTER TABLE wk_dialer_campaigns
  ADD COLUMN IF NOT EXISTS coach_profile_id uuid
    REFERENCES wk_coach_profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN wk_pipeline_columns.coach_profile_id IS
  'Link this column to a coach profile. Leads in this column get this profile''s script + coach prompts. NULL = inherit from campaign or workspace default.';

COMMENT ON COLUMN wk_dialer_campaigns.coach_profile_id IS
  'Default coach profile for this campaign. NULL = inherit from workspace default profile.';

-- ─── Part C: seed "Cold Calling" profile from current workspace defaults ─

INSERT INTO wk_coach_profiles (name, is_default, coach_style_prompt, coach_script_prompt, call_script_id)
SELECT
  'Cold Calling',
  true,
  ai.coach_style_prompt,
  ai.coach_script_prompt,
  (SELECT id FROM wk_call_scripts WHERE is_default = true LIMIT 1)
FROM wk_ai_settings ai
LIMIT 1;

-- ─── Part D: seed "Follow-up" profile ──────────────────────────────

INSERT INTO wk_coach_profiles (name, is_default, coach_style_prompt, coach_script_prompt, call_script_id)
VALUES (
  'Follow-up',
  false,
  E'You are a live AI call coach for NFSTAY. This is a FOLLOW-UP call — the lead has already shown interest and received a deal breakdown via SMS.\n\nTone: warm, assumptive, confident. The lead knows who we are. No cold intro needed.\n\nRules:\n- UK English only. No American spelling or phrasing.\n- One short actionable coaching card at a time.\n- Never use acting notes, stage directions, or multiple response variants.\n- Reference previous contact naturally ("as we discussed", "following up on the breakdown we sent").\n- Be direct — this is a closing call, not discovery.\n- If the lead raises FCA/regulatory concerns, use the JV defence framing from your knowledge base.',
  E'CALL TYPE: FOLLOW-UP (lead previously contacted via SMS/call)\n\nSTAGES:\n1. RE-OPEN — Warm reference to previous contact. Coach the agent: "Hi [name], it''s [agent] from NFSTAY, just following up on the deal breakdown we sent over."\n2. GAUGE INTEREST — "Did you get a chance to look through it?" Listen for buying signals vs objections.\n3. HANDLE QUESTIONS — Address objections using knowledge base facts. Use JV/FCA defence if regulation comes up. Be confident.\n4. CLOSE — "Shall we get you booked in for a strategy call this week?" or "Want me to send the booking link now?"\n5. FOLLOW-UP LOCK — Confirm next step, send calendar link, set expectation for next contact.\n\nCONFIDENCE RULE: Answer confidently from general property/business knowledge if the knowledge base doesn''t have the exact fact. Never say "I don''t know" — say "From what I understand..." and give your best answer. Only defer to "I''ll check and come back to you" for very specific numbers or legal details.',
  (SELECT id FROM wk_call_scripts WHERE name ILIKE '%follow%up%' LIMIT 1)
);
