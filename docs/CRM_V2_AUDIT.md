# COMPREHENSIVE CRM AUDIT REPORT
## marketplace10 @ 2026-04-29

---

## 1. CRM CURRENT MAP

The `/crm` workspace is a **power-dialer + calling + SMS + email platform** for sales teams (called "agents") to run outbound campaigns and manage inbound inquiries.

### Route structure
- **`/crm`** (line 324, src/App.tsx) → mounts `Smsv2Layout`, which enforces `CrmGuard` (workspace_role membership)
- **`/smsv2/*`** (lines 342–343) redirects to `/crm/*` for backward-compat (old bookmarks)
- **`/crm/login`** (line 323) → gate-keeper page (`CrmLoginPage`)

### Major sub-pages
- **`/crm/inbox`** – incoming messages (SMS, WhatsApp via Unipile, email via Resend webhooks); message threads by contact
- **`/crm/dialer`** – outbound power dialer (PR 140–154 rebuilt it 3× in 2 weeks); agent places parallel calls, AI coach streams suggestions, script navigator
- **`/crm/calls`** – call history; filters by agent, outcome, duration; can replay recordings + transcripts
- **`/crm/calls/:callId`** – past call detail screen; shows transcript, AI summary, agent notes, outcome
- **`/crm/contacts`** – bulk contact list; can bulk-upload CSV; search, tag, stage
- **`/crm/contacts/:id`** – single contact detail; shows call/SMS history, next follow-up, linked property
- **`/crm/pipelines`** – drag-drop Kanban board; columns = pipeline stages (e.g. "Interested", "Scheduling", "Close pending"); auto-moves on outcome
- **`/crm/dashboard`** (admin only) – agent leaderboard, call metrics, spend tracking, today's stats
- **`/crm/leaderboard`** – public agent rankings (answered %, total calls, SMSes sent); sortable
- **`/crm/reports`** – call duration distributions, agent performance, campaign ROI
- **`/crm/settings`** (admin only) – three-layer AI coach config (style + script + knowledge base), SMS templates, Twilio numbers, channels (WhatsApp via GHL, Resend email)

### Real CRM vs. legacy "CRM Page"
- **Real CRM** = `/crm` → lives in `src/features/smsv2/` (not sms/)
- **Legacy CRM Page** = `/dashboard/crm` → `src/features/crm/CRMPage.tsx` – **separate from the dialer**; a simple Kanban for non-agent users (landlords, deal sourcers) to track their property inquiries. **Not part of the rebuild scope** (frozen unless explicitly targeted)

### The Dialer (core of the rebuild PRs 125–154)

**Purpose**: Agent clicks "Start" → the system originates parallel Twilio calls to N leads, agent picks up the first one to answer, others hang up, agent has live-call UI with:
- Real-time transcript (both legs) → Supabase realtime
- AI coach suggestions (OpenAI Chat, streamed via SSE) → Supabase realtime
- Script navigator (with stage cursor that auto-advances per agent voice match)
- Mid-call SMS send
- Live terminator buttons (hang up, next call, skip, pause pacing)

**Edge functions involved** (files: supabase/functions/):
- `wk-dialer-start` – agent clicks Start; we originate N calls to Twilio
- `wk-dialer-answer` – first call to answer wins; hang up losers, bridge winner to agent's <Client>
- `wk-dialer-tick` – for parallel/power mode, poll the queue every Xs (future)
- `wk-dialer-hangup-leg` – agent hangs up; mark call done/skipped/outcome
- `wk-voice-token` – agent requests Twilio Device token (identity = profile UUID, ttl = 1h)
- `wk-voice-twiml-outgoing` – TwiML for outbound legs (ring agent's <Client>, record, transcribe)
- `wk-voice-twiml-incoming` – TwiML for inbound softphone (future)
- `wk-voice-transcription` – Twilio Real-Time Transcription webhook → INSERT wk_live_transcripts + wk_live_coach_events (SSE streams to browser)
- `wk-voice-recording` – Twilio recording complete webhook → fetch MP3, save to Supabase Storage
- `wk-voice-status` – Twilio call status webhook (ringing → answered → completed)
- `wk-ai-live-coach` – **DEPRECATED** (replaced by wk-voice-transcription's streaming)
- `wk-ai-postcall` – after call ends, generate a summary + actionable next steps (OpenAI)
- `wk-calls-create` – agent sets outcome (outcome column ID); we INSERT wk_calls record
- `wk-outcome-apply` – outcome automation (move contact to stage, send SMS template, create task, etc.)

**Key browser components** (src/features/smsv2/):
- `pages/DialerPage.tsx` → mounts `components/dialer/v3/OverviewPage.tsx` (PR 153)
- `components/dialer/v3/` – pre-call UI (campaign hero card, queue preview, pacing controls)
- `components/live-call/LiveCallScreen.tsx` – four-column layout:
  1. Transcript pane (left)
  2. Coach suggestions (top-right)
  3. Call script + stage cursor (bottom-left)
  4. Mid-call SMS (bottom-right)
- `hooks/useDialerSession.tsx` – session state (sessionId, paused, pacing config, dialedThisSession set)
- `hooks/useTwilioDevice.ts` – singleton Device management
- `components/softphone/Softphone.tsx` – floating softphone (always visible, minimizable)

---

## 2. FILE INVENTORY

### Thin CRM folder (legacy, not part of dialer rebuild)
```
src/features/crm/
  CRMPage.tsx                  (39–421 lines) — deals Kanban for landlords
  LeadsTab.tsx                 (1–464 lines) — tenant inquiry pipeline (from /inquiries table)
  LeadAccessAgreement.tsx      — NDA/claim modal
```

### Real CRM (SMSV2) — comprehensive
```
src/features/smsv2/

PAGES (entry points per route)
  pages/
    DialerPage.tsx           (11 lines) → mounts v3/OverviewPage
    InboxPage.tsx            (617 lines) — message threads, contact search
    CallsPage.tsx            (641 lines) — call history + filters
    PastCallScreen.tsx       (394 lines) — single call detail + transcript
    ContactsPage.tsx         (417 lines) — contact table + bulk upload
    ContactDetailPage.tsx    (409 lines) — single contact + call history
    PipelinesPage.tsx        (335 lines) — Kanban board
    DashboardPage.tsx        (53 lines) — admin leaderboard
    LeaderboardPage.tsx      (171 lines) — public agent rankings
    ReportsPage.tsx          (161 lines) — metrics
    SettingsPage.tsx         (4,700+ lines!) — three-layer coach config, numbers, templates, channels
    CrmLoginPage.tsx         (151 lines) — workspace login gate
    TestPage.tsx             (390 lines) — debug/manual test page

LAYOUT & GUARDS
  layout/
    Smsv2Layout.tsx          (86 lines) — root layout (CrmGuard, Providers, Softphone, StatusBar)
    Smsv2Sidebar.tsx         (main nav + profile menu)
    Smsv2StatusBar.tsx       (top bar: agent status, spend limit, kill switches)
  components/
    CrmGuard.tsx             — enforces workspace_role membership
    AdminOnlyRoute.tsx       — enforces admin role
    ChannelsTab.tsx          (components/settings/) — WhatsApp + email config

LIVE CALL (dialer + in-call)
  components/live-call/
    LiveCallScreen.tsx       (major — four-column call UI)
    CallScriptPane.tsx       (script navigator + stage cursor)
    CallTimeline.tsx         (transcript timeline)
    LiveTranscriptPane.tsx   (realtime transcript + speaker ID)
    ContactMetaCompact.tsx   (caller info card)
    TerminologyPane.tsx      (Glossary / custom terms)
    EditScriptModal.tsx      (agent edits script mid-call)
    MidCallSmsSender.tsx     (SMS template picker + send)
    ActiveCallContext.tsx    (call lifecycle state machine + reducer)
  components/dialer/
    v3/
      OverviewPage.tsx       (main dialer UI — hero card, queue list, pacing)
      HeroCard.tsx           (campaign info + start/pause/resume)
      OrderedQueueList.tsx   (next 5 leads preview)
      SessionControlBar.tsx  (pause/resume/pacing buttons)
      SessionFooter.tsx      (session timer, stats)
      PacingControl.tsx      (manual / auto-next with delay)
      HistoryList.tsx        (recent calls during session)
    SpendBanner.tsx          (spend limit warning)
    SoftPhone/
      Softphone.tsx          (always-on floating softphone)
      DialPad.tsx            (manual dial for non-campaign)

HOOKS (data & state)
  hooks/
    useDialerSession.tsx     (session state: paused, pacing, sessionId, dialed set)
    useTwilioDevice.ts       (Twilio Device singleton)
    useTwilioAccount.ts      (logged-in agent's Twilio extension + status)
    useMyDialerQueue.ts      (real next-5 from wk_dialer_queue)
    useCalls.ts              (wk_calls table, realtime)
    useCallTimeline.ts       (wk_live_transcripts subscription)
    useContactTimeline.ts    (wk_sms_messages + wk_calls for contact detail)
    useContactMessages.ts    (inbox thread for contact)
    useCampaignAgents.ts     (agents assigned to campaign)
    useCampaigns.ts          (agent's campaigns or admin view)
    useAiSettings.ts         (three-layer coach config)
    useCoachFacts.ts         (wk_coach_facts CRUD + realtime)
    useAgentScript.ts        (campaign script)
    useAgentsToday.ts        (daily stats: calls, answers, SMS)
    useAgentPresence.ts      (agent online/offline status)
    useTerminologies.ts      (glossary terms)
    useSpendLimit.ts         (spend gate checks)
    useKillSwitch.ts         (global/agent kill switches)
    useInboxNotifications.ts (new message count)
    useReports.ts            (metrics aggregation)
    useContactSmsStatus.ts   (SMS channel status for contact)
    useContactPersistence.ts (localStorage backup of contacts)
    useChannels.ts           (WhatsApp, Resend email integration config)
    useSmsTemplates.ts       (template list + send)
    useDefaultCallScript.ts  (fetch or seed default script)
    useScriptReadTracking.ts (agent reads script line → mark seen)
    useColumnPersistence.ts  (save column sort order)
    useHydrateContacts.ts    (pump wk_contacts into store on mount)
    useHydratePipelineColumns.ts (pump wk_pipeline_columns into store)
    useLiveActivity.ts       (real-time dashboard activity feed)
    useFollowups.ts          (CRUD scheduled follow-ups)
    useInboxThreads.ts       (message thread list for inbox)
    useCampaignNumbers.ts    (Twilio numbers assigned to campaign)

STATE MANAGEMENT
  store/
    SmsV2Store.tsx           (Zustand-like: contact/column/queue/activity reducer)
    GlobalToasts.tsx         (cross-screen toast notifications)

HELPERS & LIBS
  lib/
    callLifecycleReducer.ts       (state machine for call phases)
    callLifecycleReducer.types.ts (Call, CallPhase, CallError types)
    dialerSession.types.ts        (DialerSessionState, PacingConfig)
    dialerLog.ts                  (structured logging helper)
    startCallOrchestration.ts     (atomically start call via wk-calls-create)
    twilioErrorMap.ts             (Twilio error codes → user-friendly text)
    scriptParser.ts               (parse markdown script → sections + anchors)
    scriptMatcher.ts              (match agent voice against script anchors)
    interpolateTemplate.ts        (merge fields in SMS templates)
    buildOutgoingTwiml.ts         (generate TwiML for outbound calls)
    useDemoMode.ts                (is-demo-mode flag for test page)
  data/
    mockCalls.ts, mockContacts.ts, mockAgents.ts, mockCampaigns.ts, mockDialer.ts, mockPipelines.ts, mockTranscripts.ts
    mockData.ts, helpers.ts
    waTemplateStarters.ts         (WhatsApp template boilerplate)

TYPES
  types/
    index.ts                 (Agent, Contact, Call, Campaign, SmsMessage, KillSwitch, etc.)

TESTS
  __tests__/
    coach-stream.test.ts               — retrieveFacts(), buildOpenerBanList()
    wk-voice-transcription.contract.test.ts — three-layer structure lock
    useCalls.test.ts
    useContactPersistence.test.ts
    useHydrateContacts.test.ts, .replace.test.tsx
    useHydratePipelineColumns.test.ts, .hook.test.tsx
    useCurrentAgent.test.tsx
    SmsV2Store.test.tsx
    uuid-write-guards.test.ts
    CallScriptPane.parser.test.ts
    LiveTranscriptPane.test.tsx
    interpolateTemplate.test.ts
    buildOutgoingTwiml.test.ts
    scriptMatcher.test.ts
    useDemoMode.test.tsx
```

### Edge functions (supabase/functions/wk-*)
```
wk-dialer-start              (269 lines) — originate calls
wk-dialer-answer             (199 lines) — first-answer-wins
wk-dialer-tick               (TBD) — queue poller (unused in Phase 1)
wk-dialer-hangup-leg         (HM) — hang up + mark outcome
wk-voice-token               — fetch Twilio token
wk-voice-twiml-outgoing      (334 lines) — TwiML for outbound
wk-voice-twiml-incoming      (TBD) — TwiML for inbound (future)
wk-voice-transcription       (1,360 lines!) — Twilio webhook + coach stream
  coach-stream.ts            (helpers: parseSseChunk, retrieveFacts)
wk-voice-recording           (204 lines) — save MP3 to Storage
wk-voice-status              (419 lines) — Twilio status webhook
wk-supervisor-join           (260 lines) — admin tap into agent's call (future)
wk-calls-create              (205 lines) — INSERT wk_calls, check spend gate
wk-outcome-apply             (HM) — execute outcome automations
wk-ai-live-coach             (207 lines) — DEPRECATED
wk-ai-postcall               (254 lines) — summarize call + next steps
wk-ai-template               (201 lines) — generate SMS templates
wk-leads-next                (TBD) — atomic queue picker (called from browser)
wk-leads-distribute          (TBD) — distribute queue to agents
wk-sms-send                  (206 lines) — send SMS (Twilio)
wk-sms-incoming              (248 lines) — inbound SMS webhook
wk-email-send                (255 lines) — send email (Resend)
wk-email-webhook             (380 lines) — inbound email webhook
wk-spend-check               — verify agent's daily spend
wk-spend-record              — log spend pence for this call
wk-twilio-connect            (266 lines) — validate + connect Twilio account
wk-create-agent, wk-delete-agent — CRUD agents
wk-killswitch-check          — verify kill switches
wk-test-transcribe, wk-diag  — debug helpers
wk-jobs-worker               (297 lines) — background job processor
```

### Core integrations used by CRM
```
src/core/integrations/
  twilio-voice.ts            (28 KB) — single owner of Twilio SDK in browser
    - fetchVoiceToken()
    - createDevice(), destroyDevice()
    - connect(), disconnect()
    - token refresh + error mapping
    - 5+ test files for edge cases (multi-tab, hang-up race, token refresh, incoming)
  ghl.ts                      — WhatsApp API wrapper (GoHighLevel)
  __tests__/
    twilio-voice.*.test.ts
```

---

## 3. DATA FLOW — Major Actions

### A. Open Inbox / Load Threads
```
UI: InboxPage.tsx → useContactMessages() (hook)
  ↓
Supabase query: wk_sms_messages + wk_contacts (realtime)
  ↓
Thread list grouped by contact_id + direction
  ↓
Each message: render + allow reply (MidCallSmsSender pattern)
```

### B. Send SMS (during call or from inbox)
```
UI: MidCallSmsSender.tsx → pick template → click Send
  ↓
Supabase function invoke('wk-sms-send', { contact_id, template_id, merge_fields })
  ↓
wk-sms-send/index.ts (206 lines):
  1. Verify agent JWT + spend gate (wk-spend-check)
  2. Resolve contact's phone number
  3. Resolve SMS template (substitute merge fields)
  4. POST to Twilio Messaging API
  5. INSERT wk_sms_messages record (direction='outbound')
  6. Broadcast 'message:sent' for realtime
  ↓
Browser: InboxPage realtime subscription receives new message
```

### C. Send WhatsApp (via Unipile)
```
UI: ChannelsTab.tsx → configure Unipile workspace ID
  ↓
On message send:
  Supabase function invoke('wk-sms-send', { contact_id, channel: 'whatsapp' })
  ↓
wk-sms-send/index.ts:
  1. Detect channel='whatsapp'
  2. Call Unipile REST API (workspace_id + contact phone)
  3. INSERT wk_sms_messages (channel='whatsapp')
  ↓
Webhook: wk-sms-incoming receives inbound replies (Unipile → Supabase)
```

### D. Send Email (via Resend)
```
UI: SettingsPage → email templates tab
  ↓
Agent clicks "Send" on email template
  ↓
Supabase function invoke('wk-email-send', { contact_email, template_id })
  ↓
wk-email-send/index.ts (255 lines):
  1. Fetch email template from DB
  2. POST to Resend API (from: nfstay@..., to: contact_email)
  3. INSERT wk_sms_messages (direction='outbound', channel='email')
  ↓
Webhook: wk-email-webhook receives bounce/complaint/delivery status
```

### E. Start Dialer Session (agent clicks "▶ Start")
```
UI: OverviewPage.tsx → HeroCard "Start" button
  ↓
Browser: CallContext.startCall({ campaign_id })
  ↓
Hook: startCallOrchestration({ campaign_id }) (src/features/smsv2/lib/)
  1. Call Supabase function invoke('wk-calls-create', { campaign_id, ... })
  ↓
Edge fn: wk-calls-create/index.ts (205 lines):
  1. Verify agent JWT + agent membership in campaign
  2. Check spend gate via wk-spend-check (daily budget)
  3. Call wk-leads-next to atomically pick next contact (or queue_id)
  4. Originate Twilio call via Twilio REST API:
     - To: contact.phone
     - From: campaign_number.e164
     - Url: PUBLIC_FN_BASE/wk-voice-twiml-outgoing
     - StatusCallback: PUBLIC_FN_BASE/wk-voice-status
  5. INSERT wk_calls record (agent_id, contact_id, campaign_id, status='initiated')
  6. Return call_id + queue_id to browser
  ↓
Browser: Twilio.Device.connect({ params: { call_id, queue_id } })
  (params embed via TwiML App; Twilio calls wk-voice-twiml-outgoing)
  ↓
Agent hears "ringing" via softphone <Client>
```

### F. Dial Next Lead (power/parallel mode)
```
Agent clicks "Skip" or "Next" → ActiveCallContext reducer dispatches END_CALL + NEXT_CALL
  ↓
EndCall handler:
  1. Hang up current Twilio call (disconnectAllCalls)
  2. POST wk-dialer-hangup-leg (callSid) → mark status
  3. Prompt for outcome (outcome column from UI selector)
  ↓
NextCall handler:
  1. Call startCallOrchestration again (same campaign)
  2. Loop back to "Start Dialer Session" flow above
```

### G. First Call Answers → Auto-Bridge Others
```
Twilio fires StatusCallback to wk-voice-status/index.ts:
  { CallStatus: 'in-progress', CallSid: 'CA...', ... }
  ↓
wk-dialer-answer/index.ts (199 lines):
  1. Verify Twilio signature
  2. SELECT * FROM wk_calls WHERE twilio_call_sid = $1 AND status='ringing'
  3. Atomically UPDATE to status='connected' (only one wins CAS)
  4. If this is the winning call:
     a. DELETE (or set status='skipped') on losing calls (same queue_id, same agent)
     b. POST Twilio REST to hang up losing call SIDs
     c. POST Twilio REST to redirect winning call to new TwiML
        (Url: wk-voice-twiml-outgoing?mode=bridge)
     d. Broadcast 'dialer:winner' event to agent's browser
  5. If this is a losing call:
     a. No-op (already hung up by winner)
  ↓
Browser receives 'dialer:winner' → CallContext.receive({ call_id })
  → switches UI from "Calling..." to LiveCallScreen
```

### H. During Call: Receive Transcripts + Coach Suggestions
```
Twilio calls wk-voice-transcription/index.ts (webhook, Twilio Real-Time Transcription):
  { TranscriptionSid, TranscriptionText, CallSid, TrackType: 'both_tracks' }
  ↓
wk-voice-transcription/index.ts (1,360 lines):
  1. Verify Twilio HMAC signature
  2. For each transcript chunk:
     a. INSERT wk_live_transcripts (call_id, speaker, text, ts)
     b. Broadcast via Supabase realtime → LiveTranscriptPane renders
  3. For caller utterances, async-POST rolling transcript to OpenAI Chat:
     a. Resolve three-layer coach config (style + script + KB facts)
     b. Build OpenAI request:
        {
          messages: [
            { role: 'system', content: STYLE_PROMPT },
            { role: 'system', content: SCRIPT_PROMPT },
            { role: 'system', content: KB_SYSTEM_BLOCK },
            { role: 'user', content: transcript + matched_facts + utterance }
          ]
        }
     c. Stream response via SSE → wk-voice-transcription → browser
     d. INSERT wk_live_coach_events (call_id, kind, text, ts)
  4. Advance stage cursor: match agent voice against script anchors
     UPDATE wk_calls SET current_stage = ... (PR 58)
  ↓
Browser: ActiveCallContext receives coach event via realtime
  → CallContext reducer pushes to coach.cards array
  → CoachPane rerenders with new card
```

### I. Call Ends → Generate Post-Call AI Summary
```
Agent hangs up (manually or timeout) + clicks outcome (e.g. "Interested" column)
  ↓
CallContext.applyOutcome({ outcome_column_id, notes? })
  ↓
Supabase function invoke('wk-outcome-apply', { call_id, outcome_column_id, notes })
  ↓
wk-outcome-apply/index.ts:
  1. UPDATE wk_calls SET outcome_column_id = ..., agent_notes = ...
  2. Trigger wk_calls UPDATE → broadcasts to live-call consumers
  3. For automation (move to pipeline, send SMS template, create task):
     a. Async POST to wk-ai-postcall to generate summary
     ↓
wk-ai-postcall/index.ts (254 lines):
  1. Fetch transcript from wk_live_transcripts
  2. POST OpenAI Chat (summarize + next steps)
  3. UPDATE wk_calls SET ai_summary = ...
  4. If automation.sendSms = true:
     a. Pick template or generate via wk-ai-template
     b. POST wk-sms-send
  5. If automation.moveToPipeline:
     a. UPDATE wk_contacts SET pipeline_column_id = ...
  ↓
Browser: Realtime updates for call record + contact stage
```

### J. Log Call Outcome (drag-drop to pipeline stage)
```
UI: PipelinesPage → drag contact card to "Close" stage
  ↓
Reducer: contact/patch { pipeline_column_id: new_stage_id }
  ↓
CallContext.applyOutcome({ outcome_column_id: new_stage_id })
  ↓
Same as section I above
```

### K. Write / Edit Coach Prompt (three-layer system)
```
UI: SettingsPage → AI coach tab → "Layer 1 — Style / voice" textarea
  ↓
Agent types new prompt → click Save
  ↓
Supabase function invoke('update-ai-settings', { coach_style_prompt: '...' })
  ↓
Edge fn (or direct update via RLS):
  UPDATE wk_ai_settings SET coach_style_prompt = ... WHERE 1=1
  ↓
Supabase realtime: all agents on active calls receive update
  ↓
wk-voice-transcription next coach generation uses new prompt
```

### L. Add / Edit Knowledge Base Fact
```
UI: SettingsPage → Knowledge base tab → click "Add fact"
  ↓
Form: key, label, value, keywords, sort_order
  ↓
Supabase function invoke('upsert-coach-fact', { ... })
  ↓
Edge fn (or direct RLS):
  INSERT wk_coach_facts (key, label, value, keywords, sort_order, is_active)
  VALUES (...)
  ↓
Supabase realtime: all agents receive updated KB
  ↓
Next coach generation uses new fact + keyword triggers
```

### M. Run Live Coach (realtime suggestions during call)
```
Same as Section H — wk-voice-transcription is the single entry point.
No separate "run coach" call; coach is auto-triggered on every agent utterance.
```

### N. Record Call (Twilio automatic)
```
wk-voice-twiml-outgoing includes:
  <Record ... recordingStatusCallback="PUBLIC_FN_BASE/wk-voice-recording" />
  ↓
Twilio finishes recording → POSTs to wk-voice-recording/index.ts
  ↓
wk-voice-recording/index.ts (204 lines):
  1. Verify Twilio signature
  2. Fetch MP3 from Twilio
  3. Supabase.storage.from('call-recordings').upload(filename, buffer)
  4. UPDATE wk_calls SET recording_url = signed_url
  ↓
Browser: past-call screen has playable recording
```

---

## 4. INTEGRATION MAP

### Twilio (voice + SMS)
| Part | Where | Edge Function | Client Lib | Env Vars | Webhooks |
|------|-------|----------------|-----------|----------|----------|
| **Voice (calls)** | Outbound dialing, inbound accept, device token | `wk-voice-token`, `wk-voice-twiml-outgoing`, `wk-voice-twiml-incoming`, `wk-dialer-start`, `wk-dialer-answer`, `wk-voice-transcription`, `wk-voice-status`, `wk-voice-recording` | `src/core/integrations/twilio-voice.ts` (Device singleton, token fetch, error mapping) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | StatusCallback (wk-voice-status), RecordingStatusCallback (wk-voice-recording), Real-Time Transcription (wk-voice-transcription) |
| **SMS** | Send + receive SMS | `wk-sms-send`, `wk-sms-incoming` | none (direct REST) | Same as above | Twilio webhook → wk-sms-incoming |

### Unipile (multi-channel: WhatsApp, Facebook, etc.)
| Part | Where | Edge Function | Client Lib | Env Vars | Webhooks |
|------|-------|----------------|-----------|----------|----------|
| **WhatsApp** | Send WhatsApp messages to contacts | `wk-sms-send` (detects channel='whatsapp') | none | `UNIPILE_WORKSPACE_ID`, `UNIPILE_API_KEY` | Unipile webhook → wk-sms-incoming |

### GoHighLevel (GHL — WhatsApp on account settings)
| Part | Where | Edge Function | Client Lib | Env Vars | Webhooks |
|------|-------|----------------|-----------|----------|----------|
| **WhatsApp** | Store workspace config in UI | `wk-sms-send` calls Unipile, not GHL directly | `src/core/integrations/ghl.ts` (for non-CRM features) | `GHL_API_KEY` (for CRM, used in ChannelsTab) | GHL webhooks → nfstay-specific (not CRM) |

### Resend (email)
| Part | Where | Edge Function | Client Lib | Env Vars | Webhooks |
|------|-------|----------------|-----------|----------|----------|
| **Email send** | Send emails to contacts | `wk-email-send` | none | `RESEND_API_KEY` | Resend webhook → wk-email-webhook |
| **Email receive** | Inbound email replies | `wk-email-webhook` | none | Same | Resend → wk-email-webhook |

### OpenAI (AI coach + post-call AI)
| Part | Where | Edge Function | Client Lib | Env Vars | Webhooks |
|------|-------|----------------|-----------|----------|----------|
| **Live coach** | Generate suggestions per agent utterance | `wk-voice-transcription` (streams via SSE) | none | `OPENAI_API_KEY` | (SSE stream, not webhook-based) |
| **Post-call AI** | Summarize call + suggest next steps | `wk-ai-postcall` | none | Same | (async, non-webhook) |
| **Template gen** | Generate SMS templates | `wk-ai-template` | none | Same | (async, non-webhook) |

### Supabase
| Part | Where | Edge Function | Client Lib | Env Vars | Realtime subscriptions |
|------|-------|----------------|-----------|----------|------------------------|
| **Database** | All tables (wk_*, inquiries) | All edge functions | `src/integrations/supabase/client.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (edge fn) | `wk_calls`, `wk_live_transcripts`, `wk_live_coach_events`, `wk_sms_messages`, `wk_contacts`, `wk_pipeline_columns`, `wk_ai_settings`, `wk_coach_facts` |
| **Auth** | Agents sign in, JWT in headers | `wk-*` verify JWT via middleware | `src/hooks/useAuth.ts` | Same | (none) |
| **Storage** | Call recordings, agent profiles | `wk-voice-recording` uploads MP3 | `supabase.storage.from('...')` | Same | (none) |
| **Realtime** | Live transcript, coach, messages, presence | All webhook receivers broadcast | Supabase realtime subscriptions | Same | Enabled on select tables |

---

## 5. DATABASE + SUPABASE MAP

### Core CRM Tables

| Table | Columns Used | Writer | Reader | RLS Policy | Realtime? |
|-------|--------------|--------|--------|-----------|-----------|
| **wk_calls** | id, agent_id, contact_id, campaign_id, twilio_call_sid, status, current_stage, outcome_column_id, ai_summary, agent_notes, duration_sec, cost_pence, created_at, started_at, ended_at, recording_url | wk-calls-create, wk-outcome-apply, wk-voice-status, wk-voice-recording | ActiveCallContext (live), PastCallScreen, CallsPage, useCallTimeline, useCalls | admin + agent (own calls) | YES (LiveCallScreen, CallsPage) |
| **wk_contacts** | id, campaign_id, name, phone, email, pipeline_column_id, tags[], custom_fields, last_contact_at, created_at | wk-leads-distribute, BulkUploadModal (CSV), wk-outcome-apply (stage moves) | useHydrateContacts (pump to store), ContactsPage, ContactDetailPage, InboxPage | admin + agent (campaign members) | YES (ContactsPage) |
| **wk_dialer_queue** | id, campaign_id, contact_id, agent_id, status (pending / dialing / connected / voicemail / missed / done / skipped), priority, attempts, scheduled_for, created_at | wk-calls-create (set status='dialing'), wk-leads-next (atomic pick), wk-dialer-answer (set status='connected'), wk-dialer-hangup-leg (set status=outcome) | useMyDialerQueue (next 5), wk-leads-next (picker), DialerPage (session stats) | admin + agent (own rows or unassigned) | YES (queue preview, session counts) |
| **wk_live_transcripts** | id, call_id, speaker (agent / caller), text, ts, created_at | wk-voice-transcription (webhook) | LiveTranscriptPane (realtime), PastCallScreen (replay) | admin + agent (own calls) | YES (LiveCallScreen) |
| **wk_live_coach_events** | id, call_id, kind, title, body, ts, created_at | wk-voice-transcription (streaming) | CoachPane (realtime), PastCallScreen | admin + agent (own calls) | YES (LiveCallScreen) |
| **wk_sms_messages** | id, contact_id, direction (inbound / outbound), body, channel (sms / whatsapp / email), sentAt, agentId, created_at | wk-sms-send, wk-sms-incoming, wk-email-send, wk-email-webhook | InboxPage, ContactDetailPage, useContactMessages | admin + agent (own contacts or campaign contacts) | YES (InboxPage, ContactDetailPage) |
| **wk_pipeline_columns** | id, campaign_id, name, position, colour, icon, requires_followup, automation { sendSms, createTask, moveToPipeline, ... } | useHydratePipelineColumns (pump from DB), admin edit in SettingsPage | PipelinesPage (Kanban), ContactDetailPage (stage selector), wk-outcome-apply (automation) | admin + agent (campaign columns) | YES (PipelinesPage) |
| **wk_dialer_campaigns** | id, owner_agent_id, name, pipeline_id, parallel_lines, mode (power / parallel / manual), ai_coach_enabled, script_md, auto_advance_seconds, totalLeads, pendingLeads, connectedLeads, doneLeads, etc. | Admin creates in SettingsPage, wk-outcome-apply (updates counts) | DialerPage, DashboardPage, useDialerCampaigns, useMyDialerQueue (filter) | admin creates; agents can see own campaigns or assigned campaigns | YES (OverviewPage hero card) |
| **wk_ai_settings** | id, coach_style_prompt, coach_script_prompt, live_coach_system_prompt (deprecated), live_coach_custom_kb (deprecated) | useAiSettings (admin edit in SettingsPage) | wk-voice-transcription (resolve three-layer), LiveCallScreen (display to agent) | admin only | YES (all agents during live calls) |
| **wk_coach_facts** | id, key, label, value, keywords[], sort_order, is_active, created_at, updated_at | useCoachFacts (admin CRUD in SettingsPage) | wk-voice-transcription (retrieveFacts keyword match), KnowledgeBaseTab (display) | admin writes; agents read active only | YES (all agents) |
| **wk_numbers** | id, campaign_id, e164, label, capabilities (voice / sms), max_calls_per_minute, cooldown_seconds_after_call, recording_enabled | Admin creates in SettingsPage | wk-calls-create (pick from pool), wk-sms-send (SMS from number) | admin + agent (campaign numbers) | NO |
| **wk_campaign_agents** | id, campaign_id, agent_id, role (owner / member), can_dial, can_listen, joined_at | Admin in SettingsPage (add agent to campaign) | useCampaignAgents (fetch agents for campaign) | admin + agent (own rows) | NO |

### Shared Tables (CRM reads, other features write)
| Table | CRM Usage | Writer | RLS |
|-------|-----------|--------|-----|
| **profiles** | wk_calls.agent_id foreign key; useAuth reads role/name/extension | auth + features | admin can edit all; agents can edit own |
| **inquiries** | LeadsTab.tsx reads (separate from dialer CRM) | inquiry feature, GHL webhook | inquiry RLS |

### CRM-Related Config Tables
| Table | Purpose | Updated By |
|-------|---------|-----------|
| **wk_ai_settings** | Singleton row (or per-campaign); three-layer coach config | Admin in SettingsPage |
| **wk_coach_facts** | Knowledge base for coach | Admin in SettingsPage |
| **wk_kill_switches** | Global/agent pauses (dialer, ai_coach, outbound) | Admin kill-switch controls |

---

## 6. BROKEN / RISKY PARTS

### Evidence of heavy churn (PRs 140–154, ~2 weeks)
```
git log --oneline PRs 140–154:
  27× commits (18× in main, 9× from rebases)
  fix(crm dialer): 13 separate fix PRs in a row (PRs 141–148)
    - 31005 loop (multi-tab identity collision)
    - 31486 (busy signal), 31404 (no pickup), 31000 (device error)
    - hang-up race windows (awaits extended to 1.5s)
    - auto-outcome removal (Hugo rule: agent always picks)
    - recent-calls dedup by contact_id
```

**Risk indicator**: Twilio Device + WebSocket + call state machine are fragile at the browser layer. Every fix required careful state synchronization. The reducer-based refactor (PR 138) stabilized this but needs monitoring.

### Deprecated / fallback code
| File | Issue | Evidence |
|------|-------|----------|
| **wk-ai-live-coach** (207 lines) | Replaced by wk-voice-transcription streaming | Comment in wk-voice-transcription line 1 |
| **wk_ai_settings.live_coach_system_prompt** (DB column) | Deprecated, kept as fallback | COACH_PROMPT_LAYERS.md line 169 |
| **useAiSettings.ts** | Falls back to deprecated column if both new prompts empty | Code: `fallback: DEFAULT_SCRIPT_PROMPT` |
| **src/features/crm/** (thin CRMPage.tsx) | Separate from /crm dialer; landlord-only deals Kanban | Not touched in rebuild; likely stale |

### Half-finished features
| Feature | Status | Evidence |
|---------|--------|----------|
| **Parallel dialer (2–5 lines)** | Wired but UI Phase 2 | wk-dialer-start line 36: `// Phase 1 ships with mode='power'` |
| **wk-dialer-tick** (queue poller) | Undefined / unused | Function folder exists, no implementation yet |
| **wk-leads-distribute** | Stub | Distributes queue to agents (not yet called) |
| **wk-supervisor-join** (call monitoring) | Stub | Future: admin joins agent's call to listen |
| **wk-voice-twiml-incoming** | Stub | Future: inbound softphone (no TwiML yet) |

### Mock data leftovers
| File | Lines | Risk |
|------|-------|------|
| **src/features/smsv2/data/mock*.ts** | 10 files, ~500 lines total | Hardcoded UUIDs, dates. If real data changes schema, mocks become wrong. CLAUDE.md line 60: "feature-local" mocks are OK; these are loaded at module level in tests. |
| **data/mockCampaigns.ts** | Used in store initialState if real campaigns empty + demo mode | Good defensive pattern; unlikely bug. |

### Commented-out code blocks
```
Grep result: ~3 small sections
  - SettingsPage: old kill switch UI
  - CallScriptPane: old stage-picker logic
  - useDialerSession: comments describing deprecated behavior
```

**Risk**: Low. Comments document why they were removed (e.g. "PR 137 removed auto-outcome").

### Known inconsistencies
| Issue | Location | Evidence |
|-------|----------|----------|
| **Dialed-this-session anti-loop** | useDialerSession + ActiveCallContext | PR 151 splits session state from call state; two places to check if contact already dialed. Good for isolation, but changes need both. |
| **Outcome column vs. stage column** | wk_calls.outcome_column_id vs. wk_contacts.pipeline_column_id | Two separate concepts (where contact ended up after call vs. where it will be placed in pipeline). Can drift if automation fails. |
| **Spend tracking pence** | Multiplied by 100 everywhere (£1 = 100p) but rounding not enforced at DB layer. | Unlikely issue in practice (Twilio bills integers), but could accumulate rounding errors in reports. |

### Fragile patterns
| Pattern | Risk | Evidence |
|---------|------|----------|
| **Realtime subscriptions depend on RLS** | Agent can see only their own calls + contacts. RLS is critical. | src/features/smsv2/hooks/*.ts all call `.select()` with `.eq(agent_id, ...)`. If RLS policy broken, data leaks. |
| **Three-layer coach prompt must stay in sync** | DB columns + DEFAULT_*_PROMPT in edge fn + migration. Desync = coach uses stale prompt. | docs/runbooks/COACH_PROMPT_LAYERS.md line 207: "MUST stay in sync". |
| **Twilio token TTL = 1h** | If agent on call >1h, token expires mid-call. No refresh mechanism in place. | src/core/integrations/twilio-voice.ts fetchVoiceToken() line 79: "60s before expiry, refresh". But this is fetch-time, not mid-call. Risk: long calls fail at 1h mark. |
| **Call state machine can diverge from Twilio state** | If browser crashes mid-call, the call is still active on Twilio but browser doesn't know. Next sign-in re-creates Device. | src/features/smsv2/lib/callLifecycleReducer.ts has no "recover hanging call" flow. |

---

## 7. COUPLING PROBLEMS

### Cross-feature imports
```
Grep result: NO cross-feature imports detected.
  ✓ smsv2 does NOT import from sms/
  ✓ smsv2 does NOT import from crm/
  ✓ crm/ does NOT import from smsv2/
  ✓ All use core/ integrations correctly
```

### BUT: CRM code in src/features/crm/ (CRMPage.tsx) is SEPARATE

The **CRMPage** (landlord Kanban) and **SMSV2 dialer** are two unrelated "CRM" concepts:
- CRMPage: deals pipeline (for property buyers/sourcers tracking inquiries)
- SMSV2: agent outbound dialer (for sales reps calling leads)

Hugo's PR 45 comment (line 135–139, src/App.tsx):
```
// PR 45 (Hugo 2026-04-27): the SMSV2 module is rebranded to "CRM"
// for the user-facing surface. /crm/* routes are the new home;
// /smsv2/* are kept as redirects so any bookmark / external link
// keeps working. Internal folder + DB tables stay smsv2 / wk_* —
// see docs/runbooks/CRM_RENAME.md.
```

**The rename was UI-only**, not a code refactor. The `/dashboard/crm` legacy page is NOT being rebuilt.

### Integration wrappers are isolated
- **twilio-voice.ts** is the single Twilio consumer in the browser (good!)
- **ghl.ts** exists but CRM doesn't use it directly (good!)
- **No raw API calls** in features (all go through wk-* edge functions)

### RLS + realtime subscriptions
- Every hook that reads user data filters by agent_id (good defensive coding)
- RLS policies gate table access by wk_is_admin() or workspace_role (good)
- No select('*') statements (explicit columns only per CLAUDE.md rule 5)

---

## 8. WHAT TO COPY INTO CRM V2

### Working integrations (stable, tested, documented)

1. **Twilio Voice SDK wrapper** (`src/core/integrations/twilio-voice.ts`)
   - Singleton Device, token refresh, error mapping
   - 5 test files lock edge cases (multi-tab, race windows, token refresh)
   - **Status**: Production-stable after PR 139–144 fixes
   - **Action**: Copy as-is; no refactor needed

2. **Three-layer coach prompt system** (wk-voice-transcription + types)
   - Style / script / knowledge-base split (COACH_PROMPT_LAYERS.md)
   - retrieveFacts() keyword matching algorithm
   - wk_coach_facts table schema + RLS
   - **Status**: Finalized 2026-04-29 (PR 574), tested
   - **Action**: Copy entirely; it's the production system

3. **Call lifecycle state machine** (callLifecycleReducer.ts + types)
   - Unified reducer for all call phases (idle → placing → in_call → post_call → outcome_done)
   - Maps legacy phase names for backward-compat
   - Tested in PR 138 + subsequent 13 hotfixes
   - **Status**: Stabilized, multiple states per PR 150 additions
   - **Action**: Copy + extend if adding new phases

4. **Dialer session provider** (useDialerSession.tsx)
   - Session-scoped state (sessionId, paused, pacing, dialedThisSession set)
   - Anti-loop protection (don't re-dial same contact in session)
   - **Status**: Added in PR 151, stable
   - **Action**: Copy as-is

5. **Twilio error mapping** (twilioErrorMap.ts)
   - Maps Twilio error codes (31005, 31404, 31486, etc.) to user-friendly text
   - Covers all documented Twilio client errors
   - **Status**: Complete after PR 141–148
   - **Action**: Copy + add new error codes as discovered

6. **wk-voice-transcription streaming** (edge function + coach-stream.ts helpers)
   - Real-Time Transcription webhook handler
   - SSE-style streaming to browser
   - Coach generation with three-layer prompts
   - Stage cursor advancement (agent voice matching)
   - **Status**: 1,360 lines, tested, production
   - **Action**: Copy; it's core to the coach system

7. **Post-call AI** (wk-ai-postcall edge function)
   - Summarizes transcript, suggests next steps
   - Integrates with outcome automation (move contact, send SMS, create task)
   - **Status**: Stable, used daily
   - **Action**: Copy

8. **Outcome automation** (wk-outcome-apply + ColumnAutomation type)
   - Execute on outcome column selection: SMS template send, contact stage move, task creation
   - **Status**: Tested in pipeline moves
   - **Action**: Copy

9. **Call recording** (wk-voice-recording edge function)
   - Fetch MP3 from Twilio, upload to Supabase Storage, sign URL
   - **Status**: Works reliably
   - **Action**: Copy

### Database schema elements

10. **wk_calls table** (columns, RLS, realtime)
    - Agent-scoped read (own calls)
    - Admin full access
    - Realtime on update
    - **Action**: Use existing; don't duplicate

11. **wk_contacts table** (with campaign_id, pipeline_column_id, tags)
    - **Action**: Use existing; don't duplicate

12. **wk_dialer_queue table** (with priority, attempts, scheduled_for, status)
    - **Action**: Use existing; query patterns are solid

13. **wk_coach_facts table** (with keywords, is_active)
    - **Status**: Schema finalized 2026-04-29
    - **Action**: Use existing; don't duplicate

### Test infrastructure

14. **Twilio integration tests** (`src/core/integrations/__tests__/*.test.ts`)
    - Device singleton, multi-tab detection, token refresh, incoming call
    - **Action**: Copy + extend for V2 features

15. **Coach stream tests** (coach-stream.test.ts)
    - retrieveFacts() algorithm, opener ban list
    - **Action**: Copy + add facts as they evolve

---

## 9. WHAT TO REBUILD FROM ZERO

### UI layers (too intertwined to salvage)

1. **DialerPage + OverviewPage** (pages/DialerPage.tsx, components/dialer/v3/)
   - **Why**: PR 140–153 rebuilt 3× in 2 weeks. Still has dead v2 code. Confusing layout (hero card → queue preview → in-call room transitions). V3 introduced SessionFooter, SessionControlBar (PR 152, 153) but full refactor to atomic components still pending. 
   - **Rebuild scope**: Extract atomic components (HeroCard → separate CampaignPreview, QueuePreview → separate RecentLeadsList, PacingControl → separate PacingMode), define clear UI state machine, kill dead code.
   - **Evidence**: DialerPage.tsx is now 11 lines (just mounts OverviewPage); OverviewPage is monolithic 400+ lines mixing presentation + logic.

2. **LiveCallScreen** (components/live-call/LiveCallScreen.tsx)
   - **Why**: Four-column layout is tight but logic is spread across 600+ lines. Transcript, coach, script, SMS all in one file. Hard to test, hard to reuse script in isolation, hard to add new panes.
   - **Rebuild scope**: Break into: TranscriptPane, CoachPane, ScriptPane, MidCallSmsPane (all Suspense-ready), parent LiveCallContainer orchestrates layout + keyboard shortcuts. Define clear data contracts for each pane.
   - **Evidence**: PR 138 refactored state machine, but UI layout stayed the same. Next refactor should separate concerns.

3. **SettingsPage** (pages/SettingsPage.tsx)
   - **Why**: 4,700+ lines. Covers AI coach config, SMS templates, Twilio numbers, channels (WhatsApp, email), agent CRUD, kill switches. Too much in one file. Also, some tabs (Legacy prompt collapse) are dead weight.
   - **Rebuild scope**: Break into separate pages: SettingsAiCoach, SettingsSmsTemplates, SettingsNumbers, SettingsChannels. Each page owns its own state + hooks. Keep a router to switch tabs.
   - **Evidence**: Line count alone; also tabs have zero logical coupling (AI config doesn't need SMS templates, etc.).

4. **InboxPage** (pages/InboxPage.tsx)
   - **Why**: 617 lines, mixing contact search, message thread list, message detail, reply UI. Hard to test contact-list search in isolation from message rendering.
   - **Rebuild scope**: Split into: InboxContactList (search + list), InboxThreadPanel (thread UI), InboxReplyPanel (reply UI). Parent InboxPage orchestrates layout.

5. **CallsPage + PastCallScreen** (pages/CallsPage.tsx, pages/PastCallScreen.tsx)
   - **Why**: Filtering, sorting, pagination logic spread across two files. Transcript replay doesn't cache (refetches on every remount). Timestamp formatting duplicated.
   - **Rebuild scope**: Centralize call list state (filters, sort, pagination) in useCallsListState(). Make transcript replay a pure component (no side effects). Reuse CallDetailCard across both pages.

### Store / state management

6. **SmsV2Store** (store/SmsV2Store.tsx)
   - **Why**: Zustand-like reducer but not Zustand (custom React context). Works, but doesn't integrate with React Query (hooks fetch from DB separately, pump into store). Mismatch: "real" data lives in Supabase, store is a cache, but logic doesn't reflect that.
   - **Rebuild scope**: Migrate to Zustand (or keep context but adopt its conventions). Better yet: use React Query + TanStack Table for contacts/columns; use context only for cross-screen state (active call, session).
   - **Evidence**: useHydrateContacts() pumps DB data into store; later components query both store AND DB (see InboxPage line 45: `supabase.from(...)` alongside store reads).

### Hooks (some are over-grown)

7. **useAiSettings** (hooks/useAiSettings.ts)
   - **Why**: Reads + writes both old (live_coach_system_prompt) and new (coach_style_prompt, coach_script_prompt) prompts, with fallback logic. Deprecated column adds complexity.
   - **Rebuild scope**: Drop old column read/write; assume both new prompts exist (migration seeded them). Simplify to read/write two strings + notify realtime subscribers.

8. **useCalls** (hooks/useCalls.ts)
   - **Why**: Fetches wk_calls with filters (agent_id, campaign_id, status) and realtime. But also handles recent-calls dedup (by contact_id) which was added in PR 137. Dedup logic duplicated elsewhere.
   - **Rebuild scope**: Extract dedup into a pure helper function (dedupeCallsByContactId). Make useCalls just a data fetcher, no business logic.

### Type definitions

9. **types/index.ts** (200+ lines)
   - **Why**: Mixes DB schema (wk_calls columns) with UI types (Agent, Contact, Campaign). CoachEvent mixes live-coach and post-call summaries. ActivityEvent is open-ended union.
   - **Rebuild scope**: Split into DatabaseTypes (from Supabase schema), UITypes (for components), ServiceTypes (for hooks + edge functions). Use discriminated unions for ActivityEvent (call_inbound, call_outbound, sms_inbound, etc.).

---

## 10. CRM V2 ARCHITECTURE PLAN

### Folder structure
```
src/features/crm-v2/
  ├── pages/
  │   ├── CrmV2Layout.tsx          ← root; mounts Providers
  │   ├── DialerPage.tsx           ← /crm-v2/dialer
  │   ├── InboxPage.tsx            ← /crm-v2/inbox
  │   ├── CallsPage.tsx            ← /crm-v2/calls
  │   ├── ContactsPage.tsx         ← /crm-v2/contacts
  │   ├── PipelinesPage.tsx        ← /crm-v2/pipelines
  │   ├── SettingsPage.tsx         ← /crm-v2/settings
  │   ├── DashboardPage.tsx        ← /crm-v2/dashboard (admin)
  │   ├── LoginPage.tsx            ← /crm-v2/login
  │   └── [others TBD]
  ├── components/
  │   ├── layout/
  │   │   ├── CrmV2Sidebar.tsx
  │   │   ├── CrmV2StatusBar.tsx
  │   │   └── CrmV2Guard.tsx       ← RLS check, workspace_role enforcement
  │   ├── dialer/
  │   │   ├── PreCallRoom/         ← atomic: campaign hero, queue list, pacing
  │   │   │   ├── CampaignHero.tsx
  │   │   │   ├── QueuePreview.tsx
  │   │   │   └── PacingControl.tsx
  │   │   ├── InCallRoom/          ← atomic: four-pane live call
  │   │   │   ├── TranscriptPane.tsx
  │   │   │   ├── CoachPane.tsx
  │   │   │   ├── ScriptPane.tsx
  │   │   │   └── MidCallSmsPane.tsx
  │   │   └── SessionControls.tsx  ← pause, resume, skip, next, hangup
  │   ├── inbox/
  │   │   ├── ContactSearchBox.tsx ← input + results dropdown
  │   │   ├── ThreadList.tsx       ← scroll list of contacts with unread badges
  │   │   ├── ThreadPanel.tsx      ← message history + UI
  │   │   └── ReplyComposer.tsx    ← textarea + template picker + send
  │   ├── calls/
  │   │   ├── CallsTable.tsx       ← sortable, filterable, paginated
  │   │   ├── CallDetail.tsx       ← single call card (reused in CallsPage + dashboard)
  │   │   ├── TranscriptViewer.tsx ← read-only transcript replay
  │   │   └── CallFilters.tsx      ← agent, status, date range dropdowns
  │   ├── contacts/
  │   │   ├── ContactsTable.tsx
  │   │   ├── ContactRow.tsx       ← single contact row
  │   │   ├── BulkUploadModal.tsx
  │   │   └── ContactDetail.tsx    ← side panel or modal
  │   ├── pipelines/
  │   │   ├── KanbanBoard.tsx      ← columns + cards
  │   │   ├── PipelineColumn.tsx
  │   │   └── ContactCard.tsx      ← draggable card
  │   ├── settings/
  │   │   ├── SettingsRouter.tsx   ← tab navigation
  │   │   ├── AiCoachSettings.tsx  ← three-layer coach UI
  │   │   ├── SmsTemplatesTab.tsx
  │   │   ├── ChannelsTab.tsx
  │   │   ├── TwilioNumbersTab.tsx
  │   │   └── AgentsTab.tsx
  │   └── shared/
  │       ├── StageSelector.tsx    ← reused in contacts, pipelines, calls
  │       ├── TemplateEditor.tsx   ← MD editor for SMS + email templates
  │       ├── CoachFactsEditor.tsx ← KB fact CRUD
  │       └── ErrorBoundary.tsx    ← crash boundaries per section
  ├── hooks/
  │   ├── useCrmAuth.ts            ← check workspace_role, admin status
  │   ├── useDialerState.ts        ← session + pacing + call state (from core reducer)
  │   ├── useCalls.ts              ← fetch + realtime + filters
  │   ├── useContacts.ts           ← fetch + search + bulk ops
  │   ├── useMessages.ts           ← fetch + realtime per contact
  │   ├── usePipelines.ts          ← fetch columns + realtime
  │   ├── useCampaigns.ts          ← fetch campaigns + stats
  │   ├── useAiSettings.ts         ← fetch three-layer config
  │   ├── useCoachFacts.ts         ← CRUD KB
  │   └── [others as needed]
  ├── lib/
  │   ├── callLifecycleReducer.ts  ← (COPY from smsv2)
  │   ├── callLifecycleReducer.types.ts (COPY from smsv2)
  │   ├── dialerSession.types.ts   ← (COPY from smsv2)
  │   ├── twilioErrorMap.ts        ← (COPY from smsv2)
  │   ├── startCallOrchestration.ts ← (COPY from smsv2, adapt if needed)
  │   ├── scriptParser.ts          ← (COPY from smsv2)
  │   ├── scriptMatcher.ts         ← (COPY from smsv2)
  │   └── [new utilities as needed]
  ├── types/
  │   ├── index.ts                 ← single types file (refactored)
  │   │   ├── // Database types (from schema)
  │   │   ├── // UI component types
  │   │   ├── // Service types
  │   │   └── // Discriminated unions
  │   └── [optional: split into sub-files if >500 lines]
  ├── data/
  │   └── (NO mock data in V2; use real DB only)
  ├── store/
  │   ├── dialerSessionProvider.tsx ← (COPY from smsv2; keep context)
  │   ├── activeCallProvider.tsx    ← (COPY from smsv2; keep context)
  │   └── (Consider: CrmStateProvider for cross-page state?)
  └── __tests__/
      ├── (copy relevant tests from smsv2)
      └── (add new tests for refactored components)
```

### Integration contracts

**With `core/integrations/`:**
- **twilio-voice.ts** – CrmV2 uses fetchVoiceToken(), createDevice(), muteAllCalls(), etc. (NO changes needed)
- **ghl.ts** – Optional: if WhatsApp config is in CrmV2, check if GHL integration is used (likely not; Unipile is the normalizer)

**With `core/contracts/`:**
- Define explicit contracts for:
  - Call record shape (wk_calls)
  - Contact record shape (wk_contacts)
  - Message record shape (wk_sms_messages)
  - Coach event shape (wk_live_coach_events)
  - These live in src/core/contracts/*.ts (if created) or types/index.ts (scoped to crm-v2)

**With Supabase edge functions:**
- CrmV2 calls wk-* functions via supabase.functions.invoke() (no change to existing pattern)
- Each hook documents which edge function it calls and what it expects back

**RLS + Realtime:**
- CrmV2 respects existing RLS policies (agent can see own calls, own contacts in own campaigns, etc.)
- All table subscriptions use `.on('*', ...)` with filtering at the hook level (don't rely on RLS to prevent reads; do it proactively)

### Routing strategy

**Dual-run period (Phase 1):**
- Keep `/crm/*` pointing to `Smsv2Layout` (old code) — **do NOT modify the old routes**
- Add new `/crm-v2/*` routes (CrmV2Layout) in parallel
- Hugo tests V2 in parallel with agents using old /crm
- No data conflict (both read same DB tables; writes go through same wk-* edge functions)

**Cutover (Phase 2):**
- Change `/crm` route to `CrmV2Layout`
- Keep `/smsv2/*` redirect → `/crm/*` for backward-compat
- Delete old `/crm-v2/*` routes
- Retire smsv2/ folder after a 1-week deprecation window

**No forced migration:** Agents' bookmarks, SSO deep links, all continue to work; they're just served by the new code.

---

## 11. STEP-BY-STEP EXECUTION PLAN

### PR 1: Folder structure + base layout + types refactor
**Scope:** Foundation layer
- Create `src/features/crm-v2/` folder structure
- Move + refactor types/index.ts → crm-v2/types/ (split DB / UI / Service types into discriminated unions)
- Create CrmV2Layout.tsx (copy Smsv2Layout, swap imports, add CrmV2Guard)
- Create stub pages (all return placeholder <div>)
- Add routes in src/App.tsx: `/crm-v2/*` → CrmV2Layout (no /crm change yet)
- Add RLS contract tests (ensure agent can only see own data)

**Files touched:** 15 new, 2 modified (types, App.tsx)
**Blast radius:** LOW (new code, no existing changes)
**Tests required:** Folder-level smoke test, RLS policy verification

---

### PR 2: Core state management + providers
**Scope:** Wiring state machine + session state
- Copy `callLifecycleReducer.ts`, `callLifecycleReducer.types.ts`, `dialerSession.types.ts` from smsv2
- Copy `src/core/integrations/twilio-voice.ts` (no mods)
- Create crm-v2/store/activeCallProvider.tsx (from smsv2)
- Create crm-v2/store/dialerSessionProvider.tsx (from smsv2)
- Create CrmV2Layout.tsx with stacked providers
- Unit tests: reducer state transitions, provider context

**Files touched:** 8 new, 0 modified (copied, not moved)
**Blast radius:** LOW (new only)
**Tests required:** Reducer tests (copy from smsv2), provider mount tests

---

### PR 3: Authentication + workspace enforcement
**Scope:** RLS + role checking
- Create crm-v2/components/CrmV2Guard.tsx (verify workspace_role, workspace_id)
- Wrap CrmV2Layout with CrmV2Guard
- Create useCrmAuth() hook (check role, return admin status, agent name)
- Test: admin can access /crm-v2, non-admin can't; agent can access own campaigns

**Files touched:** 3 new, 1 modified (CrmV2Layout)
**Blast radius:** LOW
**Tests required:** Guard component tests (valid / invalid roles)

---

### PR 4: Dialer — atomic PreCallRoom components
**Scope:** UI foundation for dialer
- Create components/dialer/PreCallRoom/:
  - CampaignHero.tsx (display campaign name, totalLeads stat)
  - QueuePreview.tsx (render next 5 via useMyDialerQueue)
  - PacingControl.tsx (radio: manual / auto, delay input)
- Create hooks/useCampaigns.ts (fetch wk_dialer_campaigns, realtime)
- Create hooks/useMyDialerQueue.ts (copy from smsv2, test integration)
- Create pages/DialerPage.tsx (mount PreCallRoom components, placeholder InCallRoom)
- Unit tests: each component renders correctly, data flows

**Files touched:** 5 new, 2 copied
**Blast radius:** MEDIUM (depends on Supabase queries)
**Tests required:** Component rendering, data fetching (mock Supabase)

---

### PR 5: Dialer — start / hangup flow
**Scope:** Wiring call orchestration
- Copy startCallOrchestration.ts from smsv2
- Create ActiveCallContext effect (call startCallOrchestration on StartButton click)
- Wire hang-up button → endCall action
- Test: clicking Start calls wk-calls-create, Twilio device connects, ringing heard
- Add toast on error (spend limit exceeded, Twilio error, etc.)

**Files touched:** 2 new, 2 modified (DialerPage, ActiveCallContext)
**Blast radius:** MEDIUM (calls real wk-calls-create; affects Supabase + Twilio)
**Tests required:** E2E dialer start/hang-up (may need Twilio mocking)

---

### PR 6: Dialer — InCallRoom four-pane UI (non-interactive)
**Scope:** Layout only; no transcript/coach logic yet
- Create components/live-call/:
  - TranscriptPane.tsx (static placeholder, ready for realtime)
  - CoachPane.tsx (static placeholder, ready for realtime)
  - ScriptPane.tsx (static script display, no stage cursor yet)
  - MidCallSmsPane.tsx (template list, no send yet)
- Create pages/PastCallScreen.tsx (show static transcript from wk_calls record)
- Layout: grid 4-column in Live, 2-column in Past
- No interactive features; just CSS grid layout

**Files touched:** 6 new, 1 modified (DialerPage)
**Blast radius:** LOW (UI only, no data logic)
**Tests required:** Snapshot tests, layout breakpoint tests

---

### PR 7: Live call — realtime transcript + CoachPane
**Scope:** Streaming data into live call
- Hook useCallTimeline.ts (subscribe wk_live_transcripts, realtime)
- Hook useCoachStream.ts (subscribe wk_live_coach_events, realtime)
- Update TranscriptPane.tsx (render wk_live_transcripts from hook)
- Update CoachPane.tsx (render wk_live_coach_events, SSE streaming animation)
- Test: transcript appears in real-time during call
- Realtime subscriptions tested in isolation

**Files touched:** 2 new hooks, 2 modified components
**Blast radius:** MEDIUM (depends on wk-voice-transcription edge fn + Supabase realtime)
**Tests required:** Realtime subscription tests, component animation tests

---

### PR 8: Script navigator + stage cursor
**Scope:** Script parsing + stage matching
- Copy scriptParser.ts, scriptMatcher.ts from smsv2
- Hook useScriptWithStage.ts (parse campaign.script_md, match agent voice against anchors, compute current_stage)
- Update ScriptPane.tsx (render script sections with stage cursor highlight)
- Test: stage advances as agent reads script aloud

**Files touched:** 2 new hooks, 1 modified component, 2 copied
**Blast radius:** MEDIUM (depends on script_md format, anchor matching logic)
**Tests required:** Script parsing tests (copy from smsv2), stage cursor tests

---

### PR 9: Mid-call SMS + send
**Scope:** Template picking + SMS send
- Hook useSmsTemplates.ts (fetch templates, realtime)
- Create components/shared/TemplateEditor.tsx (reusable MD editor)
- Update MidCallSmsPane.tsx (template picker, merge fields, send button)
- Function: POST wk-sms-send on send button click
- Test: SMS appears in wk_sms_messages realtime, inbox updates

**Files touched:** 2 new hooks, 2 new/modified components
**Blast radius:** MEDIUM (calls wk-sms-send edge fn)
**Tests required:** SMS send E2E test, template merge test

---

### PR 10: Call outcome + realtime pipeline
**Scope:** Outcome selection, contact stage move, automation
- Create components/shared/StageSelector.tsx (dropdown of outcome columns)
- Hook useOutcomeApply.ts (call wk-outcome-apply edge fn)
- Button: "Pick outcome" in PostCallPanel
- Test: clicking outcome updates wk_calls + wk_contacts (pipeline_column_id), automation fires
- Realtime: PipelinesPage sees contact move instantly

**Files touched:** 1 new component, 1 new hook, 2 modified (PostCallPanel, PipelinesPage)
**Blast radius:** HIGH (affects wk_calls + wk_contacts, triggers automation)
**Tests required:** Outcome apply E2E, automation trigger test

---

### PR 11: Post-call AI summary
**Scope:** Async summary generation
- Hook usePostCallAi.ts (poll/subscribe wk_calls.ai_summary after call ends)
- Integrate wk-ai-postcall edge fn (already exists; just call it)
- Display summary in PastCallScreen
- Test: summary appears 5-10s after call ends

**Files touched:** 1 new hook, 1 modified component
**Blast radius:** LOW (read-only on wk_calls)
**Tests required:** Summary display test, poll/subscribe test

---

### PR 12: Inbox — contact search + thread list
**Scope:** Message browsing UI
- Hook useContactSearch.ts (search wk_contacts by name/phone)
- Hook useInboxThreads.ts (fetch message threads per contact, realtime)
- Create components/inbox/ContactSearchBox.tsx
- Create components/inbox/ThreadList.tsx
- Create pages/InboxPage.tsx (layout: search + list + detail)
- Test: typing in search updates contact list, clicking contact shows messages

**Files touched:** 3 new hooks, 3 new components, 1 new page
**Blast radius:** MEDIUM (depends on Supabase queries + realtime)
**Tests required:** Search test, thread list test, realtime updates

---

### PR 13: Inbox — message detail + reply
**Scope:** Reading + sending messages
- Create components/inbox/ThreadPanel.tsx (show contact + message history + timestamps)
- Create components/inbox/ReplyComposer.tsx (textarea + template picker + send)
- Hook useContactMessages.ts (fetch messages, realtime)
- Integrate wk-sms-send on reply send
- Test: reply appears in thread instantly, other agents see it

**Files touched:** 2 new components, 1 new hook
**Blast radius:** MEDIUM (calls wk-sms-send)
**Tests required:** Message compose/send test, realtime message receipt

---

### PR 14: Contacts page — table + bulk upload
**Scope:** Contact list management
- Hook useContacts.ts (fetch wk_contacts, realtime, filter by campaign)
- Create components/contacts/ContactsTable.tsx (sortable, searchable, paginated via React Table)
- Create components/contacts/BulkUploadModal.tsx (CSV upload)
- Create pages/ContactsPage.tsx
- Test: bulk upload inserts wk_contacts, table displays them

**Files touched:** 2 new hooks, 3 new components, 1 new page
**Blast radius:** MEDIUM (CSV import, wk_contacts writes)
**Tests required:** CSV parsing test, table sort/filter test, bulk insert test

---

### PR 15: Contacts detail
**Scope:** Single contact view + history
- Create components/contacts/ContactDetail.tsx (call history, message history, pipeline stage)
- Hook useContactTimeline.ts (fetch wk_calls + wk_sms_messages for contact, realtime)
- Create pages/ContactDetailPage.tsx
- Test: clicking contact in CallsPage / InboxPage shows detail

**Files touched:** 1 new hook, 2 new components, 1 new page
**Blast radius:** LOW (read-only)
**Tests required:** Detail page rendering test, realtime updates

---

### PR 16: Pipelines — Kanban board
**Scope:** Drag-drop contact stages
- Hook usePipelines.ts (fetch wk_pipeline_columns + wk_contacts, realtime)
- Create components/pipelines/KanbanBoard.tsx (dnd-kit or react-beautiful-dnd)
- Create components/pipelines/PipelineColumn.tsx
- Create components/pipelines/ContactCard.tsx (draggable)
- Create pages/PipelinesPage.tsx
- Test: drag contact to stage, it moves in DB realtime

**Files touched:** 1 new hook, 4 new components, 1 new page
**Blast radius:** MEDIUM (contact stage moves via wk-outcome-apply)
**Tests required:** Drag-drop test, realtime update test

---

### PR 17: Calls page + history
**Scope:** Call list + filtering
- Hook useCalls.ts (fetch wk_calls, realtime, filters: agent/status/date)
- Create components/calls/CallsTable.tsx (React Table)
- Create components/calls/CallFilters.tsx (agent/status/date dropdowns)
- Create pages/CallsPage.tsx (layout: filters + table + detail on click)
- Test: filter by agent shows only their calls, realtime count updates

**Files touched:** 1 new hook, 3 new components, 1 new page
**Blast radius:** LOW (read-only)
**Tests required:** Filter test, table pagination test

---

### PR 18: AI Coach settings — three-layer config
**Scope:** Coach prompt UI
- Hook useAiSettings.ts (read/write wk_ai_settings, realtime updates to agents)
- Hook useCoachFacts.ts (CRUD wk_coach_facts, realtime)
- Create components/shared/CoachFactsEditor.tsx (add/edit/delete facts)
- Create components/settings/AiCoachSettings.tsx (three-layer textarea tabs)
- Create components/settings/KnowledgeBaseTab.tsx (facts list + editor)
- Create pages/SettingsPage.tsx (tab router)
- Test: editing coach prompt, facts appear in next AI generation

**Files touched:** 2 new hooks, 4 new components, 1 new page
**Blast radius:** MEDIUM (wk_ai_settings writes, affects all agents)
**Tests required:** Settings save test, coach prompt update test (via realtime), facts CRUD test

---

### PR 19: SMS templates + Twilio numbers
**Scope:** Template + channel configuration
- Hook useSmsTemplates.ts (CRUD wk_sms_templates)
- Hook useTwilioNumbers.ts (CRUD wk_numbers, realtime)
- Create components/settings/SmsTemplatesTab.tsx
- Create components/settings/TwilioNumbersTab.tsx
- Update pages/SettingsPage.tsx (add tabs)
- Test: create template, use in MidCallSmsSender; assign number to campaign

**Files touched:** 2 new hooks, 2 new components, 1 modified page
**Blast radius:** MEDIUM (wk_sms_templates + wk_numbers writes)
**Tests required:** Template CRUD test, number assignment test

---

### PR 20: Channels (WhatsApp, email) + Resend/Unipile config
**Scope:** Outbound channel configuration
- Hook useChannels.ts (read/write channel config: Unipile workspace ID, Resend API key)
- Create components/settings/ChannelsTab.tsx
- Update pages/SettingsPage.tsx (add channels tab)
- Test: toggling WhatsApp enables wk-sms-send to detect and use Unipile

**Files touched:** 1 new hook, 1 new component, 1 modified page
**Blast radius:** MEDIUM (channel config affects all sends)
**Tests required:** Channel config save test, send routing test (SMS vs WhatsApp)

---

### PR 21: Admin dashboard + leaderboard
**Scope:** Admin-only metrics pages
- Hook useAgentsToday.ts (fetch agent stats: calls, answers, SMS, spend)
- Hook useReports.ts (aggregated metrics: call duration, answer rate, ROI)
- Create pages/DashboardPage.tsx (leaderboard grid, live stats)
- Create pages/LeaderboardPage.tsx (public agent rankings, sorted)
- Add routes to CrmV2Layout (admin-only guard on dashboard)
- Test: admin sees all agents' stats, public leaderboard hides internal metrics

**Files touched:** 2 new hooks, 2 new pages
**Blast radius:** MEDIUM (read-only, but depends on call aggregation logic)
**Tests required:** Stats aggregation test, admin-only guard test

---

### PR 22: Error handling + kill switches
**Scope:** Safety + outage control
- Hook useKillSwitch.ts (check wk_kill_switches: global_dialer, agent_dialer, ai_coach)
- Add banner UI: "Dialer paused by admin"
- Add spend limit check (re-use from useCalls, extend for daily budget)
- Update all major action handlers (start dialer, send SMS, send email) to check kill switches + spend
- Test: kill switch blocks dialing, banner shows, spend limit shows warning

**Files touched:** 1 new hook, 3+ modified components (DialerPage, InboxPage, etc.)
**Blast radius:** MEDIUM (safety layer, affects all main actions)
**Tests required:** Kill switch test, spend limit test

---

### PR 23: E2E smoke test + migration guide
**Scope:** Integration + documentation
- Create e2e tests: sign in → dialer → call → SMS → outcome → calls history ✓
- Create migration guide for agents: "How to use /crm-v2" (bookmarks, keyboard shortcuts, etc.)
- Create rollback plan: if V2 breaks, agents can use /crm (old code)
- Create runbook for Hugo: how to hot-swap routes on the day

**Files touched:** Playwright test file, 2 docs
**Blast radius:** LOW (no code changes, docs only)
**Tests required:** Full E2E test

---

### PR 24: Flip the switch — route `/crm` to CrmV2Layout
**Scope:** Go-live
- Modify src/App.tsx: change `/crm` route from `Smsv2Layout` to `CrmV2Layout`
- Keep `/smsv2/*` redirect → `/crm/*` for backward-compat
- Monitor: error logs, user feedback
- If issues: revert route to Smsv2Layout (fast rollback)

**Files touched:** 1 modified (App.tsx)
**Blast radius:** CRITICAL (all agents affected)
**Tests required:** Pre-switch: full E2E suite pass, Hugo sign-off

---

### PR 25: Cleanup — delete smsv2 folder (optional, Phase 2+)
**Scope:** Housekeeping
- Once V2 is stable for 1 week, delete `src/features/smsv2/` folder
- Keep `/smsv2/*` redirect → `/crm/*` indefinitely (for old links)
- Update CLAUDE.md: mark smsv2 as deprecated

**Files touched:** Delete 50+ files (smsv2 folder)
**Blast radius:** CRITICAL but **only if V2 is stable**
**Tests required:** Quick smoke test on /crm, no sign-in errors

---

## 12. TEST PLAN

### Golden-path scenarios (Playwright E2E)

1. **Outbound call flow**
   ```
   Given an agent signed in to /crm-v2/dialer
   And a campaign with 5 contacts
   When agent clicks "Start"
   Then Twilio device connects
   And agent hears ringing
   When caller answers
   Then live-call UI appears (transcript, coach, script, SMS)
   When agent reads script line
   Then coach suggestion appears in realtime
   When agent speaks, transcript updates
   Then script stage cursor advances
   When caller hangs up
   Then post-call summary generates
   When agent clicks "Interested" outcome
   Then contact moves to "Interested" pipeline stage (realtime)
   ```

2. **SMS thread — mid-call**
   ```
   Given a live call is in-progress
   When agent clicks "Send SMS"
   And picks a template
   And clicks "Send"
   Then SMS appears in wk_sms_messages (realtime)
   And contact sees SMS on their phone
   When contact replies
   Then reply appears in InboxPage thread
   ```

3. **Contact pipeline move**
   ```
   Given PipelinesPage is open
   And contact is in "New Lead" stage
   When agent drags contact to "Interested"
   Then contact moves realtime
   And wk_contacts.pipeline_column_id updates
   And any automation (SMS, task, etc.) fires
   ```

4. **Knowledge base fact retrieval**
   ```
   Given a live call with coach enabled
   And KB has fact: entry_minimum = "£500"
   And keywords: ["minimum", "how much"]
   When caller says "What's the minimum entry?"
   Then coach suggestion includes "Entry from £500"
   ```

5. **Multi-agent realtime sync**
   ```
   Given two agents (Alice, Bob) on same call
   When Alice updates contact notes
   Then Bob sees notes update (realtime)
   When Alice sends SMS
   Then Bob sees message in thread
   ```

### Edge cases (Playwright + unit tests)

6. **Missed call**
   ```
   When Twilio rings but caller doesn't answer
   And call times out after 35s
   Then wk_calls.status = 'missed'
   And agent can click "Next" to dial next lead
   And no outcome required (auto-logs as No Pickup)
   ```

7. **Voicemail detection**
   ```
   When Twilio detects voicemail (MachineDetection=Enable)
   Then wk_calls.status = 'voicemail'
   And agent sees "Leave voicemail?" prompt
   When agent hangs up
   Then outcome defaults to "Voicemail"
   ```

8. **Busy signal**
   ```
   When Twilio returns error 31486 (number busy)
   Then toast shows "Destination is busy"
   And wk_calls.status = 'failed'
   And agent can immediately dial next lead (no manual hangup needed)
   ```

9. **Hung up mid-dial**
   ```
   When caller hangs up while agent is dialing
   Then Twilio error 31005 (device unavailable)
   And toast shows friendly message
   And agent can click "Next" without manual reconnect
   ```

10. **Lost network during call**
    ```
    When agent's network drops (e.g. Wi-Fi disconnect)
    Then Twilio call continues (remote Twilio, not local)
    When agent reconnects browser
    Then reconnect flow: POST wk-calls-create to re-fetch call state
    And UI re-syncs (transcript, coach, script)
    And agent can continue call (if <1h old)
    ```

11. **Multi-tab Twilio identity collision**
    ```
    When agent opens /crm-v2/dialer in Tab A and Tab B
    And Tab A dials a contact
    Then Tab B should NOT connect to same call
    (PR 143 fix: suffix Twilio identity per tab)
    ```

12. **Spend limit exceeded**
    ```
    When agent's daily spend exceeds limit
    And agent clicks "Next" or "Start"
    Then wk-spend-check blocks the call
    And toast shows "Daily spend limit reached"
    And agent must wait for quota reset (midnight)
    ```

13. **AI coach with empty KB**
    ```
    When coach KB has zero facts
    And caller asks "How many partners?"
    Then coach suggests "I'll check that and come back to you"
    (per script prompt instruction)
    ```

14. **SMS template merge fields**
    ```
    When SMS template has {{first_name}} {{deal_name}}
    And agent sends to contact (Sarah, Liverpool 15-bed)
    Then SMS becomes "Hi Sarah, interested in the Liverpool 15-bed deal?"
    ```

15. **Call recording saved to Storage**
    ```
    When call ends
    Then Twilio webhooks to wk-voice-recording
    And MP3 is uploaded to supabase.storage
    And PastCallScreen shows playable recording (signed URL)
    ```

### Test matrix

| Test Type | Coverage | Tools |
|-----------|----------|-------|
| **E2E (golden path + 5 edge cases)** | Pages, routing, user flows | Playwright, mock Twilio |
| **Integration** | Edge functions, Supabase realtime | Playwright, real Supabase test db |
| **Unit** | Reducers, hooks, helpers | Vitest |
| **Realtime** | Supabase subscriptions | Vitest + Supabase mock |
| **Accessibility** | a11y (WCAG 2.1 AA minimum) | axe/pa11y in Playwright |
| **Performance** | Call latency, re-renders | Chrome DevTools, React Profiler |

### Acceptance criteria (before flipping `/crm` route)

- All golden-path E2E tests pass ✓
- All 9 edge-case tests pass ✓
- No console errors on /crm-v2 pages ✓
- RLS policies tested (agent can't see other agents' calls) ✓
- Kill switch blocks dialing (admin safety) ✓
- Spend limit blocks calls (billing safety) ✓
- Call recording saves + plays ✓
- Coach streams realtime (coach-stream.test.ts passes) ✓
- Three-layer coach config tested (wk-voice-transcription.contract.test.ts passes) ✓
- Performance: call latency <5s, UI re-render <16ms (60 fps) ✓
- Accessibility: 0 critical axe violations ✓

---

## 13. RISKS + QUESTIONS

### Technical risks

1. **Twilio Device token refresh during long calls**
   - **Risk**: Token TTL = 1h. If agent is on a call > 1h, token expires mid-call and the call may fail.
   - **Evidence**: src/core/integrations/twilio-voice.ts fetchVoiceToken() refreshes token at request time, but not during call.
   - **Question**: Does Twilio auto-refresh the Device token, or does the browser need to handle it?
   - **Mitigation**: Test a 90-minute call simulation; add token refresh trigger in ActiveCallContext.

2. **Multi-tab Twilio Device clash**
   - **Risk**: Twilio Device is a singleton per tab. If agent opens 2 tabs with /crm, both try to create Device with same identity.
   - **Evidence**: PRs 143–144 added tab-specific suffix to identity (fixed most cases), but the fix was 2 PRs of churn (sign it wasn't bulletproof).
   - **Question**: Is the current suffix strategy (per-tab random suffix) sufficient? Will it cause issues with call routing if the agent's browser crashes and reconnects?
   - **Mitigation**: Test multi-tab scenario thoroughly; monitor production for identity errors (31005, 31084).

3. **Call state recovery after browser crash**
   - **Risk**: If agent's browser crashes mid-call, the Twilio call continues (it's on Twilio's servers), but the browser doesn't know about it. On reconnect, the call is "orphaned" (no UI, but Twilio is connected to no one).
   - **Evidence**: callLifecycleReducer.ts has no "recover hanging call" flow.
   - **Question**: What happens if an agent dials, the browser crashes, they refresh, and the same contact is now calling in from Twilio (ringing in the softphone)?
   - **Mitigation**: Implement a "reconnect to orphaned call" flow on page load (check Twilio Device for any active calls, reconnect UI if found).

4. **Realtime subscriptions under high agent count**
   - **Risk**: If CRM scales to 50+ agents all on calls, Supabase realtime may struggle (Postgres WAL, subscription fan-out).
   - **Evidence**: No stress testing mentioned in git log.
   - **Question**: At what agent count does realtime latency degrade (transcript, coach, messages)?
   - **Mitigation**: Load test with 20, 50, 100 concurrent agents; monitor Supabase metrics (replication lag, connection count).

5. **Coach streaming SSE timeout**
   - **Risk**: wk-voice-transcription streams coach suggestions via SSE. If the browser closes the SSE connection, the edge function may continue writing.
   - **Evidence**: SSE streaming is relatively new in this codebase (PR 572 refactored it).
   - **Question**: Does the edge function detect a closed SSE connection and stop writing? Or does it buffer indefinitely?
   - **Mitigation**: Monitor edge function logs for orphaned streams; implement heartbeat/ping in SSE stream.

### Organizational / process risks

6. **Lack of integration tests for edge functions**
   - **Risk**: Edge functions (wk-calls-create, wk-voice-transcription, wk-outcome-apply, etc.) are tested in isolation but not in sequence (e.g., start call → receive transcript → apply outcome).
   - **Evidence**: Git log shows hotfixes to individual functions but no integration test suite.
   - **Question**: If we change wk-calls-create contract (add a new required field), will we catch it before deploying?
   - **Mitigation**: Create a `supabase/functions/__tests__/integration/` directory with flow tests (start → transcript → outcome).

7. **Three-layer coach prompt must stay in sync**
   - **Risk**: Coach defaults live in two places: (1) wk_ai_settings table, (2) DEFAULT_*_PROMPT constants in wk-voice-transcription/index.ts. If they drift, the model uses old behavior.
   - **Evidence**: COACH_PROMPT_LAYERS.md explicitly states "MUST stay in sync" (line 207).
   - **Question**: Is there a deploy order that locks the two in sync? Or is it a manual checklist?
   - **Mitigation**: Add a pre-deploy check: grep the migration + edge function for matching DEFAULT_PROMPT values. Fail the deploy if they differ.

8. **Kill switch enforcement is client-side + server-side**
   - **Risk**: Client checks kill switch to show/hide the "Start" button, but server also checks (wk-calls-create). If client check fails to block, server will catch it, but the UX is bad (agent clicks, nothing happens).
   - **Evidence**: src/features/smsv2/hooks/useKillSwitch.ts + wk-calls-create/index.ts both check.
   - **Question**: What if the client-side kill switch hook fails to load? Agent might think they can dial when they can't.
   - **Mitigation**: Always assume server is the source of truth. Client-side kill switch is a UX hint only. Test: disable kill switch hook in browser DevTools, try to dial, verify server blocks.

9. **Spend tracking rounding errors**
   - **Risk**: Call cost is in pence (integers), but daily spend is summed across many calls. If there are rounding errors in cost calculation, spend limit may be incorrect over time.
   - **Evidence**: Cost is multiplied/divided by 100 but no rounding strategy enforced at DB layer.
   - **Question**: How accurate is Twilio's billing? Can we assume costs are always integers in pence, or should we use DECIMAL(19,2)?
   - **Mitigation**: Audit a month of call costs in production; if errors exceed 1%, migrate wk_calls.cost_pence to DECIMAL.

### Missing documentation

10. **No runbook for "escalate to Twilio support"**
    - **Risk**: If a Twilio error (e.g., 31025, 31206) occurs at scale, we don't have a playbook to escalate to Twilio with logs, call SIDs, etc.
    - **Question**: Where do we log Twilio errors for debugging? How do we correlate browser logs + edge function logs + Twilio side?
    - **Mitigation**: Create docs/runbooks/TWILIO_DEBUG.md with steps to find call SID, fetch logs, escalate.

11. **No runbook for "coach prompt isn't working"**
    - **Risk**: Hugo or a coach team member changes the script prompt, and the model doesn't follow it. Is it a prompt issue, a model issue, or a fact retrieval issue?
    - **Question**: How do we diagnose coach failures? Do we have a test page to generate a coach suggestion without making a real call?
    - **Mitigation**: TestPage.tsx already exists (wk-test-transcribe). Document it in a runbook: "Test the coach prompt here".

### Questions for Hugo

Before starting the rebuild, Hugo should answer:

**Q1: Twilio token refresh**
- How are long calls (>1h) currently handled? Does the Device auto-refresh the token, or is there a manual refresh?

**Q2: Coach prompt sync**
- Is there a deploy checklist to verify DEFAULT_*_PROMPT in the edge function matches the migration? If not, should we automate this check?

**Q3: Orphaned calls**
- If an agent's browser crashes mid-call, what should happen on reconnect? Should the UI reconnect to the Twilio call, or hang it up?

**Q4: Load testing**
- Have we tested realtime subscriptions with 50+ agents on calls? If not, what's the expected threshold before latency degrades?

**Q5: Edge function integration tests**
- Should we write integration tests for the call flow (start → transcript → outcome)? Current tests are unit-level only.

**Q6: Spend tracking precision**
- Is cost in wk_calls always an integer (pence), or can it be a decimal? Should we change the schema to DECIMAL?

**Q7: Kill switches in production**
- Have kill switches ever been used in production? If so, did the server-side check work as expected?

**Q8: V2 parallel run duration**
- How long should /crm-v2 run in parallel with /crm before we flip the route? 1 week? Until no bugs reported?

---

## Summary

The current CRM (`/crm` on `smsv2/` codebase) is a **working but brittle power-dialer** with a **three-layer AI coach**, **call recording**, **realtime transcription**, and **outcome automation**. It ships with a dialer that was rebuilt 3× in 2 weeks (PRs 140–154), indicating the architecture is still settling after heavy churn.

**What to preserve:**
- Twilio Voice SDK wrapper (stable, tested)
- Three-layer coach prompt system (finalized, documented)
- Call lifecycle state machine (stabilized after PR 138 + 13 hotfixes)
- Realtime subscriptions + RLS patterns (solid)
- Post-call AI, outcome automation, call recording (production-ready)

**What to rebuild:**
- UI component hierarchy (DialerPage, LiveCallScreen, SettingsPage are monolithic)
- State management (SmsV2Store mixes DB cache with UI state; should use React Query + context)
- Hook organization (some hooks are 200+ lines; need to split)
- Test coverage (unit tests exist; integration tests are thin)

**Execution:** A 25-PR plan, starting with foundation (folder structure, types, providers), then UI layer-by-layer (dialer, inbox, contacts, pipelines, settings), finishing with admin + go-live. Each PR is scoped to keep blast radius low. Total effort: ~8–12 weeks for full rebuild + testing.

**Critical risks:** Twilio token refresh during long calls, multi-tab Device collisions (mostly fixed but monitor), orphaned call recovery, realtime subscription load testing, coach prompt sync, spend tracking precision.