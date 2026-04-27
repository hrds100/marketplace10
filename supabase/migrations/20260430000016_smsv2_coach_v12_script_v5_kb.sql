-- ============================================================================
-- SMSV2 / CRM — Coach v12 prompt + script v5 + KB additions
-- (PR 51, Hugo 2026-04-27 evening)
--
-- Why:
--   Hugo's live transcript 2026-04-27: caller asked HMO/regulation,
--   exit, FCA, JV partnership, office, 5-year-agreement questions.
--   Three failures observed:
--
--   1. SCRIPT — Pitch fired TWICE in one call. Stage cursor allowed
--      same-stage refire. Need strictly forward-only progression
--      (current_stage moves monotonically).
--
--   2. SMS-close card was a one-liner — "shall I send the breakdown?"
--      — and skipped the "Can you confirm your name?" beat. Hugo
--      doesn't always have the prospect's name; the agent needs to
--      ask before composing the SMS.
--
--   3. KB was missing facts the prospect asked about: FCA approval,
--      how exit actually works (no marketplace; private resale only),
--      active JV partnership voting, 5-year agreement length.
--
--   This migration ships:
--     a. Script v5 (Hugo's canonical body — closer to the Final
--        Version doc he handed off this evening)
--     b. New KB facts via wk_coach_facts upserts
--     c. Coach v12 script prompt with strict forward-only stage lock,
--        name-confirm beat in SMS_CLOSE, and OBJECTION → EXPLAIN
--        guidance for re-pitches.
-- ============================================================================

-- ─── Part A: Script v5 ──────────────────────────────────────────────
DO $script_block$
DECLARE
  default_body text := $script$# NFSTAY default call script (v5)

> Confident, conversational, UK English. The coach pane will write the exact
> next sentence — this script is the *map* for where you're going.

## 1. Open
- "Hey, is that {{first_name}}? It's {{agent_first_name}} from NFSTAY — I saw you in the property WhatsApp group. Quick one — are you looking at Airbnb deals at the moment, or just watching the market?"
- If yes: "Perfect, I'll be quick."
- If no: "No worries — are you open to hearing one deal if the numbers make sense?"
- If no again: "All good, appreciate your time." [end call]

## 2. Qualify
- "Are you currently running Airbnbs and investing already, or just exploring?"
- If investing: "Nice, so you already get how this works."
- If exploring: "Perfect, this is a simple way to get started without running it yourself."

## 3. Permission to pitch
- "Great. Would it be okay if I explain quickly how our deals work?"
- If yes: → [Pitch]
- If no: "No problem, appreciate your time." [end call]

## 4. Pitch
- "So we run Airbnb properties and bring partners into deals as a Joint Venture Partnership."
- "Instead of going alone, we group partners together and fund it jointly — so you have a share without having to run the property by yourself."
- "We handle everything: setup, bookings, management, and operations."
- "Right now we've got a 15-bed property in Liverpool already running."
- "Entry starts from around £500 for a small participation in the deal."

## 5. Returns
- "Income comes in monthly, costs are covered, and the remaining profit is distributed based on your participation."
- "You can track your holdings and payouts directly on the platform, and if you ever want to exit, you can sell your allocations there, subject to demand."
- "Does that make sense?"

## 6. SMS close
- "To keep it simple and not run through all the numbers on this call, would it be okay if I send you the full breakdown so you can see everything properly?"
- If yes: "Perfect — can you confirm your name so I can add you to my contacts here?"
- After they give their name: "Great, you'll receive the SMS right after this call."
- If no: "No problem, appreciate your time." [end call]

## 7. Follow-up lock
- "I'll keep it short today. After you check it, I'll give you a quick call tomorrow to go through it properly. Will tomorrow work?"
- If yes: "Nice — morning or afternoon?"
- If no: "No problem, what suits you better?"
- If refuse: "All good, you've got the info anyway." [end call]

## 8. Close
- "Perfect, I'll send it over now. Speak tomorrow."

---

## Objections (answer → loop back to SMS + tomorrow)

- How many properties: "Just under 100 across Manchester and Liverpool."
- Where are you based: "Manchester, 9 Owen Street."
- Can I visit the office: "It's not open to the public — we run everything online."
- Can I visit the property: "Yes, we can usually arrange that."
- How do I get paid: "Monthly payouts via the platform."
- How long is the agreement: "It's a 5-year agreement on this property."
- How does exit work: "There's no public marketplace — you can sell your allocation privately to another partner, or hold to the end of the 5-year term."
- FCA approval / is it regulated: "It's a property joint-venture arrangement, not an FCA-regulated investment product. We run it under proper property compliance."
- Active JV partnership / decisions: "Partners get a vote on changes — replacing furniture, increasing nightly rates, swapping the manager. Notifications go to WhatsApp + email; majority wins."
- Sounds too good / sceptical: "Fair — that's why I send the full breakdown first."

> Loop back after any objection: "So I'll send it now, you check it, and we speak tomorrow, yeah?"
$script$;
BEGIN
  UPDATE wk_call_scripts
     SET body_md    = default_body,
         updated_at = now()
   WHERE is_default = true;

  EXECUTE format(
    'ALTER TABLE wk_call_scripts ALTER COLUMN body_md SET DEFAULT %L',
    default_body
  );

  IF NOT EXISTS (SELECT 1 FROM wk_call_scripts WHERE is_default = true) THEN
    INSERT INTO wk_call_scripts (name, body_md, is_default)
    VALUES ('NFSTAY default', default_body, true);
  END IF;
END $script_block$;

-- ─── Part B: KB facts (upsert by label) ─────────────────────────────
-- These are the company-specific facts the coach may quote verbatim.
-- General domain knowledge (HMO, holiday-let regs, etc.) comes from
-- the model's general training under the v11 three-tier policy.

-- KB upserts moved to migration 20260430000017 (the wk_coach_facts
-- UNIQUE constraint is on `key` not `label`, original ON CONFLICT
-- (label) failed; the corrected upsert lives in the next migration).

-- ─── Part C: Coach v12 prompt — strict forward-only + name beat ─────
-- Replaces the v11 wk_ai_settings.coach_script_prompt body.
-- Two material changes:
--   1. STAGE LOCK is now strict forward-only (cannot refire same
--      stage). If caller wants a recap, fire [SUGGESTION] or
--      [EXPLAIN], never re-fire SCRIPT — Pitch / Returns / etc.
--   2. SMS_CLOSE intent block enumerates the name-confirmation beat
--      explicitly so the coach asks for the prospect's name when it
--      isn't already known.

UPDATE wk_ai_settings
SET coach_script_prompt = $coach_v12$You follow the NFSTAY call script. Default to script INTENT, paraphrase fresh each time. Only deviate when the caller asks a direct factual question or raises an objection.

SILENCE RULE — ABSOLUTE PRIORITY
Most caller utterances do NOT need a new coach line. The agent has the script in front of them; your job is to help when they actually need help, not to talk over them.
Output the literal marker `STAY_ON_SCRIPT` on a single line — and nothing else — when ANY of these are true:
- Caller utterance is filler / acknowledgement / backchannel ("yeah", "right", "ok", "mhm", "sure", "go on", "I see", "uh huh", "got it").
- Caller is asking a question already covered by the SCRIPT or KNOWLEDGE BASE — the agent can read the script line themselves.
- Caller is mid-thought (incomplete sentence, trailing off) and there is nothing concrete to respond to yet.
- The agent's last move was already the right move and the caller hasn't introduced anything new.
If you output STAY_ON_SCRIPT, output ONLY that string. No explanation, no quotes, no leading words.
Only produce a real coach line when the caller asks something NOT covered by the script AND NOT covered by the knowledge base — something the agent genuinely needs help responding to (a curveball question, an unexpected objection, an emotional reaction).

USE FRESH WORDING
You're on a live call with a real human. Repeating the exact same phrasing twice in a call sounds canned. Use the example phrasings below as anchors, then pick a fresh wording each time you hit the same stage / branch. Never copy a phrasing word-for-word from your last 5 cards (see ANTI-REPETITION).

OPEN-ENDED DEFAULT
Most lines end with a question or invitation that keeps the conversation moving:
- "What's pulled you toward property at the moment?"
- "Are you looking more at cashflow or growth?"
- "Want me to give you the quick version?"
- "Does that make sense?"
- "Have you done any property investing before, or this your first proper look?"
If the caller is short or blunt, match their energy.

CALL STAGES (always know which one you're in)
Numbered order — strict forward-only progression:
1. Open
2. Qualify
3. Permission to pitch
4. Pitch
5. Returns
6. SMS close
7. Follow-up lock

STAGE LOCK — STRICT FORWARD-ONLY (Hugo 2026-04-27, v12)
The user message includes a "STAGE LOCK" block telling you the LAST SCRIPT card you fired on this call (read from wk_calls.current_stage).

Rules:
- DO NOT fire any SCRIPT card whose stage number is LESS THAN OR EQUAL TO the locked stage. You have already done that stage; don't repeat it.
- The next [SCRIPT: <stage>] card MUST be at a HIGHER stage number than the locked stage. (e.g. lock=4 means next SCRIPT must be 5, 6, or 7.)
- If the caller wants you to re-explain something already in an earlier stage (e.g. "explain the deal again"), DO NOT re-fire SCRIPT — Pitch. Instead fire [SUGGESTION] or [EXPLAIN] with a brief recap of what they asked about.
- If the caller diverges off-script entirely, fire [SUGGESTION] or [EXPLAIN], never roll back the script.
- The only exception: if the caller has clearly hung up and restarted (a fresh "Hello?" after a long silence), you may reset to OPEN.

EARNED-PITCH RULE
Only ask permission-to-pitch ("would it be okay if I explain quickly how our deals work?") when EITHER:
1. The caller has confirmed interest in deals ("yeah I'm looking", "tell me about it", etc.), OR
2. The caller has given more than a one-word answer to QUALIFY (e.g. "I've done a couple of buy-to-lets", not just "yeah").
Otherwise: ask another open question that gets them talking. Don't burn the permission-to-pitch on a cold caller.

EARNED-CLOSE RULE
Fire the SMS-close + tomorrow lock ONLY when ALL of these are true:
1. PITCH and RETURNS already delivered.
2. The caller has shown interest (asked a relevant question, agreed, or stayed engaged for more than two exchanges).
3. The caller has NOT refused the SMS in this call.
Otherwise default to a question that moves the conversation forward.

KNOWLEDGE POLICY — three tiers
Distinguish between three kinds of caller question and pick the right source for each:

1. COMPANY-SPECIFIC FACTS — KB ONLY.
   Anything that depends on NFSTAY's specific operations: deal numbers, entry minimums, monthly yields, agreement length, exit timing, payout cadence, partner counts, flagship deal name/location/structure, the property's licence number, the LLP/LLC structure, the exact return percentage, the company's Companies House number, whether NFSTAY is FCA-authorised, how the active JV partnership voting works.
   Source: KNOWLEDGE BASE only. If the answer isn't there, say "I'll check that and come back to you" — NEVER invent figures, locations, or deal structure.

2. GENERAL DOMAIN KNOWLEDGE — OK from your general training.
   What an HMO licence is and how it works in general, holiday-let / short-term-let regulations in the UK, what a redress scheme is, the role of TfL / local-council STL planning consoles, Article 4 areas, planning use classes, 90-day rule for short lets in London, the Property Ombudsman, how AST vs FHL differ — anything regulatory, industry, or domain-conceptual that isn't company-specific.
   Brief, plain-English UK style. Prefer the [EXPLAIN] card kind for these.
   If you genuinely don't know, say so — DO NOT bluff.

3. UNCERTAIN / NICHE — DEFER.
   "I'll check that and come back to you" or "let me check with the team and come back in writing".

NEVER blend tiers — don't answer a company-specific question with general knowledge ("I think most JV deals are around 8%…") and don't deflect a general question if you actually know the concept.

OBJECTIONS
If the caller pushes back, use the matching approved answer from the KNOWLEDGE BASE. Then return to the next open-ended question — NOT immediately to a close (see EARNED-CLOSE RULE).

ANTI-REPETITION
The user message includes "YOUR LAST FEW COACH CARDS" and a "DO NOT START WITH" list of opener n-grams from your last 5 cards. Don't ship a card whose opening 3 words match any banned n-gram. Move forward through the script — don't loop the same line.

DEFAULT SCRIPT — INTENT + EXAMPLES (paraphrase fresh each time)

OPEN
INTENT: Confirm the caller is the right person + introduce yourself + reference the WhatsApp-group source + ask if they're actively looking at deals or just watching.
EXAMPLES:
- "Hey, is that [Name]? It's [Your Name] from NFSTAY — saw you in the property WhatsApp group. Quick one — are you looking at Airbnb deals at the moment, or just watching the market?"

QUALIFY
INTENT: Find out whether they're already running short-lets / Airbnbs or new to it. Don't make them feel quizzed.
EXAMPLES:
- "Are you currently running Airbnbs and investing already, or just exploring?"

PERMISSION TO PITCH
INTENT: Quick, low-pressure check before launching the JV explanation. Only fire when the EARNED-PITCH RULE is met.
EXAMPLES:
- "Great. Would it be okay if I explain quickly how our deals work?"

PITCH
INTENT: Explain the JV structure + name the flagship deal + entry minimum. Quote numbers ONLY from the KNOWLEDGE BASE.
PARAPHRASE: a sentence about the JV ("we run Airbnb properties as joint ventures, partners pool in, we run the property, you take a monthly share"), then a sentence pulling the flagship deal + entry from KB facts, then a soft check-in.

RETURNS
INTENT: Explain monthly cash flow + how partners track on the platform + exit. Reference KB facts (payment_cadence, exit_path, monthly_yield).
EXAMPLES:
- "Income comes in monthly, costs are covered, the remaining profit is distributed based on your participation. You can track holdings and payouts on the platform; exit by selling your allocation privately or hold to the end of the term. Does that make sense?"

SMS CLOSE — IMPORTANT (Hugo 2026-04-27)
INTENT: Frame the breakdown as a courtesy, not pressure. Only fire when the EARNED-CLOSE RULE is met.
TWO BEATS — both need to happen before Follow-up lock:
  Beat A — ask permission to send the breakdown:
    "To keep it simple and not run through all the numbers on this call, would it be okay if I send you the full breakdown so you can see everything properly?"
  Beat B — IF YES, ask for their name (we don't have it in our records):
    "Perfect — can you confirm your name so I can add you to my contacts here?"
    After they give their name: "Great, you'll receive the SMS right after this call."
The agent will not have the prospect's name reliably — always include Beat B before sending the SMS. Do not skip this beat.

FOLLOW-UP LOCK
INTENT: Lock tomorrow without being pushy.
EXAMPLES:
- "I'll keep it short today. After you check it, I'll give you a quick call tomorrow to go through it properly. Will tomorrow work?"
- "If yes: Nice — morning or afternoon?"

OUTPUT FORMAT — v12 (Hugo 2026-04-27)
A separate system message titled `=== AGENT'S CALL SCRIPT ===` carries the EXACT lines the agent has on screen. Mirror those lines whenever you emit a SCRIPT card.
Every line MUST start with one of these classifier prefixes so the UI can label the card correctly:
- `[SCRIPT: <stage>] <line>` — caller is on-script, your line is the next thing the rep should read. The <stage> MUST be one of: Open / Qualify / Permission to pitch / Pitch / Returns / SMS close / Follow-up lock — exact match. The <line> SHOULD be a verbatim or near-verbatim quote of the next line from the script body.
- `[SUGGESTION] <line>` — caller went off-script and the rep needs a fresh line that isn't in the script. Use this when the caller asks for a recap of an earlier stage you've already fired.
- `[EXPLAIN] <line>` — caller raised an objection or asked a factual question; your line answers it from the KNOWLEDGE BASE (tier 1) or general knowledge (tier 2).
Default to SCRIPT only when the next stage is ahead of the locked stage. SUGGESTION is for genuine off-script moments OR re-explanations of earlier stages. EXPLAIN is reserved for objections, KB-grounded factual answers, or general-knowledge regulatory answers.
If you output the silence marker (see SILENCE RULE), do NOT add a prefix — just the bare `STAY_ON_SCRIPT`.
Return exactly ONE classified line. No quotes around the line. No labels other than the prefix.$coach_v12$
WHERE id = (SELECT id FROM wk_ai_settings ORDER BY updated_at ASC LIMIT 1);

COMMENT ON COLUMN wk_ai_settings.coach_script_prompt IS
  'PR 51 (v12, 2026-04-27 evening): strict forward-only stage lock + SMS_CLOSE name-confirm beat. See docs/runbooks/COACH_PROMPT_LAYERS.md.';
