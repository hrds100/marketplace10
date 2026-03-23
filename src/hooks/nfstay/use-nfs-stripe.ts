// nfstay Stripe hooks
// Manages Stripe Connect account state and checkout flow

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import type { NfsStripeAccount } from '@/lib/nfstay/types';

// ============================================================================
// useNfsStripeAccount — Fetch operator's Stripe Connect account
// ============================================================================

interface UseNfsStripeAccountReturn {
  stripeAccount: NfsStripeAccount | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useNfsStripeAccount(): UseNfsStripeAccountReturn {
  const { operator } = useNfsOperator();
  const [stripeAccount, setStripeAccount] = useState<NfsStripeAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!operator?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await (supabase.from('nfs_stripe_accounts') as any)
        .select('*')
        .eq('operator_id', operator.id)
        .maybeSingle();

      if (dbError) {
        setError(dbError.message);
        return;
      }

      setStripeAccount(data as NfsStripeAccount | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Stripe account');
    } finally {
      setLoading(false);
    }
  }, [operator?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { stripeAccount, loading, error, refetch: fetch };
}

// ============================================================================
// useNfsStripeConnect — Connect/disconnect Stripe account
// ============================================================================

interface UseNfsStripeConnectReturn {
  connecting: boolean;
  disconnecting: boolean;
  error: string | null;
  initiateConnect: () => Promise<void>;
  disconnect: () => Promise<boolean>;
}

export function useNfsStripeConnect(): UseNfsStripeConnectReturn {
  const { operator } = useNfsOperator();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateConnect = async () => {
    if (!operator?.id) {
      setError('No operator found');
      return;
    }

    try {
      setConnecting(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('nfs-stripe-connect-oauth', {
        body: null,
        method: 'GET',
        headers: {},
      });

      // Since Edge Functions don't support GET with invoke easily, call via fetch
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nfs-stripe-connect-oauth?action=authorize&operator_id=${operator.id}`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        setError(err.error || 'Failed to initiate Stripe Connect');
        return;
      }

      const result = await response.json();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Stripe');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async (): Promise<boolean> => {
    if (!operator?.id) {
      setError('No operator found');
      return false;
    }

    try {
      setDisconnecting(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('nfs-stripe-connect-oauth', {
        body: { action: 'disconnect', operator_id: operator.id },
      });

      if (fnError) {
        setError(fnError.message);
        return false;
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Stripe');
      return false;
    } finally {
      setDisconnecting(false);
    }
  };

  return { connecting, disconnecting, error, initiateConnect, disconnect };
}

// ============================================================================
// useNfsStripeCheckout — Create checkout session for a reservation
// ============================================================================

interface UseNfsStripeCheckoutReturn {
  creating: boolean;
  error: string | null;
  createCheckoutSession: (reservationId: string) => Promise<string | null>;
}

export function useNfsStripeCheckout(): UseNfsStripeCheckoutReturn {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckoutSession = async (reservationId: string): Promise<string | null> => {
    try {
      setCreating(true);
      setError(null);

      const origin = window.location.origin;
      const { data, error: fnError } = await supabase.functions.invoke('nfs-stripe-checkout', {
        body: {
          reservation_id: reservationId,
          success_url: `${origin}/nfstay/payment/success?reservation_id=${reservationId}`,
          cancel_url: `${origin}/nfstay/payment/cancel?reservation_id=${reservationId}`,
        },
      });

      if (fnError) {
        setError(fnError.message);
        return null;
      }

      if (data?.url) {
        return data.url;
      }

      setError('No checkout URL returned');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkout');
      return null;
    } finally {
      setCreating(false);
    }
  };

  return { creating, error, createCheckoutSession };
}
