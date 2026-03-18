import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

  // Load saved wallet address from profile on mount
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
        }
      });
  }, [user?.id]);

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

      // No wallet available — show error
      throw new Error('No wallet found. Please install MetaMask or use Particle Network.');
    } catch (err) {
      console.error('Wallet connection failed:', err);
      setWallet(w => ({ ...w, connecting: false }));
      throw err;
    }
  }, [user?.id]);

  const disconnect = useCallback(() => {
    setWallet({ address: null, connected: false, connecting: false, chainId: null });
  }, []);

  return { ...wallet, connect, disconnect };
}
