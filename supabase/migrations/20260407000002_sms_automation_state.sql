-- Conversation automation state — tracks where each contact is in a flow
CREATE TABLE IF NOT EXISTS sms_automation_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES sms_conversations(id) ON DELETE CASCADE,
  automation_id uuid NOT NULL REFERENCES sms_automations(id) ON DELETE CASCADE,
  current_node_id text NOT NULL,  -- which node we're at in the flow
  step_number integer NOT NULL DEFAULT 0,
  context_data jsonb DEFAULT '{}',  -- variables collected during the flow
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'completed', 'paused')),
  -- active = bot is running
  -- suspended = human took over (manual reply)
  -- completed = flow reached end/stop node
  -- paused = temporarily paused by user
  last_message_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  exit_reason text,  -- 'stop_node', 'manual_takeover', 'timeout', 'opted_out'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, automation_id)
);

ALTER TABLE sms_automation_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_automation_state_admin" ON sms_automation_state
  FOR ALL USING (
    auth.jwt() ->> 'email' = ANY(ARRAY['admin@hub.nfstay.com', 'hugo@nfstay.com', 'hugodesouzax@gmail.com', 'hugords100@gmail.com', 'hugo24eu@gmail.com'])
  ) WITH CHECK (
    auth.jwt() ->> 'email' = ANY(ARRAY['admin@hub.nfstay.com', 'hugo@nfstay.com', 'hugodesouzax@gmail.com', 'hugords100@gmail.com', 'hugo24eu@gmail.com'])
  );

-- Add automation_enabled flag to conversations (per-conversation toggle)
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS automation_id uuid REFERENCES sms_automations(id) ON DELETE SET NULL;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS automation_enabled boolean NOT NULL DEFAULT false;

-- Add realtime for automation state
ALTER PUBLICATION supabase_realtime ADD TABLE sms_automation_state;
