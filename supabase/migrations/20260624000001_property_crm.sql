-- ============================================================================
-- Property Ops CRM — internal staff tool at /properties.
-- Self-contained namespace (pcrm_*) so it does not touch any existing tables.
--
-- Tables: workspaces / members / rows (property records) / fields (columns) /
-- cells (values) / credentials / documents / activity / views.
--
-- Gate: profiles.workspace_role IS NOT NULL OR email in admin list.
-- Per-workspace role lives in pcrm_members.role (admin|manager|staff|viewer).
--
-- Credentials are stored as plaintext in this phase — protection is "must be
-- logged in as staff" (RLS). Vault encryption is a Phase 2 follow-up.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper functions (SECURITY DEFINER so they can read profiles under RLS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pcrm_is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Hardcoded admins always pass
    ((auth.jwt() ->> 'email') IN ('admin@hub.nfstay.com', 'hugo@nfstay.com', 'chris@nfstay.com'))
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND workspace_role IS NOT NULL
    );
$$;

CREATE OR REPLACE FUNCTION pcrm_workspace_role(p_workspace_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Hardcoded admins → workspace admin everywhere
    WHEN (auth.jwt() ->> 'email') IN ('admin@hub.nfstay.com', 'hugo@nfstay.com', 'chris@nfstay.com')
      THEN 'admin'
    ELSE (
      SELECT role FROM pcrm_members
      WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
      LIMIT 1
    )
  END;
$$;

CREATE OR REPLACE FUNCTION pcrm_can_write(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT pcrm_workspace_role(p_workspace_id) IN ('admin', 'manager', 'staff');
$$;

CREATE OR REPLACE FUNCTION pcrm_can_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT pcrm_workspace_role(p_workspace_id) IN ('admin', 'manager');
$$;

-- ----------------------------------------------------------------------------
-- 2. Workspaces
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pcrm_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  color text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pcrm_workspaces_created_idx ON pcrm_workspaces(created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Members (per-workspace role: admin | manager | staff | viewer)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pcrm_members (
  workspace_id uuid NOT NULL REFERENCES pcrm_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','manager','staff','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS pcrm_members_user_idx ON pcrm_members(user_id);

-- ----------------------------------------------------------------------------
-- 4. Fields (columns) — defined per workspace
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pcrm_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES pcrm_workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN (
    'text','long_text','number','date','checkbox','select','multi_select',
    'url','email','phone','status','currency','user'
  )),
  options jsonb DEFAULT '[]'::jsonb,   -- for select / multi_select / status
  position integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false, -- the "property name" column
  is_system boolean NOT NULL DEFAULT false,  -- system-managed (cannot delete)
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pcrm_fields_workspace_idx
  ON pcrm_fields(workspace_id, position);

-- ----------------------------------------------------------------------------
-- 5. Rows (property records)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pcrm_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES pcrm_workspaces(id) ON DELETE CASCADE,
  property_name text NOT NULL DEFAULT 'Untitled property',
  address text,
  status text DEFAULT 'active',
  position integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pcrm_rows_workspace_idx
  ON pcrm_rows(workspace_id, position);
CREATE INDEX IF NOT EXISTS pcrm_rows_status_idx
  ON pcrm_rows(workspace_id, status);

-- ----------------------------------------------------------------------------
-- 6. Cells (jsonb value so any field_type fits)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pcrm_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id uuid NOT NULL REFERENCES pcrm_rows(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES pcrm_fields(id) ON DELETE CASCADE,
  value jsonb,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (row_id, field_id)
);
CREATE INDEX IF NOT EXISTS pcrm_cells_field_idx ON pcrm_cells(field_id);

-- ----------------------------------------------------------------------------
-- 7. Credentials (1:1 with rows — wifi / broadband / booking)
--    Plaintext for Phase 1; access locked to staff via RLS.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pcrm_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id uuid NOT NULL UNIQUE REFERENCES pcrm_rows(id) ON DELETE CASCADE,
  wifi_name text,
  wifi_password text,
  wifi_provider text,
  broadband_email text,
  broadband_password text,
  broadband_provider text,
  broadband_account_number text,
  booking_email text,
  booking_password text,
  booking_provider text,
  notes text,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 8. Documents — metadata for files in storage bucket "pcrm-docs"
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pcrm_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id uuid NOT NULL REFERENCES pcrm_rows(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES pcrm_workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pcrm_documents_row_idx ON pcrm_documents(row_id);

-- ----------------------------------------------------------------------------
-- 9. Activity log (audit trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pcrm_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES pcrm_workspaces(id) ON DELETE CASCADE,
  row_id uuid REFERENCES pcrm_rows(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,           -- e.g. row.create, cell.update, credential.update
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pcrm_activity_workspace_idx
  ON pcrm_activity(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pcrm_activity_row_idx
  ON pcrm_activity(row_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 10. Saved views (table | kanban | calendar | gallery)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pcrm_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES pcrm_workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  view_type text NOT NULL CHECK (view_type IN ('table','kanban','calendar','gallery')),
  config jsonb DEFAULT '{}'::jsonb,   -- filters, kanban group field, etc.
  is_default boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pcrm_views_workspace_idx
  ON pcrm_views(workspace_id, position);

-- ----------------------------------------------------------------------------
-- 11. updated_at triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pcrm_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'pcrm_workspaces_touch') THEN
    CREATE TRIGGER pcrm_workspaces_touch BEFORE UPDATE ON pcrm_workspaces
      FOR EACH ROW EXECUTE FUNCTION pcrm_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'pcrm_rows_touch') THEN
    CREATE TRIGGER pcrm_rows_touch BEFORE UPDATE ON pcrm_rows
      FOR EACH ROW EXECUTE FUNCTION pcrm_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'pcrm_credentials_touch') THEN
    CREATE TRIGGER pcrm_credentials_touch BEFORE UPDATE ON pcrm_credentials
      FOR EACH ROW EXECUTE FUNCTION pcrm_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'pcrm_cells_touch') THEN
    CREATE TRIGGER pcrm_cells_touch BEFORE UPDATE ON pcrm_cells
      FOR EACH ROW EXECUTE FUNCTION pcrm_touch_updated_at();
  END IF;
END$$;

-- ----------------------------------------------------------------------------
-- 12. Auto-add creator as workspace admin member
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pcrm_add_creator_as_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO pcrm_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'admin')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'pcrm_workspaces_creator_admin') THEN
    CREATE TRIGGER pcrm_workspaces_creator_admin AFTER INSERT ON pcrm_workspaces
      FOR EACH ROW EXECUTE FUNCTION pcrm_add_creator_as_admin();
  END IF;
END$$;

-- ----------------------------------------------------------------------------
-- 13. RLS — enable + policies
-- ----------------------------------------------------------------------------
ALTER TABLE pcrm_workspaces  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcrm_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcrm_fields      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcrm_rows        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcrm_cells       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcrm_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcrm_documents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcrm_activity    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcrm_views       ENABLE ROW LEVEL SECURITY;

-- pcrm_workspaces: any staff reads; any staff can create (becomes admin via trigger); admin/manager updates+deletes
CREATE POLICY pcrm_workspaces_read ON pcrm_workspaces
  FOR SELECT USING (pcrm_is_staff());
CREATE POLICY pcrm_workspaces_insert ON pcrm_workspaces
  FOR INSERT WITH CHECK (pcrm_is_staff() AND created_by = auth.uid());
CREATE POLICY pcrm_workspaces_update ON pcrm_workspaces
  FOR UPDATE USING (pcrm_can_admin(id)) WITH CHECK (pcrm_can_admin(id));
CREATE POLICY pcrm_workspaces_delete ON pcrm_workspaces
  FOR DELETE USING (pcrm_can_admin(id));

-- pcrm_members: workspace members read; workspace admins manage
CREATE POLICY pcrm_members_read ON pcrm_members
  FOR SELECT USING (pcrm_is_staff());
CREATE POLICY pcrm_members_write ON pcrm_members
  FOR ALL USING (pcrm_can_admin(workspace_id))
  WITH CHECK (pcrm_can_admin(workspace_id));

-- pcrm_fields: staff read; admin/manager/staff write
CREATE POLICY pcrm_fields_read ON pcrm_fields
  FOR SELECT USING (pcrm_is_staff());
CREATE POLICY pcrm_fields_write ON pcrm_fields
  FOR ALL USING (pcrm_can_write(workspace_id))
  WITH CHECK (pcrm_can_write(workspace_id));

-- pcrm_rows: staff read; admin/manager/staff write
CREATE POLICY pcrm_rows_read ON pcrm_rows
  FOR SELECT USING (pcrm_is_staff());
CREATE POLICY pcrm_rows_write ON pcrm_rows
  FOR ALL USING (pcrm_can_write(workspace_id))
  WITH CHECK (pcrm_can_write(workspace_id));

-- pcrm_cells: staff read; write requires workspace write on the parent row
CREATE POLICY pcrm_cells_read ON pcrm_cells
  FOR SELECT USING (pcrm_is_staff());
CREATE POLICY pcrm_cells_write ON pcrm_cells
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pcrm_rows r
      WHERE r.id = pcrm_cells.row_id AND pcrm_can_write(r.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pcrm_rows r
      WHERE r.id = pcrm_cells.row_id AND pcrm_can_write(r.workspace_id)
    )
  );

-- pcrm_credentials: staff read; write requires workspace write
CREATE POLICY pcrm_credentials_read ON pcrm_credentials
  FOR SELECT USING (pcrm_is_staff());
CREATE POLICY pcrm_credentials_write ON pcrm_credentials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pcrm_rows r
      WHERE r.id = pcrm_credentials.row_id AND pcrm_can_write(r.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pcrm_rows r
      WHERE r.id = pcrm_credentials.row_id AND pcrm_can_write(r.workspace_id)
    )
  );

-- pcrm_documents: staff read; write requires workspace write
CREATE POLICY pcrm_documents_read ON pcrm_documents
  FOR SELECT USING (pcrm_is_staff());
CREATE POLICY pcrm_documents_write ON pcrm_documents
  FOR ALL USING (pcrm_can_write(workspace_id))
  WITH CHECK (pcrm_can_write(workspace_id));

-- pcrm_activity: staff read; any member may insert; no update/delete
CREATE POLICY pcrm_activity_read ON pcrm_activity
  FOR SELECT USING (pcrm_is_staff());
CREATE POLICY pcrm_activity_insert ON pcrm_activity
  FOR INSERT WITH CHECK (pcrm_is_staff() AND user_id = auth.uid());

-- pcrm_views: staff read; write requires workspace write
CREATE POLICY pcrm_views_read ON pcrm_views
  FOR SELECT USING (pcrm_is_staff());
CREATE POLICY pcrm_views_write ON pcrm_views
  FOR ALL USING (pcrm_can_write(workspace_id))
  WITH CHECK (pcrm_can_write(workspace_id));

-- ----------------------------------------------------------------------------
-- 14. Storage bucket for documents (private, RLS-gated)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('pcrm-docs', 'pcrm-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY pcrm_docs_storage_read ON storage.objects
  FOR SELECT USING (bucket_id = 'pcrm-docs' AND pcrm_is_staff());
CREATE POLICY pcrm_docs_storage_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'pcrm-docs' AND pcrm_is_staff());
CREATE POLICY pcrm_docs_storage_update ON storage.objects
  FOR UPDATE USING (bucket_id = 'pcrm-docs' AND pcrm_is_staff());
CREATE POLICY pcrm_docs_storage_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'pcrm-docs' AND pcrm_is_staff());
