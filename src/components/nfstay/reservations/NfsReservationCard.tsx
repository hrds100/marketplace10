import { useNavigate } from 'react-router-dom';
import type { NfsReservation } from '@/lib/nfstay/types';
import { NFS_RESERVATION_STATUS_LABELS } from '@/lib/nfstay/constants';
import { CalendarDays, User, MapPin } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  no_show: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  expired: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-500',
};

interface Props {
  reservation: NfsReservation;
}

export default function NfsReservationCard({ reservation }: Props) {
  const navigate = useNavigate();
  const guestName = [reservation.guest_first_name, reservation.guest_last_name].filter(Boolean).join(' ') || 'No name';
  const statusLabel = NFS_RESERVATION_STATUS_LABELS[reservation.status as keyof typeof NFS_RESERVATION_STATUS_LABELS] || reservation.status;
  const statusColor = STATUS_COLORS[reservation.status] || STATUS_COLORS.pending;

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
      onClick={() => navigate(`/nfstay/reservations/${reservation.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm truncate">{guestName}</span>
            {reservation.guest_email && (
              <span className="text-xs text-muted-foreground truncate hidden sm:inline">{reservation.guest_email}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="w-4 h-4 flex-shrink-0" />
            <span>{formatDate(reservation.check_in)} — {formatDate(reservation.check_out)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span>{reservation.booking_source === 'operator_direct' ? 'Direct booking' : reservation.booking_source}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor}`}>
            {statusLabel}
          </span>
          <span className="font-semibold text-sm">
            {reservation.payment_currency} {Number(reservation.total_amount).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
