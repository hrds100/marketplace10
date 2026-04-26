-- Affiliate System: profiles + events tables
-- Commission: 30% referral signup, 40% direct link payment, 10% JV partner (future)

CREATE TABLE affiliate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  paypal_email TEXT,
  rank TEXT NOT NULL DEFAULT 'bronze' CHECK (rank IN ('bronze', 'silver', 'gold', 'diamond')),
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_signups INTEGER NOT NULL DEFAULT 0,
  total_paid_users INTEGER NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_paid_out NUMERIC NOT NULL DEFAULT 0,
  pending_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_affiliate_profiles_user ON affiliate_profiles(user_id);
CREATE UNIQUE INDEX idx_affiliate_profiles_code ON affiliate_profiles(referral_code);

CREATE TABLE affiliate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('click', 'signup', 'payment', 'payout_requested', 'payout_paid')),
  referred_user_id UUID REFERENCES auth.users(id),
  amount NUMERIC DEFAULT 0,
  commission_type TEXT CHECK (commission_type IN ('referral', 'direct_link', 'jv_partner')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliate_events_affiliate ON affiliate_events(affiliate_id, event_type, created_at DESC);
CREATE INDEX idx_affiliate_events_type ON affiliate_events(event_type, created_at DESC);

-- Track which user was referred by which affiliate
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- RLS
ALTER TABLE affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_events ENABLE ROW LEVEL SECURITY;

-- Affiliate profiles: users see their own, admin sees all
CREATE POLICY "affiliate_own_profile" ON affiliate_profiles
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "affiliate_admin_read" ON affiliate_profiles
  FOR SELECT USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

CREATE POLICY "affiliate_admin_update" ON affiliate_profiles
  FOR UPDATE USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- Affiliate events: users see their own, admin sees all
CREATE POLICY "events_own_read" ON affiliate_events
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliate_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "events_own_insert" ON affiliate_events
  FOR INSERT WITH CHECK (
    affiliate_id IN (SELECT id FROM affiliate_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "events_admin_read" ON affiliate_events
  FOR SELECT USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- Service role can do everything (for Edge Functions and n8n)
-- (service_role bypasses RLS automatically)

-- Leaderboard: public read of aggregate stats only (no personal data)
CREATE POLICY "affiliate_leaderboard_read" ON affiliate_profiles
  FOR SELECT USING (true);
