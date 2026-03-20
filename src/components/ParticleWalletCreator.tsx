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

  // Primary: get the actual signing address from the EVM provider.
  // This MUST match what pa.ethereum.request({ method: 'eth_accounts' }) returns
  // during signing — otherwise the profile wallet_address and the signing address
  // will diverge (which causes contract reverts because shares belong to wrong address).
  try {
    const accounts = await particleAuth.ethereum.request({ method: 'eth_accounts' });
    if (Array.isArray(accounts) && accounts[0]) {
      console.log('[Particle] Wallet address from eth_accounts:', accounts[0]);
      return accounts[0] as string;
    }
  } catch (e) {
    console.log('[Particle] eth_accounts failed, falling back to userInfo.wallets:', e);
  }

  // Fallback: extract from the particleConnect response wallets array
  const evmWallet = userInfo?.wallets?.find(
    (w: any) => w.chain_name === 'evm_chain' || w.chain_name === 'bsc',
  );
  const address = evmWallet?.public_address || null;

  if (address) {
    console.log('[Particle] Wallet address from userInfo.wallets:', address);
    return address;
  }

  throw new Error('Wallet created but no EVM address found in response');
}

// Default export for backward compatibility with dynamic import
export default { createWalletWithJWT };
