-- Backfill a missing SamCart-style row in inv_orders (e.g. old $5 test that never stored).
-- Run in Supabase Dashboard → SQL Editor for project asazddtvjvmckouxcmmo
-- 1. Replace the email below with the buyer's hub login email (must match profiles.email).
-- 2. Optionally set v_prop to a specific inv_properties.id; otherwise first "open" property is used.

DO $$
DECLARE
  v_user uuid;
  v_prop int;
  v_amount numeric := 5; -- USD paid
BEGIN
  SELECT id INTO v_user
  FROM public.profiles
  WHERE email ILIKE 'REPLACE_WITH_BUYER_EMAIL@example.com'
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No profile for that email — fix REPLACE_WITH_BUYER_EMAIL in this script';
  END IF;

  SELECT id INTO v_prop
  FROM public.inv_properties
  WHERE status = 'open'
  ORDER BY id ASC
  LIMIT 1;

  IF v_prop IS NULL THEN
    RAISE EXCEPTION 'No open inv_properties row — create one or pick an id manually';
  END IF;

  INSERT INTO public.inv_orders (
    user_id,
    property_id,
    shares_requested,
    amount_paid,
    payment_method,
    status,
    external_order_id
  ) VALUES (
    v_user,
    v_prop,
    0, -- below one full share
    v_amount,
    'card',
    'pending',
    'manual-backfill-' || to_char(now() AT TIME ZONE 'utc', 'YYYYMMDDHH24MISS')
  );
END $$;

-- Verify (optional): last few orders
-- SELECT id, user_id, property_id, amount_paid, shares_requested, status, external_order_id, created_at
-- FROM public.inv_orders ORDER BY created_at DESC LIMIT 5;
