-- Allow hub admins to list and manage all investment orders (SamCart + crypto).
-- Without this, inv_orders_own only returns the signed-in user's rows, so /admin/invest/orders appears empty.

CREATE POLICY "inv_orders_admin_select" ON public.inv_orders
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'admin@hub.nfstay.com',
      'hugo@nfstay.com',
      'chrisgermano@icloud.com',
      'hugodesouzax@gmail.com'
    )
  );

CREATE POLICY "inv_orders_admin_update" ON public.inv_orders
  FOR UPDATE TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'admin@hub.nfstay.com',
      'hugo@nfstay.com',
      'chrisgermano@icloud.com',
      'hugodesouzax@gmail.com'
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') IN (
      'admin@hub.nfstay.com',
      'hugo@nfstay.com',
      'chrisgermano@icloud.com',
      'hugodesouzax@gmail.com'
    )
  );
