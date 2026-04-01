# nfstay - Integrations

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

## GoHighLevel (GHL) - Payments
All payments are processed through GoHighLevel only; tier updates are performed by n8n. Do not add direct Stripe or other payment integrations.

**Location ID**: `eFBsWXY3BmWDGIRez13x`
**API Token**: Private Integration Token (stored in n8n, not in frontend)

### Products
| Tier | Product ID | Price ID | Amount |
|------|-----------|----------|--------|
| Monthly | 69b5b769081db66d1afbf145 | 69b5d533d314dc23b8a6f918 | £67/mo recurring |
| Lifetime | 69b5b777711f98f382f110ff | 69b5d535a0334430aa1f2eac | £997 one-time |
| Annual | 69b5b7791fe1a8f21eb651b5 | 69b5d5371fe1a88dbdba1590 | £397/yr recurring |

### Funnel Flow (Custom Domain: pay.nfstay.com)
1. **Cart page** (£67/mo) - `https://pay.nfstay.com/order`
2. **Upsell page** (£997 lifetime) - `https://pay.nfstay.com/upsell`
3. **Downsell page** (£397/yr) - `https://pay.nfstay.com/Down`
4. **Thank you page** - `https://pay.nfstay.com/thank-You` → redirects to `hub.nfstay.com/dashboard/inbox?payment=success`

### Tier Update Webhook
**n8n Workflow**: `wsDjAdpWnjqnO7ML` - nfstay - GHL Payment → Tier Update
**Webhook URL**: `https://n8n.srv886554.hstgr.cloud/webhook/ghl-payment-success`

Flow: GHL Order Submitted → n8n webhook → maps product_id to tier → PATCH profiles.tier in Supabase → tags GHL contact

**GHL Automation Workflow Setup** (must be done in GHL dashboard - API does not support action editing):
- Workflow: "Webhook nfstay Chat" (`7d1bac63-4e8a-491d-9d56-4058d76e8872`) - or create new
- Trigger: Order Submitted
- Action: Custom Webhook → POST `https://n8n.srv886554.hstgr.cloud/webhook/ghl-payment-success`
- Body:
  ```json
  {
    "email": "{{contact.email}}",
    "contact_id": "{{contact.id}}",
    "product_id": "{{order.product_id}}",
    "price_id": "{{order.price_id}}",
    "amount": "{{order.amount}}"
  }
  ```

### Marketplace Lead Flow (admin-gated)

Tenant WhatsApp inquiries do NOT trigger automatic landlord notifications.
The flow is:

1. Tenant sends WhatsApp → GHL → n8n → `receive-tenant-whatsapp` edge function → inquiry row created
2. Inquiry appears in Admin > Outreach > Tenant Requests. **Landlord gets nothing yet.**
3. Admin chooses NDA, NDA + Claim, or Direct → `ghl-enroll` edge function fires
4. Only then is the landlord contacted via GHL workflow

See `docs/N8N_WHATSAPP_WORKFLOW.md` for full workflow details.

### GHL Workflow IDs

| Workflow | ID | Use |
|----------|-----|-----|
| Cold outreach (Landlord Activation) | `67250bfa-e1fc-4201-8bca-08c384a4a31d` | Admin sends first contact to landlord |
| NDA/warm (Tenant lead release) | `0eb4395c-e493-43dc-be97-6c4455b5c7c4` | Admin releases tenant lead with NDA |
| Landlord replied (inbox) | `9b826037-0562-4e10-9bd8-d9d488b719b6` | In-app messaging notification (post-claim only) |

**Re-enrollment rule:** GHL will not re-trigger a workflow for an already-enrolled contact. The `ghl-enroll` edge function handles this by removing the contact from the workflow, waiting 1.5s, then re-enrolling.

### GHL Contact Custom Fields

| Field ID | Field Name | Purpose |
|----------|-----------|---------|
| `Z0thvOTyoO2KxTMt5sP8` | property_reference | Property title shown in WhatsApp template |
| `gWb4evAKLWCK0y8RHp32` | magic_link_url | Auto-login URL for landlord (`hub.nfstay.com/inbox?token=...`) |
| `QIc7FR6U3OGNEhdk7LoY` | first_contact_sent | Tracks if landlord was contacted before |

### Inbox Messaging Webhooks (post-claim, ongoing)

These fire from ChatWindow.tsx for existing conversation threads only. They are NOT part of the marketplace inquiry flow.

| Webhook | n8n ID | Purpose |
|---------|--------|---------|
| `/webhook/inbox-new-message` | `J6hWjodwJlqXHme1` | Operator sends message → WhatsApp to landlord |
| `/webhook/inbox-landlord-replied` | `BrwfLUE2LPj9jovR` | Landlord replies → WhatsApp to tenant |

### Post-Payment Detection (Frontend)
InquiryPanel.tsx detects payment success via 3 methods:
1. **postMessage** - GHL iframe fires events on thank-you page
2. **onLoad fallback** - detects iframe URL changing to thank-you page
3. **Query param** - `?payment=success` from GHL full-page redirect

Then polls Supabase every 1s for tier update (up to 10s) → shows success screen → redirects to /dashboard/inbox

### Custom Fields
| Field | Key | ID |
|-------|-----|-----|
| Property Reference | `contact.property_reference` | `Z0thvOTyoO2KxTMt5sP8` |
| Magic Link URL | `contact.magic_link_url` | `gWb4evAKLWCK0y8RHp32` |

### WhatsApp Number
- Phone: `07676 368123` | Name: nfstay | Quality: Green

## Affiliate Commission Tracking

Three revenue sources feed into `aff_commissions`. All commissions have a 14-day holdback before becoming claimable.

### 1. GHL Subscription Payments (40% commission)

**Flow:** User pays for Monthly/Yearly/Lifetime via GHL funnel -> app detects tier change -> POSTs to n8n

**n8n workflow:** "NFsTay -- Subscription Commission" (id: `VdiSsyokBcUteHio`, ACTIVE)
**Webhook:** `POST /webhook/aff-commission-subscription`
**Payload:**
```json
{
  "referral_code": "HUGO12",
  "user_id": "uuid",
  "amount": 67,
  "payment_id": "ghl-uuid-timestamp"
}
```
**Called from:** `PaymentSheet.tsx` and `InquiryPanel.tsx` after confirmed tier change in DB
**Commission:** n8n queries `aff_profiles` by `referral_code`, calculates 40% (from `aff_commission_settings`), inserts into `aff_commissions` with `ON CONFLICT DO NOTHING`

**How referral code reaches GHL:**
- `getFunnelUrl()` and `getUpgradeUrl()` in `src/lib/ghl.ts` accept `ref` param
- `PaymentSheet.tsx`, `InquiryPanel.tsx`, and `SettingsPage.tsx` fetch `profiles.referred_by` and pass it as `&ref=CODE` to the GHL iframe URL
- On payment success, the app reads `referred_by` from the user's profile and POSTs to n8n directly (does not rely on GHL to forward the code)

### 2. SamCart Investment Payments (5% first / 2% recurring)

**Flow:** User buys shares via SamCart card checkout -> SamCart fires webhook -> edge function creates order + commission

**Edge function:** `supabase/functions/inv-samcart-webhook/index.ts`
**Referral attribution:** Reads `custom_fields.agent_code` or `custom_fields.referral_code` from SamCart payload
**Commission logic (lines 898-947):**
1. Look up agent's `aff_profiles` by `user_id`
2. Fetch rate from `aff_commission_settings` (user-specific, then global default)
3. Insert into `aff_commissions` with source `investment_first`, 14-day `claimable_at`

### 3. Crypto On-Chain Purchases (5% from settings)

**Flow:** User buys shares via `buyPrimaryShares()` on BNB Chain -> tx confirms -> hook creates order + commission

**Called from:** `src/hooks/useBlockchain.ts` after `buyPrimaryShares` receipt
**Attribution logic:**
1. Query buyer's `profiles.referred_by`
2. Resolve referral code to `agent_id` via `aff_profiles.referral_code`
3. Insert `inv_orders` with `agent_id`
4. Insert `aff_commissions` with rate from `aff_commission_settings` (default 5%)

### Referral Tracking (Clicks + Signups)

**Edge function:** `supabase/functions/track-referral/index.ts`
**Called from:** `SignUp.tsx` on page load (`?ref=CODE`) and after signup completion
**Actions:**
- Click: increments `aff_profiles.total_clicks`, inserts `affiliate_events` (type: click)
- Signup: increments `aff_profiles.total_signups`, inserts `affiliate_events` (type: signup), stores `profiles.referred_by`

### Auto-Provisioning

Every logged-in user automatically gets an `affiliate_profiles` row on first visit to `/dashboard/affiliates`. No "Become An Agent" button needed. The referral code is generated from the user's name (e.g., `HUGO12`).

**Implementation:** `AffiliatesPage.tsx` queryFn auto-creates row if `maybeSingle()` returns null.

### Commission Rates (Global Defaults)

| Source | Rate | Holdback |
|--------|------|----------|
| Subscription (GHL) | 40% | 14 days |
| Investment first purchase | 5% | 14 days |
| Investment recurring | 2% | 14 days |

Stored in `aff_commission_settings` (NULL user_id = global). Per-user overrides supported.

### Payout Processing

- **Bank transfer:** Weekly batch every Tuesday 05:00 AM via n8n + Revolut API. Hugo approves in Revolut app.
- **Crypto (USDC):** Immediate on-chain transfer from treasury wallet to user's Particle wallet.
- **Payout settings:** Users configure bank details at `/dashboard/settings` (Payout Settings tab).

---

## Pexels (Stock Photos)
**API**: https://api.pexels.com/v1
**Env var**: `VITE_PEXELS_API_KEY`

### Usage Pattern
1. Property has no uploaded photos → `usePropertyImage` hook fires
2. Calls `fetchPexelsPhotos(city, type, 5)` → searches for city + apartment/house images
3. Returns array of landscape photo URLs
4. Caches result to `properties.photos` in Supabase (fire-and-forget)
5. Subsequent views read from DB - Pexels never called twice for same property

### Fallback Chain
`photos[0] from DB` → `Pexels API` → `placehold.co` (deterministic placeholder)

## Resend (Email)
**API**: https://api.resend.com/emails
**Deployed as**: Supabase Edge Function `send-email`
**Sender**: `nfstay <onboarding@resend.dev>`

### Email Types
- `new-deal-admin`: Sent to admin when a deal is submitted
- `deal-approved-member`: Sent to member when admin approves their deal

## Supabase Auth
- Email/password signup via `supabase.auth.signUp()`
- Phone OTP via n8n (Twilio) - not Supabase native OTP
- Admin detection: JWT email checked against hardcoded `ADMIN_EMAILS` array in `useAuth.ts`
- Session persistence: localStorage with auto-refresh
