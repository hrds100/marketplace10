import { useState, useCallback } from 'react';

// Stub for Particle Network wallet integration
// Will be replaced with real Particle SDK when credentials are confirmed

interface WalletState {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  chainId: number | null;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    connected: false,
    connecting: false,
    chainId: null,
  });

  const connect = useCallback(async () => {
    setWallet(w => ({ ...w, connecting: true }));
    // STUB: In production, this will use Particle Network SDK
    // For now, simulates a wallet connection
    setTimeout(() => {
      setWallet({
        address: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        connected: true,
        connecting: false,
        chainId: 56, // BNB Chain
      });
    }, 1500);
  }, []);

  const disconnect = useCallback(() => {
    setWallet({ address: null, connected: false, connecting: false, chainId: null });
  }, []);

  return { ...wallet, connect, disconnect };
}
