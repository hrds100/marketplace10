-- Add lister_id to inquiries so My Leads can filter by user ID
-- instead of relying on phone/email matching
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS lister_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_inquiries_lister_id ON public.inquiries(lister_id);

-- Update SELECT policy to include lister_id match
DROP POLICY IF EXISTS "Listers can read their inquiries" ON public.inquiries;
CREATE POLICY "Listers can read their inquiries" ON public.inquiries
  FOR SELECT USING (
    auth.uid() = tenant_id
    OR auth.uid() = lister_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        (p.whatsapp IS NOT NULL AND p.whatsapp != '' AND inquiries.lister_phone = p.whatsapp)
        OR (p.email IS NOT NULL AND p.email != '' AND inquiries.lister_email = p.email)
      )
    )
  );

-- Update UPDATE policy to include lister_id match
DROP POLICY IF EXISTS "Lister or service role can update inquiries" ON public.inquiries;
CREATE POLICY "Lister or service role can update inquiries" ON public.inquiries
  FOR UPDATE USING (
    auth.role() = 'service_role'
    OR auth.uid() = lister_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        (p.whatsapp IS NOT NULL AND p.whatsapp != '' AND inquiries.lister_phone = p.whatsapp)
        OR (p.email IS NOT NULL AND p.email != '' AND inquiries.lister_email = p.email)
      )
    )
  );
