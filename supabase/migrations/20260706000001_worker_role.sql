-- Worker role (Hugo 2026-07-06)
-- A 'worker' is an agent-level CRM member WITHOUT the Dialer, Pipelines,
-- Reports and Leaderboard surfaces (hidden in sidebar + route-guarded).
-- Same RLS powers as 'agent' — inbox, contacts, calls, templates.
--
-- 1. Allow the new value on profiles.workspace_role.
ALTER TABLE profiles DROP CONSTRAINT profiles_workspace_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_workspace_role_check
  CHECK (workspace_role = ANY (ARRAY['admin'::text, 'agent'::text, 'viewer'::text, 'worker'::text]));

-- 2. Workers get the same wk_* RLS access as agents.
CREATE OR REPLACE FUNCTION public.wk_is_agent_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT wk_is_admin()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND workspace_role IN ('agent', 'admin', 'worker')
      );
$function$;

-- 3. Shanto + Shyra become workers (Hugo's ask, 2026-07-06).
UPDATE profiles SET workspace_role = 'worker'
WHERE email IN ('shanto@nfstay.com', 'shyra@nfstay.com');
