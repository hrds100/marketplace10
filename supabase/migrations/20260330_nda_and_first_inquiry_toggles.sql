-- Add admin-controlled toggles to properties table
-- nda_required: when ON, leads require NDA before showing contact details (any lister type)
-- first_landlord_inquiry: when ON, first tenant inquiry triggers multi-step WhatsApp sequence
-- source: tracks where the listing came from (quick_list or self_submitted)

ALTER TABLE properties ADD COLUMN IF NOT EXISTS nda_required BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS first_landlord_inquiry BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'self_submitted'
  CHECK (source IN ('quick_list', 'self_submitted'));

-- Also add nda_required to inquiries so process-inquiry can stamp it per-lead
-- (copied from the property at inquiry time, used by LeadsTab without extra join)
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS nda_required BOOLEAN DEFAULT FALSE;

-- Fix inquiries RLS: replace the overly permissive "Anyone can read by token" policy
-- with a proper lister-scoped policy

-- Drop the broken policy
DROP POLICY IF EXISTS "Anyone can read by token" ON public.inquiries;

-- Listers can read inquiries for their properties (matched by phone or email)
CREATE POLICY "Listers can read their inquiries" ON public.inquiries
  FOR SELECT USING (
    auth.uid() = tenant_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        (p.whatsapp IS NOT NULL AND p.whatsapp != '' AND public.inquiries.lister_phone = p.whatsapp)
        OR (p.email IS NOT NULL AND p.email != '' AND public.inquiries.lister_email = p.email)
      )
    )
  );

-- Admins can read all inquiries
CREATE POLICY "Admins can read all inquiries" ON public.inquiries
  FOR SELECT USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- Service role read (for edge functions using service role key)
CREATE POLICY "Service role can read inquiries" ON public.inquiries
  FOR SELECT USING (
    auth.role() = 'service_role'
  );

-- Restrict UPDATE: only service role or matching lister can update
DROP POLICY IF EXISTS "Service role can update" ON public.inquiries;

CREATE POLICY "Lister or service role can update inquiries" ON public.inquiries
  FOR UPDATE USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        (p.whatsapp IS NOT NULL AND p.whatsapp != '' AND public.inquiries.lister_phone = p.whatsapp)
        OR (p.email IS NOT NULL AND p.email != '' AND public.inquiries.lister_email = p.email)
      )
    )
  );
