-- Add whatsapp_verified column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT FALSE;