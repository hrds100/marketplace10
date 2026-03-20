"use client";

import React from "react";

import { ConnectKitProvider, createConfig } from "@particle-network/connectkit";
import { authWalletConnectors } from "@particle-network/connectkit/auth";

// embedded wallet start
import { EntryPosition, wallet } from "@particle-network/connectkit/wallet";
// embedded wallet end

// evm start
import { sepolia,bsc } from "@particle-network/connectkit/chains";
import { evmWalletConnectors } from "@particle-network/connectkit/evm";
import { APP_CONFIG, PARTICLE_OPTIONS } from "@/config";
// evm end

const projectId = PARTICLE_OPTIONS.projectId;
const clientKey = PARTICLE_OPTIONS.clientKey;
const appId = PARTICLE_OPTIONS.appId;
const logo = PARTICLE_OPTIONS.customStyle.logo;
const walletConnectProjectId = APP_CONFIG.WALLET_CONNECT_PROJECT_ID;

if (!projectId || !clientKey || !appId) {
  throw new Error("Please configure the Particle project in .env first!");
}

// export const supportedChains = [sepolia];//TESTNETSEPOLIA
export const supportedChains = [bsc];//MAINNETBNB

export const isValidChain = (_id, _supportChains) => {
  return _supportChains.filter((c) => c.id == _id).length > 0;
};

const config = createConfig({
  projectId,
  clientKey,
  appId,
  appearance: {
    logo: logo,
    recommendedWallets: [{ walletId: "metaMask", label: "Recommended" }],
    language: "en-US",
    mode: "light",
  },
  walletConnectors: [
    authWalletConnectors(),
    // evm start
    evmWalletConnectors({
      metadata: {
        name: "Connectkit Demo",
        icon:
          typeof window !== "undefined"
            ? `${window.location.origin}/favicon.ico`
            : "",
        description: "Particle Connectkit Next.js Scaffold.",
        url: typeof window !== "undefined" ? window.location.origin : "",
      },
      walletConnectProjectId: walletConnectProjectId,
    }),
    // evm end
  ],
  plugins: [
    // embedded wallet start
    wallet({
      visible: true,
      entryPosition: EntryPosition.MC,
    }),
    // embedded wallet end
  ],
  chains: supportedChains,
});

// Wrap your application with this component.
export const ParticleConnectkit = ({ children }) => {
  return <ConnectKitProvider config={config}>{children}</ConnectKitProvider>;
};
