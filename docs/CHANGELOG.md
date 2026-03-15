# Changelog

## [Unreleased]

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
