-- marketplace10 Supabase schema
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)

-- ========== PROFILES (extends auth.users) ==========
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  whatsapp TEXT UNIQUE,
  photo_url TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free','monthly','lifetime','yearly'))
);

-- ========== PROPERTIES (deals/listings) ==========
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  city TEXT,
  postcode TEXT,
  rent_monthly NUMERIC,
  profit_est NUMERIC,
  beds INTEGER,
  type TEXT,
  status TEXT DEFAULT 'live',
  landlord_whatsapp TEXT,
  description TEXT,
  photos TEXT[],
  featured BOOLEAN DEFAULT false,
  days_since_added INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== OTPS (phone verification, expire 5 min) ==========
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS public.otps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone TEXT,
  code TEXT,
  expires_at TIMESTAMP
);

-- ========== INQUIRIES (optional, for workflow 8) ==========
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_name TEXT,
  city TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== RLS ==========
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own row
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role can do all on profiles" ON public.profiles FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Properties: public read (for marketplace); service role full access
CREATE POLICY "Public read properties" ON public.properties FOR SELECT USING (true);
CREATE POLICY "Service role full properties" ON public.properties FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- OTPs: no direct frontend access; n8n uses service role
CREATE POLICY "Service role only otps" ON public.otps FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Inquiries: insert from frontend; service role read for notifications
CREATE POLICY "Anyone can insert inquiry" ON public.inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role read inquiries" ON public.inquiries FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- ========== TRIGGER: create profile on signup ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== RPC: update profile tier by email (for GHL/n8n webhook) ==========
CREATE OR REPLACE FUNCTION public.update_profile_tier_by_email(customer_email TEXT, new_tier TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET tier = new_tier
  WHERE id = (SELECT id FROM auth.users WHERE email = customer_email LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
