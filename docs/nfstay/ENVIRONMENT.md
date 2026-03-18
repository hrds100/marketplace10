# NFStay — Environment Variables

> Every env var and secret NFStay needs. Where it's stored, what it's for, and who provides it.

---

## 1. VERCEL ENV VARS (Frontend — Build Time)

Set in **Vercel Dashboard → marketplace10 → Settings → Environment Variables**.

| Variable | Purpose | Example | Status |
|----------|---------|---------|--------|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps + Places (shared with marketplace10) | `AIzaSy...` | **NEEDS SET** in Vercel — key provided |
| `NEXT_PUBLIC_NFS_STRIPE_PUBLISHABLE_KEY` | Stripe frontend (NFStay-specific) | `pk_test_...` | Provided (test key) — set in Vercel Preview+Dev |
| `VITE_SUPABASE_URL` | Supabase project URL (shared) | `https://asazddtvjvmckouxcmmo.supabase.co` | Already set |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (shared) | `eyJ...` | Already set |

### Notes
- `VITE_*` vars are exposed to the browser (Vite convention). Never put secrets here.
- `VITE_GOOGLE_MAPS_API_KEY` is shared with marketplace10 — same var, same key. Code references: `use-nfs-google-maps.ts`, `NfsSearchMap.tsx`, `NfsPropertyMap.tsx`, `NfsPlacesAutocomplete.tsx`.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are already set for marketplace10. NFStay uses the same values.
- `NEXT_PUBLIC_NFS_STRIPE_PUBLISHABLE_KEY` is NFStay-specific — marketplace10 uses GHL for payments.

---

## 2. SUPABASE EDGE FUNCTION SECRETS

Set via `npx supabase secrets set KEY=VALUE` or Supabase Dashboard.

| Secret | Purpose | Status |
|--------|---------|--------|
| `NFS_STRIPE_SECRET_KEY` | Stripe API (server-side) | **SET** (test key) |
| `NFS_STRIPE_WEBHOOK_SECRET` | Verify Stripe platform webhooks | **SET** (test) |
| `NFS_STRIPE_CONNECT_WEBHOOK_SECRET` | Verify Stripe Connect webhooks | **SET** (test) |
| `NFS_STRIPE_CLIENT_ID` | Stripe Connect OAuth | **SET** (test) |
| `NFS_HOSPITABLE_PARTNER_ID` | Hospitable Partner API (OAuth client ID) | **NEEDS SET** in Supabase |
| `NFS_HOSPITABLE_PARTNER_SECRET` | Hospitable Partner API (OAuth client secret) | **NEEDS SET** in Supabase |
| `NFS_HOSPITABLE_BEARER_TOKEN` | Hospitable API auth (for n8n workflows) | **NEEDS SET** in n8n env vars |
| `NFS_HOSPITABLE_WEBHOOK_SECRET` | Verify Hospitable webhooks | **NEEDS SET** in Supabase |
| `NFS_RESEND_API_KEY` | Email sending via Resend | **SET** |
| `NFS_CF_API_TOKEN` | Cloudflare API for custom domains | **NEEDS SET** in Supabase — token provided by Tajul |
| `NFS_CF_ZONE_ID` | Cloudflare zone for nfstay.app | **NEEDS SET** in Supabase — zone ID provided by Tajul |

### Notes
- All NFStay secrets use the `NFS_` prefix to distinguish from marketplace10 secrets.
- Existing secrets (`RESEND_API_KEY`, `ADMIN_EMAIL`) belong to marketplace10 — do not modify.
- Edge Function secrets are available to all Edge Functions in the project. Use the `NFS_` prefix to avoid confusion.

---

## 3. n8n ENVIRONMENT VARIABLES

Set in **n8n → Settings → Variables** (or via n8n API).

The NFStay n8n workflows use `{{ $env.VAR_NAME }}` environment variables, NOT credential nodes.

| Variable | Purpose | Status |
|----------|---------|--------|
| `SUPABASE_URL` | Supabase REST API base URL | **Already set** (shared with marketplace10 workflows) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) | **Already set** (shared with marketplace10 workflows) |
| `NFS_HOSPITABLE_BEARER_TOKEN` | Hospitable Partner API Bearer token | **NEEDS SET** |

### Notes
- n8n env vars are separate from Supabase Edge Function secrets
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already used by marketplace10 n8n workflows — do NOT change them
- `NFS_HOSPITABLE_BEARER_TOKEN` is NFStay-specific — add it, don't modify existing vars
- n8n accesses Supabase via the REST API using the service_role key (bypasses RLS)
- Hospitable API calls from n8n use the Bearer token in Authorization header

---

## 4. EXISTING SHARED VARS (DO NOT MODIFY)

marketplace10 env vars are documented in `docs/ENV.md`. Do not duplicate that list here.

NFStay reuses these shared vars (already set, no action needed):
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — same Supabase project
- `VITE_N8N_WEBHOOK_URL` — same n8n instance

NFStay does **not** use: `VITE_GHL_FUNNEL_URL`, `VITE_PEXELS_API_KEY`.

For the full shared var list, see `docs/ENV.md`.

---

## 5. REQUIRED BY PHASE

| Phase | Env Vars Needed |
|-------|----------------|
| 1 (Foundation) | None new — uses existing Supabase vars |
| 2 (Properties) | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (already set) |
| 3 (Reservations) | `NFS_RESEND_API_KEY` |
| 4 (Stripe) | `NEXT_PUBLIC_NFS_STRIPE_PUBLISHABLE_KEY`, `NFS_STRIPE_SECRET_KEY`, `NFS_STRIPE_WEBHOOK_SECRET`, `NFS_STRIPE_CONNECT_WEBHOOK_SECRET`, `NFS_STRIPE_CLIENT_ID` |
| 5 (Hospitable) | `NFS_HOSPITABLE_*` (4 secrets) |
| 6 (White-label) | `NFS_CF_API_TOKEN`, `NFS_CF_ZONE_ID` |

---

## Shared with marketplace10

- **Supabase URL and anon key** are shared — same project.
- **Google Maps API key** is shared — same key.
- **n8n base URL** is shared — same instance.
- All NFStay-specific secrets use the `NFS_` prefix to prevent collision.
- Never modify existing marketplace10 env vars.

---

*End of NFStay Environment Variables.*
