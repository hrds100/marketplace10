---
name: affiliates
description: >
  Use when: affiliates, referral program, commission, share link,
  "affiliate stats wrong", AffiliatesPage, track-referral,
  "payout settings link broken", aff_profiles, aff_events
---
SCOPE: src/features/affiliates/*, supabase/functions/track-referral/
READ-ONLY: core/database/client.ts
FORBIDDEN: all other features, frozen paths

DIAGNOSE FIRST: track-referral function logs → aff_profiles data → then code

WORKFLOW: diagnose → read → PLAN → approve → execute → test

NOTE: Commission n8n calls in PaymentSheet + InquiryPanel to be replaced with aff_events INSERT (Phase 2).

TESTS: affiliates + smoke
BLAST RADIUS: LOW (feature-local)
