-- Growth config singleton
-- Stores A/B router config and social proof config that admin controls
-- via /admin/marketplace/growth. Replaces localStorage-based config so
-- admin changes actually reach live visitors.
--
-- Owner: features/admin-growth
-- Readers: public landing router (public/landing/index.html),
--          social proof script (public/landing/js/social-proof.js),
--          AdminGrowth.tsx
-- Writers: AdminGrowth.tsx (via growth-config edge function, admin-only)

CREATE TABLE IF NOT EXISTS public.growth_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ab_enabled BOOLEAN NOT NULL DEFAULT true,
  ab_weights JSONB NOT NULL DEFAULT '[50,50]'::jsonb,
  social_proof_enabled BOOLEAN NOT NULL DEFAULT true,
  social_proof_interval_seconds INT NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

COMMENT ON TABLE public.growth_config IS
  'Singleton row (id=1) holding growth / landing page config (A/B router weights + social proof toast settings). Public read, service-role write. Admin UI writes via growth-config edge function.';

-- Seed the singleton row
INSERT INTO public.growth_config (id, ab_enabled, ab_weights, social_proof_enabled, social_proof_interval_seconds)
VALUES (1, true, '[50,50]'::jsonb, true, 30)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.growth_config ENABLE ROW LEVEL SECURITY;

-- Public can read (landing page + anyone)
DROP POLICY IF EXISTS "Public read growth_config" ON public.growth_config;
CREATE POLICY "Public read growth_config"
  ON public.growth_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only service role can write (edge function does admin check itself)
DROP POLICY IF EXISTS "Service role write growth_config" ON public.growth_config;
CREATE POLICY "Service role write growth_config"
  ON public.growth_config
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
