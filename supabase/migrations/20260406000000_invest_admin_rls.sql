-- Allow hub admins to list all affiliate commissions on /admin/invest/commissions.
-- Without this, aff_commissions_own only returns the signed-in user's affiliate rows.

CREATE POLICY "aff_commissions_admin_select" ON public.aff_commissions
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'admin@hub.nfstay.com',
      'hugo@nfstay.com',
      'chrisgermano@icloud.com',
      'hugodesouzax@gmail.com'
    )
  );

-- Allow hub admins to list all shareholdings on /admin/invest/shareholders.
-- Without this, inv_shareholdings_own only returns the signed-in user's rows.

CREATE POLICY "inv_shareholdings_admin_select" ON public.inv_shareholdings
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'admin@hub.nfstay.com',
      'hugo@nfstay.com',
      'chrisgermano@icloud.com',
      'hugodesouzax@gmail.com'
    )
  );
