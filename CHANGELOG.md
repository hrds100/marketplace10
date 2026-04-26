# Changelog

## 2026-04-26 — smsv2: terminology cards + default call script (item C)

Schema scaffolding for the new live-call surface (items B2 + G).

- New table `wk_terminologies` (term, short_gist, definition_md, sort_order,
  is_active). Admin write, agent-or-admin read. Added to `supabase_realtime`
  so admin edits propagate live to the call screen. Seeded with 10 nfstay
  glossary entries (JV partnership, HMO, finder's fee, gross yield,
  occupancy, ADR, rent-to-rent, setup cost, voting, exit).
- `wk_call_scripts.is_default boolean` + partial unique index. The
  CallScriptPane reads the `is_default = true` row. Original plan called for
  a `call_script` column on `wk_ai_settings`; chose to reuse the existing
  `wk_call_scripts` table instead — it already had the right shape and zero
  callers in src. Documented in the migration header.
- Seeded a canonical NFSTAY default script (open + qualify + permission to
  pitch + JV pitch + returns + SMS-close + follow-up + objection cheatsheet).
  Hugo can edit it via the Settings UI in item G.

No frontend changes in this PR — types regen + UI ship in items G and B2.

## 2026-04-26 — smsv2: 3-column live-call layout now resizable (item B1)

Pure layout skeleton. Wrapped the existing 3-pane flex layout in a
`ResizablePanelGroup` (horizontal, `autoSaveId="smsv2-live-call-layout"`).
Each border is now draggable; widths persist per browser. Min sizes
16/30/16% keep panes usable on narrow viewports. No behaviour change, no
new components. Item B2 will split into 4 columns and add nested vertical
resize between transcript and coach.

## 2026-04-26 — smsv2: coach prompt v2 (Belfort-style + bend on SMS-refusal)

Hugo's 2026-04-26 live test surfaced that the coach was rigid: caller said
"give me the breakdown over the phone" and the coach kept echoing "I'll send
you the SMS, speak tomorrow". Coach prompt rewritten to fix that.

**What changed**
- `DEFAULT_COACH_PROMPT` in `supabase/functions/wk-voice-transcription/index.ts`
  rewritten with: a straight-line Belfort stance (assumptive, looping,
  scarcity/social-proof/urgency, never pushy), variable line length (1-3
  sentences, up to ~50 words), and an explicit CRITICAL BRANCH for when the
  caller refuses the SMS — coach now gives the spoken breakdown using the
  deal numbers, then loops back to the tomorrow follow-up.
- `max_tokens` raised 90 → 180 to fit the longer breakdown lines.
- New migration `20260426_smsv2_coach_prompt_v2.sql` UPDATEs the canonical
  singleton row in `wk_ai_settings.live_coach_system_prompt` AND changes the
  column DEFAULT so fresh installs get v2 too. The DB value and the edge
  function fallback are kept identical in the same PR.
- Existing instructional-verb post-processor regex left untouched — still
  drops lines that open with "Reintroduce…", "Tell them…", "Explain…", etc.

**Not yet shipped (next PRs in this series — work items B–G of the plan)**
- B: 4-column resizable LiveCallScreen layout (transcript + coach split,
  contact/script/terminology panes, mid-call SMS).
- C: `wk_terminologies` table + `wk_ai_settings.call_script` column.
- D: mid-call SMS sender embedded in the call screen.
- E: manual "Apply automation" button next to StageSelector.
- F: transcript modal + `PastCallScreen` route on the calls page.
- G: Settings UI — call script editor + Terminology tab.

**Living docs**
- Edge function `wk-voice-transcription` source-of-truth changed; will need
  redeploy via `scripts/deploy-function.sh wk-voice-transcription` (Hugo /
  Co-Pilot, agents do not deploy).
- Migration applied via Supabase migration runner on next deploy.

## 2026-04-25 — smsv2: real Twilio dial + mock cleanup (PRs #526–#532)

End-to-end TDD fix series so the /smsv2 surface stops being theater. Hugo
clicks Call → his phone actually rings → outcome applies to a real wk_calls
row.

**Living docs:** all wk-* edge functions deployed and ACTIVE. New function
`wk-calls-create` deployed at 2026-04-25 21:11 UTC. Updated:
`wk-voice-twiml-outgoing` (v4, also 21:11 UTC) now reads `CallId` /
`ContactId` form params and UPDATEs the pre-minted row instead of inserting
a duplicate. Full deployed list (20):

| function | role |
|----------|------|
| wk-create-agent | provision an agent profile + spend-limit row |
| wk-twilio-connect | OAuth callback for Twilio Connect |
| wk-spend-check | pre-dial spend / killswitch RPC wrapper |
| wk-spend-record | record cost after a call ends |
| wk-killswitch-check | global enable/disable flags |
| wk-outcome-apply | server automation when an outcome is picked |
| wk-leads-next | atomic "next lead" picker |
| wk-leads-distribute | bulk distribute leads to agents |
| wk-dialer-start | parallel/power-dialer originator |
| wk-dialer-answer | winner-takes-screen broadcast on first answer |
| wk-dialer-tick | poll loop for stuck queues |
| wk-ai-postcall | post-call summary + sentiment + tagging |
| wk-ai-live-coach | live transcription + coach event publisher |
| wk-voice-token | Twilio access-token mint |
| wk-voice-twiml-outgoing | TwiML for browser-initiated outbound |
| wk-voice-twiml-incoming | TwiML for PSTN→Client routing |
| wk-voice-status | call status callback receiver |
| wk-voice-recording | recording status callback receiver |
| wk-jobs-worker | scheduled background tasks |
| wk-calls-create | **NEW** mints wk_calls UUID before dialing |

### What landed

- **PR #526** — Empty store seed + atomic contact replace. The 8 mock
  contacts no longer leak into /smsv2/contacts. `useHydrateContacts` now
  calls `setContacts(real)` once instead of upserting per row on top of
  the seed.
- **PR #527** — `useCurrentAgent` hook replaces hardcoded `CURRENT_AGENT`
  (a-tom). Status bar, softphone header, live-call agent stats, and call
  greeting all show the signed-in user's real identity / spend / call
  counts.
- **PR #528** — Real Twilio dial in `startCall`. New edge function
  `wk-calls-create` mints the wk_calls row server-side; orchestrator
  invokes it, dials with `{ CallId, ContactId }` baked into TwiML params;
  `wk-voice-twiml-outgoing` now updates that row instead of inserting a
  dupe. Phase transitions only after Twilio Call accept/disconnect.
- **PR #529** — `LiveTranscriptPane` empty state. Production no longer
  shows MOCK_TRANSCRIPT / MOCK_COACH_EVENTS. Mock fallback gated behind
  `?demo=1` URL flag for internal demos.
- **PR #530** — Post-call button guard. Orange "Pick outcome" only
  renders when `call.callId` is a real UUID, so the button never appears
  for calls that didn't really happen.
- **PR #531** — Per-page mock fallbacks gated behind `?demo=1`.
  CallsPage / InboxPage / ContactDetailPage / SettingsPage stop leaking
  Sarah Jenkins / Tom Richards / fake history into production. New
  `useDemoMode()` helper reads `?demo=1` from the URL.
- **PR #532** — Inbound call wiring. `Device.on('incoming')` auto-accepts
  + notifies subscribers via `addIncomingCallListener`. ActiveCallContext
  morphs into the live-call screen for inbound PSTN calls the same way
  it does for the dialer-winner broadcast.

### Verification
- 87/87 vitest tests green (was 43 before this series; +44 across the 7
  PRs).
- `npx tsc --noEmit` clean throughout.
- All edge fns ACTIVE on `asazddtvjvmckouxcmmo`.

## 2026-04-15 — Growth config backend (A/B + social proof)

Admin Growth page (/admin/marketplace/growth) now persists A/B weights and social-proof settings to a new `growth_config` Supabase table via a new `growth-config` edge function. The landing router (public/landing/index.html) and social-proof toast script (public/landing/js/social-proof.js) read from the edge function on load (2.5s timeout, localStorage cache fallback, hardcoded defaults as last resort), so admin changes finally reach real visitors within ~30s instead of dying in the admin's own browser.

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
