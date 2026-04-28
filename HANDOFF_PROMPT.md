# SMSV2 — Production-readiness Handoff (2026-04-27 session 2)

> Paste this entire file as the first message of a fresh Claude chat.
> Hugo (CEO, non-technical) has been driving the smsv2 module hard.
> The previous session shipped PRs #585–#626 (~30 PRs). This handoff
> captures **what's still broken**, **what works**, and **what to
> ship next**.

---

## Context for the fresh agent

You are Co-Pilot. You merge PRs via `gh pr merge --squash`; agents push
to feature branches but never to main. Read `~/.claude/projects/-Users-hugo-marketplace10/memory/MEMORY.md`
first — it has the global safety override + workflow rules.

The repo is `/Users/hugo/marketplace10`. `npx tsc --noEmit` and
`npx vitest run src/features/smsv2` must stay green on every PR.
Vitest currently passes 176/176 in smsv2. Playwright e2e against
hub.nfstay.com — see `e2e/smsv2-dialer-csv-flow.spec.ts` for the
read-only smoke tests.

Deploy keys live in memory:
- Supabase access token: `sbp_580b870f1f5f32f737c4822c4fe5451f6d815b95`
- Project ref: `asazddtvjvmckouxcmmo`
- Migration deploy: `SUPABASE_ACCESS_TOKEN=… npx supabase db push --linked`
- Edge fn deploy: `SUPABASE_ACCESS_TOKEN=… ./scripts/deploy-function.sh <name>`

---

## What works end-to-end (verified)

| Feature | PRs |
|---|---|
| CSV upload → wk_contacts → optional auto-queue to wk_dialer_queue | 22 |
| Pause / Stop dialer (flips `is_active` + reverts in-flight rows) | 23 |
| Live ParallelDialerBoard from realtime `wk_calls` | 24 |
| Mid-call SMS sender with mandatory stage pick + resizable textarea | 16, 31 |
| Outcome cards = pure pipeline routing (no automation badges) | 17 |
| Follow-up modal + persistent banner (Nurturing/Callback/Interested) | 19 |
| Live coach: 3-layer prompt, SCRIPT/SUGGESTION/EXPLAIN, mirrors agent's actual script | 6, 8 |
| Teleprompter highlighting on col 3 (yellow read, mint current, auto-scroll) | 14 |
| Glossary + Objections tabs on col 4 with inline add | 11 |
| 60s outbound dial timeout (was Twilio default 30s) | 29 |
| Worker drain via webhook kick (recording_ingest, send_sms) | 30 |
| Optimistic outcome rollback on server failure | 26 |
| Inbox realtime inbound subscription + phone variants | 32 |
| 20 distinct test contacts at +447863992555 + "Dialer test (Hugo)" campaign | 33, 34 |
| Empty SUGGESTION cards filtered from older-cards stack | 35 |
| Calls page shows Stage column + "Open call room" link → PastCallScreen | 36 |

---

## 🔴 Outstanding bugs Hugo flagged that are NOT fixed

### 1. Coach fires wrong stage cards / repeats opener mid-call
Live screenshot 2026-04-27. Transcript:
- Caller: "No I don't have any minutes for you" → coach correctly fired SCRIPT — Open ("No problem — when's a better time?")
- Caller: "afternoon" → "3:00 p.m."
- Coach fired SCRIPT — Follow-up lock ("Yeah, 3:00 works") ✓
- Caller: "Wait, can you tell me about what you actually want from me?"
- Coach fired **multiple Permission-to-pitch cards** + **the OPEN opener again** as the LATEST card.

Root cause: the coach has no awareness of stage history. The v10 prompt classifies each line independently. When the caller asks "what do you want from me", the model has no context and assumes we're back at OPEN.

**Where to start**:
- `supabase/functions/wk-voice-transcription/index.ts` — `generateCoachSuggestion` + `DEFAULT_SCRIPT_PROMPT`.
- Track per-call stage: maintain `wk_calls.current_stage` and update on every SCRIPT card insert.
- Inject into the user message: "You've already done OPEN, QUALIFY. Last SCRIPT card was QUALIFY. Don't fire OPEN again."
- Also make sure the OPEN stage's `If they're busy:` branch fires correctly when the caller declines minutes.

### 2. Recording playback button still not visible
Hugo: *"We still don't have call recording working. Cannot see the recordings."*

Pipe is correct (verified):
- TwiML records ✓ → `wk-voice-recording` webhook ✓ → `wk_recordings` insert with `status='pending'` ✓ → `wk_jobs` queued ✓ → PR 30's webhook-kick fires `wk-jobs-worker` ✓ → handler downloads + uploads to bucket ✓ → `storage_path` set → CallsPage Play button appears.

But Hugo isn't seeing buttons. Likely cause: PR 30's fire-and-forget kick is racing the function's cold-start and the worker doesn't actually drain. Confirm via:

```
SUPABASE_ACCESS_TOKEN=sbp_… npx supabase functions logs wk-jobs-worker
```

If empty, kicks aren't landing. **Recommended fix**: persistent scheduler. `pg_cron` + `pg_net.http_post` ping `wk-jobs-worker` every 60s.

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron')
   AND EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_net') THEN
    PERFORM cron.schedule(
      'wk-jobs-worker-tick',
      '* * * * *',
      $cron$
        SELECT net.http_post(
          url := 'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/wk-jobs-worker',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        );
      $cron$
    );
  END IF;
END $$;
```

(Service role key needs Supabase Vault or `current_setting` config — check current Supabase docs.)

### 3. Inbound SMS still not received
Hugo: *"In the SMS inbox, we are sending, able to send SMS, but we are not receiving it."*

PR 32 added realtime subscription + phone variants on the front-end. If still not appearing, the message is being dropped before it hits `sms_messages`.

**Debug steps**:
1. Twilio Console → Phone Numbers → active number → "A message comes in" must point to:
   `https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/sms-webhook-incoming` POST
2. Check function logs for 403s (signature mismatch — `TWILIO_AUTH_TOKEN` env may be wrong):
   ```
   SUPABASE_ACCESS_TOKEN=… npx supabase functions logs sms-webhook-incoming
   ```
3. Manually POST a fake webhook to confirm reachability:
   ```
   curl -X POST https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/sms-webhook-incoming \
     -d "From=%2B447863992555&To=%2B447380308316&Body=test&MessageSid=SM_test_$RANDOM"
   ```
4. If a Messaging Service is in front of the number, the per-number webhook may be overridden — check Messaging Service config too.

### 4. "Next call" button on hangup + navigate-back to previous call
Hugo: *"When you hang up the call, it should show 'Next call' instead of 'End call'. Click for next, otherwise timer. And a button to go back to the previous call's room without ending the dial cycle."*

PostCallPanel currently has Skip / Call now / Pause. Hugo wants:
- Bottom-right green "Call now" → relabel "Next call" (already auto-advances; just label).
- A "← Previous call" button somewhere visible that navigates to PastCallScreen for the call that just ended without ending the dial cycle / discarding any unsaved outcome.

**Files**:
- `src/features/smsv2/components/live-call/PostCallPanel.tsx` — footer button row.
- `src/features/smsv2/components/live-call/ActiveCallContext.tsx` — add a `previousCall` tracker so "Previous call" knows where to navigate.

### 5. Stale "in_progress" calls in DB
PR 31 hides them on the dashboard's live feed (`started_at >= now() - 60min`). Rows still wrong server-side. Need a sweeper that flips abandoned rows to `failed` after 1 hour. Same pg_cron tick as the job queue drain (item 2).

### 6. Settings → Campaigns + Pacing tabs are still mockups
PR 27 added honesty banners. Real implementations needed:
- **Campaigns**: full CRUD on `wk_dialer_campaigns` + queue counter per campaign + AI coach toggle. `useDialerCampaigns` already reads; needs admin RLS write + UI.
- **Pacing**: real spend / blocklist controls. New table `wk_workspace_settings` (max_parallel_lines_per_agent, retry_attempts_cap_per_lead, blocklist_phones).

### 7. GHL contact sync — never started
If Hugo wants leads pulled from GoHighLevel, build `supabase/functions/wk-ghl-import/index.ts` that hits GHL's contacts API + upserts to `wk_contacts`. GHL credentials in memory under `reference_ghl_*.md`.

---

## 🟡 Verified-in-code, needs live test

1. **Invite agents** (Settings → Agents → "Send invite" → `wk-create-agent` edge fn). Wired in code, never tested end-to-end. Hugo asked to confirm it works.
2. **20 test contacts** at +447863992555 are seeded as of PR 34 in the "Dialer test (Hugo)" campaign. Should appear in /smsv2/contacts and the dialer queue. Hugo to verify.

---

## Architecture cheat sheet

```
agent click → ActiveCallContext → wk-calls-create → Twilio Voice SDK
Twilio → wk-voice-twiml-outgoing → bridges to <Number>{contact.phone}</Number>
                                 → <Start><Transcription> → wk-voice-transcription
                                 → record="record-from-answer-dual" → wk-voice-recording

caller speaks → wk-voice-transcription → wk_live_transcripts INSERT (speaker='caller')
              → OpenAI streaming generation → wk_live_coach_events
                (kind='script'|'suggestion'|'explain', script_section)
              → realtime → LiveTranscriptPane

agent speaks → wk_live_transcripts INSERT (speaker='agent')
             → useScriptReadTracking (col 3 hook)
             → fuzzy-matches against parsed script blocks
             → highlights read lines + advances cursor

call ends → wk-voice-status → wk_calls UPDATE status='completed'
         → enqueues wk_jobs (postcall_ai, compute_cost)
         → wk-voice-recording fires when recording finishes
         → enqueues wk_jobs (recording_ingest)
         → PR 30 kick → wk-jobs-worker drains
         → handleRecordingIngest downloads from Twilio + uploads to
           call-recordings bucket → wk_recordings.storage_path set

agent picks outcome → ActiveCallContext.applyOutcome
                    → optimistic store update + capture previousColumnId
                    → wk-outcome-apply edge fn → wk_apply_outcome RPC
                    → contact pipeline_column_id update
                    → activity log
                    → on RPC failure: rollback optimistic move (PR 26)
                    → if column.requiresFollowup: opens FollowupPromptModal first

CSV upload → BulkUploadModal → wk_contacts upsert (E.164, dedupe)
           → optional: wk_dialer_queue insert (PR 22) for chosen campaign
           → wk-dialer-start picks N rows via wk_pick_next_lead
           → originates N parallel Twilio calls
           → first answer wins via wk-dialer-answer
             → atomically claims winner
             → hangs up losers
             → broadcasts dialer:<agentId> realtime
             → ActiveCallContext.resumeFromBroadcast morphs to live-call

inbound SMS / WhatsApp → sms-webhook-incoming / wa-webhook-incoming
                       → sms_messages INSERT
                       → wk_contacts bridge (PR 28) — best-effort upsert
                       → realtime → InboxPage useContactTimeline (PR 32)
```

---

## Database tables that matter

| Table | Purpose | Notes |
|---|---|---|
| `wk_contacts` | smsv2 source of truth for leads | phone INDEX (UNIQUE dropped in PR 34) |
| `wk_pipeline_columns` | Pipeline stages | `requires_followup` flag (PR 18) |
| `wk_pipeline_automations` | Per-column automation config | mostly stripped to false in PR 18 |
| `wk_calls` | Call records | status enum, contact_id FK, twilio_call_sid |
| `wk_recordings` | Call recordings | `storage_path` NULL until worker drains |
| `wk_live_transcripts` | Realtime transcript chunks | speaker='caller'\|'agent' |
| `wk_live_coach_events` | Realtime coach cards | kind, script_section, body, status |
| `wk_dialer_campaigns` | Parallel dial campaigns | parallel_lines, is_active, ai_coach_enabled |
| `wk_dialer_queue` | Lead queue per campaign | (campaign_id, contact_id) UNIQUE dropped in PR 33 |
| `wk_jobs` | Background work queue | claim via wk_claim_jobs RPC, drain via wk-jobs-worker |
| `wk_call_scripts` | Per-agent scripts | owner_agent_id NULLable, is_default flag |
| `wk_terminologies` | Glossary + Objections | category enum (PR 11) |
| `wk_coach_facts` | Knowledge base for coach | key, label, value, keywords |
| `wk_contact_followups` | Follow-up timer queue | due_at, status |
| `wk_ai_settings` | Coach prompts + model | coach_style_prompt, coach_script_prompt |

---

## Recommended next-session order

1. **Recording drain pg_cron** (item 2) — write the migration above. This is the only thing blocking Hugo from hearing his test calls back.
2. **Inbound SMS Twilio config check** (item 3) — log dive + Twilio console verify.
3. **Coach state cursor** (item 1) — `wk_calls.current_stage` + prompt awareness. Stops the "fire OPEN as latest mid-call" bug Hugo screenshotted.
4. **Stale call sweeper** (item 5) — pg_cron flips abandoned in_progress to failed.
5. **PostCallPanel "Next call" + Previous call buttons** (item 4) — UX work.
6. **Settings Campaigns + Pacing real CRUD** (item 6).
7. **GHL sync** (item 7) — only if Hugo asks again.

Items 1, 2, 3 are the only ones that block Hugo going to production. Item 4 prevents data drift. Items 5–7 are polish.

---

## Communication rules with Hugo

- He's non-technical. Plain English only.
- He doesn't use GitHub. Co-Pilot merges PRs; never tell Hugo to "click merge".
- "It's live" / "it's published" — never "merged to main", "deployed to Vercel".
- He says he wants comprehensive audits frequently. Do them; report ruthless truth.
- Don't burn cycles asking too many clarifying questions — make sensible defaults, ship, iterate. He's quick to say "do all of it" / "your pick".
