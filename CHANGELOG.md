# Changelog

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
