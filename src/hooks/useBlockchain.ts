// useBlockchain — all smart contract read/write functions.
//
// SIGNING: Uses useEthereum() from @particle-network/authkit (same as legacy).
// AuthCoreContextProvider wraps the app and initializes the MPC signing session.
// The provider from useEthereum() has proper WASM/thresh-sig initialization —
// particleAuth.ethereum from auth-core does NOT (causes "Invalid payment token").
//
// READS: Use public Alchemy RPC (no wallet popup needed).

import { useCallback, useState } from 'react';
import { useEthereum } from '@particle-network/authkit';
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

// Extract readable error message from ethers.js / Particle errors.
function extractBlockchainError(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (err instanceof Error) {
    const anyErr = err as any;
    if (anyErr.reason) return anyErr.reason;
    if (anyErr.error?.message) return anyErr.error.message;
    return err.message || fallback;
  }
  if (typeof err === 'object') {
    const obj = err as any;
    if (obj.reason) return obj.reason;
    if (obj.message) return obj.message;
    if (obj.error?.message) return obj.error.message;
  }
  if (typeof err === 'string') return err;
  return fallback;
}

export function useBlockchain() {
  const { address, connected, connect } = useWallet();
  const { user } = useAuth();
  const { provider: particleProvider } = useEthereum();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get signer from Particle's EVMProvider (initialized by AuthCoreContextProvider).
  // This is the same pattern as legacy: new ethers.providers.Web3Provider(particleProvider).getSigner()
  const getSignerProvider = useCallback(async () => {
    const ethers = await getEthers();
    if (!ethers || !particleProvider) return null;
    try {
      const web3Provider = new ethers.providers.Web3Provider(particleProvider as any);
      return web3Provider;
    } catch (e) {
      console.error('[getSignerProvider] Failed:', e);
      return null;
    }
  }, [particleProvider]);

  async function getContract(contractAddress: string, abi: string[], withSigner = false) {
    const ethers = await getEthers();
    if (!ethers) return null;
    if (withSigner) {
      const provider = await getSignerProvider();
      if (!provider) return null;
      const signer = provider.getSigner();
      return new ethers.Contract(contractAddress, abi, signer);
    }
    const provider = await getReadProvider();
    if (!provider) return null;
    return new ethers.Contract(contractAddress, abi, provider);
  }

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
        const ethers = await getEthers();
        if (!ethers) throw new Error('Blockchain not available');

        // 1. Approve USDC
        const usdc = await getContract(CONTRACTS.USDC, ERC20_ABI, true);
        if (!usdc) throw new Error('Could not connect to USDC contract');
        const amount = ethers.utils.parseUnits(amountUsdc.toString(), 18);
        const approveTx = await usdc.approve(CONTRACTS.RWA_MARKETPLACE, amount);
        await approveTx.wait();

        // 2. Buy shares
        const marketplace = await getContract(CONTRACTS.RWA_MARKETPLACE, MARKETPLACE_ABI, true);
        if (!marketplace) throw new Error('Could not connect to marketplace');
        const agent = agentWallet || ethers.constants.AddressZero;
        const tx = await marketplace.sendPrimaryShares(address, agent, propertyId, shares);
        const receipt = await tx.wait();

        // F9: Write confirmed order to Supabase
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
          console.error('[F9] Supabase order record failed:', dbErr);
        }

        // N4: Notify n8n (non-blocking)
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
          console.error('[N4] n8n notify failed:', notifyErr);
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
    [address, getSignerProvider],
  );

  const claimRent = useCallback(
    async (propertyId: number) => {
      setLoading(true);
      setError(null);
      try {
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
    [getSignerProvider],
  );

  const castVote = useCallback(
    async (proposalId: number, inFavor: boolean) => {
      setLoading(true);
      setError(null);
      try {
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
    [getSignerProvider],
  );

  const boostApr = useCallback(
    async (propertyId: number) => {
      setLoading(true);
      setError(null);
      try {
        const contract = await getContract(CONTRACTS.BOOSTER, BOOSTER_ABI, true);
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
    [getSignerProvider],
  );

  const claimBoostRewards = useCallback(
    async (propertyId: number) => {
      setLoading(true);
      setError(null);
      try {
        const contract = await getContract(CONTRACTS.BOOSTER, BOOSTER_ABI, true);
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
    [getSignerProvider],
  );

  // STAY Token claim: withdraw rent → approve USDC → swap to STAY via BuyLP contract.
  // Matches legacy claim.jsx: withdrawRent → checkForApproval → buyStay(addr, USDC, amount, {value:0})
  const buyStayTokens = useCallback(
    async (propertyId: number, onStep?: (step: number, total: number) => void) => {
      setLoading(true);
      setError(null);
      try {
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

        // 3. Swap USDC → STAY via BuyLP contract
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
    [address, getSignerProvider],
  );

  // LP Token claim: withdraw rent → approve USDC → create LP via BuyLP contract.
  // Matches legacy NfstayContext.jsx handleBuyLp: buyLPToken(addr, USDC, amount, {value:0})
  const buyLpTokens = useCallback(
    async (propertyId: number, onStep?: (step: number, total: number) => void) => {
      setLoading(true);
      setError(null);
      try {
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

        // 3. Create LP position via BuyLP contract
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
    [address, getSignerProvider],
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
