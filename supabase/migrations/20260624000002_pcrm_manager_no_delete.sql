-- ============================================================================
-- Property CRM permission tightening: managers can edit/create but not delete.
--
-- Original migration treated 'manager' as a workspace admin for everything
-- destructive (delete rows/columns, delete workspace, manage members).
-- Hugo wants managers to be edit-only: create/update rows and fields, never
-- delete. Admin is now the only role that can destroy data.
--
-- Approach: redefine pcrm_can_admin() to require role = 'admin' only, then
-- split the FOR ALL policies on pcrm_fields, pcrm_rows and pcrm_documents
-- into INSERT/UPDATE (pcrm_can_write — admin+manager+staff) and DELETE
-- (pcrm_can_admin — admin only).
-- ============================================================================

CREATE OR REPLACE FUNCTION pcrm_can_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT pcrm_workspace_role(p_workspace_id) IN ('admin');
$$;

-- pcrm_fields
DROP POLICY IF EXISTS pcrm_fields_write ON pcrm_fields;
CREATE POLICY pcrm_fields_insert ON pcrm_fields
  FOR INSERT WITH CHECK (pcrm_can_write(workspace_id));
CREATE POLICY pcrm_fields_update ON pcrm_fields
  FOR UPDATE USING (pcrm_can_write(workspace_id))
  WITH CHECK (pcrm_can_write(workspace_id));
CREATE POLICY pcrm_fields_delete ON pcrm_fields
  FOR DELETE USING (pcrm_can_admin(workspace_id));

-- pcrm_rows
DROP POLICY IF EXISTS pcrm_rows_write ON pcrm_rows;
CREATE POLICY pcrm_rows_insert ON pcrm_rows
  FOR INSERT WITH CHECK (pcrm_can_write(workspace_id));
CREATE POLICY pcrm_rows_update ON pcrm_rows
  FOR UPDATE USING (pcrm_can_write(workspace_id))
  WITH CHECK (pcrm_can_write(workspace_id));
CREATE POLICY pcrm_rows_delete ON pcrm_rows
  FOR DELETE USING (pcrm_can_admin(workspace_id));

-- pcrm_documents
DROP POLICY IF EXISTS pcrm_documents_write ON pcrm_documents;
CREATE POLICY pcrm_documents_insert ON pcrm_documents
  FOR INSERT WITH CHECK (pcrm_can_write(workspace_id));
CREATE POLICY pcrm_documents_update ON pcrm_documents
  FOR UPDATE USING (pcrm_can_write(workspace_id))
  WITH CHECK (pcrm_can_write(workspace_id));
CREATE POLICY pcrm_documents_delete ON pcrm_documents
  FOR DELETE USING (pcrm_can_admin(workspace_id));

-- pcrm_workspaces UPDATE/DELETE and pcrm_members write already use
-- pcrm_can_admin, so they tighten to admin-only automatically after the
-- function redefinition above. pcrm_cells / pcrm_credentials / pcrm_views
-- stay FOR ALL with can_write — they have no user-initiated DELETE flow,
-- and cells/creds cascade with their parent row anyway.
