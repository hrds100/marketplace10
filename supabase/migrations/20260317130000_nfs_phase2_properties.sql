-- ============================================================================
-- nfstay Phase 2 — Properties Table
-- Migration: 20260317130000_nfs_phase2_properties.sql
--
-- Table: nfs_properties
-- Includes: RLS policies, indexes, full-text search, bulk update RPC
--
-- ⚠️  REQUIRES HUGO TO REVIEW SQL BEFORE EXECUTION
-- This migration creates new tables only. No existing tables are modified.
-- ============================================================================

-- ============================================================================
-- 1. nfs_properties
-- ============================================================================

CREATE TABLE nfs_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  listing_status TEXT DEFAULT 'draft' CHECK (listing_status IN ('listed', 'unlisted', 'archived', 'draft')),
  source TEXT DEFAULT 'nfstay' CHECK (source IN ('airbnb', 'nfstay')),
  current_step TEXT DEFAULT 'propertyBasics',
  completed_steps TEXT[] DEFAULT '{}',

  -- Basics
  property_type TEXT,
  rental_type TEXT,
  accommodation_type TEXT,
  size_value NUMERIC,
  size_unit TEXT,

  -- Location
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  street TEXT,
  lat NUMERIC,
  lng NUMERIC,
  timezone TEXT,

  -- Guest / Rooms
  max_guests INTEGER,
  allow_children BOOLEAN DEFAULT false,
  room_counts JSONB DEFAULT '[]',
  room_sections JSONB DEFAULT '[]',

  -- Photos
  images JSONB DEFAULT '[]',

  -- Amenities
  amenities JSONB DEFAULT '{}',

  -- Description
  public_title TEXT,
  internal_title TEXT,
  description TEXT,

  -- House Rules
  check_in_time TEXT,
  check_out_time TEXT,
  max_pets INTEGER,
  rules TEXT,
  cancellation_policy TEXT,

  -- Availability
  availability_window TEXT DEFAULT '2_years',
  advance_notice INTEGER DEFAULT 0,
  minimum_stay INTEGER DEFAULT 1,
  date_ranges JSONB DEFAULT '[]',
  blocked_date_ranges JSONB DEFAULT '[]',

  -- iCal
  inbound_calendars JSONB DEFAULT '[]',
  outbound_calendar_url TEXT,

  -- Fees & Taxes
  cleaning_fee JSONB DEFAULT '{"enabled": false}',
  extra_guest_fee JSONB DEFAULT '{"enabled": false}',
  custom_fees JSONB DEFAULT '[]',
  custom_taxes JSONB DEFAULT '[]',

  -- Discounts
  weekly_discount JSONB DEFAULT '{"enabled": false}',
  monthly_discount JSONB DEFAULT '{"enabled": false}',

  -- Rates
  base_rate_currency TEXT DEFAULT 'USD',
  base_rate_amount NUMERIC DEFAULT 100,
  daily_rates JSONB DEFAULT '{}',
  custom_rates JSONB DEFAULT '[]',
  synced_rate_modifier JSONB,

  -- Hospitable (Phase 5)
  hospitable_property_id TEXT,
  hospitable_connected BOOLEAN DEFAULT false,
  hospitable_last_sync_at TIMESTAMPTZ,
  hospitable_sync_status TEXT DEFAULT 'pending',
  hospitable_connection_id TEXT,
  hospitable_customer_id TEXT,
  hospitable_platform_mappings JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_nfs_properties_operator ON nfs_properties(operator_id);
CREATE INDEX idx_nfs_properties_listing ON nfs_properties(listing_status);
CREATE INDEX idx_nfs_properties_location ON nfs_properties(city, country);
CREATE INDEX idx_nfs_properties_search ON nfs_properties
  USING GIN (to_tsvector('english', coalesce(public_title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(address,'')));

-- updated_at trigger (reuses Phase 1 function)
CREATE TRIGGER nfs_properties_updated_at
  BEFORE UPDATE ON nfs_properties
  FOR EACH ROW EXECUTE FUNCTION nfs_set_updated_at();

-- RLS
ALTER TABLE nfs_properties ENABLE ROW LEVEL SECURITY;

-- Operator manages own properties
CREATE POLICY "nfs_properties_operator_access" ON nfs_properties
  FOR ALL USING (
    operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid())
  );

-- Public reads listed properties
CREATE POLICY "nfs_properties_public_read" ON nfs_properties
  FOR SELECT USING (listing_status = 'listed');

-- Bulk status update RPC (operator-scoped via auth.uid check)
CREATE OR REPLACE FUNCTION nfs_bulk_update_listing_status(
  property_ids UUID[],
  new_status TEXT
) RETURNS void AS $$
BEGIN
  UPDATE nfs_properties
  SET listing_status = new_status, updated_at = now()
  WHERE id = ANY(property_ids)
    AND operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- End of migration
-- ============================================================================
