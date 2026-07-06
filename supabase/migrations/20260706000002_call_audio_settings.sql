-- Call audio settings (Hugo 2026-07-06)
-- Per-number behavior when an inbound call isn't answered (or the line is
-- busy): keep the default voicemail flow, or play an admin-uploaded audio
-- message and hang up (no voicemail). Managed in /crm/settings → Channels.
--
-- 1. wk_numbers: additive columns (no reader breakage).
ALTER TABLE wk_numbers
  ADD COLUMN IF NOT EXISTS unanswered_action text NOT NULL DEFAULT 'voicemail'
    CHECK (unanswered_action IN ('voicemail', 'message')),
  ADD COLUMN IF NOT EXISTS unanswered_message_url text;

-- 2. Storage bucket for the uploaded audio. Public read — Twilio fetches
--    the file by URL when rendering <Play>.
INSERT INTO storage.buckets (id, name, public)
VALUES ('wk-call-audio', 'wk-call-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Admins manage the files; anyone can read (bucket is public anyway).
CREATE POLICY "wk_call_audio_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'wk-call-audio' AND wk_is_admin());
CREATE POLICY "wk_call_audio_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'wk-call-audio' AND wk_is_admin());
CREATE POLICY "wk_call_audio_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'wk-call-audio' AND wk_is_admin());
CREATE POLICY "wk_call_audio_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'wk-call-audio');
