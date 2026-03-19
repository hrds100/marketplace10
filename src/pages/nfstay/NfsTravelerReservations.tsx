// NFStay — Traveler "My Bookings" page
// Shows reservations where the logged-in user is the guest

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNfsTravelerReservations } from '@/hooks/nfstay/use-nfs-traveler-reservations';
import { useNfsTravelerPath } from '@/lib/nfstay/routes';
import { Button } from '@/components/ui/button';
import { CalendarDays, User, MapPin, ArrowRight } from 'lucide-react';

export default function NfsTravelerReservations() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const paths = useNfsTravelerPath();

  // Not logged in
  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h1 className="text-xl font-bold mb-2">Sign in to view your bookings</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Sign in to see your reservation history and manage your upcoming stays.
        </p>
        <Button onClick={() => navigate('/signup')}>
          Sign In
        </Button>
      </div>
    );
  }

  return <ReservationsList />;
}

function ReservationsList() {
  const { reservations, loading, error } = useNfsTravelerReservations();
  const navigate = useNavigate();
  const paths = useNfsTravelerPath();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold mb-6">My Bookings</h1>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-muted/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold mb-6">My Bookings</h1>
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
          <CalendarDays className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h1 className="text-xl font-bold mb-2">No bookings yet</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Browse properties and book your next stay.
        </p>
        <Button onClick={() => navigate(paths.search)}>
          Browse Properties
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">My Bookings</h1>
      <div className="space-y-3">
        {reservations.map(r => (
          <ReservationCard key={r.id} reservation={r} />
        ))}
      </div>
    </div>
  );
}

function ReservationCard({ reservation: r }: { reservation: any }) {
  const navigate = useNavigate();
  const paths = useNfsTravelerPath();

  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div
      className="border border-border/40 rounded-xl p-4 hover:border-border/80 transition-colors cursor-pointer bg-white dark:bg-card"
      onClick={() => r.property_id && navigate(paths.property(r.property_id))}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-sm font-semibold truncate">
              {r.property_title || r.guest_name || 'Vacation Rental'}
            </h3>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[r.status] || 'bg-muted text-muted-foreground'}`}>
              {r.status}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {formatDate(r.check_in)} — {formatDate(r.check_out)}
            </span>
            {r.total_amount && (
              <span className="font-medium text-foreground">
                {r.currency === 'gbp' ? '£' : r.currency === 'eur' ? '€' : '$'}{Number(r.total_amount).toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </div>
  );
}
