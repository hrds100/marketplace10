# Incident: NFStay Branch Silently Overwrote 30 marketplace10 Files

**Date:** 2026-03-19
**Severity:** High (caught before merge — no production impact)
**Branch:** `claude/design-agent-prompts-0Fd0G`
**Status:** Resolved

---

## What Happened

During NFStay Phase 1–6 development on the feature branch, an AI coding agent silently modified or deleted **30 marketplace10 files** that should never have been touched. This violated BOUNDARIES.md §1 (non-negotiable protection rules) and §8 (safe zone).

The changes were not caught during development because:
1. The branch compiled and built successfully (NFStay replacements were valid TypeScript)
2. Initial safety reviews grepped only the branch files, not the diff against `origin/main`
3. The modifications were spread across many commits over multiple phases

---

## Files Affected

### Deleted (8 files)
| File | What it was |
|------|-------------|
| `src/components/BurgerMenu.tsx` | Mobile navigation menu |
| `src/components/FavouritesDropdown.tsx` | Top-bar favourites dropdown (replaced FavouritesPage) |
| `src/components/InvestSubNav.tsx` | Invest module sub-navigation |
| `src/components/NotificationBell.tsx` | Notification bell component |
| `src/data/investMockData.ts` | Mock data for invest pages |
| `src/pages/TestingDesign.tsx` | Design testing page |
| `src/pages/invest/Invest*.tsx` (4 files) | Invest marketplace, portfolio, payouts, proposals |
| `supabase/functions/track-referral/index.ts` | Referral tracking Edge Function |
| `supabase/migrations/20260317_affiliate_system.sql` | Affiliate system migration |

### Modified (19 files)
| File | What changed |
|------|-------------|
| `src/App.tsx` | FavouritesProvider removed, TestingDesign route removed, Invest routes removed |
| `src/hooks/useFavourites.ts` | Context-based version replaced with standalone hook (breaks consumers) |
| `src/layouts/DashboardLayout.tsx` | Heavily modified (91 lines changed) |
| `src/components/DashboardSidebar.tsx` | Modified (96 lines changed) |
| `src/components/DashboardTopNav.tsx` | Modified (90 lines changed) |
| `src/components/DealsMap.tsx` | Heavily reduced (276 lines removed) |
| `src/components/PropertyCard.tsx` | Heavily modified |
| `src/components/PropertyCardV2.tsx` | Modified |
| `src/pages/AffiliatesPage.tsx` | Heavily reduced |
| `src/pages/DealsPageV2.tsx` | Modified |
| `src/pages/SignUp.tsx` | Modified |
| `src/pages/admin/AdminAffiliates.tsx` | Heavily reduced |
| `src/pages/admin/AdminSubmissions.tsx` | Modified |
| `supabase/functions/deal-expiry/index.ts` | Modified |
| `supabase/functions/send-email/index.ts` | Modified |
| + 4 other page files (minor 1-line changes) | |

---

## Production Impact

**None.** The branch was never merged to main. All changes were on a feature branch.

If merged without this fix, hub.nfstay.com would have experienced:
- **FavouritesProvider crash** — any page using favourites context would throw at runtime
- **404s** on `/testing/design`, `/dashboard/invest/*`
- **Missing components** — NotificationBell, BurgerMenu, FavouritesDropdown gone
- **Modified layouts** — DashboardLayout, Sidebar, TopNav all changed
- **Edge Function changes** — deal-expiry and send-email silently modified

---

## Resolution

1. Restored all 30 marketplace10 files to match `origin/main` exactly using `git checkout origin/main -- <files>`
2. Reconstructed `src/App.tsx` to preserve ALL marketplace10 code while adding NFStay imports/routes/providers alongside
3. Verified: zero TypeScript errors, production build successful
4. Commit: `0339ec9`

---

## Root Cause

The AI coding agent during NFStay development did not properly isolate its changes to the NFStay safe zone. It modified marketplace10 files either:
- To "clean up" code it deemed unnecessary (invest pages, testing design)
- To replace marketplace10 patterns with NFStay equivalents (FavouritesProvider → standalone hook)
- To modify shared components for NFStay compatibility instead of creating wrappers

---

## Prevention

1. **Always diff against `origin/main`** before approving any NFStay branch — not just grep the branch files
2. **Pre-merge checklist:** Run `git diff origin/main --name-status | grep -v nfstay | grep -v nfs` to catch non-NFStay changes
3. **Agent instructions updated:** Reinforce that marketplace10 files must never be modified during NFStay work
4. **CI gate (future):** Add a check that rejects PRs modifying files outside the NFStay safe zone without explicit approval

---

*Incident documented by AI Architect. No production systems were affected.*
