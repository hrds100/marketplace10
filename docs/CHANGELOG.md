# Changelog

## [Unreleased]

## [2026-04-02f] - Inquiry Pipeline Fixes

### Fixed
- WhatsApp inquiries now accept optional `tenant_email` field in `receive-tenant-whatsapp` edge function.
- Email inquiry modal now attempts session refresh before failing, and shows specific "session expired" message instead of generic error.

### Changed
- Documented n8n workflow change needed: include `tenant_email` from GHL contact data in webhook payload.

## [2026-04-02e] - Admin Deals Consolidation

### Changed
- Merged Submissions + Listings into one "Deals" page with 3 tabs: Pending Review, Live, Inactive.
- Pending tab supports full property editing before approval, including Airbnb pricing display and re-fetch.
- Live tab preserves all Listings features: table view, CSV import/export, featured toggle (3-max), status dropdown, hard delete with PIN.
- Inactive tab adds Reactivate button to move deals back to pending.

### Removed
- Deal Sourcers page (read-only metrics, already available in The Gate > Metrics tab).
- Observatory page (read-only chat monitor, chat system no longer active).
- Old nav links: Submissions, Listings, Deal Sourcers, Observatory replaced by single "Deals" link.
- Old URLs (/admin/marketplace/submissions, /listings, /deal-sourcers) redirect to /admin/marketplace/deals.

### Preserved
- 1st Inquiry and NDA toggles remain on Pending Review tab (both fields read by process-inquiry edge function).
- Approval workflow: audit log, email notifications, in-app notifications all intact.
- Approve/Reject buttons only visible on pending/inactive items (matches original Submissions behavior).

## [2026-04-02d] - Outreach Metadata Enrichment (Pass 1/3)

### Added
- `authorized_at` column on inquiries (migration + live applied).
- Tenant Requests: group header shows Claimed/Unclaimed badge + NDA count.
- Tenant Requests: released leads show sent timestamp and NDA signed timestamp.
- Landlord Activation: Leads (N) badge is now clickable/expandable with inline lead history.
- Lead history shows: tenant name, received time, release mode, NDA signed state.

### Changed
- `authorise()` now stamps `authorized_at` when admin releases a lead.

## [2026-04-02c] - Single Reply Source for WhatsApp Inquiries

### Fixed
- Stripped reply nodes from poll workflow. Poll is now inquiry-only backup.
- Webhook workflow is the single canonical reply sender.
- Proven: 1 test = 1 inquiry + 1 reply + 0 duplicates (before=8, after=9 replies).
- Architecture: webhook (instant reply) + poll (backup inquiry creation, no reply).

## [2026-04-02b] - Restore Poll Workflow Tenant Reply

### Fixed
- ROOT CAUSE: Poll workflow had reply nodes stripped (to avoid duplicates with webhook).
  But GHL trigger stopped firing to the webhook, so the poll was the only path creating
  inquiries - and it had no reply step. Tenant got no confirmation.
- Fix: Reply nodes restored to poll workflow (Prepare Reply -> Should Reply? -> Send Tenant Reply).
- Both paths now send replies: webhook (instant, when GHL triggers) and poll (every 2 min, backup).
- Edge function dedup prevents duplicate inquiries; reply fires for both new and dedup'd results.

## [2026-04-02a] - Fix Claimed Detection + Hide NDA + Claim for Claimed Landlords

### Fixed
- `isReallyClaimed()` helper: profiles with `@nfstay.internal` email are treated as unclaimed.
- Landlord Activation, Tenant Requests, and Metrics all use the same claimed check.
- `NDA + Claim` button hidden for truly claimed landlords (real email, not internal).
- Always Authorise dropdown: `NDA + Claim` option removed for claimed landlords.
- Saved `nda_and_claim` mode normalizes to `NDA` display for claimed landlords.
- Internal placeholder accounts (`landlord_xxx@nfstay.internal`) correctly show as Unclaimed.

## [2026-04-01i] - Restore Tenant WhatsApp Auto-Reply

### Fixed - Tenant auto-reply not sending
- ROOT CAUSE: n8n webhook workflow `IvXzbcqzv5bKtu01` had a stale GHL token
  (literal "REDACTED_GHL_PIT_TOKEN" instead of real PIT token) in the
  "Send Tenant Auto-Reply" node. Fixed via n8n API.
- Tenant now receives: "Thanks for contacting NFsTay! Your inquiry for
  [property] has been received and is being reviewed by our team."
- Reply fires from n8n webhook workflow (canonical source), not from GHL trigger.
- Old GHL workflow `11117c1a` disabled (draft) by Hugo.
- Poll workflow `ReoIHnniLpB632Ir` is backup inquiry creator only (no reply).
- Verified with tagged test: one reply, one inquiry, no landlord contact.

## [2026-04-01h] - Outreach V3: Timestamps, Auto-Authorise Modes, Landlord Badges

### Enhanced - Tenant Requests
- Inquiry cards now show date + time (clock icon) instead of date only.
- Always Authorise replaced with 4-mode dropdown: Off / Direct / NDA / NDA + Claim.
- Mode persists per landlord phone across all their inquiries.

### Enhanced - Landlord Activation
- Outreach sent badge now shows the sent date and time.
- New "Claim required" badge appears when landlord has nda_and_claim leads.
- Leads (N) badge already present from PR #163; no change needed.

## [2026-04-01g] - Marketplace Crash Fix: bcPropertyId ReferenceError (PR #168)

### Fixed
- **ROOT CAUSE:** `RecentActivityTable` (standalone component at module scope) had `bcPropertyId` in its `useCallback` dependency array, but `bcPropertyId` is only declared inside `InvestMarketplacePage`. This caused `ReferenceError: bcPropertyId is not defined` on every page load. TypeScript and lint did not catch it because dependency arrays are typed as `any[]`.
- Fix: removed the out-of-scope dependency (the callback doesn't use it).
- Browser-verified on both preview and production: marketplace loads, Pembroke Place visible, no crash.

### Lesson
- Out-of-scope variables in React hook dependency arrays pass TypeScript/lint but crash at runtime. Browser verification is mandatory before claiming "fixed."

## [2026-04-01f] - Marketplace Crash Fix: Infinite Re-Render Loop (PR #167)

### Fixed
- `useEffect` in `DealsPageV2.tsx` had `[investProperties]` as dependency. React Query returns a new array reference every render, causing infinite fetch loop. Changed to `[investProperties?.length]`.
- This fixed the DealsPageV2 infinite loop but did not fix the separate `bcPropertyId` crash on the marketplace page (fixed in PR #168).

## [2026-04-01e] - Marketplace Source-of-Truth Fix (PR #164)

### Fixed - Chain as primary source for marketplace numbers
- Chain APR now always overrides admin `annual_yield` (was showing 99.6%, now correct ~115.6%)
- Monthly yield = APR / 12 (~9.6%), matching legacy
- `totalShares`, `sharesSold`, `sharesRemaining` from chain when available
- `pricePerShare` from chain when available
- Chain reads use `blockchain_property_id` instead of hardcoded property 1
- Calculator uses 5 years (matching legacy, was 6)
- "Built 0" and "0 Bath" badges hidden when zero
- JV card on deals grid fetches chain stats
- Admin blockchain box shows live chain values (was showing DB form values)
- Admin yield field relabeled "Net Monthly Yield (%) - fallback only"
- Pembroke Place `rent_cost` corrected from 4400 to 3500 (matches legacy)

### Known issue introduced
- Two runtime crashes were introduced and fixed in PR #167 and PR #168 (see above)

## [2026-04-01d] - Outreach Grouping + Release Mode + WhatsApp Inquiry Fix (PR #163)

### Fixed - Tenant Requests grouping
- `AdminOutreachV2` Tenant Requests now groups by landlord phone/identity (expandable), matching Landlord Activation behavior.
- Group row now carries phone-level controls (Always Authorise) and request counts (pending/sent).

### Fixed - NDA vs NDA+Claim behavior in landlord CRM
- CRM lead unlock now uses `inquiries.authorisation_type` as the source of truth:
  - `nda` -> NDA required, claim not forced.
  - `nda_and_claim` -> NDA + mandatory account claim before lead details unlock.
  - `direct` -> no NDA/claim gate.
- Global claim banner is now shown only when the landlord has at least one authorized `nda_and_claim` lead.

### Fixed - Inbound WhatsApp pipeline
- ROOT CAUSE: GHL inbox-new-inquiry sends empty message bodies to n8n.
- Fix: n8n poll workflow ReoIHnniLpB632Ir checks GHL every 2 min, creates inquiry rows, sends correct auto-reply.
- Admin UPDATE RLS policy on inquiries table.
- Playwright e2e test (secrets via env vars).

### Updated docs
- `docs/COMMUNICATIONS.md` updated with grouped Tenant Requests and explicit release-mode unlock rules.
- `docs/QUICK_LIST_FLOW.md` updated with grouped Tenant Requests and CRM unlock behavior.
- `docs/ACCEPTANCE.md` updated with scenarios for grouping + release-mode gating.

## [2026-04-01c] - Payout Status Cascade Fix (PR #161)

### Fixed - Bank Payout Status Propagation
- **`revolut-check-status`**: Now reads `user_type` from `payout_claims`. Investor claims cascade `claimed` -> `paid` in `inv_payouts`. Affiliate claims resolve `aff_profiles.id` and cascade `claimed` -> `paid` in `aff_commissions`.
- **`revolut-webhook`**: Same cascade added to the webhook path. Previously only updated `payout_claims` without touching source rows.
- Money flow was never affected - this was a status/history display issue only.
- Both edge functions deployed and `verify_jwt = false` confirmed.

### Pending
- Manual live verification still needed: create test investor + affiliate bank claims, approve, confirm source rows reach `paid`.

### Files Changed
- `supabase/functions/revolut-check-status/index.ts`
- `supabase/functions/revolut-webhook/index.ts`

## [2026-04-01b] - Deactivate Old n8n Landlord Auto-Notification Workflows

### Fixed - Live n8n (external, not in repo)
- **ROOT CAUSE FOUND**: Two old n8n workflows were bypassing the admin gate and auto-contacting the landlord on every tenant inquiry.
- **Deactivated `ydrMC0qsOeaFxbsL` (Poll Inbound WhatsApp Inquiries)**: polled GHL every 30s, created duplicate inquiry rows via REST, sent old auto-reply ("We've passed your enquiry to the Landlord"), and called landlord notification workflow.
- **Deactivated `pZ6EOZ1fkj1WcDXs` (Inquiry Lister WhatsApp v5)**: auto-enrolled landlord in GHL workflow on every inquiry.
- Correct path is now: GHL inbound -> n8n `IvXzbcqzv5bKtu01` -> receive-tenant-whatsapp edge function -> Tenant Requests. Landlord receives nothing until admin release.

### Verified
- Admin (`admin@hub.nfstay.com`) can read inquiries via RLS policy
- Inquiry `3f54f0a0` visible in admin query with `authorized=false`
- Idempotency: retry within 5min returns same inquiry (`deduplicated=true`)

## [2026-04-01] - Investment Reseed (Pembroke Place)

### Added
- Idempotent migration `20260401_reseed_pembroke_place.sql` to restore `inv_properties` with Pembroke Place (blockchain_property_id=1) and reseed `aff_commission_settings` defaults (40% / 5% / 2%).

### Fixed
- Removed stale “Seseh” references from investment docs; updated acceptance, user journey, communications, and database docs to match Pembroke Place.
- Reset runbook now warns that wiping `inv_properties` or `aff_commission_settings` breaks the investment UI and must be reseeded immediately after any wipe.

## [2026-03-24b] - SamCart Auto-Approve, Affiliate Fix, Wallet Verification

### Fixed - SamCart Order Processing
- **SamCart webhook was blocked**: `verify_jwt` was `true` on `inv-samcart-webhook` edge function, rejecting all SamCart webhooks with 401. Fixed to `false`. Replayed 2 missed orders ($5 each).
- **Orders no longer auto-approve**: SamCart orders now land as `pending`. Admin must click "Approve" on the orders page to send shares on-chain. New edge function `inv-approve-order` handles the on-chain transaction.
- **Approve button on admin orders page**: Replaces old "Mark complete" (DB-only). Shows confirmation dialog before executing blockchain transaction. Loading spinner while tx processes.
- **Referrer wallet column**: Admin orders table now shows the referrer's wallet address.

### Fixed - Affiliate Tracking
- **Agent tracking for SamCart (card) purchases**: Webhook now checks buyer's `referred_by` field in profiles to resolve the referrer. Previously, agent was never tracked because `agentWallet` was missing from SamCart data.
- **Agent tracking for crypto purchases**: `inv-process-order` edge function now resolves agent from `referred_by` (was always `null`).
- **Auto-create `aff_profiles`**: If a referrer has no affiliate profile, `createCommission()` auto-creates one so commissions are recorded.
- **Backfilled**: Created `aff_profiles` for hugodesouzax@gmail.com (code AGEN0W), set agent_id on helpmybricks order, created $0.25 commission.

### Fixed - Wallet Creation for Email Signups
- **Mandatory wallet verification modal**: Email signup users see a blocking overlay on dashboard asking them to verify their account via Particle. Cannot navigate, cannot dismiss, persists on every page load until wallet is connected.
- **Blurred backdrop**: While Particle popup is active, white blurred overlay blocks all navigation behind it.
- **Race condition fixed**: Added global lock in `ParticleWalletCreator` so only one wallet creation runs at a time. `useWallet` hook now polls instead of racing with `WalletProvisioner`.

### Changed - Particle Project Consolidation
- **Removed Hub project** (`470629ca-91af-45fa-a52b-62ed2adf9ef0`) from entire codebase.
- **Single project**: Everything now uses Legacy (`4f8aca10-0c7e-4617-bfff-7ccb5269f365`) - social login and email wallet creation.
- `PARTICLE_CONFIG` is now an alias for `PARTICLE_LEGACY_CONFIG` with extra chain fields.
- Updated `particle-wallet.html` to Legacy credentials.

### Files Changed
- `supabase/functions/inv-samcart-webhook/index.ts` - pending orders, agent from referred_by
- `supabase/functions/inv-process-order/index.ts` - agent from referred_by
- `supabase/functions/inv-approve-order/index.ts` (NEW) - admin approve with on-chain
- `src/pages/admin/invest/AdminInvestOrders.tsx` - approve button, referrer column
- `src/hooks/useInvestData.ts` - fetch agent profiles for orders
- `src/components/WalletProvisioner.tsx` - mandatory verification modal
- `src/components/ParticleWalletCreator.tsx` - global lock, legacy project
- `src/hooks/useWallet.ts` - poll instead of race
- `src/lib/particle.ts` - single project, removed Hub
- `public/particle-wallet.html` - legacy credentials
- `src/pages/VerifyOtp.tsx` - cleaned up wallet creation (handled by WalletProvisioner)

## [2026-03-24] - Affiliate Commission Tracking + Profile Photo Upload

### Added - Affiliate Commission Chain (all 3 revenue sources now tracked)

- **GHL subscription commissions (40%)**: `PaymentSheet.tsx` and `InquiryPanel.tsx` detect payment success (tier change in DB), then POST to n8n `/webhook/aff-commission-subscription` with the user's `referred_by` code. n8n creates `aff_commissions` row with 14-day holdback.
- **Crypto purchase commissions (5%)**: `useBlockchain.ts` now looks up the buyer's `referred_by` from their profile after `buyPrimaryShares` tx confirms. Resolves referral code to `agent_id`, writes `inv_orders.agent_id`, and creates `aff_commissions` row.
- **Referral code passed to GHL funnel**: `getFunnelUrl()` and `getUpgradeUrl()` accept `ref` param. All payment entry points (PaymentSheet, InquiryPanel, SettingsPage membership tab) fetch `profiles.referred_by` and append `&ref=CODE` to the GHL iframe URL.
- **Affiliate auto-provisioning**: Visiting `/dashboard/affiliates` auto-creates an `affiliate_profiles` row if none exists. No "Become An Agent" button needed.
- **n8n workflow activated**: "NFsTay -- Subscription Commission" (`VdiSsyokBcUteHio`) turned ON.

### Added - Profile Photo Upload

- **`profile-photos` Supabase storage bucket**: Created with INSERT/SELECT/UPDATE/DELETE policies for authenticated users. Bucket is public so avatar URLs are accessible.
- **Migration**: `supabase/migrations/20260323_profile_photos_bucket.sql`

### Fixed

- **Affiliates page crash (TDZ error)**: `useMyAffiliateProfile` import from `useInvestData` pulled in `mergeBuyerEmailsIntoOrders` module, causing a `ReferenceError: Cannot access variable before initialization` in Vercel's production bundle. Fixed by restoring the original import chain and moving auto-provision into the existing `queryFn`.
- **Profile photo upload failed silently**: The `profile-photos` Supabase storage bucket never existed. Created bucket + RLS policies via Supabase Management API.

### Files Changed

- `src/lib/ghl.ts` - `getFunnelUrl` + `getUpgradeUrl` accept `ref` param
- `src/components/PaymentSheet.tsx` - fetch `referred_by`, fire n8n commission on payment success
- `src/components/InquiryPanel.tsx` - same as PaymentSheet
- `src/pages/SettingsPage.tsx` - pass `ref` to all GHL funnel URLs, fetch `referred_by` + `avatar_url`
- `src/pages/AffiliatesPage.tsx` - auto-provision affiliate profile in queryFn
- `src/hooks/useBlockchain.ts` - attribute `agent_id` + create `aff_commissions` on crypto purchase
- `supabase/migrations/20260323_profile_photos_bucket.sql` - new storage bucket
- `docs/INTEGRATIONS.md` - full affiliate commission tracking documentation

---

## [2026-03-20] - Social Login Fix + Chain Disconnection Fix

### Fixed - Social Login (Particle Network)

- **Google/Apple/Twitter/Facebook login redirected to verify-otp instead of dashboard**: Three root causes:
  1. `ProtectedRoute` only queried `whatsapp_verified`, not `wallet_auth_method` - social users were never detected (`ea28010`)
  2. Stale sessions with no profile triggered verify-otp loop - now signs out + redirects to /signin (`cd726eb`)
  3. `profiles.update({ wallet_auth_method })` silently failed - no error checking on the Supabase call. Added error logging + retry after 1.5s delay (`bec2510` + this commit)
- **ProtectedRoute sessionStorage fallback**: ParticleAuthCallback already stores `particle_auth_method` in sessionStorage (line 94), but ProtectedRoute ignored it. Now if the profile says `jwt` but sessionStorage says `google`, the user is let through immediately and the profile is fixed in the background.
- **handle_new_user trigger missing email**: The Supabase trigger only inserted `(id, name)` - `email` was always null. Fixed to include `COALESCE(NEW.email, '')`.
- **INSERT RLS policy added**: `CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id)` - required for upsert operations.

### Fixed - Blockchain Provider ("The provider is disconnected from the specified chain")

- **Root cause: Particle SDK initialized with wrong project credentials.** `ensureConnected()` called `pa.init(PARTICLE_CONFIG)` (hub project) BEFORE checking the user's `wallet_auth_method`. Particle SDK only allows one `init()` per page - subsequent calls throw "already initialized" and are silently caught. For social login users (Google/Apple), this meant the SDK was permanently locked to the hub project instead of the legacy project, so `particleConnect()` either failed or recovered a different wallet. The provider was left in a disconnected state.
- **Fix - auth-method-first initialization.** New `initParticle(pa, type)` helper tracks which project was initialized via `_particleInitType`. `ensureConnected()` now queries `wallet_auth_method` from the profile BEFORE any `pa.init()` call. Social users → `PARTICLE_LEGACY_CONFIG` (same wallet as app.nfstay.com). JWT users → `PARTICLE_CONFIG`.
- **Fix - `getWalletProvider()` no longer re-inits.** Previously hardcoded `pa.init(PARTICLE_CONFIG)` on every call, potentially overriding the correct init. Now defers to `_particleInitType` set by `ensureConnected()`.
- **Fix - `ensureBscChain()` returns boolean.** If chain check fails (provider fully disconnected), `getWalletProvider()` now returns `null` instead of a broken provider.

### Files Changed

- `src/pages/ParticleAuthCallback.tsx` - error checking + retry on profile update
- `src/components/ProtectedRoute.tsx` - sessionStorage fallback for social users
- `src/hooks/useBlockchain.ts` - `initParticle()` helper, auth-method-first init, `ensureBscChain()` returns boolean
- DB: `handle_new_user()` trigger updated to include email column

## [2026-03-19] - Claiming Flow Fixes + Marketplace Enhancements + Bank Transfer Verification

### Fixed - Claiming Flow

- **USDC was opening MetaMask instead of Particle wallet**: `getWalletProvider()` in `useBlockchain.ts` had `window.ethereum || window.particle?.ethereum` - MetaMask always won because `window.ethereum` is registered first. Fixed: Particle auth-core (`@particle-network/auth-core particleAuth.ethereum`) is now tried first, then `window.particle?.ethereum`, then `window.ethereum` as last resort only.
- **STAY / LP Token stuck forever on "Claiming..."**: Modal called `onClaimRent()` (which calls `withdrawRent` on-chain) AND then `onBuyStayTokens()`/`onBuyLpTokens()` which internally also call `withdrawRent`. The second `withdrawRent` call hangs forever because rent is already claimed. Fixed: removed the `onClaimRent()` pre-call from STAY and LP paths - each function handles its own internal withdraw.
- **ReferenceError: bankAccount is not defined**: `bankAccount` was in the TypeScript prop type for `ClaimModal` but missing from the destructuring pattern. `handleContinue` crashed silently every time Continue was clicked. Fixed by adding `bankAccount` to destructuring. (Confirmed via Sentry: `ReferenceError: bankAccount is not defined at x (/assets/index-R9q6iJCl.js:1030:3704)`)
- **Continue button did nothing**: Caused by the `ReferenceError` above. Fixed as above.
- **Bank transfer fake-success**: Old catch block did `setClaimStep('success')` as a demo fallback. Removed - errors now surface to the user as a visible red banner.
- **Errors swallowed silently**: Catch blocks just reset state with no message. Added `claimError` state - shown as a red banner at the top of the choose step.
- **Continue button disabled on modal open**: `selectedMethod` was null until the user explicitly clicked a method. Fixed by pre-selecting `'bank_transfer'` in `handleClaim()`.

### Added - Claiming Flow

- **Bank setup gate**: If user has no bank details saved and selects Bank Transfer → modal shows inline `BankDetailsForm` (Step `bank_setup`) instead of proceeding. After save, fires `submit-payout-claim` immediately without user needing to click again.
- **Wallet prompt in processing step**: For USDC / STAY / LP claims, shows "Approve the transaction(s) in your Particle wallet to continue."

### Added - InvestMarketplacePage

- **`appreciation_rate` from DB**: Property calculator reads `appreciation_rate` from `inv_properties` column (migration applied) instead of hardcoded 5.2%. Falls back to 5.2 if null.
- **`property_docs` download links**: Documents section shows clickable `<a href>` links for `property_docs` JSONB column. Legacy name-only `documents[]` still shown as plain text for backwards compatibility.
- **`BlockchainDot` on Recent Activity header**: Animated green ping added to "Recent Activity" card title to signal live on-chain data.
- **`AgentReferralLink` from `referral_code`**: Replaced wallet address logic with `useMyAffiliateProfile()` hook - referral URL is `hub.nfstay.com/invest?ref={referral_code}&property={id}`. Shows "Set up affiliate profile" link if no profile exists.

### Added - DB Migration

- `20260319_inv_appreciation_docs.sql`: Adds `appreciation_rate NUMERIC DEFAULT 5.2` and `property_docs JSONB DEFAULT '[]'` to `inv_properties`. Creates `inv-property-docs` storage bucket (public) with 3 RLS policies (authenticated read, admin insert, admin delete).

### Bank Transfer Flow - End-to-End Verification (2026-03-19)

All components confirmed deployed and wired:

| Step | What happens | Status |
|------|-------------|--------|
| User submits bank form | `save-bank-details` edge function saves to `user_bank_accounts` | ✅ deployed |
| `onSave()` fires | `submit-payout-claim` edge function: validates bank, calculates server-side from `inv_payouts`, UNIQUE(user_id, week_ref) guard, creates `payout_claims` row (status: pending), logs to `payout_audit_log` | ✅ deployed |
| Tuesday 05:00 AM UK | `inv-tuesday-payout-batch` n8n cron: registers Revolut counterparties, POSTs `/payment-drafts`, sets status → processing, WhatsApps Hugo | ✅ activated |
| Hugo approves | Revolut Business app Face ID - releases Faster Payments (GBP same day), SEPA (EUR next day), SWIFT (1-5 days) | Manual |
| Revolut fires webhook | `revolut-webhook` edge function: HMAC-SHA256 verified, `TRANSACTION_COMPLETED` → status = 'paid' + `paid_at`, WhatsApp to user | ✅ deployed |

**Known limitation - GBP hardcode:** `submit-payout-claim` is called with `currency: 'GBP'` hardcoded in the `bank_setup` step. Users who saved EUR bank details will have a currency mismatch. Affects non-GBP investors only. Fix: pass the currency from `BankDetailsForm` via `onSave(currency)` callback when needed.

### Commits

- `3d5d572` - fix: claiming flow - wallet priority, double withdrawRent, bank setup gate
- `37eac42` - fix: pre-select Bank Transfer in claim modal on open
- `1eafdb7` - fix: add bankAccount to ClaimModal destructuring (ReferenceError)

---

## [2026-03-19] - MILESTONE: Investment Module Fully Wired to Blockchain

### Summary
The investment module is now fully connected to real blockchain data. All 4 invest pages (Marketplace, Portfolio, Proposals, Payouts) read live data from BNB Chain smart contracts and The Graph subgraphs. No mock data remains. Legacy investor data (shares, votes, rent history) is visible without migration - the blockchain is the source of truth.

### Wallet & Auth
- **Particle MPC wallet auto-creation** at signup (silent, non-blocking)
- **Legacy wallet import** - admin grants time-limited permission, user pastes old wallet address
- **Wallet protection** - Particle SDK never overwrites a manually-set wallet
- **Reset password page** built (`/reset-password`)
- **Profile photo upload** to Supabase Storage

### Marketplace Page
- Real property data from Supabase `inv_properties` (Pembroke Place)
- IPFS images from on-chain metadata
- Activity feed from The Graph (real purchase events)
- Card payment → SamCart checkout redirect
- Crypto payment → blockchain `buyShares()` with correct property ID

### Portfolio Page
- Share balances read from RWA Token contract (`balanceOf`) via public RPC
- Legacy investors see holdings instantly after pasting old wallet
- No MetaMask popup for read-only operations
- Rank/tier system based on real holdings count

### Proposals Page
- **6 proposals fetched from Voting contract** with `getProposal()` + `decodeString()`
- Real titles and descriptions decoded from on-chain bytes
- Real vote counts (36K+ share-weighted, not wallet count)
- Active/Approved/Rejected status from contract
- User's votes shown ("You voted Yes" badge)
- Vote confirmation with confetti celebration modal

### Payouts Page
- Claimable rent from Rent contract (`getRentDetails` + `isEligibleForRent`)
- Historical rent withdrawals from The Graph rent subgraph
- Claim methods: Bank Transfer (Edge Function), USDC (on-chain `withdrawRent`), STAY (claim + PancakeSwap link), LP (claim + liquidity link)
- Property images from IPFS

### Admin Panel
- Property CRUD with image upload to Supabase Storage
- Wallet change permission system (time-limited, password-protected)
- Orders + Payouts use real Supabase data (mock arrays removed)
- Commission settings saved to database

### Infrastructure
- **SamCart webhook** live - receives payments, creates orders, updates shareholdings
- **Vite WASM plugin** for Particle SDK `thresh-sig` module
- **Public RPC** for all blockchain reads (no wallet popup)
- **30 tests** passing (portfolio, payouts, IPFS, invest wiring)
- **Runbook** for diagnosing "Something went wrong" crashes

### Technical Decisions
- Blockchain reads use ethers.js directly inside useEffect (not React hook closures) to avoid stale address bugs
- The Graph used for discovery (proposal IDs, purchase events, rent history), contracts used for authoritative data (balances, vote counts, descriptions)
- Supabase is metadata layer (property images, descriptions, bank details), blockchain is source of truth for ownership and financial data
- IPFS images served via `ipfs.io` gateway (cloudflare-ipfs.com is dead)

### Commits (25+)
Key commits: `021b9bf` (wire to real data PR), `835c114` (8 UI fixes), `048c838` (payouts direct ethers), `a8d0fdf` (portfolio+proposals+history from Graph), `c6a8539` (real proposal descriptions from blockchain)

---

## [2026-03-19] - Particle Wallet Auto-Creation + Settings Payout UI

### Added
- **Automatic wallet creation at signup**: Particle MPC wallet created silently via `WalletProvisioner` in DashboardLayout. Uses `@particle-network/auth-core` directly (no React wrapper). Wallet created after OTP verification, retries on next login if failed.
- **Vite WASM support**: Custom `particleWasmPlugin` copies `thresh-sig` WASM to build output + serves it in dev. Added `vite-plugin-node-polyfills` for Buffer/crypto/stream polyfills.
- **Payout Address copy button**: Settings > Payout Settings shows wallet with green Copy button + "Copied" feedback.
- **Wallet retry for existing users**: `useWallet` hook auto-retries wallet creation for users who signed up before this feature.
- **WALLET_ARCHITECTURE.md**: Full documentation of wallet creation flow, MPC security model, recovery procedures, troubleshooting guide.

### Changed
- **Settings > Payout Settings**: Renamed "Wallet Address" to "Payout Address". Removed unused "Preferred Claim Method" radio buttons (not wired to DB). Removed "Your wallet is active..." subtitle.
- **Bank Details**: Updated payout schedule - GBP: "Payout every Tuesday, same-day clearing". EUR: "Payout every Tuesday, cleared within 10 working days".

### Fixed
- **Particle SDK crash**: `AuthCoreContextProvider` crashed the app at runtime due to WASM loading issues in Vite. Fixed by using `auth-core` API directly (`particleAuth.init()` + `connect()`), bypassing the React wrapper entirely.
- **Particle overlay blocking clicks**: SDK injected invisible modal overlays with high z-index. Fixed with targeted CSS (`pointer-events: none` on `pn-modal`/`pn-auth` classes only).
- **Wallet creation killed by page navigation**: `VerifyOtp.tsx` did `window.location.href` 1.5s after OTP, destroying the React component mid-wallet-creation. Moved wallet creation to `WalletProvisioner` in DashboardLayout which persists across navigation.

### Technical
- Particle SDK lazy-loaded via dynamic `import()` - 1MB separate chunk, not in main bundle
- JWT auth: Edge Function signs RS256 JWT with user UUID as `sub`, Particle verifies via JWKS endpoint
- MPC wallet: private key split into 2 shares (Particle server + user browser), neither can sign alone
- Recovery: user logs back in → same UUID → same JWT `sub` → Particle restores wallet

## [2026-03-17] - nfstay Module + Google Maps + n8n Cleanup

### Added
- **Booking Site page** (#14): Split-panel editor at `/dashboard/booking-site` - operators customize brand name, colors, logo, hero content with live preview. Desktop/mobile toggle. Mockup only, no backend.
- **Google Maps on Deals page** (#15): Replaced Leaflet/CARTO map with Google Maps. Smooth animated zoom on card hover, green circle markers, info popup with deal details.
- **nfstay documentation infrastructure** (#12): 18 documentation files in `docs/nfstay/` - agent instructions, architecture, database schema (11 tables), domain model, features, integrations, webhooks, white-label, routes, acceptance scenarios, boundaries, shared infrastructure, environment vars, decisions, handoff, changelog, diagnosis runbook.
- **nfstay execution plan** (#13): 6-phase build roadmap from zero to production. Tajul authority model - Tajul approves everything, Hugo only for final production merge.
- **Dev commands**: `npm run check` (typecheck + lint + test), `npm run clean` (clear build cache).
- **n8n workflow protection protocol** (#16): Full inventory of 16 protected workflows with IDs and webhook paths. 6 protection rules for nfstay agents.

### Fixed
- **n8n webhook collisions**: Deactivated "Test Echo" workflow that was stealing production webhook calls from 3 live workflows. Deactivated duplicate "Landlord Replied" and "New Message" workflows (kept newer copies).

### Docs
- Added `VITE_GOOGLE_MAPS_API_KEY` to Vercel env vars and `docs/STACK.md`
- Updated `docs/AGENT_INSTRUCTIONS.md` - added nfstay module scoping, dev commands, clickable test URL requirement
- Updated `docs/nfstay/BOUNDARIES.md` - full n8n workflow inventory and protection rules
- Updated `docs/nfstay/SHARED_INFRASTRUCTURE.md` - credential protection, cleanup log
- Closed stale PR #10

## [2026-03-16] - Landlord Magic Link + University Fixes

### Added
- **Landlord magic link auto-login** (#7): WhatsApp magic links auto-login landlords to inbox. Edge functions `landlord-magic-login` and `claim-landlord-account`. MagicLoginPage handles `/inbox?token=` flow.
- **Deals page V2** (#8): Airbnb-style card layout with split view (cards left, map right). Filter bar, featured section, pagination.

### Fixed
- **University admin** (#9, #11): Consolidated admin tabs, fixed 0-lesson count bug, removed broken admin guard from Modules and Analytics pages.
- **Sticky session** (#5): Skip login screen if user is already authenticated.
- **Inbox redirect** (#4): `/inbox` route works for GHL magic link template.
- **Magic link redirect** (#3): Preserve URL through signin flow.
- **n8n fallback** (#2): Webhooks fire without env var set.

### Docs
- Hugo interaction protocol + feature branch workflow (#1)

## [2026-03-15] - Inbox UI + Production Safety

### Added
- **Inbox UI**: Airbnb-style 3-panel messaging layout (dummy data)
  - ThreadList with expandable search, filter pills, pinned support thread
  - ChatWindow with date-grouped bubbles, input bar, quick replies
  - InboxInquiryPanel with property details, profit, agreement CTA, next steps checklist
  - ThreadItem with hover context menu (Mark unread / Star / Archive)
  - QuickRepliesModal with full CRUD (add, edit, delete inline)
  - MessagingSettingsModal (UI stub)
  - Mobile: full-screen chat with back button
  - Nav: Inbox between Deals and CRM (MessageSquare icon)
- **GitHub Actions CI**: tsc + tests on every push/PR to main
- **Sentry ErrorBoundary**: wraps App, shows fallback UI instead of blank screen
- **Health check**: Supabase edge function + Vercel rewrite at /api/health
- **Admin audit log**: persistent admin_audit_log table, wired into approve/reject/suspend

### Fixed
- OTP page: backdrop-blur overlay blocking input interaction (z-index fix)
- Inbox layout: sidebar-responsive margins, full-bleed mode, no bottom gap
- Vercel env vars: all 7 VITE_* vars added after .env removed from git
- DashboardLayout: dynamic ml-16/ml-56 margin responds to sidebar collapse

### Docs
- docs/runbooks/DEPLOY_SAFETY.md - env checklist, rollback, smoke test
- docs/runbooks/UPTIME_MONITORING.md - UptimeRobot/BetterStack setup
- CLAUDE.md (root) - auto-loaded by Claude Code
- docs/AGENT_INSTRUCTIONS.md - XML structure, 17 hard rules, personalities
- src/pages/admin/CLAUDE.md + src/integrations/supabase/CLAUDE.md - local guardrails

## [2026-03-15] - Full Platform Build Session

### Added
- **GHL Payments**: 3 products (£67/mo, £997 LT, £397/yr), funnel integration, InquiryPanel checkout
- **Favourites**: Supabase `user_favourites` table, localStorage fallback, FavouritesPage fetches real data
- **University Progress**: Supabase `user_progress` table, syncs steps/lessons/XP to DB
- **CRM Pipeline**: Supabase-backed `crm_deals`, drag-drop stage changes, archive/unarchive, expandable cards
- **CRM Toggle**: Add/Remove from CRM on PropertyCard and DealDetail with Supabase persistence
- **Admin Users**: Full CRUD - tier filter, suspend toggle, delete with confirmation, pagination
- **Admin Notifications**: `/admin/notifications` page, unread badge, 30s polling, mark read
- **Admin AI Settings**: Model selectors + system prompt editors for pricing, university, description AI
- **Notification Toggles**: Per-category WhatsApp/Email toggles saved to profiles
- **My Listings Panel**: Right column on List a Deal page, inline edit, delete, realtime status updates
- **AI University Chat**: Real OpenAI via n8n webhook, 10s timeout, fallback message
- **AI Pricing Reveal**: 3-phase submit experience (analysing → reveal → fallback), saves to DB
- **AI Description Generator**: n8n workflow with admin-editable system prompt
- **Deal Detail**: Fetches from Supabase (not mock), real photos, nearby deals query
- **Accordion Form**: 7-section accordion with green ticks, smooth animation, multi-open
- **Pexels Integration**: Property photo fallbacks via Pexels API, cached to DB
- **Email Notifications**: Resend edge function for admin + member emails
- **n8n Workflows**: University chat, Airbnb pricing, description generator, 2x admin notifications

### Fixed
- Favourites stale closure bug (useRef for latest state)
- CRM mock data seeding removed - starts clean
- DealsPage: removed mock fallback, shows empty state when no live deals
- PropertyCard: CRM state persists via localStorage + Supabase
- AdminSubmissions: pending filter fixed (was checking 'inactive')
- RLS policies: admin can update/delete properties, read all profiles
- Form validation: specific field-level error messages
- Accordion: no auto-advance, multi-open support, smooth 300ms animation
- DealDetail: Unsplash replaced with Pexels, city-unique stock images
- InquiryPanel: fallback UI when GHL funnel URL is missing
- 11 unnecessary `as any` casts removed after types regeneration

### Security
- `.env` removed from git tracking
- `.env.example` added with all keys, no values
- Hardcoded Pexels API key removed from source code
- Admin emails checked via `auth.jwt()` not `auth.users` table (RLS fix)

### Infrastructure
- Supabase Edge Function: `send-email` deployed with Resend
- n8n: 7 active webhook workflows
- Vercel: `VITE_PEXELS_API_KEY` set on production
- Supabase types regenerated with all new columns
