-- Fix SMS RLS policies to include Hugo's actual login emails
-- The original policies only allowed admin@hub.nfstay.com and hugo@nfstay.com
-- but Hugo logs in with hugodesouzax@gmail.com, hugords100@gmail.com, or hugo24eu@gmail.com

DO $$
DECLARE
  tbl TEXT;
  pol TEXT;
  admin_list TEXT := $$ARRAY['admin@hub.nfstay.com', 'hugo@nfstay.com', 'hugodesouzax@gmail.com', 'hugords100@gmail.com', 'hugo24eu@gmail.com']$$;
BEGIN
  FOR tbl, pol IN
    SELECT tablename, policyname FROM pg_policies WHERE tablename LIKE 'sms_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (auth.jwt() ->> ''email'' = ANY(%s)) WITH CHECK (auth.jwt() ->> ''email'' = ANY(%s))',
      pol, tbl, admin_list, admin_list
    );
  END LOOP;
END;
$$;
