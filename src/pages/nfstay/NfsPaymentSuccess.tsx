import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NfsPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservation_id');

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold">Payment Successful!</h1>
        <p className="text-muted-foreground">
          Your booking has been confirmed. You will receive a confirmation email shortly.
        </p>
        {reservationId && (
          <p className="text-xs text-muted-foreground font-mono">
            Reservation: {reservationId}
          </p>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <Button asChild>
            <Link to="/nfstay/search">Browse More Properties</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
