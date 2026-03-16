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

3️⃣ ✅ Done — all inboxes empty, all users on free tier

---

## How to run (admin button)

Go to **hub.nfstay.com/admin** → Dashboard → scroll to "Testing" section → click **"Reset all inbox & payments for testing"** → confirm in the dialog.

---

## After running

- Every user's inbox is empty (only NFsTay Support thread remains — hardcoded)
- Every user is on free tier
- Inquire Now on any deal → creates fresh thread → payment gate appears for operators
- Properties and accounts are untouched
