import { useEffect } from 'react';
import { useUserTier } from '@/hooks/useUserTier';

/**
 * Runs once on dashboard mount. If sessionStorage has a payment success flag
 * (set by App.tsx when GHL redirects with ?payment=success), force-refreshes
 * the user's tier from Supabase so the locked input unlocks immediately.
 */
export default function PaymentSuccessRefresher() {
  const { refreshTier } = useUserTier();

  useEffect(() => {
    if (sessionStorage.getItem('nfstay_payment_success') === '1') {
      refreshTier();
      sessionStorage.removeItem('nfstay_payment_success');
    }
  }, []);

  return null;
}
