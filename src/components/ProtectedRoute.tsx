import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Capture ?ref= before redirecting to signin (invest page, etc.)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('nfstay_ref', ref.toUpperCase());
      fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co'}/functions/v1/track-referral?code=${encodeURIComponent(ref)}`, {
        method: 'POST',
      }).catch(() => {});
    }
  }, [location.search]);
  const [status, setStatus] = useState<'loading' | 'verified' | 'unverified'>(
    'loading'
  );
  const checkedRef = useRef<string | null>(null);
  const queryInFlight = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setStatus('unverified');
      return;
    }
    // Admin emails bypass OTP verification
    const adminEmails = ['admin@hub.nfstay.com', 'hugo@nfstay.com', 'chris@nfstay.com'];
    if (user.email && adminEmails.includes(user.email)) {
      checkedRef.current = user.id;
      setStatus('verified');
      return;
    }
    if (checkedRef.current === user.id) {
      setStatus('verified');
      return;
    }
    if (queryInFlight.current) return;
    queryInFlight.current = true;

    const checkProfile = async () => {
      try {
        const { data, error: queryErr } = await (supabase
          .from('profiles') as any)
          .select('whatsapp_verified')
          .eq('id', user.id)
          .single();

        // Profile doesn't exist — auth user is orphaned (trigger may have failed).
        // Create the missing profile row so the user isn't locked out.
        // Requires INSERT RLS policy on profiles (see migration 20260404_fix_handle_new_user_trigger).
        if (queryErr && queryErr.code === 'PGRST116') {
          try {
            const meta = user.user_metadata as Record<string, string> | undefined;
            const { error: repairErr } = await (supabase.from('profiles') as any).upsert({
              id: user.id,
              name: meta?.name || user.email || 'User',
              email: user.email || null,
              whatsapp: meta?.whatsapp || null,
              whatsapp_verified: false,
            } as any);
            if (repairErr) throw repairErr;
          } catch (repairErr) {
            console.error('Profile auto-repair failed:', repairErr);
            queryInFlight.current = false;
            await supabase.auth.signOut();
            window.location.href = '/signin';
            return;
          }
          // Profile created but whatsapp not verified — fall through to 'unverified'
          queryInFlight.current = false;
          setStatus('unverified');
          return;
        }

        if (queryErr) {
          console.error('Profile query error:', queryErr);
          queryInFlight.current = false;
          setStatus('unverified');
          return;
        }

        const profile = data as any;
        const verified = !!(profile?.whatsapp_verified);
        if (verified) {
          checkedRef.current = user.id;
        }
        queryInFlight.current = false;
        setStatus(verified ? 'verified' : 'unverified');
      } catch {
        queryInFlight.current = false;
        setStatus('unverified');
      }
    };

    checkProfile();
  }, [user, loading]);

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    const redirect = location.pathname + location.search;
    return <Navigate to={`/signin?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (status === 'unverified') {
    const phone = (user.user_metadata as Record<string, string>)?.whatsapp || '';
    const name = (user.user_metadata as Record<string, string>)?.name || '';
    return (
      <Navigate
        to={`/verify-otp?phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(user.email || '')}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
