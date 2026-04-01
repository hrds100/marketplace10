-- Fix: Admin cannot update inquiries (authorize, toggle always_authorised)
-- The existing UPDATE policy only allows service_role or lister match.
-- Admin needs UPDATE access for the Tenant Requests admin panel.

-- Drop and recreate with admin included
DROP POLICY IF EXISTS "Lister or service role can update inquiries" ON public.inquiries;

CREATE POLICY "Admin lister or service role can update inquiries" ON public.inquiries
  FOR UPDATE USING (
    auth.role() = 'service_role'
    OR auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
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
