// ParticleConnectkit — provides Particle auth context for the app.
//
// Uses AuthCoreContextProvider from @particle-network/authkit.
// This gives us useEthereum() for the signing provider.
//
// ConnectKitProvider (legacy pattern) conflicts with AuthCoreContextProvider
// when both init the same project — causes "Cannot read properties of undefined
// (reading 'S')" crash. So we use AuthCoreContextProvider alone.
//
// Credentials: LEGACY project so social login → same wallet as app.nfstay.com

import React from 'react';
import { AuthCoreContextProvider } from '@particle-network/authkit';
import { bsc } from '@particle-network/authkit/chains';
import { PARTICLE_LEGACY_CONFIG } from '@/lib/particle';

export const ParticleConnectkit = ({ children }: { children: React.ReactNode }) => {
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
};
