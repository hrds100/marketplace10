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

// Module-level Particle session flag.
// Set true when particleConnect(jwt) succeeds — persists for the tab lifetime.
// Lets getWalletProvider() skip the unreliable eth_accounts check after a confirmed connect.
let _particleConnected = false;

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

// Browser wallet provider for WRITE calls (requires signing)
// Priority: Particle auth-core MPC wallet → window.particle → MetaMask
async function getWalletProvider() {
  const ethers = await getEthers();
  if (!ethers) return null;

  // Priority 1: Particle auth-core MPC wallet (our primary wallet, created via JWT)
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

    // BSC network descriptor — pass explicitly so ethers never probes eth_chainId
    // (Particle's EIP-1193 provider returns chainId inconsistently on first call,
    //  causing "provider is disconnected from the specified chain" with auto-detect)
    const BSC_NETWORK = { chainId: 56, name: 'bnb' };

    // Fast path: session confirmed by ensureConnected() in this tab lifetime
    if (_particleConnected && pa.ethereum) {
      console.log('[Provider] Using Particle auth-core (session flag active)');
      return new ethers.providers.Web3Provider(pa.ethereum, BSC_NETWORK);
    }

    // Slow path: flag not set (e.g. hard refresh) — verify via eth_accounts
    if (pa.ethereum) {
      try {
        const accounts = await pa.ethereum.request({ method: 'eth_accounts' });
        console.log('[Provider] eth_accounts result:', accounts);
        if (Array.isArray(accounts) && accounts.length > 0) {
          console.log('[Provider] Using Particle auth-core (eth_accounts verified)');
          return new ethers.providers.Web3Provider(pa.ethereum, BSC_NETWORK);
        }
        console.log('[Provider] Particle session not active — eth_accounts returned empty');
      } catch (e) {
        console.log('[Provider] eth_accounts threw:', e);
      }
    } else {
      console.log('[Provider] pa.ethereum is undefined — Particle not connected yet');
    }
  } catch (e) {
    console.log('[Provider] Particle auth-core import/init failed:', e);
  }

  // Priority 2: window.particle?.ethereum (Particle browser extension)
  if ((window as any).particle?.ethereum) {
    console.log('[Provider] Using window.particle (browser extension)');
    return new ethers.providers.Web3Provider((window as any).particle.ethereum);
  }

  // Priority 3: window.ethereum (MetaMask — last resort)
  if ((window as any).ethereum) {
    console.log('[Provider] ⚠️ Falling back to window.ethereum (MetaMask/Phantom) — Particle session was not ready');
    return new ethers.providers.Web3Provider((window as any).ethereum);
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

  // Ensure Particle signing session is active before any write tx.
  // Runs at tx time (not on mount) so there's no race condition with user interaction.
  const ensureConnected = useCallback(async () => {
    if (user?.id) {
      console.log('[ensureConnected] user.id =', user.id, '| _particleConnected =', _particleConnected);
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

        // Check if session is already confirmed active
        let sessionActive = _particleConnected;

        if (!sessionActive) {
          // Double-check via eth_accounts (covers hard refresh where flag was cleared)
          if (pa.ethereum) {
            try {
              const accounts = await pa.ethereum.request({ method: 'eth_accounts' });
              console.log('[ensureConnected] eth_accounts check:', accounts);
              sessionActive = Array.isArray(accounts) && accounts.length > 0;
            } catch (e) {
              console.log('[ensureConnected] eth_accounts threw:', e);
            }
          } else {
            console.log('[ensureConnected] pa.ethereum is undefined before JWT fetch');
          }
        }

        if (!sessionActive) {
          // Session not active — fetch a fresh JWT and reconnect
          console.log('[ensureConnected] Session not active — fetching JWT...');
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
            jwt = jwtData?.jwt || null;
            console.log(
              '[ensureConnected] JWT fetch →',
              jwt ? `received (${jwt.length} chars)` : 'EMPTY — edge function returned no jwt',
              '| HTTP status:', res.status,
            );
          } catch (e) {
            console.log('[ensureConnected] JWT fetch threw:', e);
          }

          if (jwt) {
            try {
              await particleConnect({ provider: 'jwt' as any, thirdpartyCode: jwt });
              _particleConnected = true;
              console.log('[ensureConnected] ✅ particleConnect(jwt) succeeded — Particle session active');
            } catch (e) {
              console.log('[ensureConnected] ❌ particleConnect(jwt) threw:', e);
            }
          } else {
            console.log('[ensureConnected] ⚠️ No JWT available — Particle session will NOT be restored. MetaMask will be used as fallback.');
          }
        } else {
          console.log('[ensureConnected] Session already active — skipping JWT fetch');
        }
      } catch (e) {
        console.log('[ensureConnected] Particle module import failed:', e);
      }
    } else {
      console.log('[ensureConnected] No user.id — skipping Particle reconnect');
    }

    // Ensure wallet address is loaded into hook state
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
