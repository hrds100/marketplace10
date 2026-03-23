# 🗑️ Clear ALL Inbox Data for ALL Users

> ⚠️ **Dev/test only.** This deletes every thread, message, NDA acceptance, and invite for EVERY user. All inboxes will be completely empty.

---

## How to run

1️⃣ Open **Supabase** → your project dashboard (`asazddtvjvmckouxcmmo`)

2️⃣ Click **SQL Editor** → **New query**

3️⃣ Copy-paste the SQL below, then click **Run**

4️⃣ ✅ Done — every user's inbox is now empty

---

## SQL

```sql
DELETE FROM agreement_acceptances;
DELETE FROM landlord_invites;
DELETE FROM chat_messages;
DELETE FROM chat_threads;
```

---

## After running

Every user's inbox is now empty. The only thread visible is **nfstay Support** (hardcoded in the app, not from the database).

**For you (Hugo):**

1. 🔄 Refresh `/dashboard/inbox` — thread list is empty (only Support thread remains)
2. 🏠 Click **Inquire Now** on any deal — a brand new thread is created
3. 🔒 To test the payment gate: `UPDATE profiles SET tier = 'free' WHERE email = 'hugo@nfstay.com';`
4. 💳 Open the new thread → you'll see the **"Unlock Now"** payment banner
5. ✅ After testing: `UPDATE profiles SET tier = 'monthly' WHERE email = 'hugo@nfstay.com';`
