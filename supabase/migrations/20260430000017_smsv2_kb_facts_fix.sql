-- ============================================================================
-- SMSV2 / CRM — KB facts fix (PR 51 hotfix)
--
-- The 20260430000016 migration tried to upsert KB rows using ON CONFLICT
-- (label), but wk_coach_facts has UNIQUE on `key`, not `label`. The
-- script + coach prompt parts of that migration applied successfully;
-- the KB upserts were rolled back.
--
-- This migration retries the upserts with the correct schema:
--   - key is the snake_case identifier (UNIQUE)
--   - label is the human-readable display name
-- ============================================================================

INSERT INTO wk_coach_facts (key, label, value, keywords, is_active)
VALUES
  (
    'agreement_length',
    'Agreement length',
    '5-year agreement on this property.',
    ARRAY['agreement', 'years', 'length', 'term', 'contract', 'duration'],
    true
  ),
  (
    'exit_path',
    'Exit / liquidity',
    'There is no public marketplace for selling allocations. You can sell privately to another partner who is interested, or hold to the end of the 5-year term and exit then.',
    ARRAY['exit', 'sell', 'cash out', 'liquidity', 'get out', 'leave', 'marketplace'],
    true
  ),
  (
    'fca_status',
    'FCA / regulation status',
    'It is a property joint-venture arrangement, not an FCA-regulated investment product. The deal is structured with the proper property-compliance framework.',
    ARRAY['fca', 'regulation', 'regulated', 'authorised', 'approval', 'license', 'licensed'],
    true
  ),
  (
    'active_jv_partnership',
    'Active JV partnership / voting',
    'Partners are part of an active JV partnership. Anyone (you, another partner, or the management team) can propose decisions: replacing furniture, upgrading the bed, increasing the Airbnb nightly rate, changing the management company, or proposing yourself as the new manager. All partners get a WhatsApp + email notification with a link back to the platform when a proposal is created. Each partner casts their vote during a voting period; once it ends, the majority decision is applied.',
    ARRAY['vote', 'voting', 'decision', 'manage', 'management', 'change', 'propose', 'proposal', 'partnership', 'partner role', 'control'],
    true
  ),
  (
    'office_visit_policy',
    'Office + property visits',
    'The office at 9 Owen Street, Manchester is not open to the public — we run everything online. Property visits can usually be arranged on request.',
    ARRAY['office', 'visit', 'meet', 'in person', 'address', 'location', 'see the place'],
    true
  ),
  (
    'portfolio_size',
    'Portfolio size',
    'We run just under 100 properties across Manchester and Liverpool.',
    ARRAY['how many', 'properties', 'portfolio', 'size', 'scale'],
    true
  ),
  (
    'flagship_deal',
    'Flagship deal',
    '15-bed property in Liverpool, already running on Airbnb.',
    ARRAY['flagship', 'current deal', 'liverpool', '15-bed', '15 bed', 'biggest'],
    true
  ),
  (
    'entry_minimum',
    'Entry minimum',
    'Entry starts from around £500 for a small participation in the deal.',
    ARRAY['minimum', 'entry', 'starting', 'how much', 'minimum investment', '500', 'cheap', 'small amount'],
    true
  ),
  (
    'monthly_yield',
    'Monthly yield',
    'Income comes in monthly. Yields are not guaranteed — they depend on actual booking performance, but partners can see live actuals on the platform.',
    ARRAY['yield', 'return', 'percentage', 'monthly return', 'profit', 'income', 'earnings', 'rate'],
    true
  ),
  (
    'payment_cadence',
    'Payment cadence',
    'Monthly payouts via the platform. Costs are netted off first, the remaining profit is distributed by participation share.',
    ARRAY['paid', 'payout', 'distribution', 'when', 'how often'],
    true
  )
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  value = EXCLUDED.value,
  keywords = EXCLUDED.keywords,
  is_active = EXCLUDED.is_active,
  updated_at = now();
