import { useSearchParams, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NfsPaymentCancel() {
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservation_id');

  return (
    <div data-feature="BOOKING_NFSTAY__CHECKOUT" className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold">Payment Cancelled</h1>
        <p data-feature="BOOKING_NFSTAY__CANCEL_MESSAGE" className="text-muted-foreground">
          Your payment was cancelled. No charges have been made. You can try again or browse other properties.
        </p>
        {reservationId && (
          <p className="text-xs text-muted-foreground font-mono">
            Reservation: {reservationId}
          </p>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <Button data-feature="BOOKING_NFSTAY__CANCEL_RETRY" asChild variant="outline">
            <Link to="/nfstay/search">Back to Search</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
