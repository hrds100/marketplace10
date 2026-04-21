# Changelog

## [Unreleased]

## [2026-04-09a] - WhatsApp Cloud API + Template Management + Documentation

### Added
- **WhatsApp Cloud API integration** (Meta direct, not Twilio):
  - `wa-webhook-incoming` edge function: receives WhatsApp messages via Meta webhook. GET verification + POST message/status handling. HMAC-SHA256 signature validation.
  - `wa-send` edge function: sends WhatsApp text + template messages via Meta Graph API v25.0.
  - `wa-templates` edge function: CRUD for WhatsApp message templates via Meta API.
  - Meta App "Agencin" (ID: 1407293420420768) configured with WhatsApp Business Platform.
  - Webhook subscription registered for messages field.
  - Secrets set: META_WHATSAPP_TOKEN, META_APP_SECRET, META_VERIFY_TOKEN.
  - WhatsApp test number (+1 555 163 6030) seeded in sms_numbers.

- **WhatsApp Template Management UI** at `/sms/templates`:
  - Two tabs: SMS Templates + WhatsApp Templates
  - 20 built-in starter templates (property-focused): 12 UTILITY, 6 MARKETING, 2 AUTHENTICATION
  - Starter picker with category filter pills (green/orange/grey)
  - Template creation form: name, category, language, body with variable insertion, preview, char count
  - Template list grouped by category with status badges (APPROVED/PENDING/REJECTED)
  - Delete protection for Meta's built-in `hello_world` template

- **Comprehensive documentation** at `docs/sms/`:
  - `README.md` — module overview
  - `ARCHITECTURE.md` — database tables, edge functions, real-time flow, node types
  - `STATUS.md` — what's done, what's left, credentials, live stats
  - `AGENT_INSTRUCTIONS.md` — hotkey, rules, agent routing, key files

### Fixed
- Numbers page empty — `useNumbers` hook was querying non-existent `message_count` column
- WhatsApp template delete returns 200 with error info instead of crashing
- OpenAI model list updated to 2026 (GPT-5.4 family with fallback)
- Vercel trailing slash 404 on `/sms/` routes — added `trailingSlash: false`
- Flow editor crash — `leadCounts` prop not destructured in FlowContext
- SMS replies no longer use markdown formatting (explicit plain-text rules in AI prompt)

### Pending
- Meta App Review approval (submitted, in review)
- Record 2 videos for App Review (sending message + creating template)
- Add real phone number for WhatsApp after approval
- Meta OAuth flow for multi-account "Connect WhatsApp" button

## [2026-04-08a] - WhatsApp Channel Support

### Added
- **WhatsApp as a second channel** alongside SMS, using the same Twilio account
- **Database:** `channel` column ('sms' | 'whatsapp') on sms_numbers, sms_messages, sms_conversations. Defaults to 'sms', zero breaking changes.
- **sms-webhook-incoming:** detects `whatsapp:` prefix on From/To, strips for clean E.164 storage, filters number lookup by channel
- **sms-send:** reads channel from number row, applies `whatsapp:` prefix to Twilio API when sending on WhatsApp
- **sms-bulk-send:** same prefix logic per-number for campaigns
- **sms-automation-run:** passes number_id through so automated replies use the correct channel
- **ConversationRow:** green "W" badge on avatar for WhatsApp conversations
- **MessageThread:** "via WhatsApp" / "via SMS" badge in thread header
- **NumbersList:** channel badge (green WhatsApp / grey SMS) per number card
- **NumberForm:** SMS/WhatsApp channel toggle when adding a number
- **Types + hooks:** channel field on all relevant types, selected in all queries

### How to use WhatsApp
1. Enable WhatsApp Sandbox in Twilio console (for testing)
2. Add a WhatsApp number in /sms/numbers (select "WhatsApp" channel)
3. WhatsApp messages appear with green "W" badge
4. Replies from inbox automatically use the correct channel

### Hugo action needed
- Register +447380308316 for WhatsApp in Twilio console (Settings → WhatsApp Senders)
- For production: complete Meta Business Verification (~5 business days)

## [2026-04-07i] - Turn-Based Automation Engine

### Changed (BREAKING — complete rewrite of automation engine)
- **Turn-based execution** — one reply per user message, never batches. Bot advances one node per turn, saves position, waits for next message.
- **5-second debounce** — when user sends multiple messages quickly, bot waits 5s, reads all buffered messages, sends one intelligent reply.
- **Per-conversation toggle** — automation only runs if explicitly enabled for that conversation. Bot icon + Switch in thread header.
- **Manual reply detection** — if a human replies manually while automation is active, bot auto-suspends (doesn't fight the human).
- **Flow completion** — when STOP node reached, status=completed, no more auto-replies even if user keeps messaging.
- **Silent node passthrough** — LABEL, MOVE_STAGE, WEBHOOK nodes execute without sending messages, then advance to next reply node.

### Added
- `sms_automation_state` table — tracks current position in flow per conversation (current_node_id, step_number, status, context_data)
- `sms_conversations.automation_id` + `automation_enabled` columns — per-conversation automation control
- `useConversationAutomation` hook — toggle, resume, trigger automation per conversation
- MessageThread header: Bot icon + Switch toggle + automation name display
- ContactInfoPanel: automation status section (Active/Paused/Suspended/Completed) with Pause/Resume buttons

### How to use
1. Create an automation flow in /sms/automations
2. Go to /sms/inbox, open a conversation
3. Toggle the AI switch ON in the thread header → pick an automation
4. Next time the contact messages, bot replies following the flow
5. Toggle OFF to pause. Reply manually to auto-suspend.

## [2026-04-07h] - Smart Pathways, AI Flow Builder, Lead Tracking

### Added
- **Smart pathway routing** — AI evaluates which edge to follow based on user's actual response. Uses inline classifier with edge labels + descriptions in the prompt. Returns chosen_pathway + confidence score. Conversation history (last 10 messages) passed as context.
- **Pause/resume** — when automation is waiting for a user reply, stores current_node_id. On next inbound message, resumes from that node instead of starting fresh.
- **AI Flow Builder** — "AI Flow Builder" button on the flow canvas (Sparkles icon). Describe what you want in plain English → GPT-4o generates the complete flow with nodes, edges, pathways, prompts, and global prompt. Validates JSON, replaces flow, auto-saves.
- **Lead tracking per automation** — "Leads" column on automations list shows unique contact count per automation.
- **Lead tracking per node** — green badge on each flow node showing how many contacts reached it. Click → Popover with contact names + phone numbers.
- **Campaign-linked automations** — `sms_campaigns.automation_id` links campaigns to specific automations. Inbound replies from campaign contacts route to that automation instead of general automations.
- **Model selector** — 5 OpenAI models available per node: GPT-4o Mini, GPT-4o, GPT-4.1 Mini, GPT-4.1, GPT-3.5 Turbo.
- **Integration status fix** — Settings > Integrations now shows real connected number count + actual phone numbers from DB (was hardcoded).

### How Smart Pathways Work
1. Hugo creates flow with branching edges (e.g., "User interested" / "User declined")
2. Edge labels + descriptions are included in the AI prompt
3. AI generates response AND classifies which pathway matches the user's message
4. Automation follows the chosen edge to the next node
5. If confidence < 0.5, logs warning but still follows (no blocking)

### Database Changes
- `sms_automation_runs.current_node_id` — tracks conversation position for resume
- `sms_campaigns.automation_id` — links campaigns to automations

## [2026-04-07g] - SMS Phase 4 — Bulk Campaigns

### Added
- **sms-bulk-send edge function** — processes campaigns: loads recipients, checks opt-outs (skips opted-out contacts), rate-limits at 1 msg/sec per number, round-robin number rotation, appends opt-out footer when enabled. Per-recipient error handling (failures don't stop campaign). Updates campaign counts in real-time.
- **useCampaigns hook** — CRUD for sms_campaigns + sms_campaign_recipients. createCampaign inserts campaign + recipients. launchCampaign invokes sms-bulk-send.
- **Campaigns page wired to real data** — wizard fetches real contacts/labels/stages from DB, shows live matching count, creates campaign in Supabase, optionally sends immediately.

### Deployed
- sms-bulk-send deployed and registered in config.toml

## [2026-04-07f] - SMS Phase 3 — AI Automation Engine

### Added
- **Automations wired to Supabase** — flow editor saves/loads nodes, edges, global prompt to sms_automations.flow_json. Auto-save with 500ms debounce + save status indicator.
- **sms-ai-respond edge function** — calls OpenAI Chat Completions (gpt-4o-mini, 300 max tokens) with combined global prompt + node prompt. OPENAI_API_KEY set in Supabase secrets.
- **sms-automation-run edge function** — flow execution engine:
  - Loads all active automations, checks triggers (new_message / keyword / time_based)
  - 60-second loop guard per automation + conversation (prevents infinite loops)
  - Walks the flow graph node by node (max 20 steps safety limit)
  - Executes: DEFAULT (AI reply via OpenAI + Twilio), STOP_CONVERSATION, FOLLOW_UP (scheduled tasks), TRANSFER, LABEL, MOVE_STAGE, WEBHOOK
  - Logs every step to sms_automation_runs + sms_automation_step_runs
  - Updates automation stats (last_run_at, run_count)
- **sms-webhook-incoming updated** — fires sms-automation-run after storing inbound message (fire-and-forget, non-blocking, non-fatal)
- **useAutomations hook** — CRUD for sms_automations (create, toggle, delete)
- **useAutomationFlow hook** — load + save flow_json with debounced auto-save

### How AI Automation Works
1. Hugo creates a flow with nodes (AI Response, Follow Up, Stop, etc.) and edges (pathways with labels)
2. Someone texts +447380308316
3. Webhook receives → stores message → fires automation runner
4. Runner matches active automation triggers → walks flow graph → executes nodes
5. DEFAULT node calls OpenAI for AI reply → sends via Twilio → person receives AI response

### Deployed
- sms-ai-respond, sms-automation-run deployed
- sms-webhook-incoming redeployed with automation trigger
- All functions registered in supabase/config.toml

### Not Yet Done
- Phase 4: Bulk campaigns (sms-bulk-send edge function)
- Scheduled task processor (sms-process-scheduled for FOLLOW_UP delays)

## [2026-04-07e] - SMS All Pages Wired to Real Data + Editable Contacts

### Added
- **Contact editing from inbox** — edit name (inline in thread header + info panel), add/remove labels (checkbox popover), change pipeline stage (dropdown), edit notes — all persist to Supabase immediately
- **10 new hooks**: useUpdateContact, useContactLabels, useLabels, useStages, useContacts, usePipeline, useTemplates, useNumbers, useSettings, useDashboardStats
- **6 pages wired to real Supabase data**:
  - Contacts: real CRUD + CSV bulk import to Supabase
  - Pipeline: drag-and-drop updates pipeline_stage_id in Supabase
  - Templates: real CRUD (create/edit/delete)
  - Numbers: real data (shows +447380308316), add/remove/set default
  - Settings: labels/stages/quick-replies all from DB with full CRUD
  - Dashboard: real message counts, delivery rate, daily chart from sms_messages

### Still Mock Data
- Automations: flow save/load (Phase 3 — needs sms_automations wiring)
- Campaigns: bulk send (Phase 4 — needs sms-bulk-send edge function)
- Settings > Team tab (mock team members)
- Settings > Integrations tab (shows "Connected" status, not dynamic)

## [2026-04-07d] - SMS Phase 2 — Backend Live, Real Messages

### Added
- **17 Supabase tables** created and verified (`sms_*` prefix, all with RLS)
- **3 edge functions** deployed:
  - `sms-webhook-incoming` — receives Twilio webhooks, validates signature (Web Crypto HMAC-SHA1), handles opt-out keywords (STOP/UNSUBSCRIBE), creates contacts, stores messages, upserts conversations, idempotent via UNIQUE twilio_sid
  - `sms-send` — sends outbound SMS via Twilio API, checks opt-out, stores message, updates conversation, configures status callback
  - `sms-webhook-status` — receives Twilio delivery status callbacks (sent/delivered/failed/undelivered), updates sms_messages
- **Twilio secrets** set in Supabase (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
- **Twilio webhook** configured: +447380308316 → sms-webhook-incoming
- **4 React hooks** for real data:
  - `useConversations` — fetches from sms_conversations + contacts + labels, real-time subscription
  - `useMessages` — fetches messages by contact with real-time INSERT subscription
  - `useSendMessage` — calls sms-send edge function via supabase.functions.invoke
  - `useMarkRead` — clears unread_count when conversation opened
- **Inbox page** fully wired to real Supabase data (no more mock data for conversations/messages)
- **Real-time**: new messages appear instantly without page refresh
- **Default seeds**: 5 pipeline stages, 6 labels, 5 quick replies, Hugo's Twilio number

### Verified
- Inbound SMS from Hugo's phone (+447863992555) → stored in sms_messages as "Hello test"
- Contact auto-created, conversation auto-created with unread_count: 1
- All 17 tables confirmed via psql query
- All 3 edge functions responding (deployed + verified)
- Build + TypeScript clean

### Not Changed
- Templates, quick replies, labels still use mock data in UI (Phase 3)
- Other 9 pages (pipeline, contacts, automations, etc.) still use mock data
- No marketplace features touched
- No frozen zones touched

## [2026-04-07c] - SMS Inbox Module — Phase 1 UI Complete

### Added
- **SMS Inbox module** at `/sms/*` — 10 fully interactive pages with mock data
  - `/sms/inbox` — WhatsApp-style split-panel conversation view (resizable panels, message bubbles, compose box with templates + quick replies, contact info sheet)
  - `/sms/pipeline` — Kanban board with @dnd-kit drag-and-drop across pipeline stages
  - `/sms/contacts` — Table with search, filters, pagination, add/edit dialogs, CSV import (papaparse)
  - `/sms/automations` — Flow list with active/inactive toggles
  - `/sms/automations/:id` — React Flow editor rebuilt with agencfront patterns: one universal NodeWrapper, custom edges with labels + conditions, edge editing sidebar, add node panel, edit node popup, global prompt
  - `/sms/campaigns` — Campaign list + 7-step creation wizard
  - `/sms/templates` — Card grid with create/edit, variable insertion ({name}, {phone}), character count
  - `/sms/numbers` — Phone number management with default selection
  - `/sms/settings` — 7-tab settings (labels, stages, quick replies, team, integrations, opt-out, notifications)
  - `/sms/dashboard` — Stat cards + recharts line/pie charts
- **SmsLayout + SmsSidebar** — isolated layout with own sidebar (9 nav items), modeled on NfsOperatorLayout
- **Admin workspace tab** "SMS" added to AdminLayout for easy access
- **66 new files** in `src/features/sms/` — fully isolated, zero imports from other features
- **New packages:** @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, papaparse
- **Vercel rewrite** for `/sms/:path*` → app.html (SPA routing)
- **Full plan doc** at `docs/NFSTAY_INBOX_PLAN.md` (v2, audit-hardened)

### Flow Editor Architecture (agencfront-style)
- 7 node types: DEFAULT, STOP_CONVERSATION, FOLLOW_UP, TRANSFER, LABEL, MOVE_STAGE, WEBHOOK
- FlowContext (React Context) for all state + CRUD
- Custom edges with inline labels + pathway conditions (AND/OR, CONTAIN/EQUALS operators)
- Edge editing sidebar, add node panel, edit node popup (Dialog), global prompt popup
- One universal NodeWrapper renders all node types (replaced 9 separate files)

### Modified (existing files)
- `src/App.tsx` — added `/sms/*` route block (11 routes)
- `src/layouts/AdminLayout.tsx` — added "SMS" tab to workspace switcher

### Not Changed
- No marketplace features modified
- No Supabase tables created yet (Phase 1 is UI only)
- No edge functions deployed
- No frozen zones touched

### What's Next (Phase 2)
- Wire Twilio API (send/receive SMS via webhooks)
- Create `sms_*` Supabase tables with RLS
- Real-time message subscriptions
- Requires: Hugo's Twilio credentials (Account SID, Auth Token, phone numbers)

## [2026-04-07a] - Payout Claim Flow Restored (revolut-pay + revolut-token-refresh)

### Fixed
- **`revolut-pay` redeployed:** Function was missing from Supabase — last known good deploy was before 2026-04-07. Caused CORS preflight failure ("Failed to send a request to the Edge Function") when admin clicked "Send £X.XX" on `/admin/invest/payouts`. No code change — deploy only.
- **`revolut-token-refresh` redeployed:** Function was missing from Supabase (last deployed 2026-03-18, too old to serve). `revolut-pay` calls this internally to get a fresh Revolut access token. When it was absent, `revolut-pay` received no token and returned HTTP 500 "Could not get Revolut token". No code change — deploy only.

### Root Cause
Both functions were undeployed. Neither had been redeployed after a Supabase project-level reset or gap in the deploy history. The fix was two `./scripts/deploy-function.sh` calls. All code, credentials, and RLS policies were correct throughout.

### Verified
- Token refresh confirmed live: `revolut-token-refresh` returns valid `access_token` from Revolut Business API.
- `revolut-pay` CORS preflight now returns 200. POST returns success.
- Payout claim status updates to `processing` in `payout_claims` table.
- Revolut payment draft created in Revolut Business app (requires Face ID approval there).

### Not Changed (confirmed clean)
- No code changes to any frozen zone file.
- Schema, foreign keys, RLS policies, and env vars were all correct.
- n8n is not involved in this flow.

## [2026-04-04g] - Eliminate n8n from OTP + Inquiry Flow

### Removed
- **n8n eliminated from OTP flow (PR #251):** New `send-otp` edge function calls GHL directly (workflow `baabc69a`). New `verify-otp` edge function handles code acceptance natively. No more n8n middleman.
- **n8n eliminated from inquiry WhatsApp reply (PR #251):** `process-inquiry` now calls GHL conversations API directly for tenant auto-reply. Fires for ALL inquiry channels (not just WhatsApp).
- **Redundant n8n signup-welcome webhook removed** from SignUp.tsx — welcome email already sent natively via Resend.

### Fixed
- **Email inquiry template updated:** Tenant confirmation email now uses Hugo's approved copy: "Hello, thanks for contacting nfstay. We've passed your enquiry for [property] to the Landlord or Agent..."
- **Enquiry messages include property name:** WhatsApp + email replies now say "your enquiry for Property #1001 - Name".
- **GHL cold outreach strips ref number:** Workflow `67250bfa` property reference shows clean name (no `#XXXX`, no `()`).
- **Empty `()` stripped from property names** in Quick List publish and all outgoing messages.
- **GHL OTP workflow ID corrected:** Was truncated (`baabc69a`), now full UUID (`baabc69a-a00f-412a-863e-7189ae025091`).
- **Phone normalization:** Fixed +4407... → +447... (strip leading 0 after country code).
- **All 10 edge functions redeployed** with `--no-verify-jwt` to prevent 401 errors.
- **Dead n8n code removed:** `submitInquiry` and `sendSignupWelcome` deleted from `n8n.ts`. File reorganized with clear NATIVE vs STILL ON N8N sections.

### Fixed (earlier in session)
- **Admin wallet column (PR #245):** Shows crypto wallet in admin users table.
- **WhatsApp gate OTP enforcement (PR #246):** Forces real OTP verification instead of accepting any phone number.
- **Email backfill (PR #247):** Emails now auto-saved on all signup paths + existing users backfilled.
- **Auto wallet creation (PR #248):** Wallets auto-create silently on dashboard load.
- **Hard delete FK fix (PR #249):** Added 10 missing FK table cleanups to bulk delete.

## [2026-04-04f] - WhatsApp Gate, Email Backfill, Auto Wallets & Admin Enhancements

### Added
- **Admin wallet column (PR #245):** Admin users table now shows each user's crypto wallet address (truncated with full address on hover).
- **Auto wallet creation (PR #248):** Wallets now auto-create silently 5 seconds after dashboard load instead of waiting for users to click a button. One attempt per session, fails silently.

### Fixed
- **WhatsApp gate OTP enforcement (PR #246):** The dashboard WhatsApp gate previously accepted any phone number without verification. Now redirects to the real OTP page so users must enter a code sent to their WhatsApp. Also resets `whatsapp_verified` for users who have no phone but were previously marked verified.
- **Email backfill on all signup paths (PR #247):** Fixed 4 places where email was missing after signup: database trigger (`handle_new_user`), `SignUp.tsx`, `VerifyOtp.tsx`, and `ProtectedRoute` orphan repair. Migration backfilled all existing users from `auth.users`.

### In Progress
- **Bulk hard-delete FK constraints:** Identified missing FK table cleanups in the `hard-delete-user` edge function (investment tables, pipeline, bank accounts). Fix assigned to Dimitri, PR pending.

## [2026-04-04a] - Social Login Existing User Dead-End Fix

### Fixed
- **Social sign-in dead-end for existing users:** When an existing email/password user tried social login (Google/Apple/X/Facebook) for the first time, `ParticleAuthCallback.tsx` would show "Could not create account: User already registered" with no way forward. Now redirects to `/signin?email=...` with a toast explaining they already have an account.
- **Callback error page escape routes:** Error state on `/auth/particle` now shows both "Sign in" and "Sign up" links instead of only "Sign up".
- **Empty identities check:** Added detection for Supabase's silent "already registered" response (user returned with no identities) to prevent a second dead-end path.

### Added
- Playwright test `e2e/social-auth-existing-user.spec.ts` covering 5 callback/error-handling scenarios.

## [2026-04-03e] - Agent Roster + Handoff Protocol

### Added
- Agent roster in `docs/TAKEOVER.md` Section 9: four fixed agent IDs (NF-ALPHA, NF-BRAVO, NF-CHARLIE, NF-DELTA) with scoped branches and responsibilities.
- Mandatory output header format (AGENT, BRANCH, COMMIT, PR, CI, PREVIEW, FILES CHANGED, PROVEN, UNPROVEN) for every agent report.
- Handoff rule: Hugo must paste the AGENT line back to the Co-Pilot for routing. No ID = rejected.
- AGENT IDENTITY RULE added to `docs/AGENT_INSTRUCTIONS.md` and `docs/COPILOT_PROMPT.md` pointing to the roster.

## [2026-04-03d] - Admin Notifications, Settings & University Seed

### Added
- **Notification toggles (22 types):** Admin Settings now loads all notification types from `notification_settings` table, grouped by category (General, Deals, Affiliate, Investment, nfstay App). Each type has independent Bell and Email toggles with optimistic updates.
- **Admin email recipients field:** visible in Settings, pre-filled with hugo@nfstay.com, chris@nfstay.com, hello@nfstay.com.
- **University seed button:** AdminLessons and AdminModules now show a "Seed from template" button when empty, which populates from `universityData.ts`.
- **Migration:** `20260403_fix_ai_settings_and_notification_settings.sql` creates `notification_settings` table, seeds 22 event types, and ensures `ai_settings` RLS policies exist for admin.
- **Playwright test:** `e2e/admin-notifications-settings.spec.ts` covers settings page, notification toggles, university seed, and notifications list.

### Fixed
- **AI settings RLS:** Added explicit admin SELECT/UPDATE/INSERT policies on `ai_settings` table so prompts are visible to admin users.
- **Admin notifications query:** AdminNotifications.tsx now fetches both user-specific and admin-wide (user_id IS NULL) notifications.
- **hello@nfstay.com:** Added to default ADMIN_EMAILS in `send-email` edge function.

## [2026-04-03c] - Admin Deals Grouped View + Inquiry Pipeline Improvements

### Added
- Admin Deals page: grouped-by-landlord view with collapsible headers showing name, email, phone, and property count. Toggle between grouped and flat list.
- `ghl-enroll` edge function: error logging at all key failure points (phone normalization, contact search, contact creation, workflow enrollment, and success).
- `process-inquiry` edge function: admin bell notification inserted after every new inquiry (non-blocking).
- `EmailInquiryModal`: differentiated error messages for expired session (401), property not found (404), and generic failures. Added debug logging and `data-testid` for Playwright.
- Playwright test: `e2e/admin-deals-grouped.spec.ts` covering tabs, grouped toggle, and outreach page load.

## [2026-04-03b] - List-a-Deal Optional Fields + Airbnb Pricing Diagnostics

### Fixed
- Deposit and profit fields are no longer forced as mandatory on the list-a-deal form. Only city, postcode, type, bedrooms, and rent are truly required.
- Contact email now pre-fills correctly from profile email or auth email, even when the user has no WhatsApp in their profile.
- Airbnb pricing webhook errors are now logged to console instead of being silently swallowed.

### Changed
- Pricing webhook timeout increased from 15s to 25s (applies to both ListADealPage and AdminQuickList).
- Analysing phase copy updated to "Analysing similar listings on Airbnb".
- Reveal phase copy updated to "This property could generate approximately:".
- Fallback phase copy clarifies that revenue estimation is temporarily unavailable.

## [2026-04-03a] - Visibility Gate + Takeover Continuity Doc

### Added
- **Visibility gate** in COPILOT_PROMPT.md and AGENT_INSTRUCTIONS.md: local-only work is not considered done. Every task must end with branch, commit, PR link, CI status, preview URL, and files changed.
- **Co-Pilot review gate**: Claude's claim is not the source of truth. GitHub is. No PR merges without Co-Pilot audit of GitHub reality.
- **Takeover doc** (`docs/TAKEOVER.md`): canonical continuity file for any new chat or agent to resume the repo quickly. Covers project snapshot, production truth, active rules, critical flows, known issues, branch map, recent decisions, environment, and exact takeover procedure.
- **Takeover doc rule** in both master docs: takeover doc must be updated when meaningful changes affect continuity.

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
