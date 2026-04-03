# Lessons Learned

> Recurring mistakes, root causes, and "don't do this again" patterns.
> Newest entries at the top. Be specific - include file paths and what actually broke.

---

## 2026-04-03 - ghl-enroll had zero error logging

**What happened:** The `ghl-enroll` edge function (`supabase/functions/ghl-enroll/index.ts`) returned error HTTP responses to the caller but had no `console.error` calls at any failure point. When outreach enrollments failed, there was nothing in Supabase function logs to diagnose why.

**Root cause:** All error paths returned structured JSON errors to the frontend but never logged them server-side. The `catch` blocks were either empty or only forwarded errors to the response.

**Rule:** Every edge function should `console.error` with a prefix tag (e.g. `[ghl-enroll]`) at every failure point, even if the error is also returned in the HTTP response. Supabase function logs are the only diagnostic tool when the frontend caller doesn't surface details.

---

## 2026-04-03 - Email prefill only worked when WhatsApp existed in profile

**What happened:** The list-a-deal form's email pre-fill was inside an `if (data?.whatsapp)` block. Users without a WhatsApp number in their profile got a blank email field, even though their profile had an email address.

**Root cause:** The profile fetch callback gated ALL form updates (contactName, contactEmail, contactWhatsapp) on `data.whatsapp` being truthy. Only the WhatsApp field should have been gated.

**Rule:** When pre-filling multiple form fields from a profile query, don't nest unrelated fields inside a conditional for one specific field. Each field's prefill should be independent.

**File:** `src/pages/ListADealPage.tsx` lines 185-193 (before fix).

---

## 2026-03-23 - Password seed rename broke all social logins

**What happened:** A bulk rename accidentally changed the password seed `_NFsTay2!` across SignIn.tsx, SignUp.tsx, ParticleAuthCallback.tsx, and VerifyOtp.tsx. All social login users (Google, Apple, X, Facebook) were locked out.

**Root cause:** The seed string looked like a variable name to the rename tool. It's actually a cryptographic input that must stay exactly `_NFsTay2!` (mixed case, special chars).

**Rule:** Never rename `_NFsTay2!`. After any bulk rename, always verify: `grep -rn "_NFsTay2!" src/pages/SignIn.tsx src/pages/SignUp.tsx src/pages/ParticleAuthCallback.tsx src/pages/VerifyOtp.tsx` - all 4 must match.

---

## 2026-03-22 - vite.config.ts React alias crashed the entire site

**What happened:** Adding `resolve.alias` entries for React 18 in vite.config.ts caused a `TextEncoder is not a constructor` crash. The entire site went blank for all users.

**Root cause:** The Particle SDK, node polyfills, WASM loader, and React resolution are all fragile in vite.config.ts. The alias broke the polyfills plugin chain.

**Rule:** Never modify vite.config.ts unless 100% certain. The known working state has NO React 18 resolve aliases. If the site goes blank, check vite.config.ts first.

---

## 2026-03-22 - sed corrupted React/TypeScript files

**What happened:** Using `sed` to inject code into .tsx files created malformed merges - duplicate hooks, broken syntax, merged lines. The app crashed.

**Root cause:** sed does text replacement without understanding JSX/TypeScript syntax. It splits and merges lines in ways that break React's hook rules and JSX structure.

**Rule:** Never use sed to edit .tsx/.ts files. Always use proper Edit tools that understand file structure.

---

## 2026-03-19 - Branch merge from nfstay overwrote marketplace10 styles

**What happened:** A merge from the nfstay branch into marketplace10 silently reverted CSS fixes and layout changes that had been approved in previous PRs.

**Root cause:** The nfstay branch was stale (behind main). Merging it brought back old versions of files that had been fixed since the branch was created.

**Rule:** Always `git pull origin main` before branching. After any merge, diff the critical files: `git diff <before>..HEAD -- vite.config.ts src/main.tsx src/App.tsx src/layouts/AdminLayout.tsx`. If anything changed unexpectedly, investigate before pushing.

---

## 2026-03-20 - Supabase deploy reset verify_jwt to true

**What happened:** After deploying a Supabase edge function, the `verify_jwt` setting silently reverted to `true`. Webhook endpoints that needed to accept unauthenticated requests (from n8n, GHL, SamCart) stopped working.

**Root cause:** Supabase resets verify_jwt to true on every deploy. The `--no-verify-jwt` flag must be passed at deploy time, AND verify_jwt must be patched to false via the Management API afterward.

**Rule:** After every edge function deploy, immediately run: `SUPABASE_ACCESS_TOKEN=<PAT> supabase functions deploy <name> --project-ref asazddtvjvmckouxcmmo --no-verify-jwt`. Then verify with the Management API that verify_jwt is false.

---

*Add new lessons at the top. Be specific about what broke and why. Future agents read this to avoid repeating mistakes.*
