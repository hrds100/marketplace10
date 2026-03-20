// ParticleProvider — wraps app with Particle AuthCoreContextProvider.
//
// Provides useEthereum() hook which gives the Particle EVM provider
// for signing transactions (MPC wallet). Uses LEGACY project credentials
// so social login users get the same wallet as app.nfstay.com.
//
// RULE: Do not install @particle-network/connectkit — it ships React 19
// as a transitive dep and crashes the app. authkit@2.1.1 is sufficient.

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
