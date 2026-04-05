import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function MagicLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/dashboard/crm', { replace: true });
      return;
    }

    (async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

        const res = await fetch(`${supabaseUrl}/functions/v1/landlord-magic-login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
          },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok || !data.access_token) {
          setError(data.error || 'This link has expired. Ask the operator to send a new message.');
          return;
        }

        // Set session — fires onAuthStateChange → user is now logged in
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionErr) {
          setError('Could not sign you in. Please try again.');
          return;
        }

        // Navigate to CRM (leads tab) — legacy inbox threads also land here now
        navigate('/dashboard/crm', { replace: true });
      } catch {
        setError('Something went wrong. Please try again or contact support.');
      }
    })();
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Link issue</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground mt-4">
            Need help?{' '}
            <a href="mailto:support@nfstay.com" className="text-primary hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium text-foreground">Opening your conversation…</p>
        <p className="text-xs text-muted-foreground mt-1">This will only take a moment</p>
      </div>
    </div>
  );
}
