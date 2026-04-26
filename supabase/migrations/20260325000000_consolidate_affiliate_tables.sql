-- ============================================================================
-- CONSOLIDATE AFFILIATE TABLES
-- Merges old `affiliate_profiles` + `affiliate_events` into
-- `aff_profiles` + `aff_events` (single source of truth)
-- ============================================================================

-- 1. Add missing columns to aff_events (needed for payout tracking)
ALTER TABLE aff_events ADD COLUMN IF NOT EXISTS referred_user_id UUID REFERENCES auth.users(id);
ALTER TABLE aff_events ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE aff_events ADD COLUMN IF NOT EXISTS commission_type TEXT;

-- 2. Add missing RLS policies to aff_profiles (frontend needs UPDATE + leaderboard SELECT)
DO $$ BEGIN
  -- Allow users to update their own aff_profiles row
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'aff_profiles_update_own' AND tablename = 'aff_profiles') THEN
    CREATE POLICY "aff_profiles_update_own" ON aff_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
  -- Admin can read all aff_profiles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'aff_profiles_admin_read' AND tablename = 'aff_profiles') THEN
    CREATE POLICY "aff_profiles_admin_read" ON aff_profiles FOR SELECT TO authenticated
      USING (auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com'));
  END IF;
  -- Admin can update all aff_profiles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'aff_profiles_admin_update' AND tablename = 'aff_profiles') THEN
    CREATE POLICY "aff_profiles_admin_update" ON aff_profiles FOR UPDATE TO authenticated
      USING (auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com'));
  END IF;
  -- Leaderboard: all authenticated users can read aggregate data
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'aff_profiles_leaderboard' AND tablename = 'aff_profiles') THEN
    CREATE POLICY "aff_profiles_leaderboard" ON aff_profiles FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- 3. Add missing RLS policies to aff_events (frontend needs INSERT + admin read)
DO $$ BEGIN
  -- Users can insert their own events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'aff_events_insert_own' AND tablename = 'aff_events') THEN
    CREATE POLICY "aff_events_insert_own" ON aff_events FOR INSERT TO authenticated
      WITH CHECK (affiliate_id IN (SELECT id FROM aff_profiles WHERE user_id = auth.uid()));
  END IF;
  -- Admin can read all events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'aff_events_admin_read' AND tablename = 'aff_events') THEN
    CREATE POLICY "aff_events_admin_read" ON aff_events FOR SELECT TO authenticated
      USING (auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com'));
  END IF;
  -- Admin can update events (mark payout as paid)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'aff_events_admin_update' AND tablename = 'aff_events') THEN
    CREATE POLICY "aff_events_admin_update" ON aff_events FOR UPDATE TO authenticated
      USING (auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com'));
  END IF;
END $$;

-- 4. Migrate data from affiliate_profiles → aff_profiles (skip duplicates by user_id)
INSERT INTO aff_profiles (user_id, referral_code, full_name, tier, total_earned, total_claimed, pending_balance, link_clicks, signups, paid_users, payout_method, payout_details, created_at)
SELECT
  ap.user_id,
  ap.referral_code,
  p.name,
  CASE ap.rank
    WHEN 'bronze' THEN 'standard'
    WHEN 'silver' THEN 'silver'
    WHEN 'gold'   THEN 'gold'
    WHEN 'diamond' THEN 'diamond'
    ELSE 'standard'
  END,
  ap.total_earned,
  ap.total_paid_out,
  ap.pending_balance,
  ap.total_clicks,
  ap.total_signups,
  ap.total_paid_users,
  CASE WHEN ap.paypal_email IS NOT NULL THEN 'paypal' ELSE NULL END,
  CASE WHEN ap.paypal_email IS NOT NULL THEN jsonb_build_object('paypal', ap.paypal_email) ELSE '{}'::jsonb END,
  ap.created_at
FROM affiliate_profiles ap
LEFT JOIN profiles p ON p.id = ap.user_id
WHERE NOT EXISTS (SELECT 1 FROM aff_profiles WHERE aff_profiles.user_id = ap.user_id)
ON CONFLICT (user_id) DO NOTHING;

-- 5. Migrate data from affiliate_events → aff_events
INSERT INTO aff_events (affiliate_id, event_type, referred_user_id, amount, commission_type, metadata, created_at)
SELECT
  new_aff.id,
  ae.event_type,
  ae.referred_user_id,
  ae.amount,
  ae.commission_type,
  ae.metadata,
  ae.created_at
FROM affiliate_events ae
JOIN affiliate_profiles old_aff ON old_aff.id = ae.affiliate_id
JOIN aff_profiles new_aff ON new_aff.user_id = old_aff.user_id
-- Only migrate events that don't already exist (use created_at + event_type as dedup key)
WHERE NOT EXISTS (
  SELECT 1 FROM aff_events ex
  WHERE ex.affiliate_id = new_aff.id
    AND ex.event_type = ae.event_type
    AND ex.created_at = ae.created_at
);

-- 6. Add index for referred_by lookups (used by webhook)
CREATE INDEX IF NOT EXISTS idx_aff_profiles_referral_code ON aff_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_aff_events_affiliate_type ON aff_events(affiliate_id, event_type, created_at DESC);

-- 7. Trigger: when aff_profiles.referral_code changes, update all profiles.referred_by
-- This ensures code changes (AGEN0W → AGEhugo) propagate to existing referrals
CREATE OR REPLACE FUNCTION sync_referred_by_on_code_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.referral_code IS DISTINCT FROM NEW.referral_code THEN
    UPDATE profiles
    SET referred_by = NEW.referral_code
    WHERE referred_by = OLD.referral_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_referred_by ON aff_profiles;
CREATE TRIGGER trg_sync_referred_by
  AFTER UPDATE OF referral_code ON aff_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_referred_by_on_code_change();

-- 8. Drop old tables (they are fully migrated)
-- IMPORTANT: Only drop after verifying migration succeeded in production
-- For safety, rename instead of drop
ALTER TABLE IF EXISTS affiliate_events RENAME TO _deprecated_affiliate_events;
ALTER TABLE IF EXISTS affiliate_profiles RENAME TO _deprecated_affiliate_profiles;
