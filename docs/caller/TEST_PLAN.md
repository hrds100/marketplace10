# Caller — Test Plan

Every phase ships only when the relevant tests below pass on `/caller/*`. The full plan must pass before Phase 6 (cutover) can begin.

Tools: **Playwright** for end-to-end, **Vitest** for unit, **manual + screenshot** when an integration cannot be safely automated (e.g. live Twilio call).

---

## 1. Dialer test

**Scenario:** the agent starts a power-dial session and reaches a live call.

**Steps**
1. Sign in to `/caller/dialer` as a registered agent.
2. Confirm the campaign hero, queue preview, and pacing control render.
3. Click **Start**.
4. Confirm a Twilio device call begins (status `ringing` in `wk_calls`).
5. Confirm the queue preview rotates to the next lead when the current one is dialed.
6. Click **Hang up**. Confirm `wk_calls.status` updates and the next lead is loaded.

**Pass condition:** all steps observable in the UI and reflected in the `wk_calls` table within 2 seconds of each action.

**Edge cases**
- Spend limit exceeded → toast appears, no call placed.
- Kill switch active → Start button disabled, banner visible.
- Twilio error 31486 (busy) → friendly toast, agent can immediately dial next.
- Multi-tab open → no Twilio identity collision (PR 143/144 fix verified).

---

## 2. Call test (live + transcript + coach + recording)

**Scenario:** an active call shows transcript, coach suggestions, and stage cursor; recording is saved.

**Steps**
1. Place a call via the dialer test above. Wait for answer.
2. Speak. Confirm `wk_live_transcripts` rows appear in realtime in the TranscriptPane.
3. Confirm the CoachPane streams a suggestion within 5 seconds of an utterance.
4. Read a script line aloud. Confirm the ScriptPane stage cursor advances.
5. End the call. Confirm `wk-voice-recording` uploads MP3 to Supabase Storage.
6. Open the call in PastCallScreen. Confirm the recording plays and the transcript replays.

**Pass condition:** transcript and coach are visible in real time during the call; recording is downloadable from Supabase Storage; PastCallScreen shows everything after the call ends.

**Edge cases**
- Empty knowledge base → coach says "I'll check that and come back to you" instead of hallucinating.
- Call exceeds 60 minutes → Twilio token refresh works, call does not drop at the 1-hour mark.
- Browser crash mid-call → on reload, UI either reconnects to the orphaned call or hangs it up cleanly (per Hugo's answer to Q3).

---

## 3. SMS test

**Scenario:** the agent sends an SMS during a call and from the inbox.

**Steps**
1. During a live call, click **Send SMS** in MidCallSmsPane.
2. Pick a template with merge fields (e.g. `Hi {{first_name}}`).
3. Click **Send**.
4. Confirm `wk_sms_messages` row inserted with `direction='outbound'` and the merge field rendered correctly.
5. Reply from the contact's phone (or simulated webhook).
6. Confirm `wk_sms_messages` shows the inbound reply in realtime.
7. Open InboxPage. Confirm the thread shows both messages with correct timestamps.

**Pass condition:** outbound and inbound messages both appear in the thread within 2 seconds.

**Edge cases**
- WhatsApp channel selected → message routed via Unipile, `wk_sms_messages.channel='whatsapp'`.
- Email template selected → routed via Resend (`wk-email-send`), `wk_sms_messages.channel='email'`.
- Contact has no phone → friendly error, no row inserted.

---

## 4. Pipeline test

**Scenario:** drag-drop a contact across pipeline stages and verify automation fires.

**Steps**
1. Open `/caller/pipelines`.
2. Confirm columns render from `wk_pipeline_columns` and contacts appear in the correct columns.
3. Drag a contact from "New Lead" to "Interested".
4. Confirm `wk_contacts.pipeline_column_id` updates immediately in the database.
5. If the column has automation (e.g. `sendSms: true`), confirm the SMS is sent (`wk_sms_messages` row created).
6. Open the contact's detail page. Confirm the new stage and the automation effect are reflected.

**Pass condition:** drag-drop updates DB within 1 second and any configured automation runs to completion.

**Edge cases**
- Two agents drag the same contact at the same time → last write wins; no error toast.
- Drag to a column with `requires_followup: true` → follow-up modal appears before the move commits.

---

## 5. Realtime test

**Scenario:** two agents see each other's actions live.

**Steps**
1. Sign in as Agent A in Browser 1, Agent B in Browser 2.
2. Both open `/caller/inbox` for the same contact.
3. Agent A sends a message.
4. Agent B sees the new message appear without refresh (within 2 seconds).
5. Agent A drags the contact to a new pipeline stage.
6. Agent B sees the contact move on `/caller/pipelines` without refresh.
7. Agent A enters notes on the contact detail page.
8. Agent B sees the notes update.

**Pass condition:** all updates propagate via Supabase realtime within 2 seconds; no manual refresh required.

**Edge cases**
- Network blip on Agent B's side → realtime subscription auto-reconnects within 5 seconds; no missed events.
- 50+ concurrent agents on calls → realtime latency stays under 3 seconds (load test, see Q4 in `CALLER_OPERATING_SYSTEM.md`).

---

## Acceptance criteria for cutover (Phase 6)

Before `/crm` can be repointed to Caller:

- [ ] All 5 scenarios above pass on `/caller/*`.
- [ ] All edge cases observed and behave as specified.
- [ ] `npx tsc --noEmit` returns zero errors on the full repo.
- [ ] `npm run build` succeeds.
- [ ] No console errors during a 30-minute multi-agent test session on `/caller/*`.
- [ ] Hugo signs off in `LOG.md` with status `SIGNED_OFF`.

A single failure on any of the above blocks cutover. No exceptions.
