-- Add listing_type column to properties table
-- Properties can be either 'rental' (default) or 'sale'
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'rental' CHECK (listing_type IN ('rental', 'sale'));
