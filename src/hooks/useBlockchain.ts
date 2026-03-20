import { useCallback, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/hooks/useAuth';
import { CONTRACTS } from '@/lib/particle';
import {
  MARKETPLACE_ABI,
  RWA_TOKEN_ABI,
  RENT_ABI,
  VOTING_ABI,
  BOOSTER_ABI,
  ERC20_ABI,
  BUY_LP_ABI,
  FARM_ABI,
} from '@/lib/contractAbis';
import { supabase } from '@/integrations/supabase/client';

// Module-level session state — persists for the tab lifetime.
// _particleConnected: true only when Particle address === profile wallet address.
//   Migration users (legacy wallet ≠ Particle JWT wallet) stay false → external wallet used.
// _profileWalletAddress: set by ensureConnected() so getWalletProvider() can compare addresses
//   without needing hook context.
let _particleConnected = false;
let _profileWalletAddress: string | null = null;

// Helper to get ethers — lazy loaded
async function getEthers() {
  try {
    return await import('ethers');
  } catch {
    return null;
  }
}

// Public RPC provider for READ-ONLY calls (no wallet popup)
async function getReadProvider() {
  const ethers = await getEthers();
  if (!ethers) return null;
  return new ethers.providers.JsonRpcProvider(
    'https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T'
  );
}

// Switch any EIP-1193 provider to BSC mainnet.
async function switchProviderToBsc(provider: any) {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x38' }], // 0x38 = 56 = BSC mainnet
    });
  } catch {
    // Already on BSC, or provider doesn't support chain switching — safe to ignore
  }
}

// Browser wallet provider for WRITE calls (requires signing).
//
// Selection logic (address-aware):
//   1. Particle auth-core — ONLY if its address matches _profileWalletAddress.
//      This covers new users (wallet provisioned via JWT on hub.nfstay.com).
//   2. window.particle extension — same address check.
//   3. External wallet (MetaMask/Phantom via window.ethereum) — covers migration
//      users whose legacy wallet is registered in their profile. We request accounts
//      once so the user can approve MetaMask, then switch to BSC.
//
// _profileWalletAddress is set by ensureConnected() before every tx, so the
// comparison is always against the current profile wallet.
async function getWalletProvider() {
  const ethers = await getEthers();
  if (!ethers) return null;

  const profileAddr = _profileWalletAddress?.toLowerCase() ?? null;

  // ── Priority 1: Particle auth-core MPC wallet ──
  try {
    const { particleAuth } = await import('@particle-network/auth-core');
    const { bsc } = await import('@particle-network/authkit/chains');
    const { PARTICLE_CONFIG } = await import('@/lib/particle');
    const pa = particleAuth as any;

    try {
      pa.init({
        projectId: PARTICLE_CONFIG.projectId,
        clientKey: PARTICLE_CONFIG.clientKey,
        appId: PARTICLE_CONFIG.appId,
        chains: [bsc],
      });
    } catch { /* already initialized */ }

    // Fast path: ensureConnected() already confirmed address match this tab session
    if (_particleConnected && pa.ethereum) {
      await switchProviderToBsc(pa.ethereum);
      console.log('[Provider] ✅ Particle auth-core (session flag + address verified)');
      return new ethers.providers.Web3Provider(pa.ethereum);
    }

    // Slow path: hard refresh cleared the flag — verify eth_accounts and address
    if (pa.ethereum) {
      try {
        const accounts = await pa.ethereum.request({ method: 'eth_accounts' });
        const particleAddr = (accounts?.[0] ?? '').toLowerCase();
        console.log('[Provider] Particle eth_accounts:', accounts, '| profile:', profileAddr);

        if (particleAddr && (!profileAddr || particleAddr === profileAddr)) {
          await switchProviderToBsc(pa.ethereum);
          console.log('[Provider] ✅ Particle auth-core (eth_accounts + address match)');
          return new ethers.providers.Web3Provider(pa.ethereum);
        }

        if (particleAddr && profileAddr && particleAddr !== profileAddr) {
          console.log('[Provider] Particle address', particleAddr, '≠ profile', profileAddr, '— skipping Particle (migration user)');
        }
      } catch (e) {
        console.log('[Provider] Particle eth_accounts threw:', e);
      }
    } else {
      console.log('[Provider] pa.ethereum undefined — Particle session not established');
    }
  } catch (e) {
    console.log('[Provider] Particle auth-core unavailable:', e);
  }

  // ── Priority 2: window.particle extension ──
  if ((window as any).particle?.ethereum) {
    const ext = (window as any).particle.ethereum;
    try {
      const accounts = await ext.request({ method: 'eth_accounts' });
      const extAddr = (accounts?.[0] ?? '').toLowerCase();
      if (extAddr && (!profileAddr || extAddr === profileAddr)) {
        await switchProviderToBsc(ext);
        console.log('[Provider] ✅ window.particle extension');
        return new ethers.providers.Web3Provider(ext);
      }
    } catch { /* extension not ready */ }
  }

  // ── Priority 3: External wallet (MetaMask/Phantom) ──
  // This is the correct path for migration users whose profile wallet is a legacy
  // address (e.g. from app.nfstay.com) — not a JWT-derived Particle wallet.
  if ((window as any).ethereum) {
    const ext = (window as any).ethereum;
    try {
      // Request accounts — prompts the user once to connect their external wallet
      await ext.request({ method: 'eth_requestAccounts' });
      await switchProviderToBsc(ext);
      console.log('[Provider] ✅ External wallet (MetaMask/Phantom) — migration user or Particle unavailable');
      return new ethers.providers.Web3Provider(ext);
    } catch (e) {
      console.log('[Provider] External wallet request failed:', e);
    }
  }

  console.log('[Provider] No wallet provider found');
  return null;
}

async function getSigner() {
  const provider = await getWalletProvider();
  return provider?.getSigner() || null;
}

async function getContract(address: string, abi: string[], withSigner = false) {
  const ethers = await getEthers();
  if (!ethers) return null;
  if (withSigner) {
    // WRITE: use browser wallet (MetaMask/Particle) — requires signature
    const signer = await getSigner();
    if (!signer) return null;
    return new ethers.Contract(address, abi, signer);
  }
  // READ: use public RPC — no wallet popup
  const provider = await getReadProvider();
  if (!provider) return null;
  return new ethers.Contract(address, abi, provider);
}

export function useBlockchain() {
  const { address, connected, connect } = useWallet();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ensure the correct wallet is ready to sign before any write tx.
  // Runs synchronously at tx time — no race condition with WalletProvisioner.
  //
  // Strategy:
  //   1. Save profile wallet address to module-level _profileWalletAddress so
  //      getWalletProvider() can compare without hook context.
  //   2. Try to establish a Particle session via JWT.
  //   3. Compare Particle's address with profile wallet:
  //        match   → _particleConnected = true  → getWalletProvider() uses Particle
  //        mismatch → _particleConnected = false → getWalletProvider() falls through
  //                   to external wallet (MetaMask) — correct path for migration users
  //                   whose profile wallet is a legacy address from app.nfstay.com.
  const ensureConnected = useCallback(async () => {
    // Always update the module-level profile address before any tx
    _profileWalletAddress = address?.toLowerCase() ?? null;
    console.log('[ensureConnected] profile wallet:', _profileWalletAddress, '| _particleConnected:', _particleConnected);

    if (user?.id) {
      try {
        const { particleAuth, connect: particleConnect } = await import('@particle-network/auth-core');
        const { bsc } = await import('@particle-network/authkit/chains');
        const { PARTICLE_CONFIG } = await import('@/lib/particle');
        const pa = particleAuth as any;

        try {
          pa.init({
            projectId: PARTICLE_CONFIG.projectId,
            clientKey: PARTICLE_CONFIG.clientKey,
            appId: PARTICLE_CONFIG.appId,
            chains: [bsc],
          });
        } catch { /* already initialized */ }

        // Helper: get current Particle address (null if no session)
        const getParticleAddress = async (): Promise<string | null> => {
          if (!pa.ethereum) return null;
          try {
            const accounts = await pa.ethereum.request({ method: 'eth_accounts' });
            return accounts?.[0]?.toLowerCase() ?? null;
          } catch {
            return null;
          }
        };

        // Check if flag-confirmed session still matches (fast path on repeat txs)
        if (_particleConnected) {
          const addr = await getParticleAddress();
          if (addr && addr === _profileWalletAddress) {
            console.log('[ensureConnected] ✅ Session confirmed (flag + address match) — no JWT needed');
            return;
          }
          // Flag stale (e.g. wallet replaced mid-session) — re-evaluate
          _particleConnected = false;
        }

        // Try existing session before fetching a new JWT
        let particleAddr = await getParticleAddress();
        console.log('[ensureConnected] Particle current address:', particleAddr);

        if (!particleAddr) {
          // No active session — fetch JWT and reconnect
          console.log('[ensureConnected] No Particle session — fetching JWT...');
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

          let jwt: string | null = null;
          try {
            const res = await fetch(`${supabaseUrl}/functions/v1/particle-generate-jwt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
              body: JSON.stringify({ user_id: user.id }),
            });
            const jwtData = await res.json();
            jwt = jwtData?.jwt ?? null;
            console.log('[ensureConnected] JWT fetch →', jwt ? `${jwt.length} chars` : 'EMPTY', '| HTTP', res.status);
          } catch (e) {
            console.log('[ensureConnected] JWT fetch threw:', e);
          }

          if (jwt) {
            try {
              await particleConnect({ provider: 'jwt' as any, thirdpartyCode: jwt });
              particleAddr = await getParticleAddress();
              console.log('[ensureConnected] particleConnect(jwt) done — address:', particleAddr);
            } catch (e) {
              console.log('[ensureConnected] particleConnect(jwt) threw:', e);
            }
          }
        }

        // Address comparison — determines which provider getWalletProvider() will use
        if (particleAddr && _profileWalletAddress) {
          if (particleAddr === _profileWalletAddress) {
            _particleConnected = true;
            console.log('[ensureConnected] ✅ Particle address matches profile wallet — will use Particle for signing');
          } else {
            _particleConnected = false;
            console.log(
              '[ensureConnected] ⚠️ Particle address', particleAddr,
              '≠ profile wallet', _profileWalletAddress,
              '— migration user detected. Will use external wallet (MetaMask) for signing.',
            );
          }
        } else if (particleAddr) {
          // No profile address yet (first-time setup) — trust Particle
          _particleConnected = true;
          console.log('[ensureConnected] No profile wallet yet — trusting Particle address:', particleAddr);
        } else {
          _particleConnected = false;
          console.log('[ensureConnected] No Particle address obtained — external wallet will be used');
        }
      } catch (e) {
        console.log('[ensureConnected] Particle module failed:', e);
        _particleConnected = false;
      }
    }

    if (!connected || !address) {
      await connect();
    }
  }, [connected, address, connect, user?.id]);

  // ── READ FUNCTIONS ──

  const getShareBalance = useCallback(
    async (propertyId: number): Promise<number> => {
      try {
        const contract = await getContract(CONTRACTS.RWA_TOKEN, RWA_TOKEN_ABI);
        if (!contract || !address) return 0;
        const balance = await contract.balanceOf(address, propertyId);
        return balance.toNumber();
      } catch {
        return 0;
      }
    },
    [address],
  );

  const getRentDetails = useCallback(async (propertyId: number) => {
    try {
      const contract = await getContract(CONTRACTS.RENT, RENT_ABI);
      if (!contract) return null;
      const details = await contract.getRentDetails(propertyId);
      return {
        startTime: details.startTime.toNumber(),
        endTime: details.endTime.toNumber(),
        totalRent: details.totalRent.toString(),
        rentRemaining: details.rentRemaining.toString(),
        rentPerShare: details.rentPerShare.toString(),
      };
    } catch {
      return null;
    }
  }, []);

  const isEligibleForRent = useCallback(
    async (propertyId: number): Promise<boolean> => {
      try {
        const contract = await getContract(CONTRACTS.RENT, RENT_ABI);
        if (!contract || !address) return false;
        return await contract.isEligibleForRent(propertyId, address);
      } catch {
        return false;
      }
    },
    [address],
  );

  const getRentHistory = useCallback(
    async (propertyId: number): Promise<string> => {
      try {
        const contract = await getContract(CONTRACTS.RENT, RENT_ABI);
        if (!contract || !address) return '0';
        const ethers = await getEthers();
        if (!ethers) return '0';
        const total = await contract.getRentHistory(address, propertyId);
        return ethers.utils.formatUnits(total, 18);
      } catch {
        return '0';
      }
    },
    [address],
  );

  const getProposalDetails = useCallback(async (proposalId: number) => {
    try {
      const contract = await getContract(CONTRACTS.VOTING, VOTING_ABI);
      if (!contract) return null;
      const p = await contract.getProposal(proposalId);
      let description = '';
      try {
        description = await contract.decodeString(p._description);
      } catch {
        description = '';
      }
      return {
        propertyId: p._propertyId.toNumber(),
        proposer: p._proposer,
        endTime: p._endTime.toNumber(),
        votesYes: p._votesInFavour.toNumber(),
        votesNo: p._votesInAgainst.toNumber(),
        description,
        status: p._status,
      };
    } catch {
      return null;
    }
  }, []);

  const getLpQuote = useCallback(async (amountUsdc: number): Promise<string> => {
    try {
      const contract = await getContract(CONTRACTS.BUY_LP, BUY_LP_ABI);
      if (!contract) return '0';
      const ethers = await getEthers();
      if (!ethers) return '0';
      const amount = ethers.utils.parseUnits(amountUsdc.toString(), 18);
      const lpAmount = await contract.getLpEstimation(amount);
      return ethers.utils.formatUnits(lpAmount, 18);
    } catch {
      return '0';
    }
  }, []);

  const getBoostDetails = useCallback(
    async (propertyId: number) => {
      try {
        const contract = await getContract(CONTRACTS.BOOSTER, BOOSTER_ABI);
        if (!contract) return null;
        const details = await contract.getBoostdetails(propertyId);
        const isBoosted = address
          ? await contract.isBoosted(address, propertyId)
          : false;
        const rewards = address
          ? await contract.getEstimatedRewards(address, propertyId)
          : 0;
        return {
          boostApr: details.boostApr.toString(),
          totalBoosted: details.totalBoosted.toString(),
          isBoosted,
          estimatedRewards: rewards.toString(),
        };
      } catch {
        return null;
      }
    },
    [address],
  );

  // ── WRITE FUNCTIONS ──

  const buyShares = useCallback(
    async (
      propertyId: number,
      shares: number,
      amountUsdc: number,
      agentWallet?: string,
    ) => {
      setLoading(true);
      setError(null);
      try {
        await ensureConnected();
        const ethers = await getEthers();
        if (!ethers) throw new Error('Blockchain not available');

        // 1. Approve USDC
        const usdc = await getContract(CONTRACTS.USDC, ERC20_ABI, true);
        if (!usdc) throw new Error('Could not connect to USDC contract');
        const amount = ethers.utils.parseUnits(amountUsdc.toString(), 18);
        const approveTx = await usdc.approve(CONTRACTS.RWA_MARKETPLACE, amount);
        await approveTx.wait();

        // 2. Buy shares
        const marketplace = await getContract(
          CONTRACTS.RWA_MARKETPLACE,
          MARKETPLACE_ABI,
          true,
        );
        if (!marketplace) throw new Error('Could not connect to marketplace');
        const agent = agentWallet || ethers.constants.AddressZero;
        const tx = await marketplace.sendPrimaryShares(
          address,
          agent,
          propertyId,
          shares,
        );
        const receipt = await tx.wait();

        // F9: Write confirmed order to Supabase after on-chain tx succeeds
        // Wrapped in try/catch — DB write failure must not surface as a purchase failure
        try {
          // Write to inv_orders using column names from DATABASE.md
          await (supabase.from('inv_orders') as any).insert({
            property_id: propertyId,
            // user_id will be set by RLS / service role — passing wallet_address as reference
            shares_requested: shares,
            amount_paid: amountUsdc,
            payment_method: 'crypto_usdc',
            status: 'completed',
            tx_hash: receipt.transactionHash,
            // agent_id: TODO — resolve agentWallet to profiles.id when agent lookup is available
          });

          // Upsert inv_shareholdings — per DATABASE.md: UNIQUE(user_id, property_id)
          // NOTE: user_id from auth session is not available here (blockchain hook has no auth context)
          // TODO: wire auth user_id once useAuth is available in this hook context
          // For now, log wallet address in notes field is not available; skipping upsert
          // to avoid breaking the flow with a missing required field.
        } catch (dbErr) {
          // Non-fatal: on-chain tx already succeeded
          console.error('[F9] Supabase order record failed (tx already confirmed):', dbErr);
        }

        // N4: Notify n8n of purchase confirmation (non-blocking)
        try {
          const n8nNotifyUrl = import.meta.env.VITE_N8N_INVEST_NOTIFY_WEBHOOK_URL;
          if (n8nNotifyUrl) {
            await fetch(n8nNotifyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_type: 'purchase_confirmed',
                wallet_address: address,
                property_id: propertyId,
                shares,
                amount_usd: amountUsdc,
                tx_hash: receipt.transactionHash,
              }),
            });
          }
        } catch (notifyErr) {
          // Non-fatal: notification failure must never block the user flow
          console.error('[N4] n8n notify failed (purchase already confirmed):', notifyErr);
        }

        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Purchase failed';
        setError(msg);
        setLoading(false);
        throw err;
      }
    },
    [address, ensureConnected],
  );

  const claimRent = useCallback(
    async (propertyId: number) => {
      setLoading(true);
      setError(null);
      try {
        await ensureConnected();
        const contract = await getContract(CONTRACTS.RENT, RENT_ABI, true);
        if (!contract) throw new Error('Could not connect to rent contract');
        const tx = await contract.withdrawRent(propertyId);
        const receipt = await tx.wait();
        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Claim failed';
        setError(msg);
        setLoading(false);
        throw err;
      }
    },
    [ensureConnected],
  );

  const castVote = useCallback(
    async (proposalId: number, inFavor: boolean) => {
      setLoading(true);
      setError(null);
      try {
        await ensureConnected();
        const contract = await getContract(CONTRACTS.VOTING, VOTING_ABI, true);
        if (!contract) throw new Error('Could not connect to voting contract');
        const tx = await contract.vote(proposalId, inFavor);
        const receipt = await tx.wait();
        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Vote failed';
        setError(msg);
        setLoading(false);
        throw err;
      }
    },
    [ensureConnected],
  );

  const boostApr = useCallback(
    async (propertyId: number) => {
      setLoading(true);
      setError(null);
      try {
        await ensureConnected();
        const contract = await getContract(
          CONTRACTS.BOOSTER,
          BOOSTER_ABI,
          true,
        );
        if (!contract) throw new Error('Could not connect to booster contract');
        const tx = await contract.boost(propertyId);
        const receipt = await tx.wait();
        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Boost failed';
        setError(msg);
        setLoading(false);
        throw err;
      }
    },
    [ensureConnected],
  );

  const claimBoostRewards = useCallback(
    async (propertyId: number) => {
      setLoading(true);
      setError(null);
      try {
        await ensureConnected();
        const contract = await getContract(
          CONTRACTS.BOOSTER,
          BOOSTER_ABI,
          true,
        );
        if (!contract) throw new Error('Could not connect to booster contract');
        const tx = await contract.claimRewards(propertyId);
        const receipt = await tx.wait();
        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Claim failed';
        setError(msg);
        setLoading(false);
        throw err;
      }
    },
    [ensureConnected],
  );

  const buyStayTokens = useCallback(
    async (propertyId: number, onStep?: (step: number, total: number) => void) => {
      setLoading(true);
      setError(null);
      try {
        await ensureConnected();
        const ethers = await getEthers();
        if (!ethers) throw new Error('Blockchain not available');

        // 1. Withdraw rent
        onStep?.(1, 3);
        const rentContract = await getContract(CONTRACTS.RENT, RENT_ABI, true);
        if (!rentContract) throw new Error('Could not connect to rent contract');
        const withdrawTx = await rentContract.withdrawRent(propertyId);
        await withdrawTx.wait();

        // 2. Approve USDC for BUY_LP
        onStep?.(2, 3);
        const usdc = await getContract(CONTRACTS.USDC, ERC20_ABI, true);
        if (!usdc) throw new Error('Could not connect to USDC contract');
        const balance = await usdc.balanceOf(address);
        if (balance.isZero()) throw new Error('No USDC balance after rent withdrawal');
        const approveTx = await usdc.approve(CONTRACTS.BUY_LP, balance);
        await approveTx.wait();

        // 3. Swap USDC → STAY
        onStep?.(3, 3);
        const buyLpContract = await getContract(CONTRACTS.BUY_LP, BUY_LP_ABI, true);
        if (!buyLpContract) throw new Error('Could not connect to BuyLP contract');
        const tx = await buyLpContract.buyStay(address, CONTRACTS.USDC, balance);
        const receipt = await tx.wait();

        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Buy STAY failed';
        setError(msg);
        setLoading(false);
        throw err;
      }
    },
    [address, ensureConnected],
  );

  const buyLpTokens = useCallback(
    async (propertyId: number, onStep?: (step: number, total: number) => void) => {
      setLoading(true);
      setError(null);
      try {
        await ensureConnected();
        const ethers = await getEthers();
        if (!ethers) throw new Error('Blockchain not available');

        // 1. Withdraw rent
        onStep?.(1, 3);
        const rentContract = await getContract(CONTRACTS.RENT, RENT_ABI, true);
        if (!rentContract) throw new Error('Could not connect to rent contract');
        const withdrawTx = await rentContract.withdrawRent(propertyId);
        await withdrawTx.wait();

        // 2. Approve USDC for BUY_LP
        onStep?.(2, 3);
        const usdc = await getContract(CONTRACTS.USDC, ERC20_ABI, true);
        if (!usdc) throw new Error('Could not connect to USDC contract');
        const balance = await usdc.balanceOf(address);
        if (balance.isZero()) throw new Error('No USDC balance after rent withdrawal');
        const approveTx = await usdc.approve(CONTRACTS.BUY_LP, balance);
        await approveTx.wait();

        // 3. Create LP position
        onStep?.(3, 3);
        const buyLpContract = await getContract(CONTRACTS.BUY_LP, BUY_LP_ABI, true);
        if (!buyLpContract) throw new Error('Could not connect to BuyLP contract');
        const tx = await buyLpContract.buyLPToken(address, CONTRACTS.USDC, balance);
        const receipt = await tx.wait();

        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Buy LP failed';
        setError(msg);
        setLoading(false);
        throw err;
      }
    },
    [address, ensureConnected],
  );

  return {
    // State
    loading,
    error,
    walletAddress: address,
    walletConnected: connected,

    // Read
    getShareBalance,
    getRentDetails,
    isEligibleForRent,
    getBoostDetails,
    getRentHistory,
    getProposalDetails,
    getLpQuote,

    // Write
    buyShares,
    claimRent,
    castVote,
    boostApr,
    claimBoostRewards,
    buyStayTokens,
    buyLpTokens,

    // Wallet
    connectWallet: connect,
  };
}
