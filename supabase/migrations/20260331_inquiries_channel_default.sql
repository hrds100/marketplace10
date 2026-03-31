-- Safety net: default channel to 'whatsapp' so a missing field never
-- violates the NOT NULL constraint on inquiries.channel
ALTER TABLE public.inquiries
  ALTER COLUMN channel SET DEFAULT 'whatsapp';
