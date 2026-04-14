# Changelog

## 2026-04-14 — Booking site free-user demo restored

**PR:** #468 (commit 7023a58)

### What changed
- Restored the interactive free-user demo on `/dashboard/booking-site`.
- One-line fix in `src/pages/BookingSitePage.tsx`: re-added the `if (!isAdmin && !isPaidTier(tier)) return <BookingSitePreviewPage />` branch that PR #337 (b6d057b, 2026-04-08) deleted.
- Paid users still get `BookingSiteDashboard` + magic-login to nfstay.app — unchanged.
- Admins bypass the gate and still see the full dashboard for testing.

### Regression detail
PR #337 ("convert booking-site dashboard to mockup with payment gates") intentionally unified all users onto the dashboard with payment-gated buttons, but the side effect was that free users saw the "Complete your booking site setup" empty state instead of the playable preview they had before. `BookingSitePreviewPage` stayed in the file (lines 87–370) orphaned but intact, so restoring it was a one-line edit.

### Proven by Playwright (red-then-green TDD)
`e2e/booking-site-free-demo.spec.ts`
- **RED on prod** before merge — free user landed in "Start Setup" empty state, no Brand/Content/Contact tabs. Regression confirmed.
- **GREEN locally** with the fix — preview tabs visible, dashboard tabs absent.
- Test creates a fresh free-tier user via Supabase Admin API, verifies `profiles.tier = 'free'`, injects session via localStorage. Reusable for future free-tier regression tests.

### Human verified
Hugo confirmed live on hub.nfstay.com 2026-04-14.

---

## 2026-04-11 — Airbnb Pricing Overhaul

**PRs:** #390, #392, #393, #394, #395, #396, #397, #398, #399, #400, #401, #402, #403

### What changed
- **Edge function `airbnb-pricing` rewritten** — switched from OpenAI Chat Completions (gpt-4o-mini, no web access) to Responses API (gpt-4o, web search enabled)
- **AI now searches the web** for real Airbnb market data (Airbtics, property articles, Expedia) to inform pricing estimates — not guessing from memory alone
- **Airbnb search URLs** generated with full filters: bedrooms, beds (1 per room), bathrooms (when available), guests (1 per bedroom), entire home only
- **3 time windows**: 7-night stays at 30, 60, 90 days out for seasonal comparison
- **"AirDNA verified"** renamed to **"Airbnb verified"** across all 6 languages
- **"Est. monthly profit"** renamed to **"Est. monthly cash flow"** — now shows full revenue, no rent subtracted
- **Temperature set to 0.2** for consistent results
- **Confidence levels**: high (real market data found), medium (area averages scaled), low (limited data)
- **Reasoning field** cites actual sources with links
- **Frontend timeouts** increased from 15-25s to 90s (web search needs time)
- **Admin deals page**: added submission date+time, description section, photo delete/replace/upload, full edit modal (description, lister type, SA approved, listing type)
- **Admin quick-list**: lister type defaults to "Deal Sourcer"

### Key finding (TDD)
OpenAI web_search cannot browse Airbnb directly (blocked). The AI uses web search to find market data from accessible sources (Airbtics, property analytics sites, Expedia) and combines it with its training data.

### Proven by Playwright tests
| Property | Nightly | Occupancy | Monthly Revenue | Confidence |
|----------|---------|-----------|----------------|------------|
| 2-bed London | £250 | 74% | £5,550 | high |
| 5-bed Barking | £600 | 70% | £12,600 | medium |
| 3-bed Manchester | £150 | 60% | £2,700 | high |

### Files changed
- `supabase/functions/airbnb-pricing/index.ts` — full rewrite
- `src/features/deals/PropertyCard.tsx` — Airbnb verified link + cash flow label
- `src/features/deals/DealDetail.tsx` — Airbnb verified + cash flow labels
- `src/features/deals/DealsPage.tsx` — pass airbnbUrl30d to cards
- `src/features/deals/DealsMap.tsx` — "Cash Flow" in map popup
- `src/features/admin-deals/AdminQuickList.tsx` — deal sourcer default, 90s timeout, cash flow label
- `src/features/admin-deals/AdminDeals.tsx` — edit modal expanded, photo management, 90s timeout, cash flow labels
- `src/features/deal-submit/ListADealPage.tsx` — cash flow label, 90s timeout
- `src/features/inquiry/InquiryPanel.tsx` — airbnbUrl30d on ListingShape
- `src/core/i18n/locales/{en,es,fr,pt-BR,ar,it}/common.json` — Airbnb verified + cash flow translations
- `e2e/airbnb-pricing-api.spec.ts` — 3 live API tests
- `e2e/airbnb-pricing-labels.spec.ts` — label verification tests

---

## 2026-04-10 — Map Markers for All Properties

**PR:** #391

### What changed
- Properties with partial postcodes (SA10, ME2, TS4) now resolve via postcodes.io outcode endpoint
- City fallback list expanded from 15 to 90+ UK cities and regions
- Hovering any property card now pans the map to the correct location

### Files changed
- `src/features/deals/DealsMap.tsx` — outcode fallback + expanded cityFallbacks

---

## 2026-04-10 — Payment Gate Moved to Send (Inquiry Flow)

**PR:** #389

### What changed
- Free users now see the message form when clicking Email or WhatsApp on a deal card or listing page.
- The payment gate only appears when they click **Send**, not on button click.
- After payment completes, the message auto-sends and a confirmation toast appears.
- If the user closes the payment panel without paying, nothing sends.

### Files changed
- `src/features/deals/PropertyCard.tsx` — removed tier gate from button handlers
- `src/features/deals/DealDetail.tsx` — same + pending message auto-send with tier check
- `src/features/deals/DealsPage.tsx` — same + pending message auto-send with tier check
- `src/features/inquiry/InquiryChatModal.tsx` — added tier check in `handleSend`

---

## 2026-04-07 — Veriff KYC Identity Verification (Investment Module)

**PRs:** #323, #326, #328, #329

### What was added
- **Veriff KYC** gates payout claims on `/invest/payouts`. Users can browse and buy shares freely — KYC is only required before claiming rental income.
- New Supabase table `inv_kyc_sessions` with RLS policies (users can only see/edit their own row).
- Two new edge functions:
  - `inv-kyc-check` — checks KYC status, queries Veriff API if session is pending
  - `inv-kyc-save-session` — saves Veriff session ID after widget creates it
- New React hook `useKycStatus` and `KycVerificationModal` component.
- KYC status card on payouts page with 4 states:
  - **Loading** — skeleton shimmer
  - **Not started / Declined** — "Verify Now" button (brand green `#1E9A80`)
  - **Pending** — amber card with "Continue Verification" button
  - **Approved** — green "Identity Verified" card
- Claim flow is gated: clicking Claim opens KYC modal if not approved.
- `@veriff/incontext-sdk` npm package installed.
- `cdn.veriff.me` added to Content Security Policy in `vercel.json`.
- Playwright tests in `e2e/invest-kyc.spec.ts`.

### Infrastructure
- Supabase secrets set: `VERIFF_API_KEY`, `VERIFF_SECRET_KEY`
- Vercel env var set: `VITE_INV_VERIFF_API_KEY`
- Edge functions deployed with `--no-verify-jwt`
- Migration applied to production database

### Files changed
| Action | File |
|--------|------|
| Created | `supabase/migrations/20260407_inv_kyc_sessions.sql` |
| Created | `supabase/functions/inv-kyc-check/index.ts` |
| Created | `supabase/functions/inv-kyc-save-session/index.ts` |
| Created | `src/hooks/useKycStatus.ts` |
| Created | `src/components/KycVerificationModal.tsx` |
| Created | `e2e/invest-kyc.spec.ts` |
| Edited | `src/pages/invest/InvestPayoutsPage.tsx` |
| Edited | `supabase/config.toml` |
| Edited | `vercel.json` (CSP) |
| Edited | `package.json` (new dependency) |
