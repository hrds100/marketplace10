'use client';

import React from 'react';
import { AuthCoreContextProvider } from '@particle-network/authkit';
import { bsc } from '@particle-network/authkit/chains';

export default function ParticleProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthCoreContextProvider
      options={{
        projectId: '470629ca-91af-45fa-a52b-62ed2adf9ef0',
        clientKey: 'cTHFOA18eAs4iRrkgn8lG1QARC8HFkkv5jeYQPc1',
        appId: 'a82d525c-85da-4786-a0ed-e4cf110c8377',
        themeType: 'light',
        wallet: {
          visible: false, // Don't show wallet modal — we handle UI ourselves
        },
        chains: [bsc],
      }}
    >
      {children}
    </AuthCoreContextProvider>
  );
}
