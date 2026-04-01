-- Track columns that were added via Supabase dashboard but never had migration files.
-- All columns already exist in the live DB. This migration is idempotent (IF NOT EXISTS).

-- ═══════════════════════════════════════════════════════════════
-- PROPERTIES: columns used by Quick List, DealDetail, Outreach
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE properties ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deal_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS nightly_rate_projected INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS purchase_price INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS end_value INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS refurb_cost INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS gdv INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS gross_yield NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS roi NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS below_market_value NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS holding_deposit INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sourcing_fee INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS first_contact_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS prime BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);

-- ═══════════════════════════════════════════════════════════════
-- INQUIRIES: stage column used by pipeline views
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'New Leads';
