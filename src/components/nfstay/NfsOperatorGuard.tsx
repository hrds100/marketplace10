import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import { NFS_ROUTES } from '@/lib/nfstay/constants';

/**
 * Auth guard for NFStay operator routes.
 * 1. Not authenticated → redirect to shared /signup
 * 2. Authenticated but no nfs_operators row → redirect to /nfstay/onboarding
 * 3. Both OK → render children
 */
export default function NfsOperatorGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { operator, loading: opLoading } = useNfsOperator();
  const location = useLocation();

  if (authLoading || opLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    const redirect = location.pathname + location.search;
    return <Navigate to={`${NFS_ROUTES.SIGNUP}?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  // Authenticated but no operator record — send to onboarding
  // (skip redirect loop if already on the onboarding page)
  if (!operator && !location.pathname.startsWith(NFS_ROUTES.ONBOARDING)) {
    return <Navigate to={NFS_ROUTES.ONBOARDING} replace />;
  }

  return <>{children}</>;
}
