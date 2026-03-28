import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const LOGO_URL = 'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/public-assets/nfstay-logo-email.png';

export default function LeadDetailsPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => { document.title = 'nfstay - Opening your leads...'; }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user) { navigate('/dashboard/crm', { replace: true }); return; }
    if (!token || loggingIn) return;
    setLoggingIn(true);

    (async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        const res = await fetch(`${supabaseUrl}/functions/v1/lead-magic-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok || !data.access_token) { setError(data.error || 'This link has expired or is invalid.'); return; }
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: data.access_token, refresh_token: data.refresh_token,
        });
        if (sessionErr) { setError('Could not sign you in. Please try again.'); return; }
        navigate('/dashboard/crm', { replace: true });
      } catch { setError('Something went wrong. Please try again.'); }
    })();
  }, [token, user, authLoading, navigate, loggingIn]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F3F3EE' }}>
        <div className="max-w-md w-full text-center">
          <a href="https://hub.nfstay.com"><img src={LOGO_URL} alt="nfstay" className="mx-auto mb-6" style={{ width: 100 }} /></a>
          <div className="bg-white rounded-xl border p-8" style={{ borderColor: '#E5E7EB' }}>
            <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
            <h2 className="text-lg font-bold mb-2" style={{ color: '#1A1A1A' }}>Link issue</h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F3F3EE' }}>
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: '#1E9A80' }} />
        <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>Opening your leads...</p>
        <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>This will only take a moment</p>
      </div>
    </div>
  );
}
