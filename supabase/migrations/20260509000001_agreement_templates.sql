-- Agreement templates — reusable agreement drafts for CRM users.
-- Mirrors the ownership model of wk_sms_templates: global templates
-- visible to everyone, personal templates owned by individual agents.

CREATE TABLE IF NOT EXISTS agreement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL DEFAULT 'Investment Agreement',
  terms_html text,
  default_amount numeric,
  default_currency text NOT NULL DEFAULT 'USD',
  is_global boolean NOT NULL DEFAULT false,
  owner_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agreement_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agt_select" ON agreement_templates FOR SELECT
  USING (
    is_global = true
    OR owner_agent_id = auth.uid()
    OR wk_is_admin()
  );

CREATE POLICY "agt_insert" ON agreement_templates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "agt_update" ON agreement_templates FOR UPDATE
  USING (
    owner_agent_id = auth.uid()
    OR wk_is_admin()
  );

CREATE POLICY "agt_delete" ON agreement_templates FOR DELETE
  USING (
    owner_agent_id = auth.uid()
    OR wk_is_admin()
  );
