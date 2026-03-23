---
description: Investigate and fix a GitHub issue
argument-hint: [issue-number]
---
Read docs/AGENT_INSTRUCTIONS.md first.

## Issue Details

!`gh issue view $ARGUMENTS --repo hrds100/marketplace10`

## Issue Comments

!`gh issue view $ARGUMENTS --repo hrds100/marketplace10 --comments`

---

Follow this sequence:

1. **Understand the issue** - read the description and comments above
2. **Find the root cause** - trace through the relevant source files
3. **Fix it** - implement the minimum change that addresses the root cause
4. **Verify** - run `npx tsc --noEmit` and `npm run build` to confirm zero errors
5. **Report** - use the Section 11 response format from docs/AGENT_INSTRUCTIONS.md

Rules:
- Read every file before editing it
- Do NOT add unrequested features beyond the fix
- Do NOT revert or overwrite existing styles unless the issue requires it
- Create a feature branch: `fix/issue-$ARGUMENTS`
- Include ROOT CAUSE in your report
