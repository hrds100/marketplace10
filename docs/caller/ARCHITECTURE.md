# Caller — Architecture

## Layers

| Layer | Technology | Location | Status |
|-------|-----------|----------|--------|
| **Frontend** | React + Vite + TypeScript + Tailwind | `src/features/caller/` | Built fresh by Caller |
| **Backend** | Supabase Edge Functions (Deno) | `supabase/functions/wk-*` | Reused as-is |
| **Database** | Supabase Postgres (`wk_*` tables) | Same project (`asazddtvjvmckouxcmmo`) | Reused as-is |
| **Realtime** | Supabase Realtime (Postgres CDC) | Existing channels | Reused as-is |
| **Voice** | Twilio Voice SDK (browser) + Twilio REST (server) | `src/core/integrations/twilio-voice.ts` | Reused as-is |
| **Messaging** | Twilio SMS, Unipile WhatsApp, Resend Email | `wk-sms-send`, `wk-email-send`, webhooks | Reused as-is |
| **AI** | OpenAI Chat (live coach via SSE + post-call summary) | `wk-voice-transcription`, `wk-ai-postcall` | Reused as-is |

## Folder layout

```
src/features/caller/
  pages/            ← route entry points
  layout/           ← CallerLayout, Sidebar, StatusBar, Guard
  components/       ← atomic UI components, grouped by area
    dialer/
    live-call/
    inbox/
    contacts/
    pipelines/
    settings/
    shared/
  hooks/            ← data fetchers + realtime subscribers
  lib/              ← pure helpers (parsers, reducers, error maps)
  store/            ← React context providers (active call, dialer session)
  types/            ← discriminated unions for DB / UI / service shapes
  __tests__/        ← Vitest + Playwright fixtures
```

## Preserved systems (used as-is, do not rebuild)

| System | Backend | Notes |
|--------|---------|-------|
| **Dialer** | `wk-dialer-start`, `wk-dialer-answer`, `wk-dialer-hangup-leg`, `wk-calls-create`, `wk-leads-next` | Power-dialer with first-answer-wins bridging |
| **Live call** | `wk-voice-twiml-outgoing`, `wk-voice-status`, `wk-voice-token` | TwiML, status callbacks, device tokens |
| **Transcript** | `wk-voice-transcription` | Twilio Real-Time Transcription webhook → Supabase realtime |
| **Coach** | `wk-voice-transcription` (SSE) + `wk_ai_settings` + `wk_coach_facts` | Three-layer prompt: style + script + knowledge base |
| **Recording** | `wk-voice-recording` | MP3 upload to Supabase Storage |
| **Post-call AI** | `wk-ai-postcall` | Summary + next steps |
| **Outcome automation** | `wk-outcome-apply` | Move pipeline stage, send SMS, create task |
| **Pipelines** | `wk_pipeline_columns`, `wk_contacts.pipeline_column_id` | Kanban board state |
| **Inbox** | `wk-sms-send`, `wk-sms-incoming`, `wk-email-send`, `wk-email-webhook`, Unipile webhooks | Multi-channel message bus |
| **Contacts** | `wk_contacts` table + bulk CSV upload | Contact list + detail |
| **Admin** | `wk-create-agent`, `wk-delete-agent`, `wk-killswitch-check`, `wk-twilio-connect` | Agent CRUD, kill switches, Twilio account binding |

## Data flow (high level)

```
Browser (caller/)
  ↓ supabase.functions.invoke('wk-*')
Edge Function (wk-*)
  ↓ Supabase client (service role)
Postgres (wk_* tables)
  ↓ Realtime CDC
Browser subscriptions (caller/hooks/*)
```

External APIs (Twilio, OpenAI, Resend, Unipile) are called only from edge functions — never from the browser.

## State management

- **Server state** (calls, contacts, messages, pipelines): React Query or hook-based fetch + Supabase realtime subscriptions.
- **Cross-page UI state** (active call, dialer session, paused/pacing): React context providers in `caller/store/`.
- **Local UI state** (form inputs, modal open/closed): component `useState`.

No global Zustand store unless a specific decision in `DECISIONS.md` justifies it.

## Routing strategy

### Phase 1 — Parallel
- New app runs on: `/caller/*`
- Old system stays on: `/crm/*`
- Both run in parallel and read the same database
- Hugo and selected testers use `/caller/*`; live agents continue on `/crm/*`

### Phase 2 — Cutover
- `/crm/*` is repointed to `CallerLayout`
- `/smsv2/*` redirects to `/crm/*` are preserved (so old bookmarks keep working)
- Old `smsv2` code is deprecated but kept in the repo for one week as a safety net

### Phase 3 — Cleanup
- After one week of green telemetry on `/crm`, the `src/features/smsv2/` folder is deleted in a dedicated PR
- `LOG.md` records the deletion date and the PR number

### Rule
**Never break `/crm` until Caller is fully proven.** No single-step swap. No "let's just see if it works in production". Parallel-run evidence first, route flip second, deletion third.
