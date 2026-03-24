import { useAuth } from '@/hooks/useAuth';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import { NFS_ROUTES } from '@/lib/nfstay/constants';
import { Link, Navigate } from 'react-router-dom';
import { Building2, CalendarDays, Settings } from 'lucide-react';

export default function NfsOperatorDashboard() {
  const { user } = useAuth();
  const { operator, loading, error } = useNfsOperator();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!operator) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Welcome to nfstay</h1>
        <p className="text-muted-foreground">
          Your operator account is being set up. If this persists, try signing out and back in.
        </p>
      </div>
    );
  }

  // Auto-redirect to onboarding if not completed
  if (operator.onboarding_step !== 'completed') {
    return <Navigate to={NFS_ROUTES.ONBOARDING} replace />;
  }

  const displayName = [operator.first_name, operator.last_name].filter(Boolean).join(' ') || user?.email || 'Operator';

  return (
    <div data-feature="BOOKING_NFSTAY__OPERATOR_DASHBOARD" className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {displayName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your properties and reservations.
        </p>
      </div>

      {/* Quick action cards */}
      <div data-feature="BOOKING_NFSTAY__OPERATOR_QUICK_LINKS" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to={NFS_ROUTES.PROPERTIES}
          className="group flex items-center gap-4 p-5 rounded-xl border border-border/40 bg-white dark:bg-card hover:border-primary/30 hover:shadow-sm transition-all"
        >
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-sm">Properties</p>
            <p className="text-xs text-muted-foreground">{operator.listings_count} listed</p>
          </div>
        </Link>

        <Link
          to={NFS_ROUTES.RESERVATIONS}
          className="group flex items-center gap-4 p-5 rounded-xl border border-border/40 bg-white dark:bg-card hover:border-primary/30 hover:shadow-sm transition-all"
        >
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-sm">Reservations</p>
            <p className="text-xs text-muted-foreground">View bookings</p>
          </div>
        </Link>

        <Link
          to={NFS_ROUTES.SETTINGS}
          className="group flex items-center gap-4 p-5 rounded-xl border border-border/40 bg-white dark:bg-card hover:border-primary/30 hover:shadow-sm transition-all"
        >
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-sm">Settings</p>
            <p className="text-xs text-muted-foreground">Profile, branding, payments</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
