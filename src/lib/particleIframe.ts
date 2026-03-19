// particleWallet.ts — Manages lazy-loaded Particle wallet creation
// Dynamically imports the ParticleWalletCreator component only when needed,
// keeping Particle SDK out of the initial bundle.

import { createRoot } from 'react-dom/client';
import { createElement } from 'react';

const TIMEOUT_MS = 15_000; // 15 seconds for SDK to load + create wallet

let containerEl: HTMLDivElement | null = null;
let rootInstance: ReturnType<typeof createRoot> | null = null;

/**
 * Create a Particle wallet using JWT authentication.
 * Lazy-loads the Particle SDK (not in main bundle) and renders a hidden component.
 *
 * @param jwt - Signed JWT from particle-generate-jwt Edge Function
 * @returns Wallet address (0x...)
 * @throws If wallet creation fails or times out
 */
export async function createParticleWallet(jwt: string): Promise<string> {
  // Dynamically import the component (keeps Particle SDK out of main chunk)
  const { default: ParticleWalletCreator } = await import(
    '@/components/ParticleWalletCreator'
  );

  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Wallet creation timed out'));
    }, TIMEOUT_MS);

    let resolved = false;

    function onSuccess(address: string) {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      cleanup();
      resolve(address);
    }

    function onError(err: Error) {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      cleanup();
      reject(err);
    }

    // Create a hidden container for the React component
    containerEl = document.createElement('div');
    containerEl.style.cssText = 'position:fixed;width:0;height:0;overflow:hidden;pointer-events:none;opacity:0;';
    containerEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(containerEl);

    // Render the wallet creator
    rootInstance = createRoot(containerEl);
    rootInstance.render(
      createElement(ParticleWalletCreator, { jwt, onSuccess, onError }),
    );
  });
}

/** Clean up the hidden container */
function cleanup() {
  try {
    if (rootInstance) {
      rootInstance.unmount();
      rootInstance = null;
    }
    if (containerEl && document.body.contains(containerEl)) {
      document.body.removeChild(containerEl);
    }
    containerEl = null;
  } catch {
    // Cleanup errors are non-critical
  }
}

/**
 * Alias for cleanup — called by consumers to tear down after wallet creation.
 */
export function destroyIframe(): void {
  cleanup();
}

/**
 * Check if a wallet creation is currently in progress.
 */
export function isIframeReady(): boolean {
  return containerEl !== null;
}
