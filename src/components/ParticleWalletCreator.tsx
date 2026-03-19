// ParticleWalletCreator — Creates a Particle wallet using auth-core directly (no React wrapper)
// This avoids AuthCoreContextProvider which crashes in our Vite environment.
// Exports a function, not a React component.

import { particleAuth, connect as particleConnect } from '@particle-network/auth-core';
import { bsc } from '@particle-network/authkit/chains';
import { PARTICLE_CONFIG } from '@/lib/particle';

let initialized = false;

function ensureInit() {
  if (initialized) return;
  try {
    particleAuth.init({
      projectId: PARTICLE_CONFIG.projectId,
      clientKey: PARTICLE_CONFIG.clientKey,
      appId: PARTICLE_CONFIG.appId,
      chains: [bsc],
    });
    initialized = true;
    console.log('[Particle] auth-core initialized');
  } catch (err) {
    // If already initialized, that's fine
    if ((err as Error)?.message?.includes('already')) {
      initialized = true;
    } else {
      throw err;
    }
  }
}

/**
 * Create a Particle wallet using JWT authentication.
 * Uses auth-core directly — no React components, no AuthCoreContextProvider.
 *
 * @param jwt - Signed JWT from particle-generate-jwt Edge Function
 * @returns Wallet address (0x...)
 */
export async function createWalletWithJWT(jwt: string): Promise<string> {
  ensureInit();

  // Connect with JWT — this creates the wallet on Particle's servers
  const userInfo = await particleConnect({
    provider: 'jwt' as any,
    thirdpartyCode: jwt,
  });

  // Extract EVM wallet address
  const evmWallet = userInfo?.wallets?.find(
    (w: any) => w.chain_name === 'evm_chain' || w.chain_name === 'bsc',
  );

  const address = evmWallet?.public_address || null;

  if (!address) {
    // Try getting address from the ethereum provider
    try {
      const ethAddress = await particleAuth.ethereum.request({
        method: 'eth_accounts',
      });
      if (Array.isArray(ethAddress) && ethAddress[0]) {
        return ethAddress[0] as string;
      }
    } catch {
      // Fall through
    }

    throw new Error('Wallet created but no EVM address found in response');
  }

  return address;
}

// Default export for backward compatibility with dynamic import
export default { createWalletWithJWT };
