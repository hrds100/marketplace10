-- ============================================================================
-- SMSV2 / CRM — Follow-up call script (Hugo 2026-05-02)
--
-- Why:
--   Hugo needs a second script for follow-up calls. When the agent calls
--   leads from the "Follow-Up" or "Callback" pipeline columns, they need
--   a different opener and flow — the prospect already knows NFSTAY and
--   has received the SMS breakdown. No cold intro needed.
--
--   This migration inserts the follow-up script into wk_call_scripts.
--   Admin can then pin it to the relevant pipeline columns via the
--   Settings UI.
-- ============================================================================

INSERT INTO wk_call_scripts (name, body_md, is_default)
VALUES (
  'NFSTAY follow-up',
  $script$# NFSTAY follow-up call script (v1)

> For leads who already spoke to us and received the SMS breakdown.
> Tone: warm, relaxed, picking up where we left off — not a cold intro.

## 1. Re-open
- "Hey {{first_name}}, it's {{agent_first_name}} from NFSTAY — we spoke the other day and I sent you the breakdown. Just checking in — did you get a chance to look at it?"
- If yes: "Nice — what did you think?"
- If no: "No worries, I'll keep it quick. Want me to walk you through the main points now?"
- If didn't receive it: "Let me resend it now — what's the best number or email?"

## 2. Gauge interest
- "So now you've seen the numbers — is it something you'd consider getting involved in?"
- If interested: "Great — any questions on what you saw?"
- If unsure: "What's the main thing holding you back? Happy to go through it."
- If not interested: "Fair enough — is it the deal itself, or just not the right time?"

## 3. Handle questions
- Answer from the breakdown / knowledge base.
- Common follow-up questions:
  - "How do I actually get started?" → "You pick your participation level on the platform, pay securely, and you're in. Takes about five minutes."
  - "What happens after I pay?" → "You get access to the partner dashboard — live bookings, monthly payouts, and voting on decisions."
  - "Can I start small?" → "Yeah, entry starts from around £500."
  - "What if I want to exit?" → "You can sell your allocation privately to another partner, or hold to the end of the 5-year term."

## 4. Close
- "Look, if you're interested, the simplest thing is to jump on the platform and have a look. I can send you the direct link now — takes two minutes to browse. Want me to do that?"
- If yes: "Perfect — I'll send it over now. Any other questions before I let you go?"
- If not yet: "No rush at all. I'll check in again in a few days — sound good?"
- If no: "All good, appreciate your time. The link's there if you change your mind."

## 5. Follow-up lock
- "I'll drop you a message in a couple of days to see where you're at. Morning or afternoon better for you?"

---

## Objections (answer → loop back to close)

- "I need to think about it": "Of course. What specifically are you weighing up? Sometimes I can clear things up now."
- "I need to speak to my partner/wife/husband": "Makes sense — do you want me to send the breakdown to them directly so they can see it too?"
- "Sounds risky": "Like any property deal, there's risk involved. That said, partners vote on all key decisions, you can see live performance on the platform, and the agreements are all legally drafted."
- "Is it regulated?": "It's a joint venture, not a passive investment — so it sits outside the FCA perimeter. Each partner has real decision-making power, including the ability to replace the management company."
- "I've seen things like this before": "Fair — what specifically put you off? Our structure is different because partners are active, not passive. You vote on everything."

> After any objection: "So shall I send you the link to have a look, or would you prefer I call back another day?"
$script$,
  false
);
