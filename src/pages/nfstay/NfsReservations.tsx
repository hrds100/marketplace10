import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNfsReservations } from '@/hooks/nfstay/use-nfs-reservations';
import NfsReservationCard from '@/components/nfstay/reservations/NfsReservationCard';
import NfsCalendarView from '@/components/nfstay/reservations/NfsCalendarView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, CalendarDays, List, AlertCircle, Search } from 'lucide-react';
import { NFS_RESERVATION_STATUSES, NFS_RESERVATION_STATUS_LABELS } from '@/lib/nfstay/constants';

type ViewMode = 'list' | 'calendar';

export default function NfsReservations() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const { reservations, loading, error } = useNfsReservations({ status: statusFilter });

  const filtered = searchQuery
    ? reservations.filter(r => {
        const q = searchQuery.toLowerCase();
        return (
          r.guest_first_name?.toLowerCase().includes(q) ||
          r.guest_last_name?.toLowerCase().includes(q) ||
          r.guest_email?.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
        );
      })
    : reservations;

  return (
    <div data-feature="BOOKING_NFSTAY__OPERATOR_DASHBOARD" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage your bookings.</p>
        </div>
        <Button onClick={() => navigate('/nfstay/create-reservation')}>
          <Plus className="w-4 h-4 mr-2" /> New Reservation
        </Button>
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div data-feature="BOOKING_NFSTAY__RESERVATIONS_SEARCH" className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by guest name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          data-feature="BOOKING_NFSTAY__RESERVATIONS_FILTER"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm h-10"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {NFS_RESERVATION_STATUSES.map(s => (
            <option key={s} value={s}>
              {NFS_RESERVATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <div data-feature="BOOKING_NFSTAY__RESERVATIONS_VIEW_TOGGLE" className="flex border border-border rounded-lg overflow-hidden">
          <button
            className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted/50'}`}
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            className={`px-3 py-2 text-sm ${viewMode === 'calendar' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted/50'}`}
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {viewMode === 'list' ? (
            filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/60 rounded-xl bg-muted/20">
                <CalendarDays className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No reservations match your search.' : 'No reservations yet.'}
                </p>
                {!searchQuery && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/nfstay/create-reservation')}>
                    <Plus className="w-4 h-4 mr-1" /> Create your first reservation
                  </Button>
                )}
              </div>
            ) : (
              <div data-feature="BOOKING_NFSTAY__RESERVATIONS_LIST" className="space-y-3">
                <p className="text-xs text-muted-foreground">{filtered.length} reservation{filtered.length !== 1 ? 's' : ''}</p>
                {filtered.map(r => (
                  <NfsReservationCard key={r.id} reservation={r} />
                ))}
              </div>
            )
          ) : (
            <NfsCalendarView data-feature="BOOKING_NFSTAY__RESERVATIONS_CALENDAR" reservations={reservations} />
          )}
        </>
      )}
    </div>
  );
}
