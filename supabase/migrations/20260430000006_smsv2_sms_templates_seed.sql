-- ============================================================================
-- SMSV2 — Seed wk_sms_templates with starter templates (PR 15, Hugo 2026-04-26)
--
-- Why:
--   Hugo on a real call: "There's no template yet. Where do I add the
--   SMS template?" The Settings tab CRUD exists (see TemplatesTab in
--   SettingsPage.tsx) but the table is empty, so the agent's mid-call
--   SMS sender shows "No templates yet". This migration seeds 6
--   universally useful templates so the agent has something to pick on
--   the very first call. Admin can edit / add more in Settings → SMS
--   templates.
--
--   Merge fields: {first_name} = contact's first name,
--                 {agent_first_name} = agent's first name.
--   The mid-call SMS sender substitutes them at render time. The
--   wk-jobs-worker / sms-send pipeline does the same on auto-fired
--   templates from the outcome cards.
--
-- Idempotent: each template is INSERTed only if its name doesn't
-- already exist (case-insensitive match). Safe to re-run.
-- ============================================================================

INSERT INTO wk_sms_templates (name, body_md, merge_fields, is_global)
SELECT v.name, v.body_md, v.merge_fields, true
FROM (VALUES
  (
    'Deal breakdown',
    'Hi {first_name}, great chatting just now — sending the full breakdown of the Liverpool 15-bed: numbers, structure, partner agreement. Have a look and I''ll call tomorrow to walk through it. {agent_first_name} · NFSTAY',
    '["first_name","agent_first_name"]'::jsonb
  ),
  (
    'Callback later today',
    'Hi {first_name}, no worries — I''ll give you a call back later today. Speak soon. {agent_first_name} · NFSTAY',
    '["first_name","agent_first_name"]'::jsonb
  ),
  (
    'Missed call — quick time?',
    'Hi {first_name}, tried calling — when''s a good time today for a quick chat about NFSTAY''s short-let deals? {agent_first_name}',
    '["first_name","agent_first_name"]'::jsonb
  ),
  (
    'Voicemail follow-up',
    'Hi {first_name}, left you a voicemail — quick question about Airbnb deals at NFSTAY. Drop me a line when you have 2 mins. {agent_first_name}',
    '["first_name","agent_first_name"]'::jsonb
  ),
  (
    'Nurturing nudge',
    'Hi {first_name}, no rush — just keeping in touch. Let me know if anything pops up that you''d like to explore on the property side. {agent_first_name} · NFSTAY',
    '["first_name","agent_first_name"]'::jsonb
  ),
  (
    'Tomorrow follow-up confirm',
    'Hi {first_name}, all set for our quick call tomorrow — what time works best, morning or afternoon? {agent_first_name}',
    '["first_name","agent_first_name"]'::jsonb
  )
) AS v(name, body_md, merge_fields)
WHERE NOT EXISTS (
  SELECT 1 FROM wk_sms_templates t
  WHERE LOWER(t.name) = LOWER(v.name)
);
