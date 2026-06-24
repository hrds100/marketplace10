import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
}

// Property Ops CRM gate. Mirrors TinderGuard: anyone with a workspace_role
// set on their profile (admin/agent/viewer) or a hardcoded admin email may
// enter. Unauthenticated users are sent to /signin.
export default function StaffGuard({ children }: Props) {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const location = useLocation();
  const [hasRole, setHasRole] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!user) {
      setHasRole(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('profiles') as any)
        .select('workspace_role')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setHasRole(!!data?.workspace_role);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading || (user && hasRole === undefined)) {
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
    return <Navigate to="/properties/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin && !hasRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F3EE] px-6">
        <div className="text-center max-w-[440px] bg-white border border-[#E8E5DF] rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.05)]">
          <div className="text-3xl mb-3">🔒</div>
          <h1 className="text-[18px] font-bold text-[#0A0A0A]">Staff access required</h1>
          <p className="text-[13px] text-[#6B7280] mt-2 leading-relaxed">
            Your account is not registered as nfstay staff. Ask an admin to grant you
            workspace access, then refresh this page.
          </p>
          <a
            href="/properties/login"
            className="mt-5 inline-block text-[13px] font-semibold text-white bg-[#1E9A80] px-4 py-2 rounded-[10px]"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
