-- ============================================================================
-- SMSV2 — Terminology cards + default call script (work item C)
--
-- Why:
--   The new live-call surface (work item B2) adds a call script pane (col 3)
--   and a terminology pane (col 4). Both need persisted, admin-editable
--   sources of truth.
--
--   The original plan called for a `call_script text` column on
--   wk_ai_settings, but the existing `wk_call_scripts` table already exists
--   with the right shape (id, name, body_md, timestamps) and zero callers in
--   src — it was seeded in phase 1 for exactly this purpose. Repurposing it
--   keeps "where is the script stored?" coherent and avoids two competing
--   locations.
--
-- What this migration does:
--   1. Adds is_default to wk_call_scripts + partial unique index (only one
--      script can be the default at a time). CallScriptPane reads the
--      is_default = true row.
--   2. Seeds the canonical NFSTAY default script (open + qualify + permission
--      + pitch + returns + SMS-close + follow-up). Hugo can edit it via the
--      AI Settings tab (work item G).
--   3. Creates wk_terminologies (term + short gist + markdown definition +
--      sort order + is_active). RLS: admin write, agent-or-admin read.
--      Added to supabase_realtime so the live-call pane updates instantly.
--   4. Seeds ~10 nfstay glossary terms (HMO, JV, finder's fee, gross yield,
--      occupancy, etc).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. wk_call_scripts.is_default + canonical default script
-- ----------------------------------------------------------------------------

ALTER TABLE wk_call_scripts
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Only one row can be flagged as default at a time.
CREATE UNIQUE INDEX IF NOT EXISTS wk_call_scripts_only_one_default
  ON wk_call_scripts ((true)) WHERE is_default = true;

-- Seed the canonical NFSTAY default. ON CONFLICT not available without a
-- natural key — guard by SELECT instead so the migration is idempotent.
DO $$
DECLARE
  default_body text := $body$# NFSTAY default call script

> Confident, conversational, UK English. The coach pane will write the exact
> next sentence — this script is the *map* for where you're going.

## 1. Open
- "Hi {{first_name}}, this is {{agent_first_name}} from NFSTAY — saw you in our property WhatsApp group. Have you got a couple of minutes?"
- If they're busy: "No problem — when's a better time later today, morning or afternoon?"

## 2. Qualify
- "Are you actively looking at Airbnb deals right now, or just keeping an eye on the market?"
- If active: probe budget + timeline.
- If watching: build interest before pitching.

## 3. Permission to pitch
- "Would it be okay if I quickly explain how our deals work? Two minutes max."

## 4. The pitch — JV partnership model
- "We run Airbnb properties as Joint Venture Partnerships. Partners pool money into a deal — entry from £500 — and we handle the setup, bookings, management, the lot. You get monthly payouts via the platform, costs covered, and your share of the profit."
- "Right now our flagship is a 15-bed in Liverpool. Total setup ~£37k, split across partners, on a 5-year agreement. About 70% sold already."

## 5. Returns
- "Yield's running about 9.6% monthly, paid through the platform. You see your holdings and payouts live. Exit is by selling your allocation on the platform when you want out."

## 6. SMS-close
- "What's best — shall I send the full breakdown over SMS so you can review the numbers properly?"
- If they refuse SMS: bend → give the spoken breakdown using the deal numbers (the coach will write it for you), then loop back to follow-up.

## 7. Follow-up lock
- "Brilliant. What time tomorrow works for a quick follow-up — morning or afternoon?"
- Get a specific window. End on commitment.

---

**Objection cheat-sheet** (deeper coverage in the AI coach card)
- "How many properties?" → "Just under 100 across Manchester and Liverpool."
- "Where are you based?" → "Manchester, 9 Owen Street."
- "Can I visit the office?" → "It's online only — not open to the public."
- "Can I visit the property?" → "Yes, we can usually arrange that."
- "How do I get paid?" → "Monthly payouts via the platform."
- "Sounds too good / legit?" → "Fair — that's why I send the full breakdown first."
$body$;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wk_call_scripts WHERE is_default = true) THEN
    INSERT INTO wk_call_scripts (name, body_md, is_default)
    VALUES ('NFSTAY default', default_body, true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. wk_terminologies — glossary cards
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wk_terminologies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term          text NOT NULL,
  short_gist    text,
  definition_md text NOT NULL,
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wk_terminologies_sort_order_idx
  ON wk_terminologies (sort_order, term)
  WHERE is_active = true;

ALTER TABLE wk_terminologies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wk_terminologies_admin_all ON wk_terminologies;
CREATE POLICY wk_terminologies_admin_all ON wk_terminologies
  FOR ALL TO authenticated
  USING (wk_is_admin())
  WITH CHECK (wk_is_admin());

DROP POLICY IF EXISTS wk_terminologies_agent_read ON wk_terminologies;
CREATE POLICY wk_terminologies_agent_read ON wk_terminologies
  FOR SELECT TO authenticated
  USING (wk_is_agent_or_admin() AND is_active = true);

DROP TRIGGER IF EXISTS wk_terminologies_updated_at ON wk_terminologies;
CREATE TRIGGER wk_terminologies_updated_at
  BEFORE UPDATE ON wk_terminologies
  FOR EACH ROW EXECUTE FUNCTION wk_set_updated_at();

-- Realtime — agents see admin edits live without reload.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'wk_terminologies'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE wk_terminologies';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Seed glossary
-- ----------------------------------------------------------------------------

INSERT INTO wk_terminologies (term, short_gist, definition_md, sort_order)
SELECT * FROM (VALUES
  (
    'JV partnership',
    'Joint Venture — partners pool money, share profit by participation share.',
    $$**Joint Venture (JV) partnership** — the structure NFSTAY uses for every Airbnb deal. Partners pool money into a single property; NFSTAY handles setup, bookings, ops, and management. Profit is split by participation share (£1 = 1 share). Partners can vote on management changes, rent increases, furniture upgrades, and which platform to list on.$$,
    10
  ),
  (
    'HMO',
    'House in Multiple Occupation — licence required for 5+ unrelated tenants.',
    $$**HMO (House in Multiple Occupation)** — a UK property let to 5 or more people from different households. Requires an HMO licence from the local council. NFSTAY holds HMO licences where applicable; this is what lets us run higher-occupancy properties (e.g. the 15-bed in Liverpool) compliantly.$$,
    20
  ),
  (
    'Finder''s fee',
    'One-off cost to source the deal. Built into the setup figure.',
    $$**Finder's fee** — a one-off charge for sourcing the property and negotiating the deal. On the flagship 15-bed Liverpool deal, the finder's fee is £13,000 (part of the ~£37k total setup). It's built into the setup figure shared with partners — not an extra charge.$$,
    30
  ),
  (
    'Gross yield',
    'Annual rental income / property value, before costs. Bigger than net.',
    $$**Gross yield** — annual rental income as a % of property value, *before* operating costs (cleaning, utilities, platform fees, mortgage, etc). It's the headline number agents quote. Net yield = gross yield minus all running costs. NFSTAY quotes monthly *yield on capital deployed* — different denominator, much higher than property gross yield.$$,
    40
  ),
  (
    'Occupancy',
    '% of nights the property is booked. Drives revenue.',
    $$**Occupancy** — the % of nights a short-let property is booked. UK Airbnb averages 50-70%; well-located city properties can hit 80%+. NFSTAY underwrites deals at conservative occupancy assumptions and shares actuals on the platform monthly.$$,
    50
  ),
  (
    'Nightly rate',
    'Headline rent per night. Multiplied by occupancy for revenue.',
    $$**Nightly rate (ADR — Average Daily Rate)** — the typical headline price per night. Combines with occupancy to produce revenue: revenue ≈ nights in period × occupancy × ADR. Dynamic pricing tools adjust ADR based on demand, season, and local events.$$,
    60
  ),
  (
    'Rent-to-rent',
    'NFSTAY rents from the landlord, then sublets via Airbnb. No purchase needed.',
    $$**Rent-to-rent (R2R)** — NFSTAY signs a long lease with the landlord (e.g. 5 years) at a fixed rent, then sublets the property via Airbnb / short-let platforms. Partners' capital funds the *setup* (refurb, furniture, finder's fee, deposit), not the property purchase. Lower entry, faster cash-on-cash returns, but you don't own the bricks.$$,
    70
  ),
  (
    'Setup cost',
    'One-off cost partners fund: finder''s fee, refurb, furniture, deposit.',
    $$**Setup cost** — the one-off capital partners contribute to launch a deal. On the flagship 15-bed Liverpool: £13k finder's fee + £11k refurb + £4,447.50 furniture + £1,552.50 staging + £1k misc + first month rent £3.5k + £3.5k deposit = ~£37,000 total. Split across partners by share (£1 = 1 share, £500 minimum entry).$$,
    80
  ),
  (
    'Voting',
    'Partners vote on big decisions: management changes, rent, furniture, platform.',
    $$**Voting** — major decisions in a JV are put to a partner vote. Each partner gets a WhatsApp + email link, votes, and the majority decision applies. Things partners can vote on: replacing furniture, increasing rent, changing the booking strategy or platform, replacing the management team (NFSTAY starts as manager but can be voted out — including by a partner who wants to manage themselves).$$,
    90
  ),
  (
    'Exit',
    'Sell your allocation on the platform when there''s demand.',
    $$**Exit** — partners exit by selling their allocation back on the platform, subject to demand from other partners or new buyers. There's no fixed lock-up but liquidity isn't guaranteed — pricing depends on what others will pay. Monthly payouts continue while you hold.$$,
    100
  )
) AS v(term, short_gist, definition_md, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM wk_terminologies LIMIT 1);
