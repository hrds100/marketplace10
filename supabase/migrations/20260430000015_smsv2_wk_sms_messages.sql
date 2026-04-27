-- ============================================================================
-- SMSV2 / CRM — wk_sms_messages: single source of truth for CRM SMS
-- (PR 50, Hugo 2026-04-27)
--
-- Why a refactor:
--   The legacy sms-webhook-incoming → sms_messages → useContactTimeline path
--   has been patched ten times and inbound SMS still doesn't surface in
--   /crm/inbox or /sms/inbox. Hugo's call: stop patching, build a clean,
--   minimal receive path owned by the CRM module.
--
--   This table is the canonical CRM message store. It is INDEPENDENT of
--   the legacy sms_messages / sms_conversations / sms_contacts tables —
--   no joins, no foreign-key chains, no cross-schema coupling. Every
--   row is a single message tied to one wk_contact.
--
--   Inbound writer: edge fn wk-sms-incoming (new — replaces sms-webhook-
--   incoming for the /crm path).
--   Outbound writer: edge fn wk-sms-send (new — replaces sms-send for
--   /crm). Both write into this single table.
--
--   Reader: /crm/inbox via useInboxThreads + useContactMessages hooks.
--   Realtime publication is enabled so the inbox updates without polling.
-- ============================================================================

CREATE TABLE IF NOT EXISTS wk_sms_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    uuid NOT NULL REFERENCES wk_contacts(id) ON DELETE CASCADE,
  -- Inbound: from caller, to us. Outbound: from us, to caller.
  direction     text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body          text NOT NULL DEFAULT '',
  -- Twilio MessageSid — UNIQUE so duplicate webhook deliveries
  -- become idempotent NO-OPs (Twilio retries 11x on 5xx + once on 4xx).
  twilio_sid    text UNIQUE,
  -- Phone numbers as Twilio reported them. We keep the raw string so we
  -- can reason about format mismatches when debugging. The contact_id
  -- is the lookup key — numbers are descriptive only.
  from_e164     text NOT NULL,
  to_e164       text,
  -- MediaUrl0..N captured at receive time (Twilio expires these in 4h
  -- via the API; the agent can re-fetch by SID later if needed).
  media_urls    text[] NOT NULL DEFAULT '{}',
  -- delivery / read state
  status        text NOT NULL DEFAULT 'received',
  -- For outbound: the agent who sent it (NULL for inbound).
  created_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Read patterns:
--   1. Per-contact thread: WHERE contact_id = $1 ORDER BY created_at ASC
--   2. Inbox list: latest row per contact_id ORDER BY created_at DESC
--   3. Idempotency on insert: WHERE twilio_sid = $1
CREATE INDEX IF NOT EXISTS wk_sms_messages_contact_idx
  ON wk_sms_messages (contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wk_sms_messages_created_idx
  ON wk_sms_messages (created_at DESC);

-- ============================================================================
-- RLS — admin write, agents read their own contact's messages, viewers read.
-- ============================================================================
ALTER TABLE wk_sms_messages ENABLE ROW LEVEL SECURITY;

-- Service-role bypass is automatic (edge fns use service role).
-- Authenticated reads: any signed-in user with a CRM workspace_role can
-- see rows for contacts they're allowed to see (admins see all,
-- non-admins see only their own contacts via wk_contacts RLS).
DROP POLICY IF EXISTS wk_sms_messages_read ON wk_sms_messages;
CREATE POLICY wk_sms_messages_read ON wk_sms_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wk_contacts c
      WHERE c.id = wk_sms_messages.contact_id
    )
  );

-- Authenticated INSERT for outbound (the user is sending from /crm).
-- The edge fn that mints the row uses service role anyway, but keeping
-- this open for completeness if the frontend ever writes directly.
DROP POLICY IF EXISTS wk_sms_messages_insert ON wk_sms_messages;
CREATE POLICY wk_sms_messages_insert ON wk_sms_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    direction = 'outbound'
    AND EXISTS (
      SELECT 1 FROM wk_contacts c
      WHERE c.id = wk_sms_messages.contact_id
    )
  );

-- ============================================================================
-- Realtime — /crm/inbox subscribes to INSERT events to refresh threads.
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE wk_sms_messages;

COMMENT ON TABLE wk_sms_messages IS
  'PR 50 (2026-04-27): canonical CRM SMS table. Replaces sms_messages for /crm/inbox. Inbound writer: wk-sms-incoming. Outbound writer: wk-sms-send. Realtime-enabled.';
