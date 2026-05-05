-- Add lease_start_date to inv_properties so agreements show actual tenancy dates
ALTER TABLE inv_properties ADD COLUMN IF NOT EXISTS lease_start_date DATE;
ALTER TABLE inv_properties ADD COLUMN IF NOT EXISTS lease_term_years INTEGER DEFAULT 5;

-- Seed existing property (Pembroke Place) with 1 September 2025
UPDATE inv_properties SET lease_start_date = '2025-09-01', lease_term_years = 5;
