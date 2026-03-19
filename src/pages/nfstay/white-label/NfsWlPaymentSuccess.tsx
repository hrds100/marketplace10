// White-label payment success page — shows confirmation with reservation details
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import { useNfsReservation } from '@/hooks/nfstay/use-nfs-reservation';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Users, Mail } from 'lucide-react';

export default function NfsWlPaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservation_id');
  const { operator } = useNfsWhiteLabel();
  const { reservation } = useNfsReservation(reservationId || '');

  const nights = reservation
    ? Math.max(
        1,
        Math.ceil(
          (new Date(reservation.check_out).getTime() -
            new Date(reservation.check_in).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      <CheckCircle className="w-16 h-16 text-green-500" />
      <div>
        <h1 className="text-2xl font-bold">Booking Confirmed!</h1>
        <p className="text-muted-foreground mt-1 max-w-md">
          Your reservation has been confirmed. You'll receive a confirmation email shortly.
        </p>
      </div>

      {/* Reservation summary (if available) */}
      {reservation && (
        <div className="w-full max-w-sm rounded-xl border border-border/40 bg-white p-5 text-left space-y-3">
          <p className="text-xs text-muted-foreground">
            Reservation #{reservation.id.slice(0, 8).toUpperCase()}
          </p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Check-in</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {new Date(reservation.check_in).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Check-out</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {new Date(reservation.check_out).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            </div>
          </div>

          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {reservation.adults + (reservation.children || 0)} guests
            </span>
            <span>
              {nights} {nights === 1 ? 'night' : 'nights'}
            </span>
          </div>

          <div className="border-t border-border/40 pt-2 flex justify-between font-bold text-sm">
            <span>Total paid</span>
            <span>
              {reservation.payment_currency} {reservation.total_amount.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* What happens next */}
      <div className="max-w-sm text-left space-y-2">
        <h3 className="text-sm font-semibold">What happens next?</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5">
          <li>1. You'll receive a confirmation email with your booking details</li>
          <li>2. The host will be notified of your reservation</li>
          <li>3. Check-in instructions will be sent before your arrival</li>
        </ul>
      </div>

      {operator?.contact_email && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Mail className="w-4 h-4" />
          Questions? Contact us at{' '}
          <a href={`mailto:${operator.contact_email}`} className="underline">
            {operator.contact_email}
          </a>
        </p>
      )}

      <div className="flex gap-3">
        {reservationId && (
          <Button variant="outline" onClick={() => navigate(`/booking/${reservationId}`)}>
            View Booking
          </Button>
        )}
        <Button onClick={() => navigate('/search')}>Browse More Properties</Button>
      </div>
    </div>
  );
}
