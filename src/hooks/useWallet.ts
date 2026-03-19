import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { createParticleWallet, destroyIframe } from '@/lib/particleIframe';

interface WalletState {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  chainId: number | null;
}

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    connected: false,
    connecting: false,
    chainId: null,
  });
  const retryAttemptedRef = useRef(false);

  // Load saved wallet address from profile on mount
  // If no wallet exists but we have a stored JWT, retry wallet creation
  useEffect(() => {
    if (!user?.id) return;
    (supabase.from('profiles') as any)
      .select('wallet_address')
      .eq('id', user.id)
      .single()
      .then(({ data }: { data: { wallet_address?: string } | null }) => {
        if (data?.wallet_address) {
          setWallet({
            address: data.wallet_address,
            connected: true,
            connecting: false,
            chainId: 56,
          });
        } else if (!retryAttemptedRef.current) {
          // No wallet — try creating one from stored JWT (silent retry)
          retryAttemptedRef.current = true;
          retryWalletCreation(user.id);
        }
      });
  }, [user?.id]);

  // Silent retry: attempt wallet creation from stored JWT
  const retryWalletCreation = useCallback(async (userId: string) => {
    try {
      let jwt: string | null = null;
      try { jwt = sessionStorage.getItem('particle_jwt'); } catch { /* skip */ }

      if (!jwt) {
        // No stored JWT — generate a fresh one
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
        const res = await fetch(`${supabaseUrl}/functions/v1/particle-generate-jwt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
          body: JSON.stringify({ user_id: userId }),
        });
        const data = await res.json();
        jwt = data?.jwt || null;
      }

      if (!jwt) return;

      const address = await createParticleWallet(jwt);
      if (address) {
        await (supabase.from('profiles') as any)
          .update({ wallet_address: address })
          .eq('id', userId);
        setWallet({
          address,
          connected: true,
          connecting: false,
          chainId: 56,
        });
        try { sessionStorage.removeItem('particle_jwt'); } catch { /* skip */ }
      }
      destroyIframe();
    } catch (err) {
      console.log('Silent wallet retry failed (non-blocking):', err);
      destroyIframe();
    }
  }, []);

  const connect = useCallback(async () => {
    setWallet(w => ({ ...w, connecting: true }));
    try {
      // Try to use Particle Network if available
      if (typeof window !== 'undefined' && (window as any).particle) {
        const provider = (window as any).particle.ethereum;
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        const chainId = await provider.request({ method: 'eth_chainId' });

        // Save wallet address to profile
        if (user?.id && address) {
          await (supabase.from('profiles') as any)
            .update({ wallet_address: address })
            .eq('id', user.id);
        }

        setWallet({
          address,
          connected: true,
          connecting: false,
          chainId: parseInt(chainId, 16),
        });
        return address;
      }

      // Fallback: try MetaMask or other injected wallet
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const provider = (window as any).ethereum;
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        if (user?.id && address) {
          await (supabase.from('profiles') as any)
            .update({ wallet_address: address })
            .eq('id', user.id);
        }

        setWallet({
          address,
          connected: true,
          connecting: false,
          chainId: 56,
        });
        return address;
      }

      // Last resort: try creating via Particle iframe
      if (user?.id) {
        setWallet(w => ({ ...w, connecting: true }));
        await retryWalletCreation(user.id);
        // Check if retry succeeded
        const { data } = await (supabase.from('profiles') as any)
          .select('wallet_address')
          .eq('id', user.id)
          .single();
        if (data?.wallet_address) {
          setWallet({
            address: data.wallet_address,
            connected: true,
            connecting: false,
            chainId: 56,
          });
          return data.wallet_address;
        }
      }

      throw new Error('No wallet found. Please try again or install MetaMask.');
    } catch (err) {
      console.error('Wallet connection failed:', err);
      setWallet(w => ({ ...w, connecting: false }));
      throw err;
    }
  }, [user?.id, retryWalletCreation]);

  const disconnect = useCallback(() => {
    setWallet({ address: null, connected: false, connecting: false, chainId: null });
  }, []);

  return { ...wallet, connect, disconnect };
}
