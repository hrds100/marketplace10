# Realtime Setup for Inbox

> One-time setup. Required for messages and threads to appear live without refresh.

## 1. Enable Replication

Go to **Supabase Dashboard** → **Database** → **Replication** → turn ON for:
- `chat_messages`
- `chat_threads`

## 2. Set REPLICA IDENTITY FULL

Run in **SQL Editor**:

```sql
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE chat_threads REPLICA IDENTITY FULL;
```

This allows the Realtime subscription to receive the full row data on INSERT events, so both operator and landlord see new messages and threads without refresh.

## Fallback

The app also polls every 5s (messages) and 6s (thread list) when the tab is visible, so even if Realtime is not configured, data will still appear within a few seconds.
