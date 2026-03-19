// White-label payment cancel page
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function NfsWlPaymentCancel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservation_id');

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <XCircle className="w-16 h-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Payment Cancelled</h1>
      <p className="text-muted-foreground max-w-md">
        Your payment was not completed. No charges were made.
        You can try again or browse other properties.
      </p>
      <div className="flex gap-3 mt-2">
        {reservationId && (
          <Button
            variant="outline"
            onClick={() => navigate(`/payment?reservation_id=${reservationId}`)}
          >
            Try Again
          </Button>
        )}
        <Button onClick={() => navigate('/search')}>
          Back to Properties
        </Button>
      </div>
    </div>
  );
}
