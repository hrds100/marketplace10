// WorkerBlockedRoute — wraps the /crm routes that 'worker' accounts don't
// get: Dialer, Pipelines, Reports, Leaderboard. Workers are redirected to
// /crm/inbox; every other role passes through. Auth + workspace membership
// is already enforced by CrmGuard at the layout level.
//
// Hugo 2026-07-06: Shanto + Shyra work the inbox/contacts only — the dialer
// and reporting surfaces are noise for them. Mirrors AdminOnlyRoute's
// loading discipline (PR 62): don't redirect until the role has resolved.

import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
}

export default function WorkerBlockedRoute({ children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const [workspaceRole, setWorkspaceRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setWorkspaceRole(null); return; }
    let cancelled = false;
    setWorkspaceRole(undefined);
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('profiles' as any) as any)
        .select('workspace_role')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setWorkspaceRole((data?.workspace_role as string | null) ?? null);
    })();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  if (authLoading || (user && workspaceRole === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F3EE]">
        <div className="w-8 h-8 border-2 border-[#1E9A80] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (workspaceRole === 'worker') return <Navigate to="/crm/inbox" replace />;

  return <>{children}</>;
}
