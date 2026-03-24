import { useParams, useNavigate } from 'react-router-dom';
import { useNfsReservation } from '@/hooks/nfstay/use-nfs-reservation';
import { useNfsReservationMutation } from '@/hooks/nfstay/use-nfs-reservation-mutation';
import { NFS_RESERVATION_STATUS_LABELS, NFS_PAYMENT_STATUS_LABELS } from '@/lib/nfstay/constants';
import { Button } from '@/components/ui/button';
import { ChevronLeft, User, CalendarDays, CreditCard, AlertCircle, MapPin, Phone, Mail } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  no_show: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  expired: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-500',
};

export default function NfsReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { reservation, loading, error } = useNfsReservation(id || '');
  const { updateStatus, updating, error: mutationError } = useNfsReservationMutation();

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/nfstay/reservations')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error || 'Reservation not found'}
        </div>
      </div>
    );
  }

  const guestName = [reservation.guest_first_name, reservation.guest_last_name].filter(Boolean).join(' ') || 'No name provided';
  const statusLabel = NFS_RESERVATION_STATUS_LABELS[reservation.status as keyof typeof NFS_RESERVATION_STATUS_LABELS] || reservation.status;
  const paymentLabel = NFS_PAYMENT_STATUS_LABELS[reservation.payment_status as keyof typeof NFS_PAYMENT_STATUS_LABELS] || reservation.payment_status;
  const statusColor = STATUS_COLORS[reservation.status] || '';

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    await updateStatus(id, newStatus);
    // Reload page to reflect change
    window.location.reload();
  };

  return (
    <div data-feature="BOOKING_NFSTAY__OPERATOR_DASHBOARD" className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/nfstay/reservations')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Reservation</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{reservation.id}</p>
        </div>
        <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {mutationError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {mutationError}
        </div>
      )}

      {/* Guest info */}
      <div className="border border-border/40 rounded-xl p-5 space-y-3 bg-white dark:bg-card">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5" /> Guest
        </h2>
        <div className="grid gap-2 text-sm">
          <p className="font-medium">{guestName}</p>
          {reservation.guest_email && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" /> {reservation.guest_email}
            </p>
          )}
          {reservation.guest_phone && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" /> {reservation.guest_phone}
            </p>
          )}
          {reservation.guest_city && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" /> {[reservation.guest_city, reservation.guest_country].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {reservation.adults} adult{reservation.adults !== 1 ? 's' : ''}
          {reservation.children > 0 && `, ${reservation.children} child${reservation.children !== 1 ? 'ren' : ''}`}
          {reservation.pets > 0 && `, ${reservation.pets} pet${reservation.pets !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Dates */}
      <div className="border border-border/40 rounded-xl p-5 space-y-3 bg-white dark:bg-card">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="w-5 h-5" /> Stay
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Check-in</p>
            <p className="font-medium">{formatDate(reservation.check_in)}</p>
            <p className="text-xs text-muted-foreground">{reservation.check_in_time}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Check-out</p>
            <p className="font-medium">{formatDate(reservation.check_out)}</p>
            <p className="text-xs text-muted-foreground">{reservation.check_out_time}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Source: {reservation.booking_source === 'operator_direct' ? 'Direct booking' : reservation.booking_source}
        </p>
      </div>

      {/* Payment */}
      <div className="border border-border/40 rounded-xl p-5 space-y-3 bg-white dark:bg-card">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="w-5 h-5" /> Payment
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">
            {reservation.payment_currency} {Number(reservation.total_amount).toFixed(2)}
          </span>
          <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
            reservation.payment_status === 'paid'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : reservation.payment_status === 'failed'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                : reservation.payment_status === 'refunded' || reservation.payment_status === 'partially_refunded'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
            {paymentLabel}
          </span>
        </div>
        {reservation.stripe_payment_intent_id && (
          <p className="text-xs text-muted-foreground font-mono">
            Stripe: {reservation.stripe_payment_intent_id}
          </p>
        )}
        {reservation.payment_processed_at && (
          <p className="text-xs text-muted-foreground">
            Paid on {formatDate(reservation.payment_processed_at)}
          </p>
        )}
        {reservation.promo_code && (
          <p className="text-sm text-muted-foreground">
            Promo: <span className="font-mono">{reservation.promo_code}</span>
            {reservation.promo_discount_amount && ` (−${reservation.payment_currency} ${Number(reservation.promo_discount_amount).toFixed(2)})`}
          </p>
        )}
        {reservation.refund_amount != null && Number(reservation.refund_amount) > 0 && (
          <p className="text-sm text-purple-600">
            Refunded: {reservation.payment_currency} {Number(reservation.refund_amount).toFixed(2)}
            {reservation.refund_reason && ` — ${reservation.refund_reason}`}
          </p>
        )}
      </div>

      {/* Guest message */}
      {reservation.guest_message && (
        <div className="border border-border/40 rounded-xl p-5 bg-white dark:bg-card">
          <h2 className="text-lg font-semibold mb-2">Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{reservation.guest_message}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {reservation.status === 'pending' && (
          <>
            <Button onClick={() => handleStatusChange('confirmed')} disabled={updating}>
              Confirm Reservation
            </Button>
            <Button variant="destructive" onClick={() => handleStatusChange('cancelled')} disabled={updating}>
              Cancel
            </Button>
          </>
        )}
        {reservation.status === 'confirmed' && (
          <>
            <Button onClick={() => handleStatusChange('completed')} disabled={updating}>
              Mark Completed
            </Button>
            <Button variant="outline" onClick={() => handleStatusChange('no_show')} disabled={updating}>
              No Show
            </Button>
            <Button variant="destructive" onClick={() => handleStatusChange('cancelled')} disabled={updating}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
