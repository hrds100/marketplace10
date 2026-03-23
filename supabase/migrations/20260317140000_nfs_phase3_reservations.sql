-- ============================================================================
-- nfstay Phase 3 — Reservations + Pricing Tables
-- Migration: 20260317140000_nfs_phase3_reservations.sql
--
-- Tables: nfs_reservations, nfs_promo_codes, nfs_guest_sessions
-- Includes: RLS policies, indexes, availability check RPC
--
-- ⚠️  REQUIRES TAJUL TO REVIEW SQL BEFORE EXECUTION
-- This migration creates new tables only. No existing tables are modified.
-- ============================================================================

-- ============================================================================
-- 1. nfs_reservations
-- ============================================================================

CREATE TABLE nfs_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES nfs_properties(id),
  operator_id UUID REFERENCES nfs_operators(id),
  created_by UUID REFERENCES profiles(id),

  -- Guest info
  guest_email TEXT,
  guest_first_name TEXT,
  guest_last_name TEXT,
  guest_phone TEXT,
  guest_address TEXT,
  guest_city TEXT,
  guest_country TEXT,

  -- Booking
  booking_source TEXT DEFAULT 'operator_direct'
    CHECK (booking_source IN ('main_platform', 'white_label', 'operator_direct')),
  operator_domain TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  check_in_time TEXT NOT NULL,
  check_out_time TEXT NOT NULL,
  guest_message TEXT DEFAULT '',
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'expired')),

  -- Guests
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  infants INTEGER DEFAULT 0,
  pets INTEGER DEFAULT 0,

  -- Pricing
  total_amount NUMERIC NOT NULL,
  discounts JSONB DEFAULT '[]',
  add_ons JSONB DEFAULT '[]',
  custom_fees JSONB DEFAULT '[]',
  synced_rate_modifier JSONB,
  expiration JSONB,
  block_dates BOOLEAN DEFAULT false,

  -- Payment
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'partially_refunded', 'refunded', 'failed')),
  stripe_charge_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  stripe_refund_id TEXT,
  payment_currency TEXT DEFAULT 'USD',
  payment_amounts JSONB DEFAULT '{}',
  payment_fee_breakdown JSONB DEFAULT '[]',
  payment_processed_at TIMESTAMPTZ,
  refund_amount NUMERIC,
  refund_status TEXT,
  refund_reason TEXT,
  refund_at TIMESTAMPTZ,
  promo_code TEXT,
  promo_discount_amount NUMERIC,

  -- Guest session
  guest_token TEXT,
  is_linked_to_user BOOLEAN DEFAULT false,
  linked_at TIMESTAMPTZ,

  -- Hospitable (Phase 5)
  hospitable_reservation_id TEXT,
  hospitable_platform TEXT,
  hospitable_platform_id TEXT,
  hospitable_connection_id TEXT,
  hospitable_status TEXT,
  hospitable_financials JSONB,
  hospitable_status_history JSONB DEFAULT '[]',
  hospitable_last_sync_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_nfs_reservations_property ON nfs_reservations(property_id, status);
CREATE INDEX idx_nfs_reservations_dates ON nfs_reservations(check_in, check_out);
CREATE INDEX idx_nfs_reservations_guest ON nfs_reservations(guest_email);
CREATE INDEX idx_nfs_reservations_operator ON nfs_reservations(operator_id);
CREATE INDEX idx_nfs_reservations_hospitable ON nfs_reservations(hospitable_reservation_id);

-- updated_at trigger (reuses Phase 1 function)
CREATE TRIGGER nfs_reservations_updated_at
  BEFORE UPDATE ON nfs_reservations
  FOR EACH ROW EXECUTE FUNCTION nfs_set_updated_at();

-- RLS
ALTER TABLE nfs_reservations ENABLE ROW LEVEL SECURITY;

-- Operator manages reservations for their properties
CREATE POLICY "nfs_reservations_operator_access" ON nfs_reservations
  FOR ALL USING (
    operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid())
  );

-- Traveler reads own reservations
CREATE POLICY "nfs_reservations_traveler_read" ON nfs_reservations
  FOR SELECT USING (created_by = auth.uid());

-- ============================================================================
-- 2. nfs_promo_codes
-- ============================================================================

CREATE TABLE nfs_promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,
  name TEXT,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  value NUMERIC NOT NULL CHECK (value >= 0),
  currency TEXT CHECK (currency IN ('USD', 'EUR', 'GBP')),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  limited_uses BOOLEAN DEFAULT false,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'inactive', 'draft')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_nfs_promo_codes_operator ON nfs_promo_codes(operator_id);

-- updated_at trigger
CREATE TRIGGER nfs_promo_codes_updated_at
  BEFORE UPDATE ON nfs_promo_codes
  FOR EACH ROW EXECUTE FUNCTION nfs_set_updated_at();

-- RLS
ALTER TABLE nfs_promo_codes ENABLE ROW LEVEL SECURITY;

-- Operator manages own promo codes
CREATE POLICY "nfs_promo_codes_operator_access" ON nfs_promo_codes
  FOR ALL USING (
    operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid())
  );

-- Public can validate active codes (travelers check if code is valid)
CREATE POLICY "nfs_promo_codes_public_validate" ON nfs_promo_codes
  FOR SELECT USING (status = 'active');

-- ============================================================================
-- 3. nfs_guest_sessions
-- ============================================================================

CREATE TABLE nfs_guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  session_data JSONB DEFAULT '{}',
  linked_reservations UUID[] DEFAULT '{}',
  linked_user_id UUID REFERENCES profiles(id),
  linked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_nfs_guest_sessions_token ON nfs_guest_sessions(token);

-- RLS (service role only — no direct user access)
ALTER TABLE nfs_guest_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nfs_guest_sessions_service_only" ON nfs_guest_sessions
  FOR ALL USING (false);

-- ============================================================================
-- 4. Availability check RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION nfs_check_availability(
  p_property_id UUID,
  p_check_in DATE,
  p_check_out DATE
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM nfs_reservations
    WHERE property_id = p_property_id
      AND status IN ('pending', 'confirmed')
      AND check_in < p_check_out
      AND check_out > p_check_in
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- End of migration
-- ============================================================================
