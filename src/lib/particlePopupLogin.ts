// Particle social login via popup window.
//
// Why this exists:
//   - `auth-core`'s `thirdpartyAuth()` does a full-page redirect, which
//     passes our page URL as the OAuth `redirect_uri`. Facebook's app
//     config on the Particle project whitelists Particle's own callback
//     URL, not ours → Facebook OAuth returns 500.
//   - `authkit`'s `useConnect({ socialType })` would handle this in a
//     popup, but it requires `<AuthCoreContextProvider>` which crashes in
//     our Vite env (see src/components/ParticleWalletCreator.tsx:2).
//
// What this does:
//   - Opens `/auth/particle-popup?provider=X` in a popup window.
//   - That popup page kicks off `thirdpartyAuth()` in the POPUP (not the
//     main window), so the OAuth happens entirely inside the popup.
//   - When the popup returns from Particle with `particleThirdpartyParams`,
//     it postMessages `{code, nonce, provider}` back to the opener and
//     closes.
//   - This helper then calls `auth-core.connect({ socialType, code, nonce })`
//     in the MAIN window — finalising the session for the user.
//
// Returned shape: normalised particle user info (email, name, wallet, uuid)
// so the caller can run its own Supabase signin/signup flow.

export interface ParticleSocialUser {
  userInfo: any;
  email: string;
  name: string;
  walletAddress: string;
  uuid: string;
  provider: string;
}

export type ParticleSocialProvider = 'google' | 'apple' | 'twitter' | 'facebook';

const POPUP_TIMEOUT_MS = 5 * 60 * 1000;
const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 720;

interface PopupMessage {
  type: 'particle-social-auth';
  provider?: string;
  code?: string;
  nonce?: string;
  error?: string;
}

/**
 * Open a popup and resolve with `{code, nonce, provider}` once Particle
 * returns to our popup callback page.
 */
async function openPopupAndWaitForCode(
  provider: ParticleSocialProvider,
): Promise<{ code: string; nonce: string; provider: string }> {
  const origin = window.location.origin;
  const popupUrl = `${origin}/auth/particle-popup?provider=${encodeURIComponent(provider)}`;

  const left = Math.max(0, Math.floor((window.screen.width - POPUP_WIDTH) / 2));
  const top = Math.max(0, Math.floor((window.screen.height - POPUP_HEIGHT) / 2));
  const features = `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`;

  const popup = window.open(popupUrl, 'particle-social-auth', features);
  if (!popup) {
    throw new Error('Popup was blocked. Please allow popups for this site and try again.');
  }
  try { popup.focus(); } catch { /* ignore */ }

  return new Promise((resolve, reject) => {
    let settled = false;
    let closedCheck: ReturnType<typeof setInterval> | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      if (closedCheck) { clearInterval(closedCheck); closedCheck = null; }
      if (timer) { clearTimeout(timer); timer = null; }
    };

    const onMessage = (evt: MessageEvent) => {
      if (evt.origin !== origin) return;
      const data = evt.data as PopupMessage | undefined;
      if (!data || data.type !== 'particle-social-auth') return;
      if (settled) return;
      settled = true;
      cleanup();
      try { popup.close(); } catch { /* ignore */ }
      if (data.error) {
        reject(new Error(data.error));
        return;
      }
      if (!data.code || !data.nonce || !data.provider) {
        reject(new Error('Popup returned without OAuth params.'));
        return;
      }
      resolve({ code: data.code, nonce: data.nonce, provider: data.provider });
    };

    window.addEventListener('message', onMessage);

    closedCheck = setInterval(() => {
      if (popup.closed && !settled) {
        settled = true;
        cleanup();
        reject(new Error('Sign in was cancelled.'));
      }
    }, 500);

    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      try { popup.close(); } catch { /* ignore */ }
      reject(new Error('Sign in timed out. Please try again.'));
    }, POPUP_TIMEOUT_MS);
  });
}

/**
 * Run the full popup-based Particle social login and return a normalised
 * user info object. Throws on failure / cancellation / popup block.
 */
export async function particlePopupSocialLogin(
  provider: ParticleSocialProvider,
): Promise<ParticleSocialUser> {
  const { code, nonce, provider: confirmedProvider } = await openPopupAndWaitForCode(provider);

  const { particleAuth, connect: particleConnect } = await import('@particle-network/auth-core');
  const { bsc } = await import('@particle-network/authkit/chains');
  const { PARTICLE_LEGACY_CONFIG } = await import('@/lib/particle');
  const pa = particleAuth as any;
  try {
    pa.init({
      projectId: PARTICLE_LEGACY_CONFIG.projectId,
      clientKey: PARTICLE_LEGACY_CONFIG.clientKey,
      appId: PARTICLE_LEGACY_CONFIG.appId,
      chains: [bsc],
    });
  } catch { /* already initialized */ }

  const userInfo = await particleConnect({
    socialType: confirmedProvider as any,
    code,
    nonce,
  });

  const anyInfo = userInfo as any;
  const evmWallet = anyInfo.wallets?.find((w: any) => w.chain_name === 'evm_chain');
  const walletAddress: string = evmWallet?.public_address || '';
  const email: string =
    anyInfo[`${confirmedProvider}_email`] ||
    anyInfo.thirdparty_user_info?.user_info?.email ||
    '';
  const name: string =
    anyInfo.thirdparty_user_info?.user_info?.name ||
    (email ? email.split('@')[0] : confirmedProvider);
  const uuid: string = anyInfo.uuid || '';

  if (!uuid || !email) {
    throw new Error('Could not retrieve your account details from the provider. Please try again.');
  }

  return { userInfo, email, name, walletAddress, uuid, provider: confirmedProvider };
}
