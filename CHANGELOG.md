# Changelog

## 2026-04-27 — CRM rename (PR 45) + Watch Agent + post-call nav (PRs 42–44)

**Public rename: SMSV2 → CRM** (user-facing only).

- New URL home: `/crm/*`. Old `/smsv2/*` URLs redirect to `/crm/*`
  (wildcard `<Navigate>`), so any agent bookmark or external link
  keeps working.
- New dedicated agent sign-in at `/crm/login` — email + password
  form purpose-built for CRM agents. The regular `/signin` keeps
  serving every other user (tenants, landlords, social login, etc.).
- New `CrmGuard` (replaces `ProtectedRoute` on the CRM layout):
  only profiles whose `workspace_role IN ('admin','agent','viewer')`
  can enter. Hardcoded admin allow-list (`admin@hub.nfstay.com`,
  `hugo@nfstay.com`) is still honoured. Anyone else gets a polite
  "CRM access required" wall + sign-in CTA.
- Admin tab bar (`AdminLayout` top nav) gains a **CRM** tile next to
  **SMS**, linking to `/crm/inbox`.
- Internal labels: sidebar now reads "CRM" (was "Workspace v2");
  layout header reads "CRM" (was "Workspace · SANDBOX v2"); footer
  reads "NFSTAY CRM".

**What did NOT change** (deliberate — see `docs/runbooks/CRM_RENAME.md`):
- Folder `src/features/smsv2/` keeps its name (renaming would touch
  ~200 import paths for zero user-visible value).
- Database tables stay `wk_*` (40+ tables, every realtime channel
  filter, every RLS policy — high-risk, no benefit).
- Edge functions stay `wk-*` (`wk-voice-transcription`, `wk-create-agent`,
  etc. — Twilio webhook URLs would need re-pointing, breaks live
  calls during cutover).
- `wk` = "workwave", the original codename for this module. Treat it
  as the engine codename; users never see it.

**Other changes shipped today:**
- **PR 42** — coach state cursor: `wk_calls.current_stage` + STAGE
  LOCK injection. Coach no longer regresses to OPEN mid-call after
  it has already fired QUALIFY (Hugo's screenshot bug 2026-04-27).
  Migration `20260430000013_smsv2_call_current_stage.sql`. Edge fn
  `wk-voice-transcription` redeployed.
- **PR 43** — Watch Agent: dashboard's Live Activity "watch" button
  is no longer inert. Opens a read-only modal subscribed to
  `wk_live_transcripts` + `wk_live_coach_events` for the selected
  call_id. Two-column layout (transcript + coach), latest card
  highlighted. Invite-agents flow (`wk-create-agent`) verified.
- **PR 44** — post-call panel: CTA renamed "Call now" → "Next call"
  (verb matches behaviour), new "← Previous call" button pops the
  agent back into the just-ended lead's room without ending the
  dial cycle. `ActiveCallContext` now exposes `lastEndedContactId`
  + `openPreviousCall()`.

## 2026-04-29 — smsv2: coach v8 (looser script + filler cadence + faster debounce)

Per Hugo's PR-v8 spec — high-impact / low-risk subset of the audit fix
plan. Targets two pain points from live testing: scripty/parroted lines
and ~1.1-1.7s perceived latency.

**Script prompt** (now ~7,000 chars in `coach_script_prompt`)
- Stages converted from rigid wording to INTENT + 2-3 example phrasings.
- New "USE FRESH WORDING" block — explicit instruction to paraphrase
  each time, never copy verbatim from last 5 cards.
- New JUST EXPLORING handler with 5 named angles (WARM CURIOSITY,
  LIGHT CONTEXT, SOCIAL PROOF, LOW-PRESSURE PERMISSION, EMPATHY BRIDGE)
  — picks one, never the same shape twice in a row.
- New EARNED-PITCH RULE: don't permission-pitch on a one-word answer.
  Caller must either confirm interest OR give >1-word QUALIFY answer.
- Hardcoded deal numbers removed — PITCH and RETURNS reference KB facts
  (deal_structure / flagship_deal / entry_minimum / payment_cadence /
  exit_path / monthly_yield) instead.

**Style prompt** (now ~1,500 chars in `coach_style_prompt`)
- New FILLER CADENCE block: ~1 in 4 lines, never two filler-led in a
  row, vary vocabulary across the call.
- Existing voice + bans unchanged.

**Variety controls** (edge fn config)
- `temperature` 0.3 → 0.55 (audit showed 0.3 was over-corrected).
- Prior coach cards window 3 → 5.
- New `buildOpenerBanList(priorCards)` pure helper extracts first-3-
  words of each prior card; passed in user message as a "DO NOT START
  WITH" ban list. Beats the prompt's verbal "first 5 words" rule
  because the banned strings are concrete.

**Latency**
- Interim debounce 400ms → 250ms in `wk_acquire_coach_lock` call.
  ~150ms faster start of generation per turn at the cost of ~1.5-2×
  OpenAI calls per utterance. Existing supersede logic absorbs the
  extra cancellations.
- New `prompt_cache_key: 'nfstay-coach-v8'` on the chat completions
  request — OpenAI prefix caching shaves ~150-300ms first-token on
  warm cache (5-min TTL between calls).

**Opener rotation** (client-only, no DB)
- `LiveTranscriptPane.tsx` now has 6 opener variants, rotated hourly
  via `Math.floor(Date.now() / 3600000) % 6`. Reps doing back-to-back
  calls don't read the same line every time.

**Tests**
- `buildOpenerBanList` — 7 new pure-fn tests (lowercase normalisation,
  dedup, short-card skip, defensive null handling).
- Contract test +9 new assertions: temperature band 0.4-0.65, prior-
  cards limit 5, debounce 250, ban list block, prompt_cache_key, USE
  FRESH WORDING / JUST EXPLORING / EARNED-PITCH markers, NO hardcoded
  numbers in DEFAULT_SCRIPT_PROMPT, FILLER CADENCE block.
- 145/145 smsv2 tests green; tsc clean.

Migration applied via `supabase db push`. Edge fn redeployed.

**Rollback path** (if instruction-following regresses):
1. Drop temperature back to 0.3 — single line in edge fn, redeploy.
2. Or revert the script prompt by re-running the v6 migration content
   via Settings UI (no migration revert needed).
The two are independent levers — try (1) first; (2) is a bigger
rollback if the prompt itself is the issue.

## 2026-04-29 — smsv2: coach prompt three-layer split (style / script / KB)

Hugo's directive: stop blending voice, script logic, and factual deal
data into one giant prompt. The model was inventing facts (wrong
partner count, wrong office addresses) and over-closing because the
rules were tangled. This is a hard reset on the coach prompt
architecture.

**Three independently-editable layers**

| Layer | Storage | Edited in |
|---|---|---|
| 1. Style / voice | `wk_ai_settings.coach_style_prompt` | /smsv2/settings → AI coach |
| 2. Script / call logic | `wk_ai_settings.coach_script_prompt` | /smsv2/settings → AI coach |
| 3. Knowledge base / facts | `wk_coach_facts` table | /smsv2/settings → Knowledge base (new tab) |

**Edge function changes** (`wk-voice-transcription`)
- Reads all 3 sources (style + script + facts) on every coach call,
  parallel with the existing transcript + prior-cards SELECTs.
- Builds 3 independent system messages (voice / stages / KB) plus 1
  user message — no more giant blended prompt.
- New pure helper `retrieveFacts(utterance, facts)` — case-insensitive
  substring keyword matcher — picks facts likely relevant to the
  caller's last utterance and passes them as a "POSSIBLY RELEVANT
  FACTS" hint in the user message. Full KB still passes as a system
  message (safety net).
- Script prompt instructs: "answer factual questions ONLY from the
  KNOWLEDGE BASE — never guess. If the answer isn't there, say 'I'll
  check that and come back to you'."

**Knowledge base seeded with 16 facts**
Including the partner count Hugo flagged as missing ("About 14
partners already on this deal"), plus all the existing approved
objection answers, deal numbers, and compliance facts.

**Settings UI**
- AI coach tab — replaced the single prompt textarea with two layer-
  specific textareas (Style / Script). Legacy single-prompt textarea
  hidden behind a `<details>` collapse, marked deprecated.
- New "Knowledge base" tab (sibling of Glossary) — full CRUD on
  `wk_coach_facts` with key / label / value / keywords. Realtime —
  edits propagate to live calls instantly.

**Documentation**
- New `docs/runbooks/COACH_PROMPT_LAYERS.md` — full architecture +
  operator runbook for editing each layer.
- `CLAUDE.md` updated with the three-layer summary so future agents
  don't blend layers again.
- `.claude/rules/edge-functions.md` + `shared-tables.md` updated with
  ownership entries for the new table + edge-fn role.

**Tests**
- 7 new pure-fn tests for `retrieveFacts` (keyword matching, case
  insensitivity, empty-keywords skip, deduplication, defensive null
  handling).
- Contract test refreshed with 4 new assertions: three-layer prompt
  structure, DB reads of all three sources, three system messages
  passed to OpenAI, retrieveFacts wired into user message.
- 131/131 smsv2 tests green.

Migration applied via `supabase db push`. Edge fn redeployed.

The legacy `wk_ai_settings.live_coach_system_prompt` column is
**deprecated** but kept on the table for back-compat. Used as fallback
ONLY if both new layer columns are empty (which won't happen — the
migration seeded both).

## 2026-04-28 — smsv2: opener prefill + prompt v7 (open-ended default)

Hugo's pre-emptive teleprompter spec. Three remaining gaps from the
streaming PR closed in one shot:

**Opener prefill (no more empty teleprompter)**
On call connect, the coach pane now renders a synthetic opener card
immediately — the rep never stares at an empty prompt. Composed
client-side from the contact's first name + agent's first name:
"Hey, is that {name}? It's {agent} from NFSTAY — I saw you in the
property WhatsApp group. Quick one, are you looking at Airbnb deals
at the moment, or just watching the market?". Replaced as soon as
the first realtime coach event lands. No DB write — pure UI.

**Prompt v7 — OPEN-ENDED DEFAULT + EARNED-CLOSE RULE**
v6 was script-faithful but the model still trended toward force-
closing on every other line. v7 adds two explicit blocks:
- OPEN-ENDED DEFAULT: most lines should end with a question or
  invitation. List of canonical examples ("What's pulled you toward
  property at the moment?", "Are you looking more at cashflow or
  growth?", etc.). "Match short/blunt energy when caller is short."
- EARNED-CLOSE RULE: only fire SMS-close + tomorrow lock when ALL
  three are true: (1) PITCH and RETURNS already delivered, (2)
  caller has shown interest, (3) caller has NOT refused the SMS.
  Otherwise default to a question that moves the conversation.

**Lifecycle logs — call start + opener render**
Client-side console.logs added so we can correlate the rep's first
visible card with the edge-fn timestamps from PR #572.

Migration applied via `supabase db push`. Edge fn redeployed.

## 2026-04-28 — smsv2: streaming coach (interim trigger + token streaming)

Even with prompt v6 the coach still felt slow because every card waited
for Twilio to finalize the caller's utterance (1-3s after they stopped),
then a single blocking OpenAI call (~700-1500ms) before any text
appeared. Total card-to-screen latency: 2-4s.

Streaming PR fixes this. Architecture:

**Trigger surface widens (interim chunks for coach only)**
- `wk-voice-transcription` now acts on Twilio's interim
  `transcription-content` chunks (Final=false) for the coach pipeline.
  `wk_live_transcripts` still only stores Final=true chunks to keep
  the transcript pane clean (no "Hello" → "Hello there" → "Hello there
  um" spam).
- Interim chunks debounce on a per-call lock — if a generation
  acquired the lock within the last 400ms, skip. Otherwise supersede.
- Final chunks ALWAYS supersede (force=true) so the most accurate
  transcript gets the last word.

**Per-call lock + generation_id**
- New `wk_live_coach_locks` table (one row per call) holds the active
  generation_id. Stateless edge invocations call
  `wk_acquire_coach_lock(call_id, gen_id, force, min_age_ms)` to
  arbitrate. Returns `gen_id` to the winner, NULL to debounced losers.
- Lock auto-expires after 8s so a crashed generation can't deadlock
  the call.

**Streaming OpenAI → placeholder UPDATE**
- OpenAI request body now includes `stream: true`.
- Edge fn pre-INSERTs a placeholder `wk_live_coach_events` row with
  `body: '…'`, `status: 'streaming'`, `generation_id: <new>`.
- New `coach-stream.ts` (pure TS, importable from both Deno and
  vitest) ships:
  - `parseSseChunk(buf) → { events, remaining }` — robust SSE parser.
  - `createThrottledWriter(fn, intervalMs)` — first call immediate,
    coalesce within window, latest-wins, `flush()` drains pending.
- The streaming worker reads SSE, accumulates tokens, schedules
  throttled UPDATEs at 200ms cadence (~5 writes/sec). Each UPDATE
  asserts the row still exists — if it's gone (newer generation
  deleted it via `wk_supersede_streaming_coach`), the worker
  detects supersedence and aborts the stream.
- On stream done: the post-processor runs. If the line passes,
  status flips to `'final'` with the cleaned body. If rejected
  (instructional verb, etc.), the row is DELETEd — the client
  realtime DELETE event clears the placeholder card from the UI.

**Client UPDATE/DELETE subscription**
- `LiveTranscriptPane` realtime channel changed from
  `event: 'INSERT'` to `event: '*'`. INSERT adds a card, UPDATE
  morphs the body in place, DELETE removes the card. Dedup by id.

**Logging (every stage timestamped)**
Per Hugo's spec, edge fn logs (with `[coach gen=<8-char-id>]` prefix
and `+<ms_since_start>ms`):
- "interim received" (final=true|false, chars=N)
- "lock acquired" / "lock lost — debounced"
- "superseded prior streaming rows" (count=N)
- "placeholder inserted"
- "first token"
- "first update"
- "final update" (chars, kind) / "rejected by post-processor" / "aborted (superseded mid-stream)"

**Tests**
- `coach-stream.test.ts` — 13 unit tests on the pure SSE parser +
  throttled writer (no network, no DB).
- `wk-voice-transcription.contract.test.ts` extended with 4 new
  assertions: stream:true, lock RPC, placeholder shape, lifecycle
  log markers.
- All 118 smsv2 tests green.

Migration applied via `supabase db push`. Edge fn redeployed.

## 2026-04-28 — smsv2: coach prompt v6 (script-faithful, no acting notes)

Hugo's directive after testing v5: "Replace the teleprompter system
prompt. The current prompt is too clever, too improvisational, and not
aligned with the actual NFSTAY sales script. It is producing unnatural
lines like '[reasonable man] Fair enough...' instead of the direct
script the reps already use successfully."

Hard reset on prompt direction:
- Model now follows the actual NFSTAY rep call script verbatim where
  possible (OPEN → QUALIFY → PERMISSION TO PITCH → PITCH → RETURNS →
  SMS CLOSE → FOLLOW-UP LOCK). Only deviates to answer a direct
  question or handle an objection from the approved book.
- Removed "Three Tens / Belfort / Straight Line Selling" framing.
- Removed tonality markers from the prompt entirely. Acting notes
  ([warm], [firm], [low], [reasonable man], etc.) are now banned —
  the rep should not see or read them.
- ONE primary line, no variants, ready to read aloud.
- "Plain. Direct. Commercial. UK. Human. No fluff. No fancy reframes.
  No motivational language. No tonal annotations. No meta commentary."

Sampling tuned for compliance over creativity (per Hugo):
- temperature 0.9 → 0.3
- presence_penalty 0.85 → 0.3
- frequency_penalty 0.5 → 0.2
- max_completion_tokens 180 → 120 (1-3 short sentences)

Defensive post-processor (belt & braces):
- Strips any leading [bracket-label] from the model output (e.g.
  "[reasonable man] Fair enough..." → "Fair enough...").
- Strips bracket-labels at sentence starts mid-line.
- Doesn't touch [Name]-style template placeholders.

Contract test refreshed (9 assertions). Locks the v6 markers
("CORE RULES", "Default to the script. Do not freestyle"), bans the
old Belfort/Three-Tens framing from regressing, and exercises the
bracket-strip on representative leak shapes.

Migration applied via supabase db push. Edge fn redeployed.

Next PR (TDD): real-time streaming of coach tokens + interim transcript
chunk triggering. Even a perfect prompt feels slow without it.

## 2026-04-28 — smsv2: kill coach repetition + readable card UI (prompt v5)

Hugo's 2026-04-28 audit: 4-of-4 coach cards in a row opened with
"[warm] Yeah fair enough — sounds like you're keeping an eye…",
near-duplicates of each other; UI text was 15-18px scaling making
older cards as visually loud as the latest.

Two root causes for repetition:
1. The model has no memory across calls. Each utterance fires an
   independent OpenAI call. It can't avoid what it just produced.
2. The GOOD EXAMPLES section literally had "Yeah fair enough" three
   times — anchoring the model on that exact opener.

Fixes shipped (PR #570):
- Edge fn now SELECTs the last 3 wk_live_coach_events for the call
  alongside the recent transcript and passes them in the user message
  under "YOUR LAST FEW COACH CARDS — DO NOT repeat the opening words".
- New ANTI-REPETITION block in the system prompt with hard rules:
  no shared first-5-words with prior cards; "Yeah fair enough" max
  once per call; ONE primary line, no variants; commercially sharp
  not soft; match short/blunt energy when caller is short.
- GOOD EXAMPLES rewritten — varied openers (firm-quick-version /
  direct statement / question / number) — no more "Yeah fair enough"
  anchor.
- UI: latest coach card now 22px font-semibold tight leading + bigger
  halo. Older cards demoted to 12px with opacity-55 + line-clamp-2.
  The agent's eye snaps to the new line; the old ones fade out.
- Contract test expanded to lock the last-3-cards SELECT and the
  anti-repetition rules in the prompt so they can't drift.

**NOT YET shipped (next PR):** real-time streaming of coach tokens +
trigger on interim transcript chunks (instead of only `Final=true`).
That's a bigger architecture change with risk of breaking the working
pipeline. Doing it as its own TDD-driven PR.

## 2026-04-27 — smsv2: fix coach silently producing zero cards on gpt-5.4-mini

Hugo's live test 2026-04-27: AI coach pane was empty during a call,
even though the live transcript was streaming fine. Audit found:
`gpt-5.4-mini` (the model the previous PR wired in) rejects
`max_tokens` with HTTP 400 "Unsupported parameter: 'max_tokens' is not
supported with this model. Use 'max_completion_tokens' instead."
Verified directly against the live OpenAI API.

Fix: switched `max_tokens` → `max_completion_tokens` in
`generateCoachSuggestion`. The newer parameter name also works on
`gpt-4o-mini`, `gpt-4.1-mini`, `gpt-4.1-nano` — verified across the
whole dropdown — so it's a safe upgrade.

Added `src/features/smsv2/__tests__/wk-voice-transcription.contract.test.ts`
to lock the OpenAI request shape so this class of regression can't
ship silently again. The test asserts:
- `max_completion_tokens` is used (no `max_tokens` lines)
- `live_coach_model` is read from `wk_ai_settings`
- `live_coach_system_prompt` is read from `wk_ai_settings`
- Non-2xx responses log the body
- Speaker→track mapping is intact

## 2026-04-27 — smsv2: coach model wired to Settings UI + prompt v4 (Belfort)

Two issues from Hugo's 2026-04-27 audit:

1. **Model wasn't wired to the UI.** Last patch hardcoded `gpt-5.4-mini`
   in the edge function. The Settings UI dropdown still showed legacy
   `gpt-4o-realtime-preview` options that didn't reflect what was
   actually running. Hugo: "make sure it's always wired and it's always
   reflects on our front end as well for the user, you know, like make
   that a rule."
2. **Prompt v3 was 8/10.** Needed Belfort tweaks per Hugo's audit:
   explicit Three Tens, looping in objection handling, tonality markers.

What changed:

- `wk-voice-transcription` now SELECTs `live_coach_model` from
  `wk_ai_settings` and passes it through to the OpenAI chat completion
  call. Hardcoded `gpt-5.4-mini` is now a fallback (used only if the DB
  column is empty). Hot-swap takes effect on the next coach card.
- Settings UI "AI coach" tab — both model dropdowns (`postcall_model`
  and `live_coach_model`) updated with current model lists grouped by
  family: GPT-5 (newest), GPT-4.1, GPT-4o (legacy). The live-coach
  dropdown's label changed from "Realtime API" to "chat completions,
  per-utterance" since that's what the edge fn actually calls.
- `live_coach_model` column DEFAULT changed from `gpt-4o-realtime-preview`
  (misleading — never used) to `gpt-5.4-mini`. Singleton row UPDATEd to
  match.
- Coach prompt v4 — added Three Tens (Product Love · Trust in You ·
  Trust in Company) to the GOLDEN RULE, explicit ANSWER → RE-PRESENT →
  ASK loop in objection handling, tonality markers `[warm]` / `[firm]`
  / `[low]` / `[reasonable man]` for lines where delivery matters.

Saved a global rule to memory: backend changes that drive runtime
behaviour MUST be visible + editable in the admin UI. Hardcode is
fallback only.

Migration applied via `supabase db push`. Edge fn redeployed.

## 2026-04-27 — smsv2: coach model → gpt-5.4-mini

Hugo's directive after the v3 ship: switch from `gpt-4.1-mini` to
`gpt-5.4-mini`. Newer family, better stage-awareness + variation, still
mini-tier latency.

Also: improved error logging in `generateCoachSuggestion` so a wrong
model name surfaces in edge fn logs (response body included on non-2xx)
instead of silently producing zero coach cards.

Edge fn redeployed.

## 2026-04-27 — smsv2: coach prompt v3 + model upgrade (gpt-4.1-mini)

Hugo's 2026-04-26 live test still showed the coach pushing "I'll send the
breakdown — morning or afternoon tomorrow?" on 4 of 6 cards even when the
caller was just exploring or asking factual questions. v2's hard rule
"every objection ends with a soft close" forced this. v3 fixes it.

What changed:
- New stage-aware decision tree: warm-up → discovery → pitch → objection →
  close. Most lines are *talking*, not closing. The close happens once,
  at the right moment, after rapport + pitch.
- Direct-answer rule: when the caller asks a factual question (e.g.
  "where are you based?", "when is it available?"), answer it. No SMS
  deflection.
- UK English tone — explicit avoid-list of American/corporate phrases
  ("reach out", "circle back", "absolutely", "that's a great question",
  "going forward").
- Variation rule — "if your last suggestion was X, do not produce another
  version of X". Plus temperature 0.7→0.9 and presence_penalty 0.6→0.85
  in the OpenAI call.
- Bigger objection book ("what's the catch?", "sounds too good?").
- Removed v2's hard rule "every objection ends with a soft close".

Model: `gpt-4.1-nano` → `gpt-4.1-mini`. ~1.5-2x latency hit (~600-900ms
vs ~300-500ms) for noticeably better stage-awareness and variation.
Acceptable trade — agents read each line aloud, so a slight delay
doesn't break the flow. Easy to revert via the same hardcoded line if
needed.

DB updated via `supabase db push --linked` (now possible after the
2026-04-26 history cleanup). Edge fn redeployed.

## 2026-04-26 — supabase: migration history cleanup

The repo had drifted out of sync with the Supabase migration history table.
Two issues:
1. ~48 local migration files used date-only 8-digit prefixes (e.g.
   `20260314_deals_v2.sql`). The supabase CLI's `db push` filename parser
   silently skipped these and complained about "remote versions not found
   in local migrations directory".
2. The remote `supabase_migrations.schema_migrations` table held 23
   phantom entries for migrations applied directly to the DB during early
   dashboard-driven development (no matching local files).

This cleanup:
- Renames all 48 date-only files to use 14-digit timestamps (with
  `000000`, `000001`, … suffixes per date for ordering). File contents
  unchanged.
- Adds 23 placeholder `*_remote_history_placeholder.sql` files (comments
  only) so the CLI can match every remote version to a local file.
- Re-records every renamed migration in `supabase_migrations` as applied.

After the cleanup, `supabase db push --linked --dry-run` reports
"**Remote database is up to date.**" Future migrations follow the
standard workflow described in `docs/runbooks/SUPABASE_MIGRATIONS.md`.

No schema changes — this PR is purely metadata + filename hygiene.

## 2026-04-26 — smsv2: past-call transcript + full-screen archive view (item F)

Hugo's 2026-04-26 ask: "Calls history page is missing recording playback
for transcripts (recording is already there). Wants the full transcript
and ability to 'go back to that screen' to see history of a call."

- New `CallTranscriptModal` component. Click the new "Transcript" button
  on any row in /smsv2/calls → modal loads `wk_live_transcripts` for
  that call_id, renders speaker-labelled lines (You / first-name).
  Modal includes an "Open full screen →" link to the new past-call route.
- New `PastCallScreen` component routed at `/smsv2/calls/:callId`. Shows
  recording (signed URL), AI summary, transcript, AI coach events
  captured live during the call. Read-only.
- New "Open" button on each /smsv2/calls row → routes to
  /smsv2/calls/:callId.
- Empty state: "No transcript captured for this call. Real-time
  transcription was added on 2026-04-25 — earlier calls don't have
  transcripts." (per the review note before this work item shipped).

This completes the live-call surface overhaul plan (items A → G).

## 2026-04-26 — smsv2: "Apply automation" mid-call button (item E)

Hugo's 2026-04-26 ask: "Mid-call actions (… change pipeline stage) need
to be reachable from the live-call screen". The agent already changes
stage via `StageSelector` on the live-call screen, but its automations
(templated SMS, task, retry-dial, tag) only fire post-call. The new
button lets the agent fire those server-side automations *now* without
ending the call.

- New `ApplyAutomationButton` component placed under `StageSelector` in
  COL 1 of LiveCallScreen.
- Reuses the existing `wk-outcome-apply` edge function (no new infra).
- Confirms before firing ("Fire this stage's automation now? The call
  stays open.").
- Surfaces success / failure via existing `pushToast`. Wraps the same
  FunctionsHttpError → real-error unwrapping pattern used by
  ActiveCallContext so the toast shows the actual server error, not the
  generic "non-2xx".
- Disabled until the call has a `callId` and the contact has a
  `pipelineColumnId`.

## 2026-04-26 — smsv2: mid-call SMS sender (item D)

New `MidCallSmsSender` component embedded at the bottom of COL 1
(LiveCallScreen). Lets the agent fire a templated SMS without leaving the
call. Reuses the same `sms-send` edge function used by /smsv2/inbox so
the message lands in `sms_messages` and follows the GHL/Twilio path —
no new infrastructure.

- Templates dropdown reads `wk_sms_templates` (admin-RLS, agent-or-admin
  read).
- `{{first_name}}` and `{{agent_first_name}}` substituted at template
  insertion.
- Free-text fallback if no templates exist.
- 160-char counter (turns amber over 160).
- Toast on success/failure (uses the existing `pushToast` from store).

## 2026-04-26 — smsv2: 4-column live-call layout (item B2)

The live-call screen is now split into 4 resizable columns. Transcript
and coach are split vertically inside col 2 with a draggable handle. The
old right-side SMS / past-calls / activity panel is replaced by the
glossary; the SMS thread is reachable via /smsv2/inbox and past calls
via /smsv2/calls. Item F adds the past-call deep-link.

- COL 1 — contact + KV (pipeline, last contact, tags, deal value, custom
  fields) + sticky notes. Mid-call SMS sender lands here in item D.
- COL 2 — transcript (smaller, default 40%) + AI coach (larger, default
  60%) split with a vertical resize handle. Coach card text scales with
  body length: <60 chars = 15px, <120 = 16px, <200 = 17px, longer = 18px,
  so the longer breakdown lines (caller refused SMS path from item A) are
  legible. Coach badge label changed: "💡 SAY" → "💡 YOU COULD SAY"
  (Hugo's note: the agent was reading "Say:" out loud).
- COL 3 — `CallScriptPane` reads the `wk_call_scripts` row flagged
  is_default. Renders a small Markdown subset (#/##/### headings, lists,
  bold/italic/code, blockquotes, hr). `{{first_name}}` and
  `{{agent_first_name}}` are substituted with the live values.
- COL 4 — `TerminologyPane`: search + click-to-expand glossary cards.
  Reads `wk_terminologies` (active rows only) with realtime subscription
  so admin edits in Settings appear without reload.

`autoSaveId` bumped from `smsv2-live-call-layout` → `…-v2` so old 3-col
widths don't bleed in. Min sizes 14/26/14/14 keep panes usable on narrow
viewports.

Coach text scaling uses tailwind utility classes only — no inline style.
Markdown is rendered without an external dep (admin-controlled content).

## 2026-04-26 — smsv2: Settings UI for call script + glossary (item G)

Hugo can now self-serve both the live-call call script and the agent
glossary from the Settings UI — no code changes needed.

- New "Default call script" card at the bottom of the **AI coach** tab.
  Loads / saves the `wk_call_scripts` row flagged `is_default = true`
  (Markdown body). The CallScriptPane on the live-call screen reads this
  same row (item B2 wires the read).
- New top-level **Glossary** tab. Lists every `wk_terminologies` entry
  with: term, optional one-line gist, expandable Markdown definition,
  reorder (▲▼), hide/show (is_active toggle), delete, and add-new.
  Realtime — agents on a live call see admin edits propagate without
  reload.
- New hooks:
  - `useDefaultCallScript` — load/save the default script row.
  - `useTerminologies` — list + add/patch/delete + realtime channel.

No frontend changes to LiveCallScreen yet — that's item B2.

## 2026-04-26 — smsv2: terminology cards + default call script (item C)

Schema scaffolding for the new live-call surface (items B2 + G).

- New table `wk_terminologies` (term, short_gist, definition_md, sort_order,
  is_active). Admin write, agent-or-admin read. Added to `supabase_realtime`
  so admin edits propagate live to the call screen. Seeded with 10 nfstay
  glossary entries (JV partnership, HMO, finder's fee, gross yield,
  occupancy, ADR, rent-to-rent, setup cost, voting, exit).
- `wk_call_scripts.is_default boolean` + partial unique index. The
  CallScriptPane reads the `is_default = true` row. Original plan called for
  a `call_script` column on `wk_ai_settings`; chose to reuse the existing
  `wk_call_scripts` table instead — it already had the right shape and zero
  callers in src. Documented in the migration header.
- Seeded a canonical NFSTAY default script (open + qualify + permission to
  pitch + JV pitch + returns + SMS-close + follow-up + objection cheatsheet).
  Hugo can edit it via the Settings UI in item G.

No frontend changes in this PR — types regen + UI ship in items G and B2.

## 2026-04-26 — smsv2: 3-column live-call layout now resizable (item B1)

Pure layout skeleton. Wrapped the existing 3-pane flex layout in a
`ResizablePanelGroup` (horizontal, `autoSaveId="smsv2-live-call-layout"`).
Each border is now draggable; widths persist per browser. Min sizes
16/30/16% keep panes usable on narrow viewports. No behaviour change, no
new components. Item B2 will split into 4 columns and add nested vertical
resize between transcript and coach.

## 2026-04-26 — smsv2: coach prompt v2 (Belfort-style + bend on SMS-refusal)

Hugo's 2026-04-26 live test surfaced that the coach was rigid: caller said
"give me the breakdown over the phone" and the coach kept echoing "I'll send
you the SMS, speak tomorrow". Coach prompt rewritten to fix that.

**What changed**
- `DEFAULT_COACH_PROMPT` in `supabase/functions/wk-voice-transcription/index.ts`
  rewritten with: a straight-line Belfort stance (assumptive, looping,
  scarcity/social-proof/urgency, never pushy), variable line length (1-3
  sentences, up to ~50 words), and an explicit CRITICAL BRANCH for when the
  caller refuses the SMS — coach now gives the spoken breakdown using the
  deal numbers, then loops back to the tomorrow follow-up.
- `max_tokens` raised 90 → 180 to fit the longer breakdown lines.
- New migration `20260426_smsv2_coach_prompt_v2.sql` UPDATEs the canonical
  singleton row in `wk_ai_settings.live_coach_system_prompt` AND changes the
  column DEFAULT so fresh installs get v2 too. The DB value and the edge
  function fallback are kept identical in the same PR.
- Existing instructional-verb post-processor regex left untouched — still
  drops lines that open with "Reintroduce…", "Tell them…", "Explain…", etc.

**Not yet shipped (next PRs in this series — work items B–G of the plan)**
- B: 4-column resizable LiveCallScreen layout (transcript + coach split,
  contact/script/terminology panes, mid-call SMS).
- C: `wk_terminologies` table + `wk_ai_settings.call_script` column.
- D: mid-call SMS sender embedded in the call screen.
- E: manual "Apply automation" button next to StageSelector.
- F: transcript modal + `PastCallScreen` route on the calls page.
- G: Settings UI — call script editor + Terminology tab.

**Living docs**
- Edge function `wk-voice-transcription` source-of-truth changed; will need
  redeploy via `scripts/deploy-function.sh wk-voice-transcription` (Hugo /
  Co-Pilot, agents do not deploy).
- Migration applied via Supabase migration runner on next deploy.

## 2026-04-25 — smsv2: real Twilio dial + mock cleanup (PRs #526–#532)

End-to-end TDD fix series so the /smsv2 surface stops being theater. Hugo
clicks Call → his phone actually rings → outcome applies to a real wk_calls
row.

**Living docs:** all wk-* edge functions deployed and ACTIVE. New function
`wk-calls-create` deployed at 2026-04-25 21:11 UTC. Updated:
`wk-voice-twiml-outgoing` (v4, also 21:11 UTC) now reads `CallId` /
`ContactId` form params and UPDATEs the pre-minted row instead of inserting
a duplicate. Full deployed list (20):

| function | role |
|----------|------|
| wk-create-agent | provision an agent profile + spend-limit row |
| wk-twilio-connect | OAuth callback for Twilio Connect |
| wk-spend-check | pre-dial spend / killswitch RPC wrapper |
| wk-spend-record | record cost after a call ends |
| wk-killswitch-check | global enable/disable flags |
| wk-outcome-apply | server automation when an outcome is picked |
| wk-leads-next | atomic "next lead" picker |
| wk-leads-distribute | bulk distribute leads to agents |
| wk-dialer-start | parallel/power-dialer originator |
| wk-dialer-answer | winner-takes-screen broadcast on first answer |
| wk-dialer-tick | poll loop for stuck queues |
| wk-ai-postcall | post-call summary + sentiment + tagging |
| wk-ai-live-coach | live transcription + coach event publisher |
| wk-voice-token | Twilio access-token mint |
| wk-voice-twiml-outgoing | TwiML for browser-initiated outbound |
| wk-voice-twiml-incoming | TwiML for PSTN→Client routing |
| wk-voice-status | call status callback receiver |
| wk-voice-recording | recording status callback receiver |
| wk-jobs-worker | scheduled background tasks |
| wk-calls-create | **NEW** mints wk_calls UUID before dialing |

### What landed

- **PR #526** — Empty store seed + atomic contact replace. The 8 mock
  contacts no longer leak into /smsv2/contacts. `useHydrateContacts` now
  calls `setContacts(real)` once instead of upserting per row on top of
  the seed.
- **PR #527** — `useCurrentAgent` hook replaces hardcoded `CURRENT_AGENT`
  (a-tom). Status bar, softphone header, live-call agent stats, and call
  greeting all show the signed-in user's real identity / spend / call
  counts.
- **PR #528** — Real Twilio dial in `startCall`. New edge function
  `wk-calls-create` mints the wk_calls row server-side; orchestrator
  invokes it, dials with `{ CallId, ContactId }` baked into TwiML params;
  `wk-voice-twiml-outgoing` now updates that row instead of inserting a
  dupe. Phase transitions only after Twilio Call accept/disconnect.
- **PR #529** — `LiveTranscriptPane` empty state. Production no longer
  shows MOCK_TRANSCRIPT / MOCK_COACH_EVENTS. Mock fallback gated behind
  `?demo=1` URL flag for internal demos.
- **PR #530** — Post-call button guard. Orange "Pick outcome" only
  renders when `call.callId` is a real UUID, so the button never appears
  for calls that didn't really happen.
- **PR #531** — Per-page mock fallbacks gated behind `?demo=1`.
  CallsPage / InboxPage / ContactDetailPage / SettingsPage stop leaking
  Sarah Jenkins / Tom Richards / fake history into production. New
  `useDemoMode()` helper reads `?demo=1` from the URL.
- **PR #532** — Inbound call wiring. `Device.on('incoming')` auto-accepts
  + notifies subscribers via `addIncomingCallListener`. ActiveCallContext
  morphs into the live-call screen for inbound PSTN calls the same way
  it does for the dialer-winner broadcast.

### Verification
- 87/87 vitest tests green (was 43 before this series; +44 across the 7
  PRs).
- `npx tsc --noEmit` clean throughout.
- All edge fns ACTIVE on `asazddtvjvmckouxcmmo`.

## 2026-04-15 — Growth config backend (A/B + social proof)

Admin Growth page (/admin/marketplace/growth) now persists A/B weights and social-proof settings to a new `growth_config` Supabase table via a new `growth-config` edge function. The landing router (public/landing/index.html) and social-proof toast script (public/landing/js/social-proof.js) read from the edge function on load (2.5s timeout, localStorage cache fallback, hardcoded defaults as last resort), so admin changes finally reach real visitors within ~30s instead of dying in the admin's own browser.

## 2026-04-14 — Booking site free-user demo restored

**PR:** #468 (commit 7023a58)

### What changed
- Restored the interactive free-user demo on `/dashboard/booking-site`.
- One-line fix in `src/pages/BookingSitePage.tsx`: re-added the `if (!isAdmin && !isPaidTier(tier)) return <BookingSitePreviewPage />` branch that PR #337 (b6d057b, 2026-04-08) deleted.
- Paid users still get `BookingSiteDashboard` + magic-login to nfstay.app — unchanged.
- Admins bypass the gate and still see the full dashboard for testing.

### Regression detail
PR #337 ("convert booking-site dashboard to mockup with payment gates") intentionally unified all users onto the dashboard with payment-gated buttons, but the side effect was that free users saw the "Complete your booking site setup" empty state instead of the playable preview they had before. `BookingSitePreviewPage` stayed in the file (lines 87–370) orphaned but intact, so restoring it was a one-line edit.

### Proven by Playwright (red-then-green TDD)
`e2e/booking-site-free-demo.spec.ts`
- **RED on prod** before merge — free user landed in "Start Setup" empty state, no Brand/Content/Contact tabs. Regression confirmed.
- **GREEN locally** with the fix — preview tabs visible, dashboard tabs absent.
- Test creates a fresh free-tier user via Supabase Admin API, verifies `profiles.tier = 'free'`, injects session via localStorage. Reusable for future free-tier regression tests.

### Human verified
Hugo confirmed live on hub.nfstay.com 2026-04-14.

---

## 2026-04-11 — Airbnb Pricing Overhaul

**PRs:** #390, #392, #393, #394, #395, #396, #397, #398, #399, #400, #401, #402, #403

### What changed
- **Edge function `airbnb-pricing` rewritten** — switched from OpenAI Chat Completions (gpt-4o-mini, no web access) to Responses API (gpt-4o, web search enabled)
- **AI now searches the web** for real Airbnb market data (Airbtics, property articles, Expedia) to inform pricing estimates — not guessing from memory alone
- **Airbnb search URLs** generated with full filters: bedrooms, beds (1 per room), bathrooms (when available), guests (1 per bedroom), entire home only
- **3 time windows**: 7-night stays at 30, 60, 90 days out for seasonal comparison
- **"AirDNA verified"** renamed to **"Airbnb verified"** across all 6 languages
- **"Est. monthly profit"** renamed to **"Est. monthly cash flow"** — now shows full revenue, no rent subtracted
- **Temperature set to 0.2** for consistent results
- **Confidence levels**: high (real market data found), medium (area averages scaled), low (limited data)
- **Reasoning field** cites actual sources with links
- **Frontend timeouts** increased from 15-25s to 90s (web search needs time)
- **Admin deals page**: added submission date+time, description section, photo delete/replace/upload, full edit modal (description, lister type, SA approved, listing type)
- **Admin quick-list**: lister type defaults to "Deal Sourcer"

### Key finding (TDD)
OpenAI web_search cannot browse Airbnb directly (blocked). The AI uses web search to find market data from accessible sources (Airbtics, property analytics sites, Expedia) and combines it with its training data.

### Proven by Playwright tests
| Property | Nightly | Occupancy | Monthly Revenue | Confidence |
|----------|---------|-----------|----------------|------------|
| 2-bed London | £250 | 74% | £5,550 | high |
| 5-bed Barking | £600 | 70% | £12,600 | medium |
| 3-bed Manchester | £150 | 60% | £2,700 | high |

### Files changed
- `supabase/functions/airbnb-pricing/index.ts` — full rewrite
- `src/features/deals/PropertyCard.tsx` — Airbnb verified link + cash flow label
- `src/features/deals/DealDetail.tsx` — Airbnb verified + cash flow labels
- `src/features/deals/DealsPage.tsx` — pass airbnbUrl30d to cards
- `src/features/deals/DealsMap.tsx` — "Cash Flow" in map popup
- `src/features/admin-deals/AdminQuickList.tsx` — deal sourcer default, 90s timeout, cash flow label
- `src/features/admin-deals/AdminDeals.tsx` — edit modal expanded, photo management, 90s timeout, cash flow labels
- `src/features/deal-submit/ListADealPage.tsx` — cash flow label, 90s timeout
- `src/features/inquiry/InquiryPanel.tsx` — airbnbUrl30d on ListingShape
- `src/core/i18n/locales/{en,es,fr,pt-BR,ar,it}/common.json` — Airbnb verified + cash flow translations
- `e2e/airbnb-pricing-api.spec.ts` — 3 live API tests
- `e2e/airbnb-pricing-labels.spec.ts` — label verification tests

---

## 2026-04-10 — Map Markers for All Properties

**PR:** #391

### What changed
- Properties with partial postcodes (SA10, ME2, TS4) now resolve via postcodes.io outcode endpoint
- City fallback list expanded from 15 to 90+ UK cities and regions
- Hovering any property card now pans the map to the correct location

### Files changed
- `src/features/deals/DealsMap.tsx` — outcode fallback + expanded cityFallbacks

---

## 2026-04-10 — Payment Gate Moved to Send (Inquiry Flow)

**PR:** #389

### What changed
- Free users now see the message form when clicking Email or WhatsApp on a deal card or listing page.
- The payment gate only appears when they click **Send**, not on button click.
- After payment completes, the message auto-sends and a confirmation toast appears.
- If the user closes the payment panel without paying, nothing sends.

### Files changed
- `src/features/deals/PropertyCard.tsx` — removed tier gate from button handlers
- `src/features/deals/DealDetail.tsx` — same + pending message auto-send with tier check
- `src/features/deals/DealsPage.tsx` — same + pending message auto-send with tier check
- `src/features/inquiry/InquiryChatModal.tsx` — added tier check in `handleSend`

---

## 2026-04-07 — Veriff KYC Identity Verification (Investment Module)

**PRs:** #323, #326, #328, #329

### What was added
- **Veriff KYC** gates payout claims on `/invest/payouts`. Users can browse and buy shares freely — KYC is only required before claiming rental income.
- New Supabase table `inv_kyc_sessions` with RLS policies (users can only see/edit their own row).
- Two new edge functions:
  - `inv-kyc-check` — checks KYC status, queries Veriff API if session is pending
  - `inv-kyc-save-session` — saves Veriff session ID after widget creates it
- New React hook `useKycStatus` and `KycVerificationModal` component.
- KYC status card on payouts page with 4 states:
  - **Loading** — skeleton shimmer
  - **Not started / Declined** — "Verify Now" button (brand green `#1E9A80`)
  - **Pending** — amber card with "Continue Verification" button
  - **Approved** — green "Identity Verified" card
- Claim flow is gated: clicking Claim opens KYC modal if not approved.
- `@veriff/incontext-sdk` npm package installed.
- `cdn.veriff.me` added to Content Security Policy in `vercel.json`.
- Playwright tests in `e2e/invest-kyc.spec.ts`.

### Infrastructure
- Supabase secrets set: `VERIFF_API_KEY`, `VERIFF_SECRET_KEY`
- Vercel env var set: `VITE_INV_VERIFF_API_KEY`
- Edge functions deployed with `--no-verify-jwt`
- Migration applied to production database

### Files changed
| Action | File |
|--------|------|
| Created | `supabase/migrations/20260407_inv_kyc_sessions.sql` |
| Created | `supabase/functions/inv-kyc-check/index.ts` |
| Created | `supabase/functions/inv-kyc-save-session/index.ts` |
| Created | `src/hooks/useKycStatus.ts` |
| Created | `src/components/KycVerificationModal.tsx` |
| Created | `e2e/invest-kyc.spec.ts` |
| Edited | `src/pages/invest/InvestPayoutsPage.tsx` |
| Edited | `supabase/config.toml` |
| Edited | `vercel.json` (CSP) |
| Edited | `package.json` (new dependency) |
