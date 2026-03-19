-- ============================================================================
-- Investment Module — Add appreciation_rate and property_docs to inv_properties
-- ============================================================================

-- Add per-property appreciation rate (used in 5-year projection calculator)
-- Default 5.2 matches the previously hardcoded value
ALTER TABLE inv_properties
  ADD COLUMN IF NOT EXISTS appreciation_rate NUMERIC DEFAULT 5.2;

-- Add JSONB column for documents with upload URLs
-- Stores: [{name: string, url: string, path: string}]
-- Replaces the legacy documents TEXT[] (names only) for new uploads
ALTER TABLE inv_properties
  ADD COLUMN IF NOT EXISTS property_docs JSONB DEFAULT '[]'::jsonb;

-- Create Supabase Storage bucket for property documents (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('inv-property-docs', 'inv-property-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: all authenticated users can read (download)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='inv_docs_read'
  ) THEN
    CREATE POLICY "inv_docs_read"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'inv-property-docs');
  END IF;
END $$;

-- Storage policy: only admins can upload
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='inv_docs_admin_insert'
  ) THEN
    CREATE POLICY "inv_docs_admin_insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'inv-property-docs'
        AND (auth.jwt() ->> 'email') IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
      );
  END IF;
END $$;

-- Storage policy: only admins can delete
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='inv_docs_admin_delete'
  ) THEN
    CREATE POLICY "inv_docs_admin_delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'inv-property-docs'
        AND (auth.jwt() ->> 'email') IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
      );
  END IF;
END $$;
