import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
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
    const adminEmails = ['admin@hub.nfstay.com', 'hugo@nfstay.com', 'hugo24eu@gmail.com'];
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
          .select('whatsapp_verified, wallet_auth_method')
          .eq('id', user.id)
          .single();

        // Profile doesn't exist — stale session with no matching DB record.
        // Sign out and hard-redirect to /signin so React state can't trigger verify-otp.
        if (queryErr && queryErr.code === 'PGRST116') {
          queryInFlight.current = false;
          await supabase.auth.signOut();
          window.location.href = '/signin';
          return;
        }

        if (queryErr) {
          console.error('Profile query error:', queryErr);
          queryInFlight.current = false;
          setStatus('unverified');
          return;
        }

        const profile = data as any;
        // Social login users are identity-verified (Google/Apple/etc) — skip WhatsApp gate
        const isSocialUser = profile?.wallet_auth_method && profile.wallet_auth_method !== 'jwt';
        // Existing users who signed in (not fresh signup) should not be blocked by OTP
        const hasExistingAccount = !!profile;
        const verified = !!(profile?.whatsapp_verified) || isSocialUser || hasExistingAccount;
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
