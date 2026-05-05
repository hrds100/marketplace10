-- Script recordings table for hub.nfstay.com/script recording studio
CREATE TABLE IF NOT EXISTS script_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_index INTEGER NOT NULL,
  audio_path TEXT NOT NULL,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow public access (page is PIN-protected in the frontend)
ALTER TABLE script_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "script_recordings_public_all" ON script_recordings FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('script-recordings', 'script-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public upload/read/delete on the bucket
CREATE POLICY "script_recordings_bucket_select" ON storage.objects FOR SELECT USING (bucket_id = 'script-recordings');
CREATE POLICY "script_recordings_bucket_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'script-recordings');
CREATE POLICY "script_recordings_bucket_delete" ON storage.objects FOR DELETE USING (bucket_id = 'script-recordings');
