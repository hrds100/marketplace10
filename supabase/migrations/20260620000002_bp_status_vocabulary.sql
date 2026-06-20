-- ============================================================================
-- Extend agreements.status to allow BP vocabulary (draft/pending/outstanding/
-- accepted/lost) alongside the existing native flow values (sent/opened/
-- signed/paid). UI maps native ↔ BP for the filter tabs so both flows
-- coexist without rewriting native rows.
-- ============================================================================

ALTER TABLE agreements DROP CONSTRAINT IF EXISTS agreements_status_check;
ALTER TABLE agreements ADD CONSTRAINT agreements_status_check
  CHECK (status IN (
    -- Native sign/pay flow
    'draft', 'sent', 'opened', 'signed', 'paid',
    -- BP archive vocabulary (used by bp-import)
    'pending', 'outstanding', 'accepted', 'lost'
  ));

-- Also relax the contractor RLS policy so it still works after the new values
-- (contractor anon UPDATE checks status IN ('sent','opened')). No change needed
-- because BP rows are not contractor type and won't hit that policy.
