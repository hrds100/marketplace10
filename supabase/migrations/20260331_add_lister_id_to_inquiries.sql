-- Add lister_id to inquiries so My Leads can filter by user ID
-- instead of relying on phone/email matching
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS lister_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_inquiries_lister_id ON public.inquiries(lister_id);
