# CRM Rename — what was renamed, what wasn't

> 2026-04-27, PR 45. Status: shipped to main.
>
> Hugo's call: rebrand the SMSV2 module to "CRM" because that's what it
> actually is — and gate it behind a proper agent login so a tenant
> who happens to be signed in can't just visit `/smsv2/settings` and
> read everyone's call recordings.
>
> This doc captures what changed, what didn't, and why.

## TL;DR

| Surface | Before | After |
|---|---|---|
| User URL | `/smsv2/inbox` | `/crm/inbox` (old still redirects) |
| Agent login | `/signin` (shared with everyone) | `/crm/login` (purpose-built) |
| Access guard | `ProtectedRoute` (any signed-in user) | `CrmGuard` (workspace_role ∈ admin/agent/viewer) |
| Admin tab bar | Marketplace · JV · Booking · SMS | Marketplace · JV · Booking · SMS · **CRM** |
| Sidebar label | "Workspace v2" | "CRM" |
| **DB tables** | `wk_*` | **unchanged** |
| **Edge functions** | `wk-*` | **unchanged** |
| **Source folder** | `src/features/smsv2/` | **unchanged** |

## Why we didn't rename internals

The cost-benefit was lopsided:

| Internal rename | Cost | User-visible benefit |
|---|---|---|
| Folder `src/features/smsv2/` → `crm/` | ~200 import paths, ~2 hours, regression risk in shared types | None |
| DB tables `wk_*` → `crm_*` | ~40 tables, ~80 RLS policies, every realtime channel filter, full migration day, breaks edge fns until cutover | None |
| Edge fns `wk-*` → `crm-*` | Twilio Voice + transcription + status webhooks all point at `wk-*` URLs in Twilio Console — half-day cutover with active calls breaking during the rename | None |

We just spent four days getting recording, inbound SMS, and the live
coach stable. Renaming the engine for cosmetic reasons would invite
regressions for zero customer-facing value.

`wk` stands for **"workwave"** — the codename this module shipped under
during its first pass. Treat it the same way Tesla treats internal
project names like "Whitestar" or "Bluestar": engineering-only, customers
don't see it, and renaming it is purely a tax we'd pay for nothing.

If in 6 months we want to do the internal rename properly with full test
coverage, this runbook is the starting point. Not today.

## What changed (files)

### Routing — `src/App.tsx`
- Added `<Route path="/crm/login" element={<CrmLoginPage />} />` (public, no guard).
- Added `<Route path="/crm" element={<Smsv2Layout />}>` block with all the same child routes that used to live under `/smsv2`. Index now defaults to `inbox` (was `dashboard`) — agents land on inbox, admins navigate to dashboard from the sidebar.
- Added `<Route path="/smsv2/*" element={<Navigate to="/crm" replace />} />` so existing bookmarks still work.

### Guard — `src/features/smsv2/components/CrmGuard.tsx` (new)
- Reads `profiles.workspace_role` for the signed-in user.
- Allows: `admin`, `agent`, `viewer`. Hardcoded admin emails (`useAuth.isAdmin`) always pass even with NULL `workspace_role`.
- Redirects unauthenticated users to `/crm/login` with `state.from = path` so they bounce back after sign-in.
- Renders an "Access required" wall for signed-in non-CRM users.

### Login — `src/features/smsv2/pages/CrmLoginPage.tsx` (new)
- Plain email + password form, no social login, no signup link.
- Calls `supabase.auth.signInWithPassword`.
- On success: navigates to `state.from` or `/crm/inbox`.

### Layout — `src/features/smsv2/layout/Smsv2Layout.tsx`
- Replaced `<ProtectedRoute>` with `<CrmGuard>`.
- Header label: "Workspace · SANDBOX v2" → "CRM".

### Sidebar — `src/features/smsv2/layout/Smsv2Sidebar.tsx`
- All `path: '/smsv2/...'` → `'/crm/...'`.
- Heading: "Workspace v2" → "CRM".
- Footer: "Sandbox build / Production /sms untouched" → "NFSTAY CRM".

### Admin tab bar — `src/layouts/AdminLayout.tsx`
- Added a **CRM** link next to **SMS**, both inside the workspace
  quick-switch row at the top of every admin page. Both stay visible
  — SMS is the legacy module, CRM is the new one.

### In-component links + tests
Bulk-replaced hardcoded `/smsv2/<thing>` strings used in `<Link to>`,
`navigate()`, comments, and `MemoryRouter initialEntries` across:
- `pages/PastCallScreen.tsx`, `pages/ContactsPage.tsx`, `pages/CallsPage.tsx`, `pages/ContactDetailPage.tsx`, `pages/SettingsPage.tsx`
- `components/calls/CallTranscriptModal.tsx`
- `components/contacts/BulkUploadModal.tsx`
- `components/followups/FollowupBanner.tsx`
- `__tests__/LiveTranscriptPane.test.tsx`, `__tests__/useDemoMode.test.tsx`

## How to onboard a new agent

1. Admin opens **`https://hub.nfstay.com/crm/settings`** → **Agents** tab.
2. Click **Invite agent**, fill name + email + password (admin types it; nothing is emailed).
3. Pick role: `agent` for normal users, `viewer` for read-only.
4. Set daily spend limit (£).
5. Click **Send** — calls `wk-create-agent` edge fn, which creates the auth user, upserts the profile with `workspace_role`, seeds `wk_voice_agent_limits`.
6. Share with the agent (Slack/WhatsApp/SMS):
   - URL: **`https://hub.nfstay.com/crm/login`**
   - Email + password (the ones you just typed).
7. Agent logs in → `CrmGuard` checks `workspace_role` → lands on `/crm/inbox`.

If the agent's `workspace_role` is missing or wrong, the guard shows the
"CRM access required" wall. Fix it from `/crm/settings` → Agents (or
manually patch `profiles.workspace_role` in Supabase Studio).

## What if I really want to rename the internals later

When that day comes, here's the minimum-risk sequence:

1. **DB tables**: `ALTER TABLE wk_* RENAME TO crm_*` for all 40 tables. New migration. Update every edge fn import. Update every RLS policy reference. Update every realtime channel filter. Plan a maintenance window — active calls will fail during cutover.
2. **Edge functions**: `cp -r wk-foo crm-foo`, deploy `crm-foo`, point Twilio Console webhook URLs at `crm-foo`, wait 24h with both running, delete `wk-foo`. Repeat for ~25 edge fns.
3. **Source folder**: `git mv src/features/smsv2 src/features/crm`, fix every import, run typecheck + tests + manual smoke. Single PR, blast radius HIGH.

Estimated total: 2–3 dev days with careful testing. Customer-visible
benefit: zero. Hugo's directive 2026-04-27: not now.
