# 2026-04-14 — Booking site free-user demo missing

**Severity:** medium (UX regression, no data loss, no security impact)
**Detected:** 2026-04-14 by Hugo
**Resolved:** 2026-04-14 via PR #468
**Duration in production:** 2026-04-08 → 2026-04-14 (~6 days)

## Summary
Free users visiting `/dashboard/booking-site` saw the paid dashboard's empty "Complete your booking site setup" state instead of the interactive `BookingSitePreviewPage` demo. Paid users were unaffected.

## Root cause
PR #337 (commit `b6d057b`, 2026-04-08) — "convert booking-site dashboard to mockup with payment gates" — removed the tier branch in `src/pages/BookingSitePage.tsx` and made every user render `<BookingSiteDashboard>` unconditionally. The intent was to unify on a single dashboard with payment-gated action buttons, but the effect for free users was the bare empty-state view, not a playable preview.

The `BookingSitePreviewPage` function (the original demo, lines 87–370) was left in the file orphaned — never deleted, just no longer referenced.

## Fix
PR #468 (commit `7023a58`) — one-line restoration:

```diff
+  if (!isAdmin && !isPaidTier(tier)) return <BookingSitePreviewPage />;
   return <BookingSiteDashboard tier={tier} isAdminOverride={isAdmin} />;
```

- Free users → demo restored.
- Paid users → unchanged dashboard + magic-login to nfstay.app.
- Admins → bypass gate (keeps dashboard access for testing).

## Proof
`e2e/booking-site-free-demo.spec.ts` — red-then-green TDD:
- RED on prod before merge: assertions failed on the "Start Setup" empty state.
- GREEN on local with fix applied: preview tabs (Brand/Content/Contact) visible, dashboard tabs absent.
- Post-deploy verification by Hugo on hub.nfstay.com: confirmed working.

## Why this wasn't caught
1. PR #337 had no Playwright test covering the free-user view of `/dashboard/booking-site` — only the paid path was exercised.
2. The orphaned `BookingSitePreviewPage` function stayed in the file, so grep/tsc gave no signal that it was unreachable.
3. No free-tier test account existed in memory, so later audits defaulted to checking only the paid path.

## Follow-ups
- [x] Free-tier test account now exists: `free-booking-demo-20260414@nexivoproperties.co.uk` (created via Supabase Admin API, self-healing in `beforeAll`).
- [x] `e2e/booking-site-free-demo.spec.ts` is now part of the suite — any future regression flips it red.
- [ ] Consider deleting the orphaned `BookingSitePreviewPage` + `BookingSiteDashboard` coexistence pattern if/when Hugo decides the free view should go back to being a separate component permanently. For now both live in the same file and the branch selects between them.
- [ ] `.env.local` in working tree is missing `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — unrelated to this incident but flagged during investigation.

## Files touched
- `src/pages/BookingSitePage.tsx` (+1 line) — frozen zone, explicit Hugo approval
- `e2e/booking-site-free-demo.spec.ts` (new)
- `CHANGELOG.md`
