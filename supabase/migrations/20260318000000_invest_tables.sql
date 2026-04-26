-- ============================================================================
-- INVESTMENT MODULE — ALL TABLES + RLS
-- Run in Supabase SQL Editor or via migration
-- ============================================================================

-- 1. inv_properties
CREATE TABLE IF NOT EXISTS inv_properties (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  country TEXT,
  image TEXT,
  images TEXT[] DEFAULT '{}',
  price_per_share NUMERIC NOT NULL,
  total_shares INTEGER NOT NULL,
  shares_sold INTEGER DEFAULT 0,
  annual_yield NUMERIC,
  monthly_rent NUMERIC,
  property_value NUMERIC,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'funded', 'closed')),
  type TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  area INTEGER,
  description TEXT,
  highlights TEXT[] DEFAULT '{}',
  documents TEXT[] DEFAULT '{}',
  occupancy_rate INTEGER,
  year_built INTEGER,
  blockchain_property_id INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inv_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_properties_select" ON inv_properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "inv_properties_admin_insert" ON inv_properties FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com'));
CREATE POLICY "inv_properties_admin_update" ON inv_properties FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com'));
CREATE POLICY "inv_properties_admin_delete" ON inv_properties FOR DELETE TO authenticated
  USING (auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com'));

-- 2. inv_shareholdings
CREATE TABLE IF NOT EXISTS inv_shareholdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  property_id INTEGER REFERENCES inv_properties(id) NOT NULL,
  shares_owned INTEGER NOT NULL,
  invested_amount NUMERIC NOT NULL,
  current_value NUMERIC,
  total_earned NUMERIC DEFAULT 0,
  last_payout_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, property_id)
);

ALTER TABLE inv_shareholdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_shareholdings_own" ON inv_shareholdings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "inv_shareholdings_service" ON inv_shareholdings FOR ALL TO service_role USING (true);

-- 3. inv_orders
CREATE TABLE IF NOT EXISTS inv_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  property_id INTEGER REFERENCES inv_properties(id) NOT NULL,
  shares_requested INTEGER NOT NULL,
  amount_paid NUMERIC NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('card', 'crypto_usdc', 'crypto_bnb')),
  agent_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded')),
  tx_hash TEXT,
  external_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inv_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_orders_own" ON inv_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "inv_orders_insert" ON inv_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inv_orders_service" ON inv_orders FOR ALL TO service_role USING (true);

-- 4. inv_payouts
CREATE TABLE IF NOT EXISTS inv_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  property_id INTEGER REFERENCES inv_properties(id) NOT NULL,
  period_date DATE NOT NULL,
  shares_owned INTEGER,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimable', 'claimed', 'paid')),
  claim_method TEXT,
  tx_hash TEXT,
  claimed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inv_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_payouts_own" ON inv_payouts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "inv_payouts_service" ON inv_payouts FOR ALL TO service_role USING (true);

-- 5. inv_proposals
CREATE TABLE IF NOT EXISTS inv_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id INTEGER REFERENCES inv_properties(id) NOT NULL,
  proposer_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Renovation', 'Management', 'Pricing', 'Distribution', 'Strategy')),
  votes_yes INTEGER DEFAULT 0,
  votes_no INTEGER DEFAULT 0,
  total_eligible_votes INTEGER,
  quorum INTEGER,
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  result TEXT CHECK (result IN ('approved', 'rejected')),
  blockchain_proposal_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inv_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_proposals_select" ON inv_proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "inv_proposals_insert" ON inv_proposals FOR INSERT TO authenticated WITH CHECK (auth.uid() = proposer_id);
CREATE POLICY "inv_proposals_service" ON inv_proposals FOR ALL TO service_role USING (true);

-- 6. inv_votes
CREATE TABLE IF NOT EXISTS inv_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES inv_proposals(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('yes', 'no')),
  shares_weight INTEGER,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(proposal_id, user_id)
);

ALTER TABLE inv_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_votes_own" ON inv_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "inv_votes_insert" ON inv_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inv_votes_service" ON inv_votes FOR ALL TO service_role USING (true);

-- 7. inv_boost_status
CREATE TABLE IF NOT EXISTS inv_boost_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  property_id INTEGER REFERENCES inv_properties(id) NOT NULL,
  is_boosted BOOLEAN DEFAULT false,
  boosted_apr NUMERIC,
  base_apr NUMERIC,
  boost_cost_usdc NUMERIC,
  stay_earned NUMERIC DEFAULT 0,
  boosted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, property_id)
);

ALTER TABLE inv_boost_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_boost_own" ON inv_boost_status FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "inv_boost_service" ON inv_boost_status FOR ALL TO service_role USING (true);

-- 8. aff_profiles
CREATE TABLE IF NOT EXISTS aff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  full_name TEXT,
  tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'silver', 'gold', 'diamond')),
  total_earned NUMERIC DEFAULT 0,
  total_claimed NUMERIC DEFAULT 0,
  pending_balance NUMERIC DEFAULT 0,
  link_clicks INTEGER DEFAULT 0,
  signups INTEGER DEFAULT 0,
  paid_users INTEGER DEFAULT 0,
  payout_method TEXT,
  payout_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE aff_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_profiles_own" ON aff_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "aff_profiles_insert" ON aff_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "aff_profiles_service" ON aff_profiles FOR ALL TO service_role USING (true);

-- 9. aff_commissions
CREATE TABLE IF NOT EXISTS aff_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES aff_profiles(id) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('subscription', 'investment_first', 'investment_recurring')),
  source_id TEXT NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id),
  property_id INTEGER REFERENCES inv_properties(id),
  gross_amount NUMERIC NOT NULL,
  commission_rate NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimable', 'claimed', 'paid')),
  claimable_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  claim_method TEXT,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source, source_id)
);

ALTER TABLE aff_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_commissions_own" ON aff_commissions FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM aff_profiles WHERE user_id = auth.uid()));
CREATE POLICY "aff_commissions_service" ON aff_commissions FOR ALL TO service_role USING (true);

-- 10. aff_commission_settings
CREATE TABLE IF NOT EXISTS aff_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  commission_type TEXT NOT NULL CHECK (commission_type IN ('subscription', 'investment_first', 'investment_recurring')),
  rate NUMERIC NOT NULL,
  set_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, commission_type)
);

ALTER TABLE aff_commission_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_settings_admin" ON aff_commission_settings FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com'));
CREATE POLICY "aff_settings_service" ON aff_commission_settings FOR ALL TO service_role USING (true);

-- 11. aff_events
CREATE TABLE IF NOT EXISTS aff_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES aff_profiles(id) NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('click', 'signup', 'payment', 'payout_requested', 'payout_paid')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE aff_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_events_own" ON aff_events FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM aff_profiles WHERE user_id = auth.uid()));
CREATE POLICY "aff_events_service" ON aff_events FOR ALL TO service_role USING (true);

-- 12. user_bank_accounts (shared — no prefix)
CREATE TABLE IF NOT EXISTS user_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('GBP', 'EUR')),
  account_name TEXT NOT NULL,
  account_number TEXT,
  sort_code TEXT,
  iban TEXT,
  bic TEXT,
  bank_country TEXT NOT NULL,
  revolut_counterparty_id TEXT,
  revolut_counterparty_account_id TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank_own_select" ON user_bank_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bank_own_insert" ON user_bank_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bank_own_update" ON user_bank_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id AND is_verified = false);
CREATE POLICY "bank_service" ON user_bank_accounts FOR ALL TO service_role USING (true);

-- 13. payout_claims (shared — no prefix)
CREATE TABLE IF NOT EXISTS payout_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('investor', 'affiliate', 'subscriber')),
  amount_entitled NUMERIC NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('GBP', 'EUR')),
  bank_account_id UUID REFERENCES user_bank_accounts(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  week_ref TEXT NOT NULL,
  revolut_payment_draft_id TEXT,
  revolut_transaction_id TEXT,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_ref)
);

ALTER TABLE payout_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claims_own_select" ON payout_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "claims_own_insert" ON payout_claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "claims_service" ON payout_claims FOR ALL TO service_role USING (true);

-- 14. payout_audit_log
CREATE TABLE IF NOT EXISTS payout_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES payout_claims(id),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  performed_by TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payout_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_service" ON payout_audit_log FOR ALL TO service_role USING (true);

-- Add wallet_address to profiles if not exists
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Seed global commission defaults
INSERT INTO aff_commission_settings (user_id, commission_type, rate) VALUES
  (NULL, 'subscription', 0.40),
  (NULL, 'investment_first', 0.05),
  (NULL, 'investment_recurring', 0.02)
ON CONFLICT DO NOTHING;

-- Seed 1 investment property
INSERT INTO inv_properties (title, location, country, image, images, price_per_share, total_shares, shares_sold, annual_yield, monthly_rent, property_value, status, type, bedrooms, bathrooms, area, description, highlights, documents, occupancy_rate, year_built, blockchain_property_id)
VALUES (
  'Seseh Beachfront Villa',
  'Seseh, Bali',
  'Indonesia',
  'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80'],
  100, 1000, 720, 12.4, 8500, 450000, 'open', 'Villa', 4, 3, 320,
  'A stunning 4-bedroom beachfront villa in the heart of Seseh, Bali. Fully managed with proven Airbnb income.',
  ARRAY['Beachfront location', 'Fully furnished', 'Property management included', 'Proven rental income'],
  ARRAY['Investment Memorandum', 'Title Deed', 'Financial Projections', 'Management Agreement'],
  87, 2022, 1
) ON CONFLICT DO NOTHING;

