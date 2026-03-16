# Clear Inbox Data for Testing

> **Dev/test only.** This removes all threads and messages; run only if you want to start fresh.

Run in **Supabase SQL Editor** (order matters — foreign keys):

```sql
DELETE FROM agreement_acceptances;
DELETE FROM landlord_invites;
DELETE FROM chat_messages;
DELETE FROM chat_threads;
```

After running:
1. Refresh `/dashboard/inbox` — thread list will be empty (only NFsTay Support remains, which is hardcoded)
2. Click "Inquire Now" on any deal — a new thread is created
3. If your tier is `free`, the payment gate ("Unlock Now") will appear
4. To test as free tier: `UPDATE profiles SET tier = 'free' WHERE email = 'hugo@nfstay.com';`
5. After testing: `UPDATE profiles SET tier = 'monthly' WHERE email = 'hugo@nfstay.com';`
