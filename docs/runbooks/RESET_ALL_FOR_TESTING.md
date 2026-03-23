# 🗑️ Reset ALL Inbox + Payment State for Testing

> ⚠️ **Dev/test only.** Deletes all conversations, NDA acceptances, and invites for ALL users. Sets every user to free tier. Accounts and properties are NOT touched.

---

## What gets reset
- All chat messages → deleted
- All chat threads → deleted
- All NDA acceptances → deleted
- All magic link invites → deleted
- All user tiers → set to 'free'

## What stays
- User accounts (auth.users + profiles)
- Properties / deals
- CRM data
- Admin audit log

---

## How to run (manual)

1️⃣ Open **Supabase** → SQL Editor → New query

2️⃣ Paste and run:

```sql
-- Delete in FK order
DELETE FROM agreement_acceptances;
DELETE FROM landlord_invites;
DELETE FROM chat_messages;
DELETE FROM chat_threads;

-- Reset all tiers to free
UPDATE profiles SET tier = 'free';
```

3️⃣ ✅ Done - all inboxes empty, all users on free tier

---

## How to run (admin button)

Go to **hub.nfstay.com/admin** → Dashboard → scroll to "Testing" section → click **"Reset all inbox & payments for testing"** → confirm in the dialog.

### Deploy the Edge Function (one-time)

The admin button calls a Supabase Edge Function (`reset-for-testing`). If you see "Reset failed: the Edge Function may not be deployed", deploy it once:

**Option A - CLI (recommended):**
```bash
cd marketplace10
npx supabase link --project-ref asazddtvjvmckouxcmmo
npx supabase functions deploy reset-for-testing
```

**Option B - Dashboard:**
Go to Supabase → Edge Functions → Deploy a new function → name it `reset-for-testing` → paste the code from `supabase/functions/reset-for-testing/index.ts`.

After deploy, the admin button works immediately. No extra DB wiring needed - the function runs inside Supabase and has direct access to the project database via the service role.

---

### Troubleshooting

If the button still fails:
- **Supabase Dashboard** → Edge Functions → confirm `reset-for-testing` exists and shows a recent deployment timestamp
- **Vercel env** → confirm `VITE_SUPABASE_URL` points to the same Supabase project (`asazddtvjvmckouxcmmo`)
- **Browser DevTools** → Network tab → click "Yes, reset everything" → find the request to `.../functions/v1/reset-for-testing` → note the status code and response body
- **403 Forbidden** = your logged-in email is not in the admin list (`admin@hub.nfstay.com` or `hugo@nfstay.com`)
- **CORS error** = function needs redeploying (run `npx supabase functions deploy reset-for-testing`)

---

## After running

- Every user's inbox is empty (only nfstay Support thread remains - hardcoded)
- Every user is on free tier
- Inquire Now on any deal → creates fresh thread → payment gate appears for operators
- Properties and accounts are untouched
