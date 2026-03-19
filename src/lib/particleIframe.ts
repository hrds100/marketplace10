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

/** Clean up any DOM elements injected by Particle SDK */
export function destroyIframe(): void {
  try {
    // Particle SDK injects modals, iframes, and overlays into the DOM.
    // Remove them all after wallet creation to prevent click-blocking.
    const selectors = [
      '[id*="particle"]',
      '[class*="particle-"]',
      '[class*="pn-modal"]',
      '[class*="pn-auth"]',
      '.particle-auth-core-modal',
      'div[data-particle]',
      'iframe[src*="particle"]',
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
