-- Prevent more than one ACTIVE (unpaid) bank payout claim per investor.
--
-- Why: bank-transfer payout claims are settled off-chain and never call the
-- on-chain withdrawRent(), so getRentDetails() keeps reporting the same rent as
-- claimable. Combined with the old per-ISO-week uniqueness only, an investor
-- could re-submit a claim for the same unpaid rent every week (this produced the
-- Michael-Lund W29/W31/W32 duplicates). This partial unique index guarantees at
-- the database level that a user can hold at most one claim in pending/processing
-- at a time. Paid and cancelled claims are excluded, so normal monthly claiming
-- still works once the previous claim is settled.
--
-- Safe to apply: verified 2026-08-11 that no user currently has more than one
-- claim in pending/processing.
CREATE UNIQUE INDEX IF NOT EXISTS payout_claims_one_active_per_user
  ON public.payout_claims (user_id)
  WHERE status IN ('pending', 'processing');
