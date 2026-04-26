-- Add release timestamp to inquiries for admin audit trail
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMPTZ;
