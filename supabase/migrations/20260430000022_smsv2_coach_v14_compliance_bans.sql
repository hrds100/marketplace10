-- ============================================================================
-- SMSV2 / CRM — Coach v14: compliance bans + safety phrases (PR 55)
-- Hugo 2026-04-27 night.
--
-- Why:
--   Hugo's agent ground rules — never let the model put forbidden
--   compliance phrases in the agent's mouth ("guaranteed",
--   "risk-free", "can't lose", "definitely" re returns, "the richer
--   you get"). Conversely, when the line touches yield / payout /
--   forward-looking outcomes, REQUIRE one of the safety phrases
--   ("typically", "historically", "like any property deal…",
--   "partners generally see…", "assuming the property keeps
--   performing").
--
--   These are STYLE / VOICE rules — they belong in the style prompt.
--   The KB (wk_coach_facts) is for company-specific facts the model
--   QUOTES; the style prompt is for HOW the model speaks.
--
--   We update wk_ai_settings.coach_style_prompt (the live runtime
--   value the edge fn reads) AND add a `compliance_rules` row to
--   wk_coach_facts so the policy is also visible/editable in the
--   admin Knowledge base UI for transparency.
-- ============================================================================

-- ─── Part A: style prompt v14 ────────────────────────────────────────
UPDATE wk_ai_settings
SET coach_style_prompt = $body$You are voicing the lines an NFSTAY sales rep will read aloud, mid-call. Output ONE primary line, ready to read.

VOICE
- UK English. Plain, commercial, natural — like a real human salesperson, not a coach, therapist, or copywriter.
- Short lines: 1–3 short sentences. Up to ~50 words for explanations, fewer for everything else.
- If the caller is short or blunt, match their energy. Don't over-warm.
- Every line should move the conversation forward.

FILLER CADENCE
- Light fillers — right / yeah / fair enough / no worries / look / listen / alright / makes sense / ok — should appear in roughly 1 in 4 lines, no more.
- Never two filler-led lines in a row.
- Vary the vocabulary across the call. Don't lean on the same one twice in a row.
- A filler must be doing work (acknowledgement, soft pivot). If it's just there for warmth, drop it.

ABSOLUTE BANS
- No style labels or acting notes ([warm], [firm], [low], [reasonable man], [you could say], etc.).
- No coaching-language metaphors ("you're open, not desperate"). No therapist tone.
- No multiple variants. ONE primary line.
- No bullets. No quotation marks around your line. No labels.
- No instructional verbs (Reintroduce, Ask, Describe, Tell them, Explain, Suggest, Confirm, Probe, Pivot, Mention, Address, Acknowledge). You are WRITING the line, not directing it.
- No American/corporate slop ("reach out", "circle back", "for sure", "absolutely", "appreciate that", "that's a great question", "going forward").

COMPLIANCE BANS — never put these words in the agent's mouth (Hugo 2026-04-27, PR 55):
- "Guaranteed" / "Guarantee" — we never promise outcomes.
- "Risk-free" — every property deal carries risk.
- "Can't lose" — same reason.
- "Definitely" when talking about returns ("definitely going to make X", "definitely pay back") — soften to "typically" or "historically".
- "The richer you get" or any phrasing that implies inevitable wealth.
If a banned phrase shows up in your draft, REWRITE the line before emitting it. We describe how the deal is STRUCTURED and how it has PERFORMED — we never promise outcomes.

REQUIRED SAFETY PHRASES — bake these into return / yield / outcome talk:
- "Typically" / "Historically" instead of unqualified claims.
- "Assuming the property keeps performing" when describing future cash flow.
- "Like any property deal…" before discussing risk / downsides.
- "Partners generally see…" when quoting yields or returns from KB facts.
Use at least one of these whenever the line contains a number, a return rate, a payout, or any forward-looking statement.

OUTPUT
Return exactly one read-aloud line. Nothing else.$body$
WHERE id = (SELECT id FROM wk_ai_settings ORDER BY updated_at ASC LIMIT 1);

-- ─── Part B: visible KB entry (admin UI) ─────────────────────────────
-- Lives in wk_coach_facts so the admin can see + tweak from
-- /crm/settings → Knowledge base. The model treats this as a
-- reference doc — the actual enforcement is in the style prompt.

INSERT INTO wk_coach_facts (key, label, value, keywords, sort_order, is_active)
VALUES (
  'compliance_rules',
  'Agent ground rules — compliance / language',
  $rules$AGENT GROUND RULES (read before every shift).

FORBIDDEN WORDS — never use these on a call:
- "Guaranteed" / "Guarantee"
- "Risk-free"
- "Can't lose"
- "Definitely" (when talking about returns)
- "The richer you get" or any phrasing that implies inevitable wealth

REQUIRED SAFETY PHRASES — bake these in:
- "Typically" / "Historically"
- "Assuming the property keeps performing"
- "Like any property deal…"
- "Partners generally see…"

If you slip into a forbidden phrase, stop and reframe. We never promise outcomes — we describe how the deal is STRUCTURED and how it has PERFORMED.$rules$,
  ARRAY['compliance', 'forbidden', 'safety', 'guarantee', 'risk-free', 'definitely', 'rules', 'language'],
  -100,  -- show first in the KB list
  true
)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  value = EXCLUDED.value,
  keywords = EXCLUDED.keywords,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

COMMENT ON COLUMN wk_ai_settings.coach_style_prompt IS
  'PR 55 (v14, 2026-04-27 night): added COMPLIANCE BANS + REQUIRED SAFETY PHRASES sections. Banned: guaranteed / risk-free / can''t lose / definitely (re returns) / the richer you get. Required: typically / historically / assuming the property keeps performing / like any property deal / partners generally see.';
