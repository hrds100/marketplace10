import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { NFS_ROUTES } from '@/lib/nfstay/constants';

/**
 * Auth guard for NFStay operator routes.
 * Checks Supabase auth only — no WhatsApp OTP (that's marketplace10-specific).
 * Does NOT check nfs_operators row — the dashboard handles missing-operator state.
 */
export default function NfsOperatorGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
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

  return <>{children}</>;
}
