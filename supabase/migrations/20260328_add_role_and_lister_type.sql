-- Add role CHECK constraint on profiles table (safe additive change)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('tenant','operator','landlord','agent','deal_sourcer'));
  END IF;
END $$;

-- Add lister_type column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lister_type TEXT
  CHECK (lister_type IN ('landlord','agent','deal_sourcer'));
