-- Migration: Dual-role inbox RLS + NDA acceptances + magic link invites
-- Applied: 2026-03-16

-- landlord_invites
CREATE TABLE IF NOT EXISTS public.landlord_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  magic_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.landlord_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read invites by token" ON landlord_invites FOR SELECT USING (true);
CREATE POLICY "Landlord can mark invite used" ON landlord_invites FOR UPDATE
  USING (thread_id IN (SELECT id FROM chat_threads WHERE landlord_id = auth.uid()));

-- agreement_acceptances
CREATE TABLE IF NOT EXISTS public.agreement_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL REFERENCES profiles(id),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  metadata jsonb
);
ALTER TABLE public.agreement_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Thread members can insert acceptances" ON agreement_acceptances FOR INSERT
  WITH CHECK (thread_id IN (SELECT id FROM chat_threads WHERE landlord_id = auth.uid() OR operator_id = auth.uid()));
CREATE POLICY "Thread members can read acceptances" ON agreement_acceptances FOR SELECT
  USING (thread_id IN (SELECT id FROM chat_threads WHERE landlord_id = auth.uid() OR operator_id = auth.uid()));

-- chat_threads RLS — both operator and landlord
DROP POLICY IF EXISTS "Thread members can read" ON chat_threads;
DROP POLICY IF EXISTS "Thread members can update" ON chat_threads;
DROP POLICY IF EXISTS "Authenticated can create threads" ON chat_threads;
CREATE POLICY "Thread members can read" ON chat_threads FOR SELECT
  USING (operator_id = auth.uid() OR landlord_id = auth.uid());
CREATE POLICY "Thread members can update" ON chat_threads FOR UPDATE
  USING (operator_id = auth.uid() OR landlord_id = auth.uid());
CREATE POLICY "Operators can create threads" ON chat_threads FOR INSERT
  WITH CHECK (operator_id = auth.uid());

-- chat_messages RLS — both roles
DROP POLICY IF EXISTS "Thread members can read messages" ON chat_messages;
DROP POLICY IF EXISTS "Thread members can send messages" ON chat_messages;
CREATE POLICY "Thread members can read messages" ON chat_messages FOR SELECT
  USING (thread_id IN (SELECT id FROM chat_threads WHERE operator_id = auth.uid() OR landlord_id = auth.uid()));
CREATE POLICY "Thread members can send messages" ON chat_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND thread_id IN (SELECT id FROM chat_threads WHERE operator_id = auth.uid() OR landlord_id = auth.uid()));
