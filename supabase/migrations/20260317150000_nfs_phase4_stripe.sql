-- ============================================================================
-- NFStay Phase 4 — Stripe Payments Tables
-- Migration: 20260317150000_nfs_phase4_stripe.sql
--
-- Tables: nfs_stripe_accounts, nfs_webhook_events
-- Includes: RLS policies, indexes
--
-- ⚠️  REQUIRES HUGO TO REVIEW SQL BEFORE EXECUTION
-- This migration creates new tables only. No existing tables are modified.
-- ============================================================================

-- ============================================================================
-- 1. nfs_stripe_accounts
-- ============================================================================

CREATE TABLE nfs_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,

  -- Stripe Connect
  connect_account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  stripe_user_id TEXT,
  stripe_publishable_key TEXT,
  oauth_state TEXT,
  oauth_code_verifier TEXT,

  -- Account status
  connection_status TEXT DEFAULT '',
  account_status TEXT DEFAULT 'pending',
  details_submitted BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  currently_due TEXT[] DEFAULT '{}',
  past_due TEXT[] DEFAULT '{}',

  -- Fee config
  platform_fee_pct NUMERIC(5,2) DEFAULT 3.0,
  stripe_fee_pct NUMERIC(5,2) DEFAULT 2.9,
  stripe_fee_fixed INTEGER DEFAULT 30,

  -- Earnings tracking
  total_earned NUMERIC DEFAULT 0,
  total_platform_fees NUMERIC DEFAULT 0,
  total_transferred NUMERIC DEFAULT 0,
  total_paid_out NUMERIC DEFAULT 0,
  pending_amount NUMERIC DEFAULT 0,
  last_payout_date TIMESTAMPTZ,
  last_payout_amount NUMERIC,

  -- Connection lifecycle
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT false,
  last_error JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_nfs_stripe_accounts_operator ON nfs_stripe_accounts(operator_id);
CREATE INDEX idx_nfs_stripe_accounts_connect ON nfs_stripe_accounts(connect_account_id);

-- updated_at trigger (reuses Phase 1 function)
CREATE TRIGGER nfs_stripe_accounts_updated_at
  BEFORE UPDATE ON nfs_stripe_accounts
  FOR EACH ROW EXECUTE FUNCTION nfs_set_updated_at();

-- RLS
ALTER TABLE nfs_stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Operator reads/updates own Stripe account
CREATE POLICY "nfs_stripe_accounts_operator_access" ON nfs_stripe_accounts
  FOR ALL USING (
    operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid())
  );

-- ============================================================================
-- 2. nfs_webhook_events (idempotency tracking)
-- ============================================================================

CREATE TABLE nfs_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('stripe', 'stripe_connect', 'hospitable')),
  external_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed BOOLEAN DEFAULT false,
  success BOOLEAN,
  error TEXT,
  data JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_nfs_webhook_events_lookup ON nfs_webhook_events(external_event_id);
CREATE INDEX idx_nfs_webhook_events_source ON nfs_webhook_events(source, event_type);

-- RLS (service role only — no direct user access)
ALTER TABLE nfs_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nfs_webhook_events_service_only" ON nfs_webhook_events
  FOR ALL USING (false);

-- ============================================================================
-- End of migration
-- ============================================================================
