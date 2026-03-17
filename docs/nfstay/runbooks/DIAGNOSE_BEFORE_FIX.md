# NFStay — Diagnose Before Fix

> For every bug report or "X not working" task. Follow this before writing any fix.
> Mirrors the repo-level Section 3e protocol, adapted for NFStay-specific systems.

---

## THE RULE

**Never guess-and-fix.** Every bug report must go through:

1. **Audit** — read relevant code and docs
2. **Reproduce** — define exact steps where failure occurs
3. **Diagnose** — identify root cause
4. **Fix** — implement only what addresses root cause
5. **Verify** — confirm fix works

The Phase 2 report **must** include `ROOT CAUSE:` for every bug task.

---

## NFStay DIAGNOSTIC CHECKLIST

### 1. Which system is involved?

| Symptom | Check first |
|---------|------------|
| Page not loading / blank | Frontend routes (`app/(nfstay)/`), middleware routing |
| Data not showing | RLS policies on `nfs_*` tables, Supabase query, auth state |
| Data not saving | RLS policies (INSERT/UPDATE), auth.uid() context |
| Payment failing | Stripe keys (live vs test?), Edge Function logs, webhook delivery |
| Hospitable sync failing | n8n workflow execution logs, bearer token expiry, webhook URL |
| White-label not loading | Middleware hostname detection, subdomain lookup, Vercel domain config |
| iCal not updating | n8n cron execution, external calendar URL validity |
| Images not uploading | Storage bucket policies, file size limits, Supabase Storage status |
| Email not sending | Resend API key, Edge Function logs, DNS (SPF/DKIM) |
| Custom domain not working | DNS verification, Cloudflare API token, SSL provisioning |

### 2. Check these in order

1. **Browser console** — any JavaScript errors?
2. **Network tab** — any failed API calls? What status code?
3. **Supabase logs** — Edge Function invocation logs (Supabase Dashboard → Edge Functions → Logs)
4. **n8n execution history** — did the workflow run? Did it succeed? (n8n → Executions)
5. **RLS** — is the policy correct? Test with: `SELECT * FROM nfs_[table] WHERE ...` in SQL Editor as the user's role
6. **Vercel logs** — build errors? Runtime errors? (Vercel Dashboard → Deployments → Logs)
7. **Stripe Dashboard** — webhook delivery status, event logs
8. **Auth state** — is `auth.uid()` returning the expected value? Is the user authenticated?

### 3. Common NFStay-specific issues

| Issue | Likely cause |
|-------|-------------|
| Operator can't see their properties | RLS policy on `nfs_properties` doesn't match `auth.uid()` → `nfs_operators.profile_id` chain |
| Stripe checkout fails | Wrong Stripe key (live vs test), missing `NFS_STRIPE_SECRET_KEY` Edge Function secret |
| Hospitable sync stuck | Bearer token expired, n8n workflow error, webhook URL not updated |
| White-label shows wrong operator | Subdomain lookup returning wrong row, middleware extracting hostname incorrectly |
| Reservation not confirmed after payment | Stripe webhook not delivered (check Stripe Dashboard), webhook secret mismatch, `nfs_webhook_events` duplicate check |
| Photos not displaying | Supabase Storage bucket not public, URL format wrong |
| Analytics not recording | `nfs_analytics` INSERT policy missing for anon users |
| Promo code rejected | Code expired, `current_uses >= max_uses`, wrong operator scope |

### 4. NFStay vs marketplace10 confusion

If the bug seems to affect marketplace10 features:
- **Check you're looking at the right table.** `properties` (marketplace10) vs `nfs_properties` (NFStay).
- **Check the route.** `/dashboard/*` is marketplace10. `/nfstay/*` is NFStay.
- **Check the Edge Function.** `nfs-*` is NFStay. Others are marketplace10.
- **Don't fix marketplace10 bugs in NFStay tickets** and vice versa. Flag it and move on.

---

## REPORT FORMAT (Bug Tasks)

```
✅ WHAT WAS DONE
[one sentence — what was fixed]

🔍 ROOT CAUSE
[one sentence — why it was broken]

🌿 BRANCH: [branch]
📦 COMMIT: [hash] — [message]
🔁 CI: running → github.com/hrds100/marketplace10/actions
🔗 PREVIEW: https://marketplace10-git-[branch]-hugos-projects-f8cc36a8.vercel.app

👀 WHAT TO CHECK ON THE PREVIEW
[how to verify the fix]

⚠️ ISSUES: [any, or "None"]
```

---

*End of NFStay Diagnose Before Fix.*
