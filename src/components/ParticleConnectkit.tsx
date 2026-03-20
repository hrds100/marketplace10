// ParticleConnectkit — direct port from legacy ParticleConnectkit.jsx.
//
// Uses ConnectKitProvider which manages:
//   1. MPC signing sessions (fixes WASM __wbg_ptr errors)
//   2. Embedded wallet UI (Buy, Receive, Wallet, Account & Security modal)
//   3. Social auth wallet connectors (Google, Apple, Twitter, Facebook)
//   4. External wallet connectors (MetaMask, WalletConnect)
//
// Credentials: LEGACY project so social login → same wallet as app.nfstay.com

import React from 'react';
import { ConnectKitProvider, createConfig } from '@particle-network/connectkit';
import { authWalletConnectors } from '@particle-network/connectkit/auth';
import { EntryPosition, wallet } from '@particle-network/connectkit/wallet';
import { bsc } from '@particle-network/connectkit/chains';
import { evmWalletConnectors } from '@particle-network/connectkit/evm';
import { PARTICLE_LEGACY_CONFIG, PARTICLE_CONFIG } from '@/lib/particle';

const projectId = PARTICLE_LEGACY_CONFIG.projectId;
const clientKey = PARTICLE_LEGACY_CONFIG.clientKey;
const appId = PARTICLE_LEGACY_CONFIG.appId;
const walletConnectProjectId = PARTICLE_CONFIG.walletConnectProjectId;

if (!projectId || !clientKey || !appId) {
  throw new Error('Particle Network credentials missing — check src/lib/particle.ts');
}

export const supportedChains = [bsc];

export const isValidChain = (_id: number, _supportChains: typeof supportedChains) => {
  return _supportChains.filter((c) => c.id === _id).length > 0;
};

const config = createConfig({
  projectId,
  clientKey,
  appId,
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
        name: 'NFsTay',
        icon: typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : '',
        description: 'NFsTay Investment Platform',
        url: typeof window !== 'undefined' ? window.location.origin : '',
      },
      walletConnectProjectId: walletConnectProjectId,
    }),
  ],
  plugins: [
    wallet({
      visible: true,
      entryPosition: EntryPosition.MC,
    }),
  ],
  chains: supportedChains,
});

export const ParticleConnectkit = ({ children }: { children: React.ReactNode }) => {
  return <ConnectKitProvider config={config}>{children}</ConnectKitProvider>;
};
