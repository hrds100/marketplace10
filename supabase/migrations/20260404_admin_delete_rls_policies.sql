-- Add admin DELETE RLS policies for tables that were missing them.
-- Without these, admin bulk-delete operations from the browser client
-- silently returned 0 rows because RLS blocked the DELETE.

CREATE POLICY "Admin can delete inquiries"
ON public.inquiries FOR DELETE
TO authenticated
USING (auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com'));

CREATE POLICY "Admin can delete notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com'));

CREATE POLICY "Admin can delete aff_profiles"
ON public.aff_profiles FOR DELETE
TO authenticated
USING (auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com'));
