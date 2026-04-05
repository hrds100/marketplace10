---
name: landlord
description: >
  Use when: landlord, magic link, claim account, NDA signing,
  "magic link not working", "landlord can't log in", MagicLoginPage,
  LeadDetailsPage, LeadNDAPage, LeadAccessAgreement, ClaimAccountBanner,
  landlord-magic-login, claim-landlord-account, lead-magic-login
---
SCOPE: src/features/landlord/*, supabase/functions/landlord-magic-login/, supabase/functions/claim-landlord-account/, supabase/functions/lead-magic-login/
READ-ONLY: core/auth/useAuth.ts, core/database/client.ts
FORBIDDEN: all other features, frozen paths

DIAGNOSE FIRST: function logs → token validation → profiles data → then code

WORKFLOW: diagnose → read → PLAN → approve → execute → test

NOTE: Magic login creates a session from a WhatsApp link token.
NOTE: Claim account lets landlord set email + password after magic login.
NOTE: Reads landlord_invites table (owned by inquiry feature).

TESTS: landlord + gate + smoke
BLAST RADIUS: MEDIUM (reads inquiries + landlord_invites, writes profiles)
REFS: docs/rebuild/flows/landlord-flow.md
