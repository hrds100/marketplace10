-- Allow hub admins to read buyer emails on profiles when reconciling inv_orders.
-- Without this, SELECT on profiles is self-only, so Admin → Investment orders shows blank user emails.

CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'admin@hub.nfstay.com',
      'hugo@nfstay.com',
      'chrisgermano@icloud.com',
      'hugodesouzax@gmail.com'
    )
  );
