-- ============================================================================
-- SMSV2 / CRM — Inbox war-room fix (PR 52, Hugo 2026-04-27 evening)
--
-- Symptom:
--   wk-sms-incoming receives + saves the row to wk_sms_messages, but
--   the message never appears in the /crm/inbox UI even after page
--   reload. Edge fn logs show the row was inserted with a valid
--   contact_id; yet Hugo (admin) sees nothing.
--
-- Root causes (multiple, layered):
--
--   1. wk_contacts is NOT in supabase_realtime publication.
--      Inbound SMS from a NEW number creates a wk_contacts row via
--      wk-sms-incoming. The /crm/inbox sidebar is hydrated from
--      wk_contacts via useHydrateContacts, with a realtime channel
--      subscribed to postgres_changes on wk_contacts. With the table
--      missing from the publication, that channel emits no events —
--      the new contact never appears in the sidebar without a hard
--      refresh.
--
--   2. wk_sms_messages_read RLS policy chains through wk_contacts
--      RLS via an EXISTS subquery. The subquery is itself filtered
--      by wk_contacts' policy ('admin OR owner_agent_id = auth.uid()'),
--      meaning a non-admin signed in as a normal user can NOT SELECT
--      messages on contacts they don't own — even ones bridged in by
--      inbound SMS (owner_agent_id = NULL). For Hugo (admin) this
--      passes, but the path is fragile and Hugo wanted normal-user
--      visibility too.
--
--   3. wk_sms_messages REPLICA IDENTITY default is the primary key
--      only. Realtime DELETE / UPDATE events would carry only the id
--      column in payload.old, so the InboxPage's filter-by-contact_id
--      in useContactMessages misses them. Set REPLICA IDENTITY FULL
--      so the entire row is in the WAL.
--
-- Fix:
--   a. Add wk_contacts to supabase_realtime so new bridged rows
--      stream into useHydrateContacts.
--   b. Replace wk_sms_messages_read with a direct workspace_role
--      check (no EXISTS over wk_contacts). Anyone with a CRM
--      workspace_role sees all messages. Outbound INSERT keeps the
--      EXISTS check so RLS still gates writes by contact existence.
--   c. ALTER REPLICA IDENTITY FULL on wk_sms_messages.
-- ============================================================================

-- Part A — wk_contacts realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'wk_contacts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wk_contacts;
  END IF;
END $$;
ALTER TABLE wk_contacts REPLICA IDENTITY FULL;

-- Part B — relax wk_sms_messages_read for the CRM workspace.
DROP POLICY IF EXISTS wk_sms_messages_read ON wk_sms_messages;
CREATE POLICY wk_sms_messages_read ON wk_sms_messages
  FOR SELECT TO authenticated
  USING (
    -- Any CRM-eligible role (admin / agent / viewer) sees the whole
    -- inbox. Per-contact filtering is done by the application — the
    -- sidebar shows contacts the user owns; admins see all.
    wk_is_agent_or_admin()
  );

-- Part C — make realtime UPDATE/DELETE payloads useful.
ALTER TABLE wk_sms_messages REPLICA IDENTITY FULL;

COMMENT ON POLICY wk_sms_messages_read ON wk_sms_messages IS
  'PR 52 (2026-04-27): SELECT for any CRM workspace_role. Replaces the EXISTS-over-wk_contacts chain that was masking inbound rows for users whose RLS path through wk_contacts was blocked.';
