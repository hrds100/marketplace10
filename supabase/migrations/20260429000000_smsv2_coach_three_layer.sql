-- ============================================================================
-- SMSV2 — coach prompt three-layer split (style / script / knowledge base)
--
-- Why:
--   Hugo's 2026-04-29 directive: stop blending voice/style, script logic,
--   and factual deal data into one giant prompt. The model was inventing
--   facts (e.g. wrong partner count) and over-closing because the rules
--   were tangled. Split into three independently-editable sources:
--
--     1. wk_ai_settings.coach_style_prompt   — voice / tone / bans
--     2. wk_ai_settings.coach_script_prompt  — call stages, decision rules,
--                                              earned-close gate, retrieval
--                                              instruction
--     3. wk_coach_facts                      — structured deal facts with
--                                              keywords for retrieval
--
--   The legacy column wk_ai_settings.live_coach_system_prompt is now a
--   fallback used only if BOTH new prompt columns are empty.
--
--   Same content lives as DEFAULT_*_PROMPT constants in
--   supabase/functions/wk-voice-transcription/index.ts. Updated in the
--   same PR — they MUST stay in sync.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Two new prompt columns on wk_ai_settings
-- ----------------------------------------------------------------------------

ALTER TABLE wk_ai_settings
  ADD COLUMN IF NOT EXISTS coach_style_prompt  text,
  ADD COLUMN IF NOT EXISTS coach_script_prompt text;

COMMENT ON COLUMN wk_ai_settings.live_coach_system_prompt IS
  'DEPRECATED 2026-04-29 — see coach_style_prompt + coach_script_prompt + wk_coach_facts. Kept as fallback only.';

-- ----------------------------------------------------------------------------
-- 2. wk_coach_facts — structured knowledge base
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wk_coach_facts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- snake_case identifier the rep / admin uses to reference this fact
  key         text NOT NULL UNIQUE,
  -- human label for the Settings UI ("Number of partners on the deal")
  label       text NOT NULL,
  -- the verbatim answer the model should reach for
  value       text NOT NULL,
  -- phrases that, if present in the caller's utterance, mark this fact
  -- as relevant (case-insensitive substring match in the edge fn)
  keywords    text[] NOT NULL DEFAULT '{}',
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wk_coach_facts_sort_order_idx
  ON wk_coach_facts (sort_order, key)
  WHERE is_active = true;

ALTER TABLE wk_coach_facts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wk_coach_facts_admin_all ON wk_coach_facts;
CREATE POLICY wk_coach_facts_admin_all ON wk_coach_facts
  FOR ALL TO authenticated
  USING (wk_is_admin())
  WITH CHECK (wk_is_admin());

DROP POLICY IF EXISTS wk_coach_facts_agent_read ON wk_coach_facts;
CREATE POLICY wk_coach_facts_agent_read ON wk_coach_facts
  FOR SELECT TO authenticated
  USING (wk_is_agent_or_admin() AND is_active = true);

DROP TRIGGER IF EXISTS wk_coach_facts_updated_at ON wk_coach_facts;
CREATE TRIGGER wk_coach_facts_updated_at
  BEFORE UPDATE ON wk_coach_facts
  FOR EACH ROW EXECUTE FUNCTION wk_set_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'wk_coach_facts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE wk_coach_facts';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Seed the knowledge base (Hugo's 2026-04-29 list + approved answers)
-- ----------------------------------------------------------------------------

INSERT INTO wk_coach_facts (key, label, value, keywords, sort_order)
SELECT * FROM (VALUES
  -- Deal scale (Hugo flagged this as missing)
  ('partner_count',     'Partners already on the deal',
   'About 14 partners already on this deal.',
   ARRAY['how many people','how many partners','how many investors','partner count','how many in this','how many on this'],
   10),
  ('flagship_deal',     'Current flagship deal',
   '15-bed property in Liverpool, run as a Joint Venture partnership.',
   ARRAY['which deal','what deal','which property','tell me about the property','what property','what is the deal'],
   20),
  ('deal_structure',    'Deal structure',
   'Joint Venture partnership. Partners pool money, NFSTAY runs the property, profit is split by participation share.',
   ARRAY['structure','how does it work','how does the deal work',' jv','joint venture','partnership'],
   30),
  ('entry_minimum',     'Minimum entry',
   'Entry from £500.',
   ARRAY['minimum','how much do i need','how much to start','starting from','entry','cheapest','smallest'],
   40),
  ('setup_cost',        'Setup cost (total deal)',
   'Setup is about £37k total, split across partners.',
   ARRAY['setup cost','total cost','deal size','how much is the deal','how big','how much in total'],
   50),
  ('agreement_length',  'Agreement length',
   '5-year agreement on this property.',
   ARRAY['how long','agreement','lock in','lock-in','tied in','tied for','contract length'],
   60),
  ('payment_cadence',   'How partners get paid',
   'Monthly payouts via the platform.',
   ARRAY['how do i get paid','when do i get paid','how often','payouts','payments','when paid'],
   70),
  ('exit_path',         'Exit / sell allocation',
   'Sell your allocation on the platform, subject to demand.',
   ARRAY['exit','get out','sell','liquidity','cash out','leave','pull out'],
   80),
  ('office_location',   'Office address',
   'Manchester, 9 Owen Street.',
   ARRAY['where are you based','where is your office','address','based in','where is the office','hq','headquarters'],
   90),
  ('office_visit',      'Visiting the office',
   'It''s not open to the public — we run everything online.',
   ARRAY['visit your office','come to your office','meet you in person','come in person'],
   100),
  ('property_visit',    'Visiting the property',
   'Yes, we can usually arrange that.',
   ARRAY['visit the property','see the property','view the property','come to the property'],
   110),
  ('portfolio_size',    'Portfolio size',
   'Just under 100 properties across Manchester and Liverpool.',
   ARRAY['how many properties','how many places','how many homes','portfolio size','how many in your'],
   120),
  ('compliance',        'Compliance / licences',
   'HMO licence held; the company is registered with a redress scheme. Holiday-let regulations followed.',
   ARRAY['licence','license','regulated','hmo','redress','compliance','legal','permitted'],
   130),
  ('legitimacy',        'Sounds too good / legit?',
   'Fair — that''s why I send the full breakdown first.',
   ARRAY['too good to be true','sounds too good','is this legit','is it real','scam','sounds dodgy'],
   140),
  ('voting',            'How big decisions are made',
   'Big decisions are voted on by partners — management changes, rent, furniture, booking strategy. Majority decides via WhatsApp + email.',
   ARRAY['how are decisions','who decides','voting','control','who runs it','who manages'],
   150),
  ('monthly_yield',     'Monthly yield on the current deal',
   'Yield runs around 9.6% monthly through the platform on the current 15-bed Liverpool deal.',
   ARRAY['return','yield','how much do i make','percentage','roi','rate of return'],
   160)
) AS v(key, label, value, keywords, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM wk_coach_facts LIMIT 1);

-- ----------------------------------------------------------------------------
-- 4. Seed the new style + script prompts on the singleton row
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  style_v1 text := $style$You are voicing the lines an NFSTAY sales rep will read aloud, mid-call. Output ONE primary line, ready to read.

VOICE
- UK English. Plain, commercial, natural — like a real human salesperson, not a coach, therapist, or copywriter.
- Short lines: 1–3 short sentences. Up to ~50 words for explanations, fewer for everything else.
- Use light fillers (right, yeah, fair enough, no worries) only when they earn their place. Never use the same opener twice in a row.
- If the caller is short or blunt, match their energy. Don't over-warm.
- Every line should move the conversation forward.

ABSOLUTE BANS
- No style labels or acting notes ([warm], [firm], [low], [reasonable man], [you could say], etc.).
- No coaching-language metaphors ("you're open, not desperate"). No therapist tone.
- No multiple variants. ONE primary line.
- No bullets. No quotation marks around your line. No labels.
- No instructional verbs (Reintroduce, Ask, Describe, Tell them, Explain, Suggest, Confirm, Probe, Pivot, Mention, Address, Acknowledge). You are WRITING the line, not directing it.
- No American/corporate slop ("reach out", "circle back", "for sure", "absolutely", "appreciate that", "that's a great question", "going forward").

OUTPUT
Return exactly one read-aloud line. Nothing else.$style$;

  script_v1 text := $script$You follow the NFSTAY call script. Default to script wording. Only deviate when the caller asks a direct factual question or raises an objection.

OPEN-ENDED DEFAULT
Most lines end with a question or invitation that keeps the conversation moving:
- "What's pulled you toward property at the moment?"
- "Are you looking more at cashflow or growth?"
- "Want me to give you the quick version?"
- "Does that make sense?"
- "Have you done any property investing before, or this your first proper look?"
If the caller is short or blunt, match their energy.

CALL STAGES (always know which one you're in)
OPEN → QUALIFY → PERMISSION TO PITCH → PITCH → RETURNS → SMS CLOSE → FOLLOW-UP LOCK

EARNED-CLOSE RULE
Fire the SMS-close + tomorrow lock ONLY when ALL of these are true:
1. PITCH and RETURNS already delivered.
2. The caller has shown interest (asked a relevant question, agreed, or stayed engaged for more than two exchanges).
3. The caller has NOT refused the SMS in this call.
Otherwise default to a question that moves the conversation forward.

DIRECT FACTUAL QUESTIONS
If the caller asks a factual question (numbers, locations, structure, agreement length, payouts, etc.), answer ONLY from the KNOWLEDGE BASE that the system message provides. Do not invent. If the fact is not in the KNOWLEDGE BASE, say "I'll check that and come back to you" — never guess.

OBJECTIONS
If the caller pushes back, use the matching approved answer from the KNOWLEDGE BASE. Then return to the next open-ended question — NOT immediately to a close (see EARNED-CLOSE RULE).

ANTI-REPETITION
The user message includes "YOUR LAST FEW COACH CARDS". Don't ship a card whose opening words match a recent one. Move forward through the script — don't loop the same line.

DEFAULT SCRIPT (use these phrasings almost verbatim where the moment fits)

OPEN
Hey, is that [Name]? It's [Your Name] from NFSTAY — I saw you in the property WhatsApp group. Quick one, are you looking at Airbnb deals at the moment, or just watching the market?

QUALIFY
Are you currently running Airbnbs and investing already, or just exploring?

PERMISSION TO PITCH
Great. Would it be okay if I explain quickly how our deals work?

PITCH
We run Airbnb properties as Joint Venture Partnerships — partners pool money, we run the property, you take a monthly share. Right now we've got a 15-bed in Liverpool, entry from £500.

RETURNS
Income comes in monthly via the platform, costs covered, profit distributed by participation. You can track your holdings and payouts on the platform, and exit by selling allocations subject to demand. Does that make sense?

SMS CLOSE
To keep it simple and not run all the numbers on this call, would it be okay if I send you the full breakdown?

FOLLOW-UP LOCK
After you check it, I'll give you a quick call tomorrow. Will tomorrow work?

OUTPUT
Return exactly one read-aloud line for the next thing the rep should say.$script$;
BEGIN
  UPDATE wk_ai_settings
     SET coach_style_prompt  = style_v1,
         coach_script_prompt = script_v1,
         updated_at = now()
   WHERE name = 'default';

  -- Future fresh installs get the v1 splits as defaults too.
  EXECUTE format(
    'ALTER TABLE wk_ai_settings ALTER COLUMN coach_style_prompt SET DEFAULT %L',
    style_v1
  );
  EXECUTE format(
    'ALTER TABLE wk_ai_settings ALTER COLUMN coach_script_prompt SET DEFAULT %L',
    script_v1
  );
END $$;
