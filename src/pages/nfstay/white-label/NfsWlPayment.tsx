// White-label payment page
// The booking widget on the property page handles Stripe checkout directly.
// This page handles edge cases: direct navigation, or future pre-checkout summary.
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNfsReservation } from '@/hooks/nfstay/use-nfs-reservation';
import { useNfsStripeCheckout } from '@/hooks/nfstay/use-nfs-stripe';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, AlertCircle, ChevronLeft } from 'lucide-react';

export default function NfsWlPayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservation_id');
  const { operator, isPlatform } = useNfsWhiteLabel();
  const { reservation, loading, error } = useNfsReservation(reservationId || '');
  const { creating, error: checkoutError, createCheckoutSession } = useNfsStripeCheckout();

  // No reservation ID — user navigated here directly
  if (!reservationId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <CreditCard className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">No Active Booking</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          To make a booking, browse our properties and select your dates.
        </p>
        <Button onClick={() => navigate('/search')}>
          Browse Properties
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h1 className="text-xl font-bold">Booking Not Found</h1>
        <p className="text-sm text-muted-foreground">
          This booking could not be found or has expired.
        </p>
        <Button variant="outline" onClick={() => navigate('/search')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Browse Properties
        </Button>
      </div>
    );
  }

  // Verify reservation belongs to this operator — skip in platform mode
  if (!isPlatform && operator && reservation.operator_id !== operator.id) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Booking Not Found</h1>
        <Button variant="outline" onClick={() => navigate('/')}>
          Go Home
        </Button>
      </div>
    );
  }

  // Already paid — redirect to booking details
  if (reservation.payment_status === 'paid') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <CreditCard className="w-12 h-12 text-green-500" />
        <h1 className="text-xl font-bold">Already Paid</h1>
        <p className="text-sm text-muted-foreground">
          This reservation has already been paid.
        </p>
        <Button onClick={() => navigate(`/booking/${reservation.id}`)}>
          View Booking
        </Button>
      </div>
    );
  }

  const handleProceedToPayment = async () => {
    const url = await createCheckoutSession(reservation.id);
    if (url) {
      window.location.href = url;
    }
  };

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(reservation.check_out).getTime() - new Date(reservation.check_in).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ChevronLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <h1 className="text-2xl font-bold">Complete Your Booking</h1>

      {/* Booking summary */}
      <div className="rounded-xl border border-border/40 bg-white p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Check-in</p>
            <p className="font-medium">
              {new Date(reservation.check_in).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Check-out</p>
            <p className="font-medium">
              {new Date(reservation.check_out).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {reservation.adults + (reservation.children || 0)} guests · {nights}{' '}
          {nights === 1 ? 'night' : 'nights'}
        </div>

        <div className="border-t border-border/40 pt-3 flex justify-between text-base font-bold">
          <span>Total</span>
          <span>
            {reservation.payment_currency} {reservation.total_amount.toFixed(2)}
          </span>
        </div>
      </div>

      {checkoutError && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" /> {checkoutError}
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={handleProceedToPayment}
        disabled={creating}
      >
        {creating ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4 mr-2" />
        )}
        {creating ? 'Redirecting to payment...' : 'Proceed to Payment'}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        You'll be redirected to Stripe for secure payment processing.
      </p>
    </div>
  );
}
