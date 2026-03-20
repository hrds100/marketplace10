# Changelog

## [Unreleased]

## [2026-03-19] — Claiming Flow Fixes + Marketplace Enhancements + Bank Transfer Verification

### Fixed — Claiming Flow

- **USDC was opening MetaMask instead of Particle wallet**: `getWalletProvider()` in `useBlockchain.ts` had `window.ethereum || window.particle?.ethereum` — MetaMask always won because `window.ethereum` is registered first. Fixed: Particle auth-core (`@particle-network/auth-core particleAuth.ethereum`) is now tried first, then `window.particle?.ethereum`, then `window.ethereum` as last resort only.
- **STAY / LP Token stuck forever on "Claiming..."**: Modal called `onClaimRent()` (which calls `withdrawRent` on-chain) AND then `onBuyStayTokens()`/`onBuyLpTokens()` which internally also call `withdrawRent`. The second `withdrawRent` call hangs forever because rent is already claimed. Fixed: removed the `onClaimRent()` pre-call from STAY and LP paths — each function handles its own internal withdraw.
- **ReferenceError: bankAccount is not defined**: `bankAccount` was in the TypeScript prop type for `ClaimModal` but missing from the destructuring pattern. `handleContinue` crashed silently every time Continue was clicked. Fixed by adding `bankAccount` to destructuring. (Confirmed via Sentry: `ReferenceError: bankAccount is not defined at x (/assets/index-R9q6iJCl.js:1030:3704)`)
- **Continue button did nothing**: Caused by the `ReferenceError` above. Fixed as above.
- **Bank transfer fake-success**: Old catch block did `setClaimStep('success')` as a demo fallback. Removed — errors now surface to the user as a visible red banner.
- **Errors swallowed silently**: Catch blocks just reset state with no message. Added `claimError` state — shown as a red banner at the top of the choose step.
- **Continue button disabled on modal open**: `selectedMethod` was null until the user explicitly clicked a method. Fixed by pre-selecting `'bank_transfer'` in `handleClaim()`.

### Added — Claiming Flow

- **Bank setup gate**: If user has no bank details saved and selects Bank Transfer → modal shows inline `BankDetailsForm` (Step `bank_setup`) instead of proceeding. After save, fires `submit-payout-claim` immediately without user needing to click again.
- **Wallet prompt in processing step**: For USDC / STAY / LP claims, shows "Approve the transaction(s) in your Particle wallet to continue."

### Added — InvestMarketplacePage

- **`appreciation_rate` from DB**: Property calculator reads `appreciation_rate` from `inv_properties` column (migration applied) instead of hardcoded 5.2%. Falls back to 5.2 if null.
- **`property_docs` download links**: Documents section shows clickable `<a href>` links for `property_docs` JSONB column. Legacy name-only `documents[]` still shown as plain text for backwards compatibility.
- **`BlockchainDot` on Recent Activity header**: Animated green ping added to "Recent Activity" card title to signal live on-chain data.
- **`AgentReferralLink` from `referral_code`**: Replaced wallet address logic with `useMyAffiliateProfile()` hook — referral URL is `hub.nfstay.com/invest?ref={referral_code}&property={id}`. Shows "Set up affiliate profile" link if no profile exists.

### Added — DB Migration

- `20260319_inv_appreciation_docs.sql`: Adds `appreciation_rate NUMERIC DEFAULT 5.2` and `property_docs JSONB DEFAULT '[]'` to `inv_properties`. Creates `inv-property-docs` storage bucket (public) with 3 RLS policies (authenticated read, admin insert, admin delete).

### Bank Transfer Flow — End-to-End Verification (2026-03-19)

All components confirmed deployed and wired:

| Step | What happens | Status |
|------|-------------|--------|
| User submits bank form | `save-bank-details` edge function saves to `user_bank_accounts` | ✅ deployed |
| `onSave()` fires | `submit-payout-claim` edge function: validates bank, calculates server-side from `inv_payouts`, UNIQUE(user_id, week_ref) guard, creates `payout_claims` row (status: pending), logs to `payout_audit_log` | ✅ deployed |
| Tuesday 05:00 AM UK | `inv-tuesday-payout-batch` n8n cron: registers Revolut counterparties, POSTs `/payment-drafts`, sets status → processing, WhatsApps Hugo | ✅ activated |
| Hugo approves | Revolut Business app Face ID — releases Faster Payments (GBP same day), SEPA (EUR next day), SWIFT (1-5 days) | Manual |
| Revolut fires webhook | `revolut-webhook` edge function: HMAC-SHA256 verified, `TRANSACTION_COMPLETED` → status = 'paid' + `paid_at`, WhatsApp to user | ✅ deployed |

**Known limitation — GBP hardcode:** `submit-payout-claim` is called with `currency: 'GBP'` hardcoded in the `bank_setup` step. Users who saved EUR bank details will have a currency mismatch. Affects non-GBP investors only. Fix: pass the currency from `BankDetailsForm` via `onSave(currency)` callback when needed.

### Commits

- `3d5d572` — fix: claiming flow — wallet priority, double withdrawRent, bank setup gate
- `37eac42` — fix: pre-select Bank Transfer in claim modal on open
- `1eafdb7` — fix: add bankAccount to ClaimModal destructuring (ReferenceError)

---

## [2026-03-19] — MILESTONE: Investment Module Fully Wired to Blockchain

### Summary
The investment module is now fully connected to real blockchain data. All 4 invest pages (Marketplace, Portfolio, Proposals, Payouts) read live data from BNB Chain smart contracts and The Graph subgraphs. No mock data remains. Legacy investor data (shares, votes, rent history) is visible without migration — the blockchain is the source of truth.

### Wallet & Auth
- **Particle MPC wallet auto-creation** at signup (silent, non-blocking)
- **Legacy wallet import** — admin grants time-limited permission, user pastes old wallet address
- **Wallet protection** — Particle SDK never overwrites a manually-set wallet
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
- **SamCart webhook** live — receives payments, creates orders, updates shareholdings
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

## [2026-03-19] — Particle Wallet Auto-Creation + Settings Payout UI

### Added
- **Automatic wallet creation at signup**: Particle MPC wallet created silently via `WalletProvisioner` in DashboardLayout. Uses `@particle-network/auth-core` directly (no React wrapper). Wallet created after OTP verification, retries on next login if failed.
- **Vite WASM support**: Custom `particleWasmPlugin` copies `thresh-sig` WASM to build output + serves it in dev. Added `vite-plugin-node-polyfills` for Buffer/crypto/stream polyfills.
- **Payout Address copy button**: Settings > Payout Settings shows wallet with green Copy button + "Copied" feedback.
- **Wallet retry for existing users**: `useWallet` hook auto-retries wallet creation for users who signed up before this feature.
- **WALLET_ARCHITECTURE.md**: Full documentation of wallet creation flow, MPC security model, recovery procedures, troubleshooting guide.

### Changed
- **Settings > Payout Settings**: Renamed "Wallet Address" to "Payout Address". Removed unused "Preferred Claim Method" radio buttons (not wired to DB). Removed "Your wallet is active..." subtitle.
- **Bank Details**: Updated payout schedule — GBP: "Payout every Tuesday, same-day clearing". EUR: "Payout every Tuesday, cleared within 10 working days".

### Fixed
- **Particle SDK crash**: `AuthCoreContextProvider` crashed the app at runtime due to WASM loading issues in Vite. Fixed by using `auth-core` API directly (`particleAuth.init()` + `connect()`), bypassing the React wrapper entirely.
- **Particle overlay blocking clicks**: SDK injected invisible modal overlays with high z-index. Fixed with targeted CSS (`pointer-events: none` on `pn-modal`/`pn-auth` classes only).
- **Wallet creation killed by page navigation**: `VerifyOtp.tsx` did `window.location.href` 1.5s after OTP, destroying the React component mid-wallet-creation. Moved wallet creation to `WalletProvisioner` in DashboardLayout which persists across navigation.

### Technical
- Particle SDK lazy-loaded via dynamic `import()` — 1MB separate chunk, not in main bundle
- JWT auth: Edge Function signs RS256 JWT with user UUID as `sub`, Particle verifies via JWKS endpoint
- MPC wallet: private key split into 2 shares (Particle server + user browser), neither can sign alone
- Recovery: user logs back in → same UUID → same JWT `sub` → Particle restores wallet

## [2026-03-17] — NFStay Module + Google Maps + n8n Cleanup

### Added
- **Booking Site page** (#14): Split-panel editor at `/dashboard/booking-site` — operators customize brand name, colors, logo, hero content with live preview. Desktop/mobile toggle. Mockup only, no backend.
- **Google Maps on Deals page** (#15): Replaced Leaflet/CARTO map with Google Maps. Smooth animated zoom on card hover, green circle markers, info popup with deal details.
- **NFStay documentation infrastructure** (#12): 18 documentation files in `docs/nfstay/` — agent instructions, architecture, database schema (11 tables), domain model, features, integrations, webhooks, white-label, routes, acceptance scenarios, boundaries, shared infrastructure, environment vars, decisions, handoff, changelog, diagnosis runbook.
- **NFStay execution plan** (#13): 6-phase build roadmap from zero to production. Tajul authority model — Tajul approves everything, Hugo only for final production merge.
- **Dev commands**: `npm run check` (typecheck + lint + test), `npm run clean` (clear build cache).
- **n8n workflow protection protocol** (#16): Full inventory of 16 protected workflows with IDs and webhook paths. 6 protection rules for NFStay agents.

### Fixed
- **n8n webhook collisions**: Deactivated "Test Echo" workflow that was stealing production webhook calls from 3 live workflows. Deactivated duplicate "Landlord Replied" and "New Message" workflows (kept newer copies).

### Docs
- Added `VITE_GOOGLE_MAPS_API_KEY` to Vercel env vars and `docs/STACK.md`
- Updated `docs/AGENT_INSTRUCTIONS.md` — added NFStay module scoping, dev commands, clickable test URL requirement
- Updated `docs/nfstay/BOUNDARIES.md` — full n8n workflow inventory and protection rules
- Updated `docs/nfstay/SHARED_INFRASTRUCTURE.md` — credential protection, cleanup log
- Closed stale PR #10

## [2026-03-16] — Landlord Magic Link + University Fixes

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

## [2026-03-15] — Inbox UI + Production Safety

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
- docs/runbooks/DEPLOY_SAFETY.md — env checklist, rollback, smoke test
- docs/runbooks/UPTIME_MONITORING.md — UptimeRobot/BetterStack setup
- CLAUDE.md (root) — auto-loaded by Claude Code
- docs/AGENT_INSTRUCTIONS.md — XML structure, 17 hard rules, personalities
- src/pages/admin/CLAUDE.md + src/integrations/supabase/CLAUDE.md — local guardrails

## [2026-03-15] — Full Platform Build Session

### Added
- **GHL Payments**: 3 products (£67/mo, £997 LT, £397/yr), funnel integration, InquiryPanel checkout
- **Favourites**: Supabase `user_favourites` table, localStorage fallback, FavouritesPage fetches real data
- **University Progress**: Supabase `user_progress` table, syncs steps/lessons/XP to DB
- **CRM Pipeline**: Supabase-backed `crm_deals`, drag-drop stage changes, archive/unarchive, expandable cards
- **CRM Toggle**: Add/Remove from CRM on PropertyCard and DealDetail with Supabase persistence
- **Admin Users**: Full CRUD — tier filter, suspend toggle, delete with confirmation, pagination
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
- CRM mock data seeding removed — starts clean
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
