# Runbook: "Something went wrong - The app encountered an unexpected error"

> How to diagnose and fix the React ErrorBoundary crash on hub.nfstay.com

---

## What This Error Means

The app uses Sentry's `ErrorBoundary` in `src/main.tsx`. When ANY unhandled JavaScript error occurs during React rendering, the entire page shows:

```
Something went wrong
The app encountered an unexpected error. Please try reloading.
```

This is NOT a build error - the app built and deployed fine. It's a **runtime crash** in the browser.

---

## Step 1: Find the Error

### Option A: Sentry Dashboard (fastest)
1. Go to Sentry → javascript-react project
2. Look at the latest issue - it shows the exact error + stack trace
3. The stack trace will be minified (e.g., `at Tre (/assets/index-B2W8vET-.js:986:26215)`)
4. The error MESSAGE is what matters: e.g., `ReferenceError: property is not defined`

### Option B: Browser Console
1. Open hub.nfstay.com
2. Press F12 → Console tab
3. Look for red errors BEFORE the "Something went wrong" message
4. The first red error is the root cause

### Option C: Source Maps (if available)
```bash
npm run build -- --sourcemap
# Then check the error line in the source map
```

---

## Step 2: Common Causes

### Cause 1: Variable Reference Error (most common)
**Error:** `ReferenceError: X is not defined`

**What happened:** A sub-component defined at module scope references a variable that only exists inside the parent component.

**Example (2026-03-19):**
```
ReferenceError: property is not defined
```

Eight sub-components in `InvestMarketplacePage.tsx` (PropertyBadges, MetricPills, ImageCarousel, InvestCardContent, ProfitCalculator, DescriptionHighlights, DocumentsSection, AgentReferralLink) were defined at module scope but referenced `property` which was a local variable inside `InvestMarketplacePage()`.

**Fix pattern:**
```typescript
// BEFORE (crashes):
function PropertyBadges() {
  return <div>{property.type}</div>;  // property is NOT in scope!
}

// AFTER (works):
function PropertyBadges({ property }: { property: PropertyData }) {
  return <div>{property.type}</div>;  // property received as prop
}
```

**How to find ALL instances:**
```bash
# List all module-scope functions and check what they reference
grep -n "^function " src/pages/invest/InvestMarketplacePage.tsx

# For each function, check if it references variables from the parent:
awk '/^function PropertyBadges/,/^function [A-Z]/' src/pages/invest/InvestMarketplacePage.tsx | grep "property\."
```

### Cause 2: Deleted File Import
**Error:** `Module not found` or `Cannot find module`

**What happened:** A file was deleted but something still imports it.

**How to check:**
```bash
grep -rn "from.*deletedFileName" src/ --include="*.tsx" --include="*.ts"
```

### Cause 3: Hook Called Conditionally
**Error:** `Rendered more hooks than during the previous render`

**What happened:** A React hook is inside an if/return block.

**How to check:**
```bash
# Hooks must be at the TOP of the component, before any returns
grep -B5 "useState\|useEffect\|useQuery\|useMutation" src/pages/invest/*.tsx | grep "if\|return"
```

### Cause 4: Null/Undefined Access
**Error:** `TypeError: Cannot read properties of null/undefined`

**What happened:** Data from Supabase or blockchain returned null/undefined and the code didn't handle it.

**How to check:**
```bash
# Look for property access without null checks
grep "\.title\|\.name\|\.id" src/pages/invest/*.tsx | grep -v "?\." | grep -v "||"
```

### Cause 5: Missing Package
**Error:** `Cannot resolve module 'package-name'`

**What happened:** A package was added locally but not committed to package.json, or the squash merge dropped the change.

**How to check:**
```bash
npm run build 2>&1 | grep "failed to resolve"
```

---

## Step 3: Fix It

### Quick Fix Process
```bash
# 1. Reproduce: check TypeScript first
npx tsc --noEmit

# 2. If TypeScript passes but runtime crashes, the error is in code logic
#    (TypeScript can't catch ReferenceErrors from module-scope functions)

# 3. Build locally
npm run build

# 4. If build fails, fix the build error
# 5. If build passes, the crash is runtime-only - need browser testing

# 6. Fix the code
# 7. Verify
npx tsc --noEmit && npm test && npm run build

# 8. Commit and push
git add [files] && git commit -m "Fix: [description]" && git push origin main
```

### Verify the Fix Deployed
```bash
# Check deployment status
gh api repos/hrds100/marketplace10/deployments --jq '.[0] | {sha: .sha[0:7], state: .statuses_url}'
gh api repos/hrds100/marketplace10/deployments/DEPLOY_ID/statuses --jq '.[0] | {state, description}'
```

### If Fix Deployed But Still Broken
1. Vercel CDN might serve cached version - wait 2-3 minutes
2. User should hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
3. Check if the JS bundle hash changed: `curl -s https://hub.nfstay.com/ | grep 'index.*\.js'`

---

## Step 4: Prevent It

### Before Committing
```bash
npx tsc --noEmit    # Catches type errors
npm test            # Catches logic errors
npm run build       # Catches bundle errors
```

### Code Patterns to Follow
```typescript
// ALWAYS pass data as props to sub-components
function SubComponent({ property }: { property: PropertyData }) { ... }

// NEVER reference parent variables from module-scope functions
// (TypeScript won't catch this - it's a runtime-only error)

// ALWAYS null-check data from Supabase/blockchain
const value = data?.field ?? defaultValue;

// ALWAYS wrap async operations in try/catch
try {
  await someBlockchainCall();
} catch (err) {
  toast.error('Failed');
}
```

### Sentry Setup
The ErrorBoundary is in `src/main.tsx`:
```typescript
<Sentry.ErrorBoundary fallback={<FallbackUI />}>
  <App />
</Sentry.ErrorBoundary>
```

All unhandled errors are captured and sent to Sentry automatically.

---

## Incident History

| Date | Error | Root Cause | Fix |
|------|-------|-----------|-----|
| 2026-03-19 | `ReferenceError: property is not defined` | 8 sub-components in InvestMarketplacePage referenced `property` from parent scope after mock data was removed and `property` became a local variable | Pass `property` as prop to all sub-components. Commits: `0cf91ba`, `a3652b4` |
| 2026-04-01 | `ReferenceError: bcPropertyId is not defined` | `RecentActivityTable` (module-scope component) had `bcPropertyId` in its `useCallback` dependency array, but `bcPropertyId` is only declared inside `InvestMarketplacePage`. TypeScript/lint did not catch it because dependency arrays are typed as `any[]`. | Removed the out-of-scope dependency. PR #168. |
| 2026-04-01 | Infinite re-render loop (no visible error, but page hangs) | `DealsPageV2.tsx` `useEffect` had `[investProperties]` as dependency. React Query returns a new array reference every render, causing infinite fetch/setState loop. | Changed to `[investProperties?.length]`. PR #167. |

### Lesson from 2026-04-01 incident

**Out-of-scope variables in React hook dependency arrays pass TypeScript and lint but crash at runtime.** This is a blind spot in the current toolchain. Always browser-verify after any change that adds variables to `useCallback`/`useEffect`/`useMemo` dependency arrays, especially when the hook is in a different function component than where the variable is declared.

**Unstable React Query references in useEffect dependencies cause infinite loops.** Always use a stable primitive (`.length`, a specific field) instead of the full array/object from React Query.

---

*Last updated: 2026-04-01*
