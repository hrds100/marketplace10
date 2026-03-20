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

// Module-level Particle session flag — persists for the tab lifetime.
// Set true once particleConnect succeeds.
let _particleConnected = false;

// Which Particle project was initialized this page session.
// Particle SDK only allows ONE init per page — subsequent pa.init() calls throw
// "already initialized" and are silently caught. So the FIRST init wins.
// Social users (Google/Apple/etc) MUST use 'legacy' to recover the same wallet
// as app.nfstay.com. JWT users use 'hub'.
let _particleInitType: 'hub' | 'legacy' | null = null;

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

// Initialize Particle SDK with the correct project.
// Must only be called ONCE per page — the first call wins.
// Social users → legacy project (same wallet as app.nfstay.com)
// JWT users → hub project
async function initParticle(pa: any, type: 'hub' | 'legacy') {
  if (_particleInitType === type) return; // Already initialized correctly
  if (_particleInitType && _particleInitType !== type) {
    // Already initialized with WRONG project — can't change. Log warning.
    console.warn('[Particle] ⚠️ Already initialized as', _particleInitType, '— cannot switch to', type);
    return;
  }
  const { bsc } = await import('@particle-network/authkit/chains');
  const { PARTICLE_CONFIG, PARTICLE_LEGACY_CONFIG } = await import('@/lib/particle');
  const config = type === 'legacy' ? PARTICLE_LEGACY_CONFIG : PARTICLE_CONFIG;
  try {
    pa.init({
      projectId: config.projectId,
      clientKey: config.clientKey,
      appId: config.appId,
      chains: [bsc],
    });
    _particleInitType = type;
    console.log('[Particle] ✅ Initialized as', type);
  } catch {
    // Already initialized — record which type won
    if (!_particleInitType) _particleInitType = type;
  }
}

// Ensure Particle provider is on BNB Chain (56). Switch if needed.
// If the provider is fully disconnected, this logs and returns false.
async function ensureBscChain(pa: any): Promise<boolean> {
  if (!pa?.ethereum) return false;
  try {
    const chainIdHex = await pa.ethereum.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    if (chainId !== 56) {
      console.log('[Provider] Wrong chain:', chainId, '— switching to BSC (56)');
      await pa.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x38' }],
      });
    }
    return true;
  } catch (e) {
    console.log('[Provider] Chain check/switch failed (provider may be disconnected):', e);
    return false;
  }
}

// Browser wallet provider for WRITE calls — Particle only.
// ensureConnected() MUST be called before this function.
// It sets _particleInitType and _particleConnected so the provider is ready.
async function getWalletProvider() {
  const ethers = await getEthers();
  if (!ethers) return null;

  try {
    const { particleAuth } = await import('@particle-network/auth-core');
    const pa = particleAuth as any;

    // Initialize with correct project if not yet initialized.
    // If ensureConnected() already ran, _particleInitType is set — this is a no-op.
    // If called standalone (shouldn't happen for write ops), default to hub.
    if (!_particleInitType) {
      await initParticle(pa, 'hub');
    }

    // Fast path: session confirmed by ensureConnected() this tab session
    if (_particleConnected && pa.ethereum) {
      console.log('[Provider] ✅ Particle (session flag active)');
      await ensureBscChain(pa);
      return new ethers.providers.Web3Provider(pa.ethereum);
    }

    // Slow path: hard refresh — verify via eth_accounts
    if (pa.ethereum) {
      try {
        const accounts = await pa.ethereum.request({ method: 'eth_accounts' });
        console.log('[Provider] eth_accounts:', accounts);
        if (Array.isArray(accounts) && accounts.length > 0) {
          console.log('[Provider] ✅ Particle (eth_accounts verified)');
          const chainOk = await ensureBscChain(pa);
          if (!chainOk) {
            console.log('[Provider] ❌ Provider disconnected — cannot use');
            return null;
          }
          return new ethers.providers.Web3Provider(pa.ethereum);
        }
      } catch (e) {
        console.log('[Provider] eth_accounts threw:', e);
      }
    }

    console.log('[Provider] Particle session not active');
  } catch (e) {
    console.log('[Provider] Particle unavailable:', e);
  }

  console.log('[Provider] No wallet provider found');
  return null;
}

async function getSigner() {
  const provider = await getWalletProvider();
  return provider?.getSigner() || null;
}

// Extract readable error message from ethers.js errors.
// Ethers v5 revert errors are often NOT standard Error instances —
// they're plain objects with reason/code/error nested fields.
function extractBlockchainError(err: unknown, fallback: string): string {
  if (!err) return fallback;
  // Standard Error
  if (err instanceof Error) {
    // Ethers wraps the revert reason in .reason
    const anyErr = err as any;
    if (anyErr.reason) return anyErr.reason;
    if (anyErr.error?.message) return anyErr.error.message;
    return err.message || fallback;
  }
  // Plain object (some ethers errors)
  if (typeof err === 'object') {
    const obj = err as any;
    if (obj.reason) return obj.reason;
    if (obj.message) return obj.message;
    if (obj.error?.message) return obj.error.message;
  }
  if (typeof err === 'string') return err;
  return fallback;
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
  // CRITICAL: Must determine user's auth method BEFORE calling pa.init(),
  // because Particle SDK only initializes once per page — subsequent init() calls
  // throw "already initialized" and are silently caught. Social users need the
  // legacy project (same wallet as app.nfstay.com), JWT users need the hub project.
  const ensureConnected = useCallback(async () => {
    if (user?.id) {
      console.log('[ensureConnected] user.id =', user.id, '| _particleConnected =', _particleConnected, '| _particleInitType =', _particleInitType);
      try {
        const { particleAuth, connect: particleConnect } = await import('@particle-network/auth-core');
        const pa = particleAuth as any;

        // Determine auth method from profile FIRST — before any pa.init()
        // This decides which Particle project credentials to use.
        let authMethod = 'jwt';
        if (!_particleInitType) {
          const { data: profile } = await (supabase.from('profiles') as any)
            .select('wallet_auth_method')
            .eq('id', user.id)
            .single();
          authMethod = (profile as any)?.wallet_auth_method || 'jwt';
          const initType = authMethod !== 'jwt' ? 'legacy' : 'hub';
          await initParticle(pa, initType);
          console.log('[ensureConnected] Auth method:', authMethod, '→ init type:', initType);
        }

        // Fast path: signing session already confirmed this tab session
        if (_particleConnected) {
          console.log('[ensureConnected] ✅ Signing session already confirmed');
          return;
        }

        // Check if WalletProvisioner already established a session.
        // WalletProvisioner runs on dashboard load and inits Particle + verifies eth_accounts.
        // If accounts exist, the session is live and signing should work.
        let hasSession = false;
        if (pa.ethereum) {
          try {
            const accounts = await pa.ethereum.request({ method: 'eth_accounts' });
            console.log('[ensureConnected] eth_accounts:', accounts);
            hasSession = Array.isArray(accounts) && accounts.length > 0;
          } catch (e) {
            console.log('[ensureConnected] eth_accounts threw:', e);
          }
        }

        if (hasSession) {
          _particleConnected = true;
          console.log('[ensureConnected] ✅ Session confirmed via eth_accounts (WalletProvisioner)');
          return;
        }

        // No session — need to establish one.
        // Re-read auth method if we haven't already (might have been read during init)
        if (_particleInitType && authMethod === 'jwt') {
          const { data: profile } = await (supabase.from('profiles') as any)
            .select('wallet_auth_method')
            .eq('id', user.id)
            .single();
          authMethod = (profile as any)?.wallet_auth_method || 'jwt';
        }

        if (authMethod !== 'jwt') {
          // Social login — try to reconnect. This may open a popup if the session is fully expired.
          console.log('[ensureConnected] No session — reconnecting via social:', authMethod);
          try {
            await particleConnect({ socialType: authMethod as any });
            _particleConnected = true;
            console.log('[ensureConnected] ✅ Social particleConnect succeeded');
          } catch (e) {
            console.log('[ensureConnected] ❌ Social particleConnect threw:', e);
            // Session may still work for signing if eth_accounts returned accounts above.
            // Don't block — let the transaction try and fail with a specific error.
          }
        } else {
          // JWT user — fetch JWT and reconnect
          console.log('[ensureConnected] No session — fetching JWT...');
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
            console.log('[ensureConnected] JWT →', jwt ? `${jwt.length} chars` : 'EMPTY', '| HTTP', res.status);
          } catch (e) {
            console.log('[ensureConnected] JWT fetch threw:', e);
          }

          if (jwt) {
            try {
              await particleConnect({ provider: 'jwt' as any, thirdpartyCode: jwt });
              _particleConnected = true;
              console.log('[ensureConnected] ✅ particleConnect(jwt) succeeded');
            } catch (e) {
              console.log('[ensureConnected] ❌ particleConnect(jwt) threw:', e);
            }
          }
        }
      } catch (e) {
        console.log('[ensureConnected] Particle module failed:', e);
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
        try {
          await (supabase.from('inv_orders') as any).insert({
            property_id: propertyId,
            shares_requested: shares,
            amount_paid: amountUsdc,
            payment_method: 'crypto_usdc',
            status: 'completed',
            tx_hash: receipt.transactionHash,
          });
        } catch (dbErr) {
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
          console.error('[N4] n8n notify failed (purchase already confirmed):', notifyErr);
        }

        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err) {
        const msg = extractBlockchainError(err, 'Purchase failed');
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
        // Dry-run first (like legacy) — catches revert with readable reason
        await contract.callStatic.withdrawRent(propertyId);
        const tx = await contract.withdrawRent(propertyId);
        const receipt = await tx.wait();
        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err) {
        const msg = extractBlockchainError(err, 'Claim failed');
        console.error('[claimRent] Failed for propertyId', propertyId, ':', err);
        setError(msg);
        setLoading(false);
        throw new Error(msg);
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
        const msg = extractBlockchainError(err, 'Vote failed');
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
        const msg = extractBlockchainError(err, 'Boost failed');
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
        const msg = extractBlockchainError(err, 'Claim failed');
        setError(msg);
        setLoading(false);
        throw err;
      }
    },
    [ensureConnected],
  );

  // STAY Token claim: withdraw rent → approve USDC → swap to STAY via BuyLP contract.
  // Contract verified on-chain: buyStay DOES accept USDC (in whitelist).
  // Legacy confirms: claim.jsx does withdrawRent → approve → buyStay(addr, USDC, amount).
  const buyStayTokens = useCallback(
    async (propertyId: number, onStep?: (step: number, total: number) => void) => {
      setLoading(true);
      setError(null);
      try {
        await ensureConnected();
        const ethers = await getEthers();
        if (!ethers) throw new Error('Blockchain not available');

        // 1. Withdraw rent as USDC
        onStep?.(1, 3);
        const rentContract = await getContract(CONTRACTS.RENT, RENT_ABI, true);
        if (!rentContract) throw new Error('Could not connect to rent contract');
        await rentContract.callStatic.withdrawRent(propertyId);
        const withdrawTx = await rentContract.withdrawRent(propertyId);
        const withdrawReceipt = await withdrawTx.wait();
        console.log('[buyStayTokens] Step 1 done — rent withdrawn, tx:', withdrawReceipt.transactionHash);

        // 2. Approve USDC for BuyLP contract
        onStep?.(2, 3);
        const usdc = await getContract(CONTRACTS.USDC, ERC20_ABI, true);
        if (!usdc) throw new Error('Could not connect to USDC contract');
        const balance = await usdc.balanceOf(address);
        console.log('[buyStayTokens] Step 2 — USDC balance:', ethers.utils.formatUnits(balance, 18));
        if (balance.isZero()) throw new Error('No USDC balance after rent withdrawal');
        const approveTx = await usdc.approve(CONTRACTS.BUY_LP, balance);
        await approveTx.wait();
        console.log('[buyStayTokens] Step 2 done — USDC approved for BuyLP');

        // 3. Swap USDC → STAY via BuyLP contract (matches legacy claim.jsx)
        onStep?.(3, 3);
        const buyLpContract = await getContract(CONTRACTS.BUY_LP, BUY_LP_ABI, true);
        if (!buyLpContract) throw new Error('Could not connect to BuyLP contract');
        const tx = await buyLpContract.buyStay(address, CONTRACTS.USDC, balance, { value: 0 });
        const receipt = await tx.wait();
        console.log('[buyStayTokens] Step 3 done — STAY purchased, tx:', receipt.transactionHash);

        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err) {
        const msg = extractBlockchainError(err, 'Buy STAY failed');
        console.error('[buyStayTokens] Failed for propertyId', propertyId, ':', err);
        setError(msg);
        setLoading(false);
        throw new Error(msg);
      }
    },
    [address, ensureConnected],
  );

  // LP Token claim: withdraw rent → approve USDC → create LP via BuyLP contract.
  // Contract verified on-chain: buyLPToken DOES accept USDC.
  // Legacy confirms: NfstayContext.jsx handleBuyLp calls buyLPToken(addr, USDC, amount).
  const buyLpTokens = useCallback(
    async (propertyId: number, onStep?: (step: number, total: number) => void) => {
      setLoading(true);
      setError(null);
      try {
        await ensureConnected();
        const ethers = await getEthers();
        if (!ethers) throw new Error('Blockchain not available');

        // 1. Withdraw rent as USDC
        onStep?.(1, 3);
        const rentContract = await getContract(CONTRACTS.RENT, RENT_ABI, true);
        if (!rentContract) throw new Error('Could not connect to rent contract');
        await rentContract.callStatic.withdrawRent(propertyId);
        const withdrawTx = await rentContract.withdrawRent(propertyId);
        await withdrawTx.wait();

        // 2. Approve USDC for BuyLP contract
        onStep?.(2, 3);
        const usdc = await getContract(CONTRACTS.USDC, ERC20_ABI, true);
        if (!usdc) throw new Error('Could not connect to USDC contract');
        const balance = await usdc.balanceOf(address);
        if (balance.isZero()) throw new Error('No USDC balance after rent withdrawal');
        const approveTx = await usdc.approve(CONTRACTS.BUY_LP, balance);
        await approveTx.wait();

        // 3. Create LP position via BuyLP contract (matches legacy handleBuyLp)
        onStep?.(3, 3);
        const buyLpContract = await getContract(CONTRACTS.BUY_LP, BUY_LP_ABI, true);
        if (!buyLpContract) throw new Error('Could not connect to BuyLP contract');
        const tx = await buyLpContract.buyLPToken(address, CONTRACTS.USDC, balance, { value: 0 });
        const receipt = await tx.wait();
        console.log('[buyLpTokens] LP created, tx:', receipt.transactionHash);

        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err) {
        const msg = extractBlockchainError(err, 'Buy LP failed');
        console.error('[buyLpTokens] Failed for propertyId', propertyId, ':', err);
        setError(msg);
        setLoading(false);
        throw new Error(msg);
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
