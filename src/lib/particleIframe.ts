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

/** Clean up visible overlay elements injected by Particle SDK.
 *  Only removes modal/overlay divs — keeps functional iframes intact. */
export function destroyIframe(): void {
  try {
    // Only remove modal overlays that block user interaction.
    // Do NOT remove iframes — Particle needs them for MPC communication.
    const selectors = [
      '.particle-auth-core-modal',
      '[class*="pn-modal"]',
      '[class*="pn-auth"]',
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    });
  } catch {
    // Cleanup errors are non-critical
  }
}

/** No-op for backward compatibility */
export function isIframeReady(): boolean {
  return true;
}
