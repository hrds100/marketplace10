# Coach prompt — three-layer architecture

> **Status:** active as of 2026-04-29 (PR #574). Replaces the single
> `wk_ai_settings.live_coach_system_prompt` mega-prompt that was active
> through PRs #556–#573.

## Why three layers

The single mega-prompt was tangling three different concerns and
producing predictable failure modes:

| Layer | Failure when blended |
|---|---|
| **Voice / style** ("UK English, no acting notes, one line") | drift back into "[reasonable man] Fair enough…" because the bans were buried at the bottom of a 4000-char prompt |
| **Script logic** (call stages + earned close) | model would jump straight to SMS-close on the second exchange because the script and style rules competed for attention |
| **Factual data** (£500 entry, 14 partners, 9 Owen Street, etc.) | model would invent or substitute facts ("about 10 partners", "based in London", etc.) |

Splitting them lets each layer evolve independently, and lets the model
treat each as a separate constraint.

## The three sources

```
┌─ Layer 1 — STYLE / VOICE ──────────────────────────┐
│ wk_ai_settings.coach_style_prompt                  │  edited in
│  (fallback: DEFAULT_STYLE_PROMPT in edge fn)       │  /smsv2/settings → AI coach
└────────────────────────────────────────────────────┘

┌─ Layer 2 — SCRIPT / CALL LOGIC ────────────────────┐
│ wk_ai_settings.coach_script_prompt                 │  edited in
│  (fallback: DEFAULT_SCRIPT_PROMPT in edge fn)      │  /smsv2/settings → AI coach
└────────────────────────────────────────────────────┘

┌─ Layer 3 — KNOWLEDGE BASE / FACTS ─────────────────┐
│ wk_coach_facts (table, one row per fact)           │  edited in
│  - key (snake_case)                                │  /smsv2/settings → Knowledge base
│  - label (human-readable)                          │
│  - value (the canonical answer)                    │
│  - keywords[] (trigger phrases)                    │
│  - sort_order, is_active                           │
└────────────────────────────────────────────────────┘
```

## How the edge function uses them

`supabase/functions/wk-voice-transcription/index.ts` does this on every
coach generation (per caller utterance, post-debounce):

1. **Read all three sources in parallel** alongside the recent
   transcript and prior cards.
2. **Resolve each layer**: prefer the DB value, fall back to the
   `DEFAULT_*_PROMPT` constant in the edge fn if the column is empty.
3. **Run keyword retrieval**: `retrieveFacts(callerUtterance, facts)`
   returns facts whose keywords appear (case-insensitive substring
   match) in the caller's last utterance.
4. **Build the OpenAI request** with three independent system messages
   plus one user message:
   ```
   messages: [
     { role: 'system', content: STYLE_PROMPT },
     { role: 'system', content: SCRIPT_PROMPT },
     { role: 'system', content: KB_SYSTEM_BLOCK },   // full KB
     { role: 'user',   content: USER_MSG },          // transcript + prior cards
                                                     // + matched-facts hint
                                                     // + caller utterance
   ]
   ```
5. **Stream the response** (PR #572 architecture is unchanged — SSE
   parser, throttled UPDATE on the placeholder coach card row).

## How to edit each layer

### Layer 1 — Style / voice

`/smsv2/settings → AI coach → "Layer 1 — Style / voice"` textarea.

This controls **how the rep sounds**: UK English, plain commercial,
short lines, no acting notes, no American corporate phrases. Edit when
the reps complain that the voice feels off (too warm, too clever, too
American, etc.).

Leave empty to use the canonical default baked into the edge function.

### Layer 2 — Script / call logic

`/smsv2/settings → AI coach → "Layer 2 — Script / call logic"`
textarea.

This controls **what the rep does next**: the call stages
(OPEN → QUALIFY → PITCH → RETURNS → SMS CLOSE → FOLLOW-UP LOCK), the
open-ended-default rule, the earned-close gate, the retrieval
instruction ("answer factual questions only from the KB").

Edit when the script changes — e.g. you add a new stage, move the
order, change the default phrasing for a stage.

Leave empty to use the canonical default baked into the edge function.

### Layer 3 — Knowledge base

`/smsv2/settings → Knowledge base` (new tab, sibling of Glossary).

Each row is one fact:

- **key** — snake_case identifier (e.g. `partner_count`,
  `entry_minimum`). Stable across edits.
- **label** — human-readable label shown in the Settings UI ("Partners
  on the deal").
- **value** — the canonical answer the model is allowed to quote
  ("About 14 partners already on this deal.").
- **keywords** — comma-separated trigger phrases that, when present in
  the caller's utterance, mark this fact as relevant
  ("how many people, how many partners, partner count").
- **sort_order** — display order (also passed to the model in the same
  order).
- **is_active** — toggle off without deleting. Inactive facts are
  hidden from the agent view AND from the model.

**Critical**: when a deal fact changes (price, partner count,
agreement length, etc.), edit it **here**, not in the script prompt.
The script prompt should never contain numbers — it should reference
the KB.

## Retrieval rules

- Match is case-insensitive **substring** match: keyword "partner
  count" matches "what's the partner count?" and "Partner Count is
  what?".
- Each fact matches at most once per utterance, even if multiple of
  its keywords hit.
- Facts with empty keywords[] are skipped by the matcher (still pass
  to the model in the full KB).
- The matched-facts subset is passed to the model as a "POSSIBLY
  RELEVANT FACTS" hint in the user message. The full KB is also
  always present as a system message — the hint focuses the model;
  the full KB is the safety net.
- The script prompt instructs: "answer ONLY from the KNOWLEDGE BASE.
  If the fact isn't there, say 'I'll check that and come back to
  you' — never guess."

## Adding a new fact (operator runbook)

1. Identify the new fact you want the rep to be able to quote (e.g. a
   new return percentage, a new property added).
2. /smsv2/settings → **Knowledge base** → click **Add fact**.
3. Fill in:
   - **key**: e.g. `new_property_count` (snake_case)
   - **label**: e.g. "Updated portfolio size" (human-readable)
   - **value**: the exact answer the rep should hear, e.g. "We've just
     hit 105 properties across Manchester and Liverpool."
   - **keywords**: phrases that should trigger this fact, e.g. "how
     many properties, how many places, total properties, portfolio
     size"
4. Save. The realtime subscription propagates to live calls instantly
   — no redeploy.

## Removing or replacing a fact

If a fact becomes wrong (e.g. the partner count moves from 14 to 18):

1. Edit the existing fact in place (keep the `key` stable so the model
   stays consistent).
2. Or click **Hide** to mark `is_active = false` if you want to
   temporarily remove the fact without deleting it.

Don't add a duplicate fact with a new key — the model will see both
and might pick the older one.

## Deprecated: `wk_ai_settings.live_coach_system_prompt`

The old single-prompt column is kept on the table for back-compat
but is **deprecated as of 2026-04-29**. The edge function only falls
back to it if BOTH `coach_style_prompt` AND `coach_script_prompt` are
empty (which won't happen in practice because the migration seeded
both).

Don't edit `live_coach_system_prompt` going forward. The Settings UI
shows it under a `<details>` collapse marked "Legacy".

## Engineering reference

| Where | What |
|---|---|
| `supabase/functions/wk-voice-transcription/index.ts` | edge fn — reads all three layers + builds the OpenAI request |
| `supabase/functions/wk-voice-transcription/coach-stream.ts` | pure helpers — SSE parser, throttled writer, `retrieveFacts` |
| `supabase/migrations/20260429000000_smsv2_coach_three_layer.sql` | schema + seed data (canonical) |
| `src/features/smsv2/hooks/useAiSettings.ts` | client read/write for `coach_style_prompt` + `coach_script_prompt` |
| `src/features/smsv2/hooks/useCoachFacts.ts` | client CRUD + realtime for `wk_coach_facts` |
| `src/features/smsv2/pages/SettingsPage.tsx` | Settings UI — `AITab` (style + script) and `KnowledgeBaseTab` (facts) |
| `src/features/smsv2/__tests__/coach-stream.test.ts` | unit tests for the pure helpers (incl. `retrieveFacts`) |
| `src/features/smsv2/__tests__/wk-voice-transcription.contract.test.ts` | contract tests locking the three-layer structure |

## Future agents — read this before changing the prompt

1. **Don't blend the layers**. Voice goes in style. Stages and rules
   go in script. Facts go in `wk_coach_facts`. If you find yourself
   wanting to put numbers in the script prompt — stop, add a fact
   instead.
2. **Never remove the retrieval instruction** from the script prompt.
   The "answer ONLY from the KNOWLEDGE BASE" line is what keeps the
   model from inventing facts.
3. **Never put acting notes** (`[warm]`, `[firm]`, etc.) in any layer.
   The post-processor strips them from model output as a safety net,
   but the goal is for them never to appear in the first place.
4. **Keep the canonical defaults in the migration AND the edge fn in
   sync**. The migration seeds the DB; the edge fn has fallbacks.
   Rule: edit the migration first (committed source of truth), then
   copy into the edge fn `DEFAULT_*_PROMPT` constants.
5. **Test with the contract test**:
   `npx vitest run src/features/smsv2/__tests__/wk-voice-transcription.contract.test.ts`.
   This locks the three-layer structure and catches regressions.
