CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES auth.users(id),
  property_id UUID REFERENCES public.properties(id),
  lister_type TEXT CHECK (lister_type IN ('landlord','agent','deal_sourcer')),
  lister_phone TEXT,
  lister_email TEXT,
  lister_name TEXT,
  channel TEXT CHECK (channel IN ('whatsapp','email')) NOT NULL,
  message TEXT,
  tenant_name TEXT,
  tenant_email TEXT,
  tenant_phone TEXT,
  token TEXT UNIQUE NOT NULL,
  nda_signed BOOLEAN DEFAULT FALSE,
  nda_signed_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('new','viewed','contacted')) DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Tenants can insert their own inquiries
CREATE POLICY "Tenants can insert inquiries" ON public.inquiries
  FOR INSERT WITH CHECK (auth.uid() = tenant_id);

-- Tenants can read their own inquiries
CREATE POLICY "Tenants can read own inquiries" ON public.inquiries
  FOR SELECT USING (auth.uid() = tenant_id);

-- Public read by token (for lister access without login)
CREATE POLICY "Anyone can read by token" ON public.inquiries
  FOR SELECT USING (true);

-- Service role can update (for edge functions)
CREATE POLICY "Service role can update" ON public.inquiries
  FOR UPDATE USING (true);

-- Index for fast token lookup
CREATE INDEX idx_inquiries_token ON public.inquiries(token);
CREATE INDEX idx_inquiries_property ON public.inquiries(property_id);
CREATE INDEX idx_inquiries_tenant ON public.inquiries(tenant_id);
