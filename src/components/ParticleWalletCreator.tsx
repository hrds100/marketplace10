// ParticleWalletCreator — Lazy-loaded component that creates a Particle wallet using JWT
// This component renders nothing visible. It wraps AuthCoreContextProvider locally
// (NOT at the app root) so if Particle crashes, only this component fails.
//
// Usage: dynamically import and render after OTP verification or as a retry.

import { useEffect, useRef } from 'react';
import { AuthCoreContextProvider, useConnect, useEthereum } from '@particle-network/authkit';
import { bsc } from '@particle-network/authkit/chains';
import { PARTICLE_CONFIG } from '@/lib/particle';

interface WalletCreatorInnerProps {
  jwt: string;
  onSuccess: (address: string) => void;
  onError: (error: Error) => void;
}

/** Inner component that uses Particle hooks (must be inside AuthCoreContextProvider) */
function WalletCreatorInner({ jwt, onSuccess, onError }: WalletCreatorInnerProps) {
  const { connect, connected } = useConnect();
  const { address } = useEthereum();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    connect({
      provider: 'jwt' as any,
      thirdpartyCode: jwt,
    })
      .then((userInfo) => {
        // Address might come from useEthereum or from the response
        const walletAddress =
          userInfo?.wallets?.find((w: any) => w.chain_name === 'evm_chain')?.public_address ||
          null;
        if (walletAddress) {
          onSuccess(walletAddress);
        } else {
          // Address not in response — wait for useEthereum to populate
          // handled by the effect below
        }
      })
      .catch((err) => {
        onError(err instanceof Error ? err : new Error(String(err)));
      });
  }, [jwt, connect, onSuccess, onError]);

  // If address populates after connect (from useEthereum), report success
  useEffect(() => {
    if (connected && address && attemptedRef.current) {
      onSuccess(address);
    }
  }, [connected, address, onSuccess]);

  return null; // Renders nothing
}

interface ParticleWalletCreatorProps {
  jwt: string;
  onSuccess: (address: string) => void;
  onError: (error: Error) => void;
}

/** Wraps AuthCoreContextProvider locally — safe to lazy-load */
export default function ParticleWalletCreator({ jwt, onSuccess, onError }: ParticleWalletCreatorProps) {
  return (
    <AuthCoreContextProvider
      options={{
        projectId: PARTICLE_CONFIG.projectId,
        clientKey: PARTICLE_CONFIG.clientKey,
        appId: PARTICLE_CONFIG.appId,
        chains: [bsc],
        authTypes: ['jwt' as any],
        wallet: false, // Don't show wallet UI
      }}
    >
      <WalletCreatorInner jwt={jwt} onSuccess={onSuccess} onError={onError} />
    </AuthCoreContextProvider>
  );
}
