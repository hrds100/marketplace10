// White-label payment success page
import { useNavigate } from 'react-router-dom';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function NfsWlPaymentSuccess() {
  const navigate = useNavigate();
  const { operator } = useNfsWhiteLabel();

  return (
    <div data-feature="BOOKING_NFSTAY__WHITE_LABEL" className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <CheckCircle className="w-16 h-16 text-green-500" />
      <h1 className="text-2xl font-bold">Booking Confirmed!</h1>
      <p className="text-muted-foreground max-w-md">
        Your reservation has been confirmed. You'll receive a confirmation email shortly.
        {operator?.contact_email && (
          <> If you have any questions, contact us at{' '}
            <a href={`mailto:${operator.contact_email}`} className="underline">
              {operator.contact_email}
            </a>.
          </>
        )}
      </p>
      <Button onClick={() => navigate('/search')} className="mt-4">
        Browse More Properties
      </Button>
    </div>
  );
}
