# NFsTay — Integrations

## n8n (Workflow Automation)
**Server**: https://n8n.srv886554.hstgr.cloud
**Auth**: API key stored in n8n instance settings

### Webhooks

#### POST /webhook/ai-university-chat
- **Purpose**: AI-powered lesson chat assistant
- **Called from**: `src/hooks/useAIChat.ts` via LessonPage
- **Payload**: `{ message, lessonTitle, moduleTitle, lessonContext, userId }`
- **Response**: `{ reply: "..." }`
- **AI**: Fetches system_prompt_university from ai_settings, calls OpenAI
- **Timeout**: 10 seconds (frontend AbortController)

#### POST /webhook/airbnb-pricing
- **Purpose**: Estimate Airbnb revenue for a submitted property
- **Called from**: `ListADealPage.tsx` after successful property insert
- **Payload**: `{ city, postcode, bedrooms, bathrooms, type, rent, propertyId }`
- **Response**: `{ estimated_nightly_rate, estimated_monthly_revenue, estimated_profit, confidence, notes, airbnb_url_7d, airbnb_url_30d, airbnb_url_90d }`
- **AI**: Fetches system_prompt_pricing from ai_settings, generates Airbnb URLs, calls OpenAI
- **Timeout**: 15 seconds

#### POST /webhook/ai-generate-listing
- **Purpose**: AI-generated property listing description
- **Called from**: `ListADealPage.tsx` "Generate description with AI" button
- **Payload**: `{ city, postcode, bedrooms, bathrooms, type, rent, profit, deposit, garage, sa_approved, notes, existing_description, street_name }`
- **Response**: `{ description: "..." }`
- **AI**: Fetches system_prompt_description from ai_settings, calls OpenAI

#### POST /webhook/notify-admin-new-deal
- **Purpose**: Insert notification for admin when new deal submitted
- **Called from**: `ListADealPage.tsx` after property insert
- **Payload**: `{ propertyId, city, postcode, type, submittedBy, rent }`
- **Response**: `{ ok: true }`
- **Action**: Inserts into notifications table for admin user

#### POST /webhook/notify-admin-edit
- **Purpose**: Insert notification when member edits a deal
- **Called from**: `MyListingsPanel.tsx` after edit save
- **Payload**: `{ propertyId, city, type, editedBy }`
- **Response**: `{ ok: true }`

#### POST /webhook/send-otp / verify-otp
- **Purpose**: Phone number verification via Twilio (managed in n8n)
- **Called from**: `SignUp.tsx`, `VerifyOtp.tsx`

#### POST /webhook/move-crm-stage
- **Purpose**: Notification when CRM deal stage changes (fire-and-forget)
- **Called from**: `CRMPage.tsx` onDrop

## GoHighLevel (GHL) — Payments
**Location ID**: `eFBsWXY3BmWDGIRez13x`
**API Token**: Private Integration Token (stored in n8n, not in frontend)

### Products
| Tier | Product ID | Price ID | Amount |
|------|-----------|----------|--------|
| Monthly | 69b5b769081db66d1afbf145 | 69b5d533d314dc23b8a6f918 | £67/mo recurring |
| Lifetime | 69b5b777711f98f382f110ff | 69b5d535a0334430aa1f2eac | £997 one-time |
| Annual | 69b5b7791fe1a8f21eb651b5 | 69b5d5371fe1a88dbdba1590 | £397/yr recurring |

### Funnel Flow
1. **Cart page** (£67/mo) — GHL hosted, embedded as iframe in InquiryPanel
2. **Upsell page** (£997 lifetime) — GHL hosted, 1-click
3. **Downsell page** (£397/yr) — GHL hosted, if upsell declined
4. **Thank you page** — redirect back to hub.nfstay.com

### Tier Update
GHL webhook → n8n workflow → `profiles.tier` update in Supabase

## Pexels (Stock Photos)
**API**: https://api.pexels.com/v1
**Env var**: `VITE_PEXELS_API_KEY`

### Usage Pattern
1. Property has no uploaded photos → `usePropertyImage` hook fires
2. Calls `fetchPexelsPhotos(city, type, 5)` → searches for city + apartment/house images
3. Returns array of landscape photo URLs
4. Caches result to `properties.photos` in Supabase (fire-and-forget)
5. Subsequent views read from DB — Pexels never called twice for same property

### Fallback Chain
`photos[0] from DB` → `Pexels API` → `placehold.co` (deterministic placeholder)

## Resend (Email)
**API**: https://api.resend.com/emails
**Deployed as**: Supabase Edge Function `send-email`
**Sender**: `NFsTay <onboarding@resend.dev>`

### Email Types
- `new-deal-admin`: Sent to admin when a deal is submitted
- `deal-approved-member`: Sent to member when admin approves their deal

## Supabase Auth
- Email/password signup via `supabase.auth.signUp()`
- Phone OTP via n8n (Twilio) — not Supabase native OTP
- Admin detection: JWT email checked against hardcoded `ADMIN_EMAILS` array in `useAuth.ts`
- Session persistence: localStorage with auto-refresh
