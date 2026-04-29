// CallerGuard — gates /caller/* routes by profiles.workspace_role.
//
// Behaviour mirrors the legacy CrmGuard so /caller and /crm have the
// same access semantics during the parallel-run period:
//   admin / agent / viewer  → allowed
//   anything else           → redirected to /caller/login
//   not signed in           → redirected to /caller/login
//
// Hardcoded admin allow-list (admin@hub.nfstay.com, hugo@nfstay.com in
// useAuth) is honoured: admins always pass even if workspace_role is null.

import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
}

const ALLOWED_ROLES = new Set(['admin', 'agent', 'viewer']);

export default function CallerGuard({ children }: Props) {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const location = useLocation();
  const [role, setRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('profiles') as any)
        .select('workspace_role')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setRole((data?.workspace_role as string | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading || (user && role === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F3EE]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1E9A80] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#6B7280] mt-3">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/caller/login" replace state={{ from: location.pathname }} />;
  }

  const allowed = isAdmin || (typeof role === 'string' && ALLOWED_ROLES.has(role));
  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F3EE] px-6">
        <div className="text-center max-w-[440px] bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.05)]">
          <div className="text-3xl mb-3">🔒</div>
          <h1 className="text-[18px] font-bold text-[#1A1A1A]">Caller access required</h1>
          <p className="text-[13px] text-[#6B7280] mt-2 leading-relaxed">
            Your account isn't set up as a Caller agent. Ask the admin who invited you
            to confirm your email is registered, or sign in with the credentials they
            gave you.
          </p>
          <a
            href="/caller/login"
            className="mt-5 inline-block text-[13px] font-semibold text-white bg-[#1E9A80] px-4 py-2 rounded-[10px]"
          >
            Sign in as agent
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
