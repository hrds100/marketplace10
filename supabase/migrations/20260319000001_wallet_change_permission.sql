-- Part 2: Wallet change permission system
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_change_allowed_until TIMESTAMPTZ DEFAULT NULL;

-- Part 3: Profile photo upload
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
