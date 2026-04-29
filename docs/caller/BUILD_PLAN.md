# Caller — Build Plan

Six phases. Each phase ships when its tests pass and Hugo signs off in `LOG.md`. No phase starts until the previous one is signed off.

---

## Phase 1 — Foundation

**Goal:** establish `src/features/caller/` and mount it at `/caller/*` with stub pages.

**Scope**
- Create the `caller/` folder structure (`pages/`, `layout/`, `components/`, `hooks/`, `lib/`, `store/`, `types/`, `__tests__/`).
- Create `CallerLayout.tsx` (sidebar, top bar, guard for workspace role).
- Create stub pages for every route (DialerPage, InboxPage, ContactsPage, PipelinesPage, CallsPage, SettingsPage, DashboardPage, LoginPage). Each returns a placeholder.
- Add `/caller/*` route to `src/App.tsx`. Do not touch `/crm/*`.
- Define types in `caller/types/index.ts` — split DB / UI / service shapes.
- Copy the Twilio Voice wrapper reference from `core/integrations/twilio-voice.ts` (no changes; just confirm it is reachable).
- Add `CallerGuard.tsx` (workspace_role check).

**Done when**
- Visiting `/caller/dialer` renders the Caller layout with a placeholder body.
- Visiting `/crm/dialer` still renders the old smsv2 layout — unchanged.
- `npx tsc --noEmit` clean. `npm run build` passes.

---

## Phase 2 — Dialer (pre-call)

**Goal:** the agent can sign in, see the campaign, see the queue, and click Start.

**Scope**
- Build `components/dialer/PreCallRoom/`: CampaignHero, QueuePreview, PacingControl.
- Build hooks: `useCampaigns`, `useMyDialerQueue`, `useDialerSession`.
- Build `store/dialerSessionProvider.tsx` (session state: paused, pacing, dialedThisSession set).
- Wire `DialerPage` to mount the PreCallRoom and the session provider.
- The Start button is wired and calls `startCallOrchestration` → `wk-calls-create`. The call is initiated on Twilio.
- Show errors via toast (spend gate, kill switch, Twilio errors mapped via `twilioErrorMap`).

**Done when**
- Agent can click Start and the Twilio device dials a real number.
- The queue preview shows the next five real leads from `wk_dialer_queue`.
- Pacing control is wired; pause and resume work.
- Spend gate and kill switch errors render correctly.

---

## Phase 3 — Live call

**Goal:** while a call is in progress, the agent sees transcript, coach, script, and can send mid-call SMS.

**Scope**
- Build `components/live-call/` as four atomic panes: `TranscriptPane`, `CoachPane`, `ScriptPane`, `MidCallSmsPane`. Parent container handles layout.
- Build `store/activeCallProvider.tsx` and the call lifecycle reducer (port from smsv2).
- Build hooks: `useCallTimeline` (subscribes to `wk_live_transcripts`), `useCoachStream` (subscribes to `wk_live_coach_events`).
- Wire script parser + stage matcher (`scriptParser.ts`, `scriptMatcher.ts`) — copy logic from smsv2 verbatim and port tests.
- Wire mid-call SMS send via `wk-sms-send`.
- Wire outcome selector → `wk-outcome-apply`.
- Wire post-call AI summary display via `wk-ai-postcall` polling/subscription.
- Build `PastCallScreen` (read-only transcript replay + recording playback).

**Done when**
- A real call shows live transcript and coach suggestions.
- Stage cursor advances as the agent reads the script.
- Mid-call SMS sends and appears in the contact's thread.
- Outcome selection moves the contact in the pipeline.
- Past call screen plays the recording from Supabase Storage.

---

## Phase 4 — Inbox + Contacts

**Goal:** agents can browse messages, search contacts, see contact history, and manage pipelines.

**Scope**
- Build `components/inbox/`: `ContactSearchBox`, `ThreadList`, `ThreadPanel`, `ReplyComposer`. Build `InboxPage`.
- Build `components/contacts/`: `ContactsTable`, `ContactRow`, `BulkUploadModal`, `ContactDetail`. Build `ContactsPage` and `ContactDetailPage`.
- Build `components/pipelines/`: `KanbanBoard`, `PipelineColumn`, `ContactCard` (draggable). Build `PipelinesPage`.
- Build hooks: `useContacts`, `useContactSearch`, `useInboxThreads`, `useContactMessages`, `useContactTimeline`, `usePipelines`.
- All writes go through existing edge functions (`wk-sms-send`, `wk-outcome-apply`).

**Done when**
- Inbox lists threads with realtime updates from new messages.
- Contact search returns results as the user types.
- Contact detail shows the full call + message history for that contact.
- Pipeline drag-drop moves the contact in `wk_contacts` and other agents see the move in realtime.
- Bulk CSV upload inserts contacts and they appear in the table.

---

## Phase 5 — Settings + Admin

**Goal:** admins can configure the AI coach, SMS templates, channels, Twilio numbers, kill switches, and view dashboards.

**Scope**
- Build `components/settings/` — split into separate tab pages: `AiCoachSettings`, `SmsTemplatesTab`, `ChannelsTab`, `TwilioNumbersTab`, `AgentsTab`, `KillSwitchesTab`. Each is its own component, not a 4,700-line monolith.
- Build hooks: `useAiSettings`, `useCoachFacts`, `useSmsTemplates`, `useTwilioNumbers`, `useChannels`, `useKillSwitch`.
- Build `components/shared/CoachFactsEditor` (CRUD on `wk_coach_facts`).
- Build admin dashboard and leaderboard pages: `DashboardPage`, `LeaderboardPage`. Hooks: `useAgentsToday`, `useReports`.
- Apply `AdminOnlyRoute` guard to admin pages.

**Done when**
- Admin can edit the three coach prompt layers (style + script + KB) and the change is visible to live agents on next call.
- Coach facts CRUD works and the live coach uses new facts in the next generation.
- SMS templates, Twilio numbers, channels are configurable via UI.
- Kill switch banner shows when the dialer is paused, and dialing is blocked.
- Admin dashboard shows today's stats per agent.

---

## Phase 6 — Cutover

**Goal:** flip `/crm` to Caller without breaking anything.

**Scope**
- Run the full `TEST_PLAN.md` on `/caller/*`. Every scenario must pass.
- Hugo signs off in `LOG.md`.
- A single PR repoints `/crm/*` from `Smsv2Layout` to `CallerLayout`. Keep `/smsv2/*` redirects to `/crm/*`.
- Monitor for 7 days. Watch error logs, agent feedback, Twilio errors.
- After 7 days of green telemetry, a separate PR deletes `src/features/smsv2/`.

**Done when**
- `/crm/*` serves Caller in production.
- No regression reports for 7 days.
- `smsv2/` folder is deleted; `LOG.md` records the date.

**Rollback**
- If anything breaks during the 7-day window, the cutover PR is reverted in one commit. `/crm/*` returns to `Smsv2Layout`. Caller stays at `/caller/*` for further work.
