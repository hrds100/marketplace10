-- ============================================================================
-- SMSV2 — Phase 1 storage bucket
-- Private bucket for call recordings + voicemails. 5-min signed URLs in app.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'call-recordings',
  'call-recordings',
  false,
  524288000,                                  -- 500 MB per file
  ARRAY['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/ogg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Admins can read/write any object in the bucket.
DROP POLICY IF EXISTS "wk_call_recordings_admin_all" ON storage.objects;
CREATE POLICY "wk_call_recordings_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'call-recordings'
    AND (
      (auth.jwt() ->> 'email') IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND workspace_role = 'admin')
    )
  )
  WITH CHECK (
    bucket_id = 'call-recordings'
    AND (
      (auth.jwt() ->> 'email') IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND workspace_role = 'admin')
    )
  );

-- Agents can read recordings of their own calls only.
DROP POLICY IF EXISTS "wk_call_recordings_agent_read" ON storage.objects;
CREATE POLICY "wk_call_recordings_agent_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'call-recordings'
    AND EXISTS (
      SELECT 1
      FROM wk_recordings r
      JOIN wk_calls c ON c.id = r.call_id
      WHERE r.storage_path = name
        AND c.agent_id = auth.uid()
    )
  );
