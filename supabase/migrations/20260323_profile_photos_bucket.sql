-- Create profile-photos storage bucket for user avatar uploads
-- Used by: src/pages/SettingsPage.tsx (handleAvatarUpload)
-- Path format: {user_id}/{timestamp}-{filename}

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT DO NOTHING;

-- Allow authenticated users to upload profile photos
CREATE POLICY "Authenticated upload profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos');

-- Allow public read of profile photos (avatars must be visible)
CREATE POLICY "Public read profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Allow authenticated users to overwrite their photos (upsert: true)
CREATE POLICY "Authenticated update profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos');

-- Allow authenticated users to delete their old photos
CREATE POLICY "Authenticated delete profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-photos');
