# Caller — Build Log

Append-only record of every Caller change. The Co-Pilot updates this file at the close of every task.

Format:

```
DATE | CHANGE | AGENT | STATUS
```

- **DATE** — `YYYY-MM-DD` (UK date)
- **CHANGE** — one short sentence; reference PR number if applicable
- **AGENT** — the agent or human who did the work (e.g. Scarlett, Co-Pilot, Hugo)
- **STATUS** — one of: `PROPOSED`, `IN_PROGRESS`, `PROVEN`, `UNPROVEN`, `BLOCKED`, `REVERTED`, `SIGNED_OFF`

---

| DATE | CHANGE | AGENT | STATUS |
|------|--------|-------|--------|
| 2026-04-29 | Caller documentation backbone created (CALLER_OPERATING_SYSTEM, README, ARCHITECTURE, BUILD_PLAN, DECISIONS, LOG, TEST_PLAN) | Scarlett | PROVEN |
| 2026-04-29 | Phase 1 — Foundation: caller/ folder, CallerLayout, CallerSidebar, CallerStatusBar, CallerGuard, AdminOnlyRoute, CallerLoginPage, 11 stub pages, types/index.ts, /caller/* route mounted in App.tsx. tsc clean, build green, zero smsv2 imports. | Co-Pilot | PROVEN |
| 2026-04-29 | Phase 1 → Phase 2 handoff. Hugo locked decisions D10-D13 (skeleton stub-pages, mixed live testing, full schema autonomy, non-stop execution). | Co-Pilot | SIGNED_OFF |
| 2026-04-29 | Phase 2A — Foundation: copied pure-logic libs (callLifecycleReducer + .types, dialerSession.types, twilioErrorMap, startCallOrchestration), ported DialerSessionProvider, ported 5 data hooks (useDialerCampaigns, useMyDialerQueue, useSpendLimit, useKillSwitch, useCurrentAgent). tsc clean, build green. | Co-Pilot | PROVEN |
| 2026-04-29 | Phase 2B — Hugo picked Option 2: skeleton ActiveCallProvider supporting only start → ringing → connected → hang up. Built CampaignHero / QueuePreview / PacingControl / LiveCallScreen wiring; replaced DialerPage stub. tsc clean, build green. App.tsx merge conflict resolved (kept both crm-v2 and Caller imports — both rebuilds active). | Co-Pilot | PROVEN |
| 2026-04-29 | Phase 3 — skeleton live-call surface: useCallTimeline, usePipelineColumns, useOutcomeApply hooks + TimelinePane + OutcomeSelector + LiveCallScreen + PastCallScreen replace stub. tsc clean, build green. | Co-Pilot | PROVEN |
| 2026-04-29 | Phase 4 — skeleton Inbox / Contacts / Pipelines / Calls: useCalls, useContacts, useContactMessages, useInboxThreads hooks + 5 page replacements with @dnd-kit Kanban. tsc clean, build green. | Co-Pilot | PROVEN |
| 2026-04-29 | Phase 5 — skeleton Settings + Admin: useAiSettings, useCoachFacts, useSmsTemplates, useTwilioNumbers hooks + tabbed SettingsPage (5 tabs: AI coach, KB, SMS templates, Numbers, Kill switches) + DashboardPage + LeaderboardPage + ReportsPage. tsc clean, build green. | Co-Pilot | PROVEN |
| 2026-04-29 | Phases 2B / 3 / 4 / 5 deferred behaviours catalogued below. Phase 6 (cutover) requires Hugo sign-off. | Co-Pilot | SIGNED_OFF |
| 2026-04-29 | Caller v1 — completing deferred behaviours. New: GlobalToasts, useSendMessage (SMS / WhatsApp / email), inbox reply composer, mid-call SMS pane, mute / unmute, recording playback + post-call AI summary in PastCallScreen, inbox unread reset + channel filter, bulk CSV upload modal, SMS templates CRUD, Settings → Channels (Unipile hosted-auth), Settings → Agents (role + daily limit edit), Coach KB inline edit, Pipelines follow-up modal, ScriptPane with stage cursor (useScriptStage), dedicated CoachPane (streaming animation), auto-next pacing timer, parallel-mode winner broadcast subscription, inbound PSTN listener, orphan-call recovery on mount, e2e caller-skeleton.spec.ts. tsc clean, build green, zero smsv2 imports. 63 caller files. | Co-Pilot | PROVEN |

## Intentionally deferred (still open, owned by future PRs)

The big-batch v1 above closed most legacy behaviours. The following remain open and are documented owners for future work — flag and assign as needed.

### ActiveCallProvider follow-ups
- `requestNextCall` resolver — auto-next pacing currently clears the wrap-up so the queue UI returns; full wk-leads-next picker + dialed-set anti-loop integration is a future PR
- Client-side `wk_calls.ended_at` fallback write (smsv2 PR 147) — Caller relies on the wk-voice-status webhook
- Room view orchestration — open / close / minimise / maximise controls (Caller's roomView is always 'open_full' for Phase 2 simplicity)
- 1-Hz duration tick — Caller doesn't show a live "X:XX" counter during in-call yet
- Recovered-call name resolution — orphan recovery uses a synthetic `recovered-<sid>` contactId; matching back to the original wk_calls row is a future PR

### Pipelines
- Per-pipeline picker — Kanban currently shows ALL columns regardless of pipeline_id
- Automation preview before drop (e.g. "this will send `welcome` SMS") — server-side automation runs but UI doesn't echo it before
- Drag-drop optimistic rollback on RLS failure

### Contacts
- Inline contact edit + notes editor + tag editor on ContactDetail
- Manual "Add contact" button on ContactsPage (admins use bulk upload or DB directly)
- CSV export

### Calls
- Advanced filters (agent / status / date range) on CallsPage
- Calls export

### Reports / Dashboard / Leaderboard
- Time-series charts on Reports
- Per-agent call-status breakdown on Dashboard
- Avg duration / msg count / spend per agent on Leaderboard (currently calls + answered only)
- Campaign-level breakdown on Reports

### Settings
- Twilio numbers purchase / Twilio Connect flow (Numbers tab is read-only — admin provisions in Twilio console)
- AI coach: OpenAI API key, model selection, postcall_system_prompt, per-campaign overrides (workspace singleton only)
- Agents: invite flow (email + temp password) — currently admin creates auth user in Supabase, then sets workspace_role here

### Cross-cutting
- Coach-prompt sync CI check (Q2 default in plan) — separate CI script
- Daily spend reconciliation script (Q6 default) — separate cron / admin script
- Edge function integration test suite (Q5 default)
- Live-phone Playwright spec — current e2e spec only validates unauthenticated surface; live call + transcript + coach + outcome E2E needs Hugo + a real phone

<!-- Append new rows below. Do not edit history. -->
