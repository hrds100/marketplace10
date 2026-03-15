# NFsTay — Full Stack Reference
_Last updated: 2026-03-15_

> **Rule:** Any time a new service, tool, or integration is added to the project, this file MUST be updated in the same commit. No exceptions.

## Quick Links
- **Production**: https://hub.nfstay.com
- **GitHub**: https://github.com/hrds100/marketplace10
- **Vercel**: https://vercel.com/hugos-projects-f8cc36a8/marketplace10
- **Supabase**: https://supabase.com/dashboard/project/asazddtvjvmckouxcmmo
- **n8n**: https://n8n.srv886554.hstgr.cloud
- **GHL**: https://app.gohighlevel.com (Location ID: `eFBsWXY3BmWDGIRez13x`)
- **Sentry**: https://nfstay.sentry.io
- **UptimeRobot**: https://uptimerobot.com (monitor: hub.nfstay.com/api/health)

## Services

| Service | Platform | URL | ID/Ref | Env Var | Config File |
|---------|----------|-----|--------|---------|-------------|
| Database + Auth | Supabase | asazddtvjvmckouxcmmo.supabase.co | asazddtvjvmckouxcmmo | VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY | src/integrations/supabase/client.ts |
| Webhooks + AI | n8n | n8n.srv886554.hstgr.cloud | — | VITE_N8N_WEBHOOK_URL | src/lib/n8n.ts |
| Payments | GoHighLevel | app.gohighlevel.com | eFBsWXY3BmWDGIRez13x | VITE_GHL_FUNNEL_URL | src/lib/ghl.ts |
| Hosting | Vercel | hub.nfstay.com | prj_knviieakfA3YpyLA6CW1ADTulRL3 | — | vercel.json |
| Stock Photos | Pexels | api.pexels.com | — | VITE_PEXELS_API_KEY | src/lib/pexels.ts |
| Email | Resend | api.resend.com | — | RESEND_API_KEY (Supabase secret) | supabase/functions/send-email/ |
| Error Monitoring | Sentry | nfstay.sentry.io | — | VITE_SENTRY_DSN | src/main.tsx |
| Uptime Monitoring | UptimeRobot | uptimerobot.com | — | — | hub.nfstay.com/api/health |
| CI Pipeline | GitHub Actions | github.com/hrds100/marketplace10/actions | — | — | .github/workflows/ci.yml |
| Health Check | Supabase Edge Fn | hub.nfstay.com/api/health | — | — | supabase/functions/health/index.ts |

## Supabase Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| profiles | User accounts + settings | id, name, whatsapp, tier, suspended, notif_* |
| properties | Deal listings | id, city, postcode, rent_monthly, profit_est, status, photos[], submitted_by |
| crm_deals | User CRM pipeline | id, user_id, property_id, stage, photo_url, archived |
| user_favourites | Saved deals | user_id, property_id |
| user_progress | University lesson progress | user_id, module_id, lesson_id, step_index |
| notifications | Admin notifications | user_id, type, title, body, property_id, read |
| ai_settings | AI model + prompt config | model_pricing, model_university, model_description, system_prompt_* |
| admin_audit_log | Persistent admin action log | user_id, action, target_table, target_id, metadata, created_at |

## n8n Webhooks

| Endpoint | Trigger | Called From |
|----------|---------|------------|
| POST /webhook/ai-university-chat | User sends chat in lesson | LessonPage.tsx via useAIChat |
| POST /webhook/airbnb-pricing | Deal submitted | ListADealPage.tsx handleSubmit |
| POST /webhook/ai-generate-listing | "Generate description" clicked | ListADealPage.tsx generateDesc |
| POST /webhook/notify-admin-new-deal | New deal submitted | ListADealPage.tsx handleSubmit |
| POST /webhook/notify-admin-edit | Deal edited by member | MyListingsPanel.tsx handleSaveEdit |
| POST /webhook/send-otp | Phone verification | SignUp.tsx |
| POST /webhook/verify-otp | OTP code check | VerifyOtp.tsx |
| POST /webhook/move-crm-stage | CRM drag-drop | CRMPage.tsx onDrop |

## GHL Products

| Tier | Product ID | Price ID | Amount |
|------|-----------|----------|--------|
| Monthly | 69b5b769081db66d1afbf145 | 69b5d533d314dc23b8a6f918 | £67/mo |
| Lifetime | 69b5b777711f98f382f110ff | 69b5d535a0334430aa1f2eac | £997 one-time |
| Annual | 69b5b7791fe1a8f21eb651b5 | 69b5d5371fe1a88dbdba1590 | £397/yr |

## Required Env Vars

| Var | Used In | Required? |
|-----|---------|-----------|
| VITE_SUPABASE_URL | client.ts | Yes |
| VITE_SUPABASE_PUBLISHABLE_KEY | client.ts | Yes |
| VITE_N8N_WEBHOOK_URL | n8n.ts | Yes (fallback to hardcoded) |
| VITE_GHL_FUNNEL_URL | ghl.ts | Yes (InquiryPanel needs it) |
| VITE_PEXELS_API_KEY | pexels.ts | Yes (photo fallbacks) |
| VITE_SENTRY_DSN | main.tsx | Optional — Sentry silently disabled if absent |
| VITE_SUPABASE_PROJECT_ID | supabase CLI | Optional — used for local dev |

## Known Issues / Tech Debt
1. `ai_settings` and `notifications` tables not in generated Supabase types — using `as any` casts
2. University lessons are static data in `src/data/universityData.ts` — not yet DB-backed
3. Landing page and auth pages still use picsum.photos for decorative avatars
4. Affiliates page uses mock payout data
5. DealDetail CRM state uses localStorage + Supabase (dual-write)
