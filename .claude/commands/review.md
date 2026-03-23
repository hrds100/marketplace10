---
description: Review the current branch diff for issues before merging
---
## Branch Info

!`git branch --show-current`

## Files Changed

!`git diff --name-only main...HEAD`

## Full Diff

!`git diff main...HEAD`

## Recent Commits on This Branch

!`git log main..HEAD --oneline`

---

Review all changes above for:

1. **TypeScript errors** - anything that would fail `npx tsc --noEmit`
2. **Security issues** - hardcoded secrets, XSS, SQL injection, exposed API keys
3. **Missing error handling** - async calls without try/catch, missing loading/error states
4. **RLS safety** - any Supabase mutation without a confirmed RLS policy
5. **Style consistency** - does it match existing patterns in the codebase
6. **Regressions** - does this change break any existing feature

Give specific, actionable feedback per file. If everything looks clean, say so.

End with a clear verdict: SAFE TO MERGE or NEEDS FIXES (with the list).
