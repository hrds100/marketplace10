-- ============================================================================
-- NFStay Phase 1 — Core Foundation Tables
-- Migration: 20260317120000_nfs_phase1_core_tables.sql
--
-- Tables: nfs_operators, nfs_operator_users, nfs_auth_tokens
-- Includes: RLS policies, updated_at triggers
--
-- ⚠️  REQUIRES HUGO TO REVIEW SQL BEFORE EXECUTION
-- This migration creates new tables only. No existing tables are modified.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: updated_at trigger function (idempotent — safe if already exists)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION nfs_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. nfs_operators
-- ============================================================================

CREATE TABLE nfs_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Identity
  first_name TEXT,
  last_name TEXT,
  persona_type TEXT CHECK (persona_type IN ('owner', 'property_manager')),
  listings_count INTEGER DEFAULT 0,

  -- Business
  brand_name TEXT,
  legal_name TEXT,
  subdomain TEXT UNIQUE,

  -- Website / Custom Domain
  primary_domain_type TEXT DEFAULT 'subdomain' CHECK (primary_domain_type IN ('subdomain', 'custom')),
  custom_domain TEXT,
  custom_domain_verified BOOLEAN DEFAULT false,
  custom_domain_dns_verified BOOLEAN DEFAULT false,
  custom_domain_dns_method TEXT,
  custom_domain_dns_checked_at TIMESTAMPTZ,
  custom_domain_cf JSONB DEFAULT '{}',

  -- Branding
  accent_color TEXT,
  logo_url TEXT,
  logo_alt TEXT,
  favicon_url TEXT,

  -- Landing Page
  landing_page_enabled BOOLEAN DEFAULT true,
  hero_photo TEXT,
  hero_headline TEXT,
  hero_subheadline TEXT,
  about_bio TEXT,
  about_photo TEXT,
  faqs JSONB DEFAULT '[]',

  -- Contact
  contact_email TEXT,
  contact_phone TEXT,
  contact_whatsapp TEXT,
  contact_telegram TEXT,

  -- External Accounts
  google_business_url TEXT,
  airbnb_url TEXT,
  social_twitter TEXT,
  social_instagram TEXT,
  social_facebook TEXT,
  social_tiktok TEXT,
  social_youtube TEXT,

  -- Analytics / SEO
  google_analytics_id TEXT,
  meta_pixel_id TEXT,
  meta_title TEXT,
  meta_description TEXT,

  -- Payment Settings
  fees_options_enabled BOOLEAN DEFAULT false,

  -- Onboarding
  onboarding_step TEXT DEFAULT 'account_setup'
    CHECK (onboarding_step IN ('account_setup','persona','usage_intent','business',
           'landing_page','website_customization','contact_info','payment_methods','completed')),
  onboarding_completed_steps TEXT[] DEFAULT '{}',
  onboarding_skipped_steps TEXT[] DEFAULT '{}',
  onboarding_preference TEXT CHECK (onboarding_preference IN
    ('create_from_scratch','import_from_airbnb','import_from_pms','need_advice')),
  usage_intent TEXT CHECK (usage_intent IN ('direct_booking','vacation_rental','booking_widget','undecided')),
  onboarding_updated_at TIMESTAMPTZ DEFAULT now(),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- updated_at trigger
CREATE TRIGGER nfs_operators_updated_at
  BEFORE UPDATE ON nfs_operators
  FOR EACH ROW EXECUTE FUNCTION nfs_set_updated_at();

-- RLS
ALTER TABLE nfs_operators ENABLE ROW LEVEL SECURITY;

-- Operator reads/updates own row (profile_id = auth.uid())
CREATE POLICY "nfs_operators_owner_access" ON nfs_operators
  FOR ALL USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- ============================================================================
-- 2. nfs_operator_users (depends on nfs_operators)
-- ============================================================================

CREATE TABLE nfs_operator_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  operator_id UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'affiliate')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  invited_by UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, operator_id)
);

-- RLS
ALTER TABLE nfs_operator_users ENABLE ROW LEVEL SECURITY;

-- Team members see their operator's users
CREATE POLICY "nfs_operator_users_team_access" ON nfs_operator_users
  FOR ALL USING (
    operator_id IN (
      SELECT operator_id FROM nfs_operator_users WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    operator_id IN (
      SELECT operator_id FROM nfs_operator_users WHERE profile_id = auth.uid()
    )
  );

-- Operator owner also has access via nfs_operators
CREATE POLICY "nfs_operator_users_operator_owner" ON nfs_operator_users
  FOR ALL USING (
    operator_id IN (
      SELECT id FROM nfs_operators WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    operator_id IN (
      SELECT id FROM nfs_operators WHERE profile_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. nfs_auth_tokens
-- ============================================================================

CREATE TABLE nfs_auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('verification', 'passwordless', 'invitation')),
  operator_id UUID REFERENCES nfs_operators(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour')
);

-- RLS
ALTER TABLE nfs_auth_tokens ENABLE ROW LEVEL SECURITY;

-- Auth tokens are managed by service role only (Edge Functions, n8n).
-- No direct user access — tokens are looked up server-side.
-- Service role bypasses RLS automatically.

-- ============================================================================
-- End of migration
-- ============================================================================
