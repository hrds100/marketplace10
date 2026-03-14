import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'verified' | 'unverified'>('loading');
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setStatus('unverified');
      return;
    }
    // Don't re-check if we already checked this user
    if (checkedRef.current === user.id) return;

    supabase
      .from('profiles')
      .select('whatsapp_verified')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const verified = !!(data as Record<string, unknown> | null)?.whatsapp_verified;
        checkedRef.current = verified ? user.id : null;
        setStatus(verified ? 'verified' : 'unverified');
      })
      .catch(() => {
        setStatus('unverified');
      });
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
