-- ═══════════════════════════════════════════════════
-- DEALS V2: Extended properties columns + photo storage
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- New columns on properties table (admin-only data, not shown on public cards)
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users,
ADD COLUMN IF NOT EXISTS property_category text,   -- 'flat' | 'house' | 'hmo'
ADD COLUMN IF NOT EXISTS bedrooms integer,
ADD COLUMN IF NOT EXISTS bathrooms integer,
ADD COLUMN IF NOT EXISTS garage boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deposit integer,
ADD COLUMN IF NOT EXISTS agent_fee integer,
ADD COLUMN IF NOT EXISTS sa_approved text DEFAULT 'awaiting',  -- 'yes' | 'no' | 'awaiting'
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS contact_whatsapp text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS notes text;

-- Allow authenticated users to insert properties (submit a deal)
CREATE POLICY "Authenticated users can submit deals"
ON public.properties FOR INSERT
TO authenticated
WITH CHECK (true);

-- Storage bucket for deal photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('deals-photos', 'deals-photos', true)
ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated upload deal photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'deals-photos');

CREATE POLICY "Public read deal photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'deals-photos');
