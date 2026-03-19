// White-label payment cancel page
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function NfsWlPaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <XCircle className="w-16 h-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Payment Cancelled</h1>
      <p className="text-muted-foreground max-w-md">
        Your payment was not completed. No charges were made.
        You can try again or browse other properties.
      </p>
      <Button onClick={() => navigate('/search')} className="mt-4">
        Back to Properties
      </Button>
    </div>
  );
}
