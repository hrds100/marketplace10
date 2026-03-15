# Environment Variables

Never commit real values. All vars must be set in Vercel dashboard.
Local development: copy `.env.example` to `.env` and fill in values.

| Variable | Required | Used In | Description |
|----------|----------|---------|-------------|
| VITE_SUPABASE_URL | Yes | src/integrations/supabase/client.ts | Supabase project REST URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | Yes | src/integrations/supabase/client.ts | Supabase anon/public key |
| VITE_SUPABASE_PROJECT_ID | No | Reference only | Supabase project ref ID |
| VITE_N8N_WEBHOOK_URL | Yes | src/lib/n8n.ts | Base URL for all n8n webhooks (fallback hardcoded) |
| VITE_GHL_FUNNEL_URL | Yes | src/lib/ghl.ts | GHL cart funnel page URL for checkout iframe |
| VITE_GHL_LOCATION_ID | No | Reference only | GHL location ID |
| VITE_PEXELS_API_KEY | Yes | src/lib/pexels.ts | Pexels API key for property stock photos |

## Supabase Edge Function Secrets
Set via `npx supabase secrets set` or Supabase Dashboard → Edge Functions → Secrets:

| Secret | Used In | Description |
|--------|---------|-------------|
| RESEND_API_KEY | supabase/functions/send-email/ | Resend email API key |
| ADMIN_EMAIL | supabase/functions/send-email/ | Email address for admin notifications |

## Setting in Vercel
1. Go to: https://vercel.com/hugos-projects-f8cc36a8/marketplace10/settings/environment-variables
2. Add each variable for: **Production**, **Preview**, **Development**
3. Redeploy after changes (or wait for next git push)
