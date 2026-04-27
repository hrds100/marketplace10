// AdminOnlyRoute — wraps /crm routes that should only be visible to
// admins. Non-admins are redirected to /crm/inbox. Auth + workspace
// membership is already enforced by CrmGuard at the layout level —
// this guard adds the admin check on top.
//
// PR 62 (Hugo 2026-04-27).

import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
}

export default function AdminOnlyRoute({ children }: Props) {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [workspaceRole, setWorkspaceRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!user) { setWorkspaceRole(null); return; }
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('profiles' as any) as any)
        .select('workspace_role')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setWorkspaceRole((data?.workspace_role as string | null) ?? null);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (authLoading || (user && workspaceRole === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F3EE]">
        <div className="w-8 h-8 border-2 border-[#1E9A80] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const allowed = isAdmin || workspaceRole === 'admin';
  if (!allowed) return <Navigate to="/crm/inbox" replace />;

  return <>{children}</>;
}
