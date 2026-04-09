// ParticleProvider — exact clone of legacy ParticleConnectkit.jsx
//
// ConnectKitProvider manages:
//   1. MPC signing sessions (the reason legacy works and we didn't)
//   2. Embedded wallet UI (Buy, Receive, Wallet, Account & Security)
//   3. Social auth connectors (Google, Apple, Twitter, Facebook)
//   4. External wallet connectors (MetaMask, WalletConnect)
//
// React 19 conflict fixed via package.json "overrides" — forces React 18 everywhere.

import React from 'react';
import { ConnectKitProvider, createConfig } from '@particle-network/connectkit';
import { authWalletConnectors } from '@particle-network/connectkit/auth';
import { EntryPosition, wallet } from '@particle-network/connectkit/wallet';
import { bsc } from '@particle-network/connectkit/chains';
import { evmWalletConnectors } from '@particle-network/connectkit/evm';
import { PARTICLE_LEGACY_CONFIG, PARTICLE_CONFIG } from '@/lib/particle';

const config = createConfig({
  projectId: PARTICLE_LEGACY_CONFIG.projectId,
  clientKey: PARTICLE_LEGACY_CONFIG.clientKey,
  appId: PARTICLE_LEGACY_CONFIG.appId,
  appearance: {
    logo: 'https://photos.pinksale.finance/file/pinksale-logo-upload/1721288952175-35ed0ed869e731b5d32a13ffb3a36d5a.png',
    recommendedWallets: [{ walletId: 'metaMask', label: 'Recommended' }],
    language: 'en-US',
    mode: 'light',
  },
  walletConnectors: [
    authWalletConnectors(),
    evmWalletConnectors({
      metadata: {
        name: 'nfstay',
        icon: typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : '',
        description: 'nfstay Partnership Platform',
        url: typeof window !== 'undefined' ? window.location.origin : '',
      },
      walletConnectProjectId: PARTICLE_CONFIG.walletConnectProjectId,
    }),
  ],
  plugins: [
    wallet({
      visible: false,
      entryPosition: EntryPosition.BR,
    }),
  ],
  chains: [bsc],
});

export default function ParticleProvider({ children }: { children: React.ReactNode }) {
  return <ConnectKitProvider config={config}>{children}</ConnectKitProvider>;
}
