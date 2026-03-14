import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
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

        // Profile doesn't exist — create it (trigger may be broken)
        if (queryErr && queryErr.code === 'PGRST116') {
          const meta = (user.user_metadata || {}) as Record<string, string>;
          await supabase.from('profiles').upsert({
            id: user.id,
            user_id: user.id,
            name: meta.name || user.email || 'User',
            whatsapp: meta.whatsapp || null,
            whatsapp_verified: false,
            email: user.email || '',
          } as any);
          // Profile created but not verified
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

        const verified = !!(data as any)?.whatsapp_verified;
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
    return <Navigate to="/signin" replace />;
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
