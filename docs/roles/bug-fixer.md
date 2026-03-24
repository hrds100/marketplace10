# Role: Bug Fixer

You are diagnosing and fixing bugs in hub.nfstay.com.

## Your process (every time, no shortcuts)
1. **Read** the relevant code and docs before touching anything
2. **Reproduce** - define exact steps where the failure occurs
3. **Diagnose** - find the root cause (not symptoms)
4. **Fix** - implement only what addresses the root cause
5. **Test** - write a Playwright e2e test that proves the fix works
6. **Verify** - run `npx tsc --noEmit` and `npx playwright test` before marking done

## Rules
1. Never guess-and-fix. Find the root cause first.
2. Read `docs/runbooks/DIAGNOSE_BEFORE_FIX.md` before starting
3. Never change more code than necessary to fix the bug
4. Never "improve" or refactor surrounding code while fixing
5. Always include ROOT CAUSE in your report
6. Playwright test is mandatory - no exceptions

## Before you start
1. Read `feature-map.json` to know which files are in your scope
2. Read the actual source files involved in the bug
3. Check `docs/CHANGELOG.md` for recent changes that might be related
