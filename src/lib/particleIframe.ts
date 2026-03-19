// particleWallet.ts — Manages lazy-loaded Particle wallet creation
// Dynamically imports auth-core (no React needed) only when wallet creation is triggered.

/**
 * Create a Particle wallet using JWT authentication.
 * Lazy-loads the Particle SDK (not in main bundle).
 *
 * @param jwt - Signed JWT from particle-generate-jwt Edge Function
 * @returns Wallet address (0x...)
 * @throws If wallet creation fails
 */
export async function createParticleWallet(jwt: string): Promise<string> {
  // Dynamically import — keeps Particle SDK out of the main chunk
  const { createWalletWithJWT } = await import(
    '@/components/ParticleWalletCreator'
  );

  return createWalletWithJWT(jwt);
}

/** No-op for backward compatibility */
export function destroyIframe(): void {
  // Nothing to clean up — no iframe or React components
}

/** No-op for backward compatibility */
export function isIframeReady(): boolean {
  return true;
}
