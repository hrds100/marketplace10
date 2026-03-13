
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create subscription_tier enum
CREATE TYPE public.subscription_tier AS ENUM ('monthly', 'yearly', 'lifetime');

-- Create subscription_status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'paused', 'trial');

-- Create property_status enum
CREATE TYPE public.property_status AS ENUM ('live', 'on-offer', 'inactive');

-- Create crm_stage enum
CREATE TYPE public.crm_stage AS ENUM ('New Lead', 'Under Negotiation', 'Contract Sent', 'Follow Up', 'Closed', 'Portfolio');

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  whatsapp TEXT,
  photo_url TEXT,
  samcart_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- USER ROLES TABLE (security best practice)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- PROPERTIES TABLE
-- =============================================
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  postcode TEXT NOT NULL DEFAULT '',
  rent_monthly INTEGER NOT NULL DEFAULT 0,
  profit_est INTEGER NOT NULL DEFAULT 0,
  beds INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL DEFAULT '2-bed flat',
  status property_status NOT NULL DEFAULT 'live',
  landlord_whatsapp TEXT,
  description TEXT,
  photos TEXT[] DEFAULT '{}',
  featured BOOLEAN NOT NULL DEFAULT false,
  landlord_approved BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Properties are publicly readable (for the deals page)
CREATE POLICY "Properties are viewable by authenticated users" ON public.properties FOR SELECT TO authenticated USING (true);
-- Only admins can modify properties
CREATE POLICY "Admins can insert properties" ON public.properties FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update properties" ON public.properties FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete properties" ON public.properties FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- CRM DEALS TABLE
-- =============================================
CREATE TABLE public.crm_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL DEFAULT '',
  rent INTEGER NOT NULL DEFAULT 0,
  profit INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT '',
  stage crm_stage NOT NULL DEFAULT 'New Lead',
  archived BOOLEAN NOT NULL DEFAULT false,
  outsider_lead BOOLEAN NOT NULL DEFAULT false,
  whatsapp TEXT,
  email TEXT,
  notes TEXT,
  photo_url TEXT,
  last_contact TEXT DEFAULT 'Today',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own CRM deals" ON public.crm_deals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own CRM deals" ON public.crm_deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own CRM deals" ON public.crm_deals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own CRM deals" ON public.crm_deals FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- LESSONS TABLE
-- =============================================
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  module_id TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lessons are viewable by authenticated users" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  samcart_id TEXT,
  tier subscription_tier NOT NULL DEFAULT 'monthly',
  status subscription_status NOT NULL DEFAULT 'trial',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- TRIGGERS for updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_deals_updated_at BEFORE UPDATE ON public.crm_deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, whatsapp)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'whatsapp', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX idx_properties_city ON public.properties(city);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_featured ON public.properties(featured);
CREATE INDEX idx_crm_deals_user_id ON public.crm_deals(user_id);
CREATE INDEX idx_crm_deals_stage ON public.crm_deals(stage);
