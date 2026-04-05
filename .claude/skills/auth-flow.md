---
name: auth-flow
description: >
  Use when: fixing signup, signin, OTP, WhatsApp verification, registration,
  password reset, new user flow, "users can't sign up", "OTP not sending",
  "can't log in", "verification code", send-otp, verify-otp edge function,
  ParticleAuthCallback, social login, Google login, Apple login
---
SCOPE: src/features/auth/*, supabase/functions/send-otp/, supabase/functions/verify-otp/
READ-ONLY: core/auth/useAuth.ts, core/integrations/ghl.ts
FORBIDDEN: all other features, frozen paths

DIAGNOSE FIRST: GHL token → function logs → config.toml → _NFsTay2! seed → then code

WORKFLOW: diagnose → read → PLAN → approve → execute → test

DANGER: Password seed `_NFsTay2!` in derivedPassword() — NEVER rename.
DANGER: ParticleAuthCallback.tsx — social login callback. One bug locks out all social users.

TESTS: auth flow + smoke suite
BLAST RADIUS: CORE_CHANGE (auth affects everything)
REFS: docs/rebuild/flows/signup-flow.md, docs/rebuild/REBUILD_PLAN.md section 2
