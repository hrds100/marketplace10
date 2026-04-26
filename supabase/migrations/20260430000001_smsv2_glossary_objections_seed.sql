-- ============================================================================
-- SMSV2 — Glossary objection seed (PR C)
--
-- Why:
--   Hugo 2026-04-30: col 4 of the live-call screen is the Glossary
--   (TerminologyPane). It already has ~10 NFSTAY terms (JV, HMO, finder's
--   fee, etc) but agents on calls hit *objections* far more often than
--   they hit jargon questions. Seed 12 common caller objections with
--   coach-friendly answers so agents have something to reach for mid-call.
--
-- Idempotency: each row is INSERTed only if its term doesn't already
--   exist (by case-insensitive match). Safe to re-run.
-- ============================================================================

INSERT INTO wk_terminologies (term, short_gist, definition_md, sort_order)
SELECT v.term, v.short_gist, v.definition_md, v.sort_order
FROM (VALUES
  (
    'What''s the catch?',
    'There isn''t one — the model is the catch. Read the breakdown.',
    $$**"What's the catch?"** — name it: there isn't a catch, the *model* is the answer to that question. Partners pool capital, NFSTAY does the operational work, profit splits by share. The risk is the deal underperforming — that's why we share full numbers in the SMS breakdown before anyone commits. Push back: "Fair question — that's exactly why we put every number in writing first."$$,
    200
  ),
  (
    'Have you done this before?',
    'Just under 100 properties across Manchester and Liverpool.',
    $$**"Have you done this before?"** — yes. Just under 100 properties operating across Manchester and Liverpool. Flagship is the 15-bed Liverpool deal currently ~70% sold. Offer: "Happy to share the full track record on the SMS — easier to read than me listing them down the phone."$$,
    210
  ),
  (
    'Why should I trust you?',
    'Trust is built from the breakdown, not the call.',
    $$**"Why should I trust you?"** — agree with them. Trust isn't built on a phone call. Offer: "You shouldn't trust me yet — that's why I want to send the full deal pack on SMS. Numbers, structure, partner agreement, voting rights. Read it cold, then decide if you want a second call." Don't oversell.$$,
    220
  ),
  (
    'Who''s the property owner?',
    'On rent-to-rent: the landlord. On JV: the partner pool collectively.',
    $$**"Who's the property owner?"** — depends on deal structure. On a *rent-to-rent* deal, the original landlord owns the bricks; NFSTAY signs a long lease and partners fund the setup. On a *purchase JV*, the partner pool collectively owns the property via the JV vehicle. Either way, voting rights are the same — you vote on management, rent, furniture, platform.$$,
    230
  ),
  (
    'What if the property doesn''t perform?',
    'Conservative underwriting + voting rights to change strategy.',
    $$**"What if the property doesn't perform?"** — honest answer: returns aren't guaranteed. Mitigations: deals are underwritten at conservative occupancy assumptions; partners vote on strategy changes (rent, platform, management); monthly actuals are visible on the platform; if NFSTAY isn't performing, partners can vote to replace the manager. Don't promise yields — talk about transparency and partner control instead.$$,
    240
  ),
  (
    'Can I see the contract first?',
    'Yes — sent with the SMS breakdown.',
    $$**"Can I see the contract first?"** — yes, always. The full partner agreement goes out with the SMS deal pack. They can read it, send it to a solicitor, take their time. No one signs on the phone. Push: "Of course — agreement comes with the breakdown so you can read it cold before any next step."$$,
    250
  ),
  (
    'What if I want to exit early?',
    'Sell allocation on the platform — liquidity not guaranteed.',
    $$**"What if I want to exit early?"** — exit is by selling your allocation back on the platform to other partners or new buyers. There's no fixed lock-up, but liquidity isn't guaranteed — depends on what others will pay. Monthly payouts continue while you hold. Honest framing: "It's more like selling a stake than withdrawing cash — quick if there's demand, slower if not."$$,
    260
  ),
  (
    'Is this regulated by the FCA?',
    'JVs aren''t collective investments — outside FCA scope. Not advice.',
    $$**"Is this regulated by the FCA?"** — JVs are not collective investment schemes; they sit outside FCA-regulated investment products. NFSTAY does not give financial advice. Partners enter a private joint venture agreement; that's the governing document. Push: "We're not regulated as an investment fund — this is a private property partnership. The agreement is the rulebook. Recommend you have a solicitor look at it before signing."$$,
    270
  ),
  (
    'What happens if NFSTAY goes bust?',
    'Partner ownership + voting rights survive — manager can be replaced.',
    $$**"What happens if NFSTAY goes bust?"** — the partner JV agreement is separate from NFSTAY the company. If NFSTAY can't operate, partners hold their share of the asset (lease or property) and can vote in a new manager — including managing it themselves. The bricks / lease don't vanish with the company. Frame it as: "The deal lives in the JV, not in NFSTAY's books. We're the manager, not the owner."$$,
    280
  ),
  (
    'How are you different from other JVs?',
    'Voting rights, monthly platform payouts, low entry, manager-replaceable.',
    $$**"How are you different from other JVs?"** — four points: (1) entry from £500 (most JVs ask £25k+); (2) monthly payouts via the platform, not annual; (3) partners *vote* on management, rent, platform — most JVs are operator-controlled; (4) manager (NFSTAY) can be voted out, including by a partner who wants to take over. Most JVs lock partners in. We don't.$$,
    290
  ),
  (
    'What''s your fee structure?',
    'Finder''s fee + management cut. All disclosed in the breakdown.',
    $$**"What's your fee structure?"** — two layers, both disclosed in the deal pack: (1) one-off **finder's fee** for sourcing + negotiating (e.g. £13k on the 15-bed); (2) ongoing **management fee** taken from gross income before partner payouts. Exact %s vary per deal — they're in the breakdown. Don't quote numbers from memory; offer the SMS.$$,
    300
  ),
  (
    'Do I get tax benefits?',
    'Not tax advice — depends on personal circumstances. Speak to an accountant.',
    $$**"Do I get tax benefits?"** — NFSTAY is not a tax adviser. Generally: JV income is treated as partnership income for UK partners; treatment varies by personal circumstances (employed vs self-employed, residency, existing property holdings). Honest answer: "We're not qualified to give tax advice — best to talk to your accountant once you've got the breakdown. Most partners have us send the deal pack first, then loop in their accountant."$$,
    310
  )
) AS v(term, short_gist, definition_md, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM wk_terminologies w
  WHERE LOWER(w.term) = LOWER(v.term)
);
