// ParticleProvider — wraps app with Particle AuthCoreContextProvider.
// Provides useEthereum() hook for proper MPC signing (matches legacy ConnectKit pattern).
// Uses LEGACY project credentials so social login wallets match app.nfstay.com (0xAA884...).

import React from 'react';
import { AuthCoreContextProvider } from '@particle-network/authkit';
import { bsc } from '@particle-network/authkit/chains';
import { PARTICLE_LEGACY_CONFIG } from '@/lib/particle';

export default function ParticleProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthCoreContextProvider
      options={{
        projectId: PARTICLE_LEGACY_CONFIG.projectId,
        clientKey: PARTICLE_LEGACY_CONFIG.clientKey,
        appId: PARTICLE_LEGACY_CONFIG.appId,
        chains: [bsc],
        wallet: false,
      }}
    >
      {children}
    </AuthCoreContextProvider>
  );
}
