# NFStay Code Flows — hub.nfstay.com
> Auto-generated 2026-03-29. Maps every user action to the files and services that handle it.

---

## 1. Free user clicks WhatsApp on a property card

| Step | File | What happens |
|------|------|--------------|
| 1 | `src/components/PropertyCard.tsx:112` | `isPaidTier(tier)` returns false → calls `onInquire(listing)` |
| 2 | `src/pages/DealsPageV2.tsx:127` | `handleInquire` sets `inquiryListing` + `inquiryOpen=true` |
| 3 | `src/components/InquiryPanel.tsx` | Side panel opens → shows GHL payment iframe (`pay.nfstay.com`) |
| External | GoHighLevel | Stripe-powered payment form loads inside iframe |

---

## 2. Tenant pays and tier upgrades

| Step | File | What happens |
|------|------|--------------|
| 1 | `src/components/InquiryPanel.tsx:124` | Listens for `postMessage('order_success')` from iframe |
| 2 | `src/components/InquiryPanel.tsx:80` | `handlePaymentSuccess()` starts polling Supabase every 1s, max 15 attempts (15s) |
| 3 | GoHighLevel | Fires webhook to n8n |
| 4 | n8n: Payment Tier Update (PcPb3B5i4nyDOYtu) | Updates `profiles.tier` → 'monthly' in Supabase |
| 5 | `src/components/InquiryPanel.tsx:89` | Polling detects `tier !== 'free'` → redirects to `/dashboard/deals` |
| Fallback | `src/components/PaymentSuccessRefresher.tsx:13` | If GHL redirects with `?payment=success`, reads sessionStorage flag and calls `refreshTier()` |

**Known bug:** Poll max 15s - if payment webhook is slow, panel gives up and tenant is stuck.
**Fix:** Increase max attempts from 15 to 45 (45 seconds).

---

## 3. Paid user clicks WhatsApp on a property card (from deals grid)

| Step | File | What happens |
|------|------|--------------|
| 1 | `src/components/PropertyCard.tsx:112` | `isPaidTier(tier)` returns true → `handleWhatsApp()` runs |
| 2 | `src/components/PropertyCard.tsx:122` | Calls `supabase.functions.invoke('process-inquiry', {...})` in background |
| 3 | `src/components/PropertyCard.tsx:133` | Opens `wa.me/447476368123` (NFStay company number) |
| 4 | `supabase/functions/process-inquiry/index.ts` | Creates inquiry in DB, generates magic token, fires n8n webhooks |

**Status: Working correctly.** PropertyCard already uses NFStay number and calls process-inquiry.

---

## 4. Paid user clicks WhatsApp from DealDetail page

| Step | File | What happens |
|------|------|--------------|
| 1 | `src/pages/DealDetail.tsx:117` | `isPaidTier(tier)` returns true → `handleDetailWhatsApp()` runs |
| 2 | `src/pages/DealDetail.tsx:122` | Calls `supabase.functions.invoke('process-inquiry', {...})` in background |
| 3 | `src/pages/DealDetail.tsx:132` | Opens `wa.me/447476368123` (NFStay company number) |
| 4 | `supabase/functions/process-inquiry/index.ts` | Creates inquiry in DB, generates magic token, fires n8n webhooks |

**Status: Working correctly.** DealDetail already uses NFStay number and calls process-inquiry.

---

## 5. BROKEN: Paid user clicks Send inside InquiryPanel (after just upgrading)

| Step | File | What happens |
|------|------|--------------|
| 1 | `src/components/InquiryPanel.tsx:159` | `handleSendWhatsApp()` runs |
| 2 | `src/components/InquiryPanel.tsx:160` | Opens `wa.me/${listing.landlordWhatsapp}` (landlord's PERSONAL number) |
| MISSING | - | process-inquiry is NEVER called |
| MISSING | - | No DB record, no tenant auto-reply, no landlord notification |

**Fix:** Change `wa.me/${cleanNumber}` to `wa.me/447476368123` and add `supabase.functions.invoke('process-inquiry', {...})` call before opening WhatsApp.

---

## 6. process-inquiry edge function pipeline

| Step | File | What happens |
|------|------|--------------|
| 1 | `supabase/functions/process-inquiry/index.ts:53` | Fetches property details from `properties` table |
| 2 | Line 76 | Inserts inquiry into `inquiries` table |
| 3 | Line 107 | Inserts magic token into `landlord_invites` table |
| BUG | Line 109 | Uses `whatsappPhone` (defined at line 169) — ReferenceError, caught silently, magic token = '' |
| 4 | Line 136 | Calls `send-email` edge function → email to lister |
| 5 | Line 149 | POST to n8n `inquiry-tenant-reply` → auto-reply WhatsApp to tenant |
| 6 | Line 172 | POST to n8n `inquiry-lister-whatsapp` → WhatsApp notification to landlord |
| BROKEN | n8n | No workflow listens on `inquiry-lister-whatsapp` — silently 404s |

**Fix 1:** Line 109 - change `whatsappPhone` to `landlordWhatsapp` (defined at line 69).
**Fix 2:** Create n8n workflow listening on `inquiry-lister-whatsapp`.

---

## 7. n8n workflows involved in inquiry pipeline

| Workflow | ID | Trigger path | Status |
|----------|-----|--------------|--------|
| Payment Tier Update | PcPb3B5i4nyDOYtu | ghl-payment-* | Active, working |
| Tenant Inquiry Auto-Reply | YMjVISVnUb7AxqXU | inquiry-tenant-reply | Active, working |
| Notify Admin New Deal | LqWhsAcWyOjS489q | (deal submission) | Active, missing email step |
| Landlord WhatsApp Notify | MISSING | inquiry-lister-whatsapp | Does not exist |

---

## 8. Landlord magic link login

| Step | File/Service | What happens |
|------|-------------|--------------|
| 1 | GHL WhatsApp message | Landlord receives "You have a new inquiry" + link |
| 2 | `supabase/functions/landlord-magic-login/index.ts` | Validates token from `landlord_invites` table |
| 3 | Supabase Auth | Creates session for landlord |
| 4 | `src/pages/InboxPage.tsx` | Landlord lands on My Leads, sees tenant details |

**Status: Working once landlord notification is fixed (Fix 2 above).**

---

## 9. Admin notifications

| Event | Current state | Missing |
|-------|--------------|---------|
| New inquiry | Bell notification written to `notifications` table | Email to hugo@nfstay.com + chris@nfstay.com |
| Admin dedup | None | 60s dedup to prevent duplicate bells |

---

## Summary of all fixes needed

| # | What | File/Service | Type |
|---|------|-------------|------|
| 1 | GHL Thank You page - publish the draft | GoHighLevel dashboard | Hugo clicks Publish (30s) |
| 2 | Poll timeout 15s → 45s | `InquiryPanel.tsx:115` | Code change, 1 line |
| 3a | Open NFStay number instead of landlord number | `InquiryPanel.tsx:160` | Code change, 1 line |
| 3b | Call process-inquiry from InquiryPanel | `InquiryPanel.tsx:158` | Code change, ~8 lines |
| 4 | Fix whatsappPhone scope bug | `process-inquiry/index.ts:109` | Code change, 1 line |
| 5 | Create missing landlord notification workflow | n8n | New workflow |
| 6 | Add email step to admin notification | n8n: LqWhsAcWyOjS489q | Edit workflow |
| 7 | Add 60s dedup to admin notification | n8n: LqWhsAcWyOjS489q | Edit workflow |
