'use client';

import React from 'react';
import { ConnectKitProvider, createConfig } from '@particle-network/connectkit';
import { authWalletConnectors } from '@particle-network/connectkit/auth';
import { EntryPosition, wallet } from '@particle-network/connectkit/wallet';
import { bsc } from '@particle-network/connectkit/chains';
import { evmWalletConnectors } from '@particle-network/connectkit/evm';

const config = createConfig({
  projectId: '4f8aca10-0c7e-4617-bfff-7ccb5269f365',
  clientKey: 'cWniBMIDt2lhrhdIERSBWURpannCk30SGNwdPK7D',
  appId: 'd80e484f-a690-4f0b-80a8-d1a1d0264b90',
  appearance: {
    recommendedWallets: [{ walletId: 'metaMask', label: 'Recommended' }],
    language: 'en-US',
    mode: 'auto',
    logo: 'https://hub.nfstay.com/favicon.ico',
  },
  walletConnectors: [
    authWalletConnectors(),
    evmWalletConnectors({
      metadata: {
        name: 'NFsTay',
        icon: typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : '',
        description: 'NFsTay — Real Estate Investment Platform',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://hub.nfstay.com',
      },
      walletConnectProjectId: '28e91881cee345ca645f8ad85e4db6fe',
    }),
  ],
  plugins: [
    wallet({
      visible: true,
      entryPosition: EntryPosition.BR, // Bottom-right
    }),
  ],
  chains: [bsc],
});

export default function ParticleProvider({ children }: { children: React.ReactNode }) {
  return <ConnectKitProvider config={config}>{children}</ConnectKitProvider>;
}
