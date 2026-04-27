-- ============================================================================
-- SMSV2 — Default call script v6 + exit_path correction (PR 65)
-- Hugo 2026-04-27.
--
-- Why:
--   The v5 RETURNS section said: "if you ever want to exit, you can
--   sell your allocations there, subject to demand." Hugo: "they
--   can't exit, you don't have that option." Same fix needed on the
--   `exit_path` KB fact (PR 51 wording was too soft — implied a
--   private resale was supported on-platform).
--
-- Two edits:
--   1. wk_call_scripts default (is_default = true) — RETURNS section
--      rewritten to match Hugo's exact wording, no exit claim.
--   2. wk_coach_facts where key='exit_path' — value rewritten to
--      "no exit during the term, hold to the end of the 5-year
--      agreement". Keywords stay the same so the retrieval block
--      still surfaces this fact when callers ask about exit.
-- ============================================================================

-- ─── 1. Script v6 ────────────────────────────────────────────────────
DO $script_block$
DECLARE
  default_body text := $script$# NFSTAY default call script (v6)

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
- "Income comes in monthly, after all costs are covered like rents and bills, the remaining profit is distributed based on your participation."
- "You can track your holdings and get your payouts directly on the platform, paid to your bank."
- "Let me know if you understand?"

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
- How do I get paid: "Monthly payouts via the platform, paid directly to your bank."
- How long is the agreement: "It's a 5-year agreement on this property."
- How does exit work: "There's no exit during the term — you hold your position until the end of the 5-year agreement, when the deal concludes and capital is returned. We don't run a marketplace for early exits."
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

-- ─── 2. Update the exit_path KB fact ────────────────────────────────
UPDATE wk_coach_facts
SET value = 'There is no exit during the term. Partners hold their position until the end of the 5-year agreement, when the deal concludes and capital is returned. NFSTAY does not run a marketplace for early exits.',
    updated_at = now()
WHERE key = 'exit_path';

-- Also update the payment_cadence fact to mention "paid directly to bank"
-- so the coach can quote it the same way the new script does.
UPDATE wk_coach_facts
SET value = 'Monthly payouts via the platform, paid directly to the partner''s bank. Costs are netted off first, the remaining profit is distributed by participation share.',
    updated_at = now()
WHERE key = 'payment_cadence';
