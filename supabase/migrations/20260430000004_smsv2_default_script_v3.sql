-- ============================================================================
-- SMSV2 — default call script v3 (Hugo 2026-04-26)
--
-- Why:
--   Hugo dictated a fully reworked script with:
--     - Cleaner IF branches at every stage (IF YES / IF NO / IF NO AGAIN /
--       IF INVESTING / IF EXPLORING / IF REFUSE) so the agent reads the
--       right line without composing it themselves.
--     - "Probe budget + timeline" bullet replaced with proper sentences
--       ("Are you currently running Airbnbs and investing already, or
--       just exploring?").
--     - Hard FOLLOW-UP LOCK after the SMS close — every call ends with
--       "we speak tomorrow" regardless of objections.
--     - Tightened OBJECTIONS list with answers for office / property /
--       payouts / agreement length / scepticism.
--     - "Let me know if you understand?" → "Does that make sense?"
--     - Final CLOSE block to seal: "I'll send it over now. Speak tomorrow."
--
--   Format follows the parser conventions:
--     - `## N. <Stage>` for numbered headings (renderer extracts as h2)
--     - `- "<line>"` for read-aloud lines
--     - `- If <cond>: <body>` for branches (parser auto-styles as orange
--       pill — see PR 3)
--     - `[end call]` markers stay plain text for now; they're cues for
--       the agent, not state transitions.
-- ============================================================================

DO $$
DECLARE
  default_body text := $body$# NFSTAY default call script

> Confident, conversational, UK English. The coach pane will write the exact
> next sentence — this script is the *map* for where you're going.

## 1. Open
- "Hey, is that {{first_name}}? It's {{agent_first_name}} from NFSTAY — saw you in the property WhatsApp group. Quick one — are you looking at Airbnb deals at the moment, or just watching the market?"
- If yes: "Perfect, I'll be quick."
- If no: "No worries — are you open to hearing one deal if the numbers make sense?"
- If no again: "All good, appreciate your time." [end call]
- If they're busy: "No problem — when's a better time later today, morning or afternoon?"

## 2. Qualify
- "Are you currently running Airbnbs and investing already, or just exploring?"
- If investing: "Nice, so you already get how this works."
- If exploring: "Perfect, this is a simple way to get started without running it yourself."

## 3. Permission to pitch
- "Great. Would it be okay if I explain quickly how our deals work?"
- If yes: continue to the pitch.
- If no: "No problem, appreciate your time." [end call]

## 4. The pitch — JV partnership model
- "We run Airbnb properties and bring partners into deals as a Joint Venture Partnership."
- "Instead of going alone, we group partners together and fund it jointly — so you have a share without having to run the property yourself."
- "We handle everything: setup, bookings, management, and operations."
- "Right now we've got a 15-bed property in Liverpool already running."
- "Entry starts from around £500 for a small participation in the deal."

## 5. Returns
- "Income comes in monthly, costs are covered, and the remaining profit is distributed based on your participation."
- "You can track your holdings and payouts directly on the platform, and if you ever want to exit, you can sell your allocations there, subject to demand."
- "Does that make sense?"

## 6. SMS close
- "To keep it simple and not run through all the numbers on this call, would it be okay if I send you the full breakdown so you can see everything properly?"
- If yes: "Perfect — can you confirm your name so I can add you to my contacts here? Great, you'll receive the SMS right after this call."
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

- If asked how many properties: "Just under 100 across Manchester and Liverpool."
- If asked where you're based: "Manchester, 9 Owen Street."
- If asked about the office: "It's not open to the public — we run everything online."
- If asked about visiting the property: "Yes, we can usually arrange that."
- If asked how partners get paid: "Monthly payouts via the platform."
- If asked how long the agreement is: "It's a 5-year agreement on this property."
- If it sounds too good / they're sceptical: "Fair — that's why I send the full breakdown first."

> Loop back after any objection: "So I'll send it now, you check it, and we speak tomorrow, yeah?"
$body$;
BEGIN
  -- Update the canonical default row + the Postgres column DEFAULT so
  -- fresh installs get the same text.
  UPDATE wk_call_scripts
     SET body_md    = default_body,
         updated_at = now()
   WHERE is_default = true;

  -- Defensive: if no default row exists yet (shouldn't happen — the
  -- 20260426 migration seeds one), insert it.
  IF NOT EXISTS (SELECT 1 FROM wk_call_scripts WHERE is_default = true) THEN
    INSERT INTO wk_call_scripts (name, body_md, is_default)
    VALUES ('NFSTAY default', default_body, true);
  END IF;
END $$;
