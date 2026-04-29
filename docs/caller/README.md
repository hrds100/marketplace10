# Caller — README

## What Caller is

Caller is the new name for the calling platform that lives at `/crm` today. It is a clean, modern frontend that replaces the messy `smsv2` codebase.

Agents (the people who use it) won't see anything called "smsv2" or "CRM v2" — they will see "Caller".

## What Caller replaces

- **Replaces:** `src/features/smsv2/` (the messy frontend behind `/crm`)
- **Does NOT replace:** the database, the edge functions, Twilio, OpenAI, Resend, Unipile, or anything that already works on the server
- **Does NOT touch:** the legacy `src/features/crm/CRMPage.tsx` (a separate landlord-deals page) or any frozen zone

In short: we keep everything that works on the server side, and we rewrite the user interface and the state management.

## How to work with Caller

If you are an AI agent or a developer:

1. Open `docs/caller/CALLER_OPERATING_SYSTEM.md` and read it end to end. It is the rulebook.
2. Open `docs/caller/ARCHITECTURE.md` for the system map.
3. Open `docs/caller/BUILD_PLAN.md` for the six phases.
4. Open `docs/caller/DECISIONS.md` for the rationale behind key choices.
5. Check `docs/caller/LOG.md` for what has been done recently.
6. Only after reading those four files, start your task.

If you are Hugo:

1. Pick a phase from `BUILD_PLAN.md`.
2. Hand off to the Co-Pilot with the phase number.
3. The Co-Pilot assigns subagents, tracks parallel work, and reports back with the three artefacts (summary, prompts, review).

## Where the code lives

- **New code:** `src/features/caller/`
- **Old code (do not touch):** `src/features/smsv2/`
- **Backend (do not rebuild):** `supabase/functions/wk-*`
- **Shared integrations:** `src/core/integrations/*`

## Routes

- **Today:** `/crm/*` is the live route, served by old `smsv2` code.
- **During build:** `/caller/*` is the new route, served by Caller.
- **After cutover:** `/crm/*` is served by Caller. `/smsv2/*` redirects continue to work.

## Why a rename

The internal folder was named `smsv2` for legacy reasons. The product is no longer about SMS — it is about calling. "Caller" reflects what the platform actually does and gives the rebuild a clean identity separate from the brittle history of `smsv2`.
