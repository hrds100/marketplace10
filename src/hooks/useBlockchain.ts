// useBlockchain — all smart contract read/write functions.
//
// SIGNING: Uses ConnectKitProvider (same as legacy app.nfstay.com).
// ConnectKitProvider manages the full MPC signing session lifecycle.
// For social users: useEthereum() from authkit provides the Particle provider.
// For external wallets: window.ethereum is used.
// Legacy pattern: check connector type → pick provider → getSigner().
//
// READS: Use public Alchemy RPC (no wallet popup needed).

import { useCallback, useState } from 'react';
import { useAccount, useSwitchChain } from '@particle-network/connectkit';
import { useEthereum } from '@particle-network/authkit';
import { isSocialAuthType, getLatestAuthType } from '@particle-network/auth-core';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/hooks/useAuth';
import { CONTRACTS } from '@/lib/particle';
import {
  MARKETPLACE_ABI,
  MARKETPLACE_FULL_ABI,
  RWA_TOKEN_ABI,
  RWA_TOKEN_FULL_ABI,
  RENT_ABI,
  VOTING_ABI,
  BOOSTER_ABI,
  ERC20_ABI,
  BUY_LP_ABI,
  BUY_LP_FULL_ABI,
  FARM_ABI,
  ROUTER_ABI,
  PAIR_ABI,
} from '@/lib/contractAbis';
import { APPROVE_AMOUNT } from '@/lib/particle';
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
  const { address: walletAddr, connected, connect } = useWallet();
  const { user } = useAuth();
  // ConnectKit hooks — same as legacy NfstayContext.jsx
  const { address: ckAddress, status, chainId, isConnected, connector } = useAccount();
  const { provider: particleProvider } = useEthereum();
  const { switchChainAsync } = useSwitchChain();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ConnectKit address if available, fallback to wallet hook address
  const address = ckAddress || walletAddr;

  // Get signer provider — matches EXACT legacy pattern from NfstayContext.jsx:
  //   if social login → use particleProvider (from AuthCoreContextProvider / useEthereum)
  //   else → use window.ethereum (MetaMask / injected)
  //   fallback → particleProvider
  const getSignerProvider = useCallback(async () => {
    const ethers = await getEthers();
    if (!ethers) return null;
    try {
      let rawProvider: any;

      // Check if this is a social auth user (safe — returns false if no auth)
      let isParticleSocial = false;
      try {
        const connectorType = (connector as any)?.walletConnectorType;
        isParticleSocial =
          connectorType === 'particleAuth' &&
          isSocialAuthType(getLatestAuthType());
      } catch {
        // getLatestAuthType() may throw if no auth session — that's fine
      }

      if (isParticleSocial && particleProvider) {
        rawProvider = particleProvider;
        console.log('[getSignerProvider] Using Particle provider (social auth)');
      } else if (particleProvider) {
        // AuthCoreContextProvider gives us particleProvider — use it (most common path)
        rawProvider = particleProvider;
        console.log('[getSignerProvider] Using Particle provider (AuthCore)');
      } else if (typeof window !== 'undefined' && (window as any).ethereum) {
        rawProvider = (window as any).ethereum;
        console.log('[getSignerProvider] Using window.ethereum (external wallet)');
      } else {
        console.error('[getSignerProvider] No provider available');
        return null;
      }

      const web3Provider = new ethers.providers.Web3Provider(rawProvider);
      return web3Provider;
    } catch (e) {
      console.error('[getSignerProvider] Failed:', e);
      return null;
    }
  }, [particleProvider, connector]);

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

  // ── PORTED FROM LEGACY NfstayContext.jsx ──

  // Get on-chain property details from RWA token
  const getPropertyDetails = useCallback(async (propertyId: number) => {
    try {
      const contract = await getContract(CONTRACTS.RWA_TOKEN, RWA_TOKEN_FULL_ABI);
      if (!contract) return null;
      const p = await contract.getProperty(propertyId);
      return {
        partners: p.partners,
        shares: p.shares,
        totalShares: p.totalShares.toNumber(),
        pricePerShare: p.pricePerShare.toString(),
        uri: p.uri,
        aprBips: p.aprBips.toNumber(),
      };
    } catch { return null; }
  }, []);

  // Get primary sale info (remaining shares, status)
  const getPrimarySale = useCallback(async (propertyId: number) => {
    try {
      const contract = await getContract(CONTRACTS.RWA_MARKETPLACE, MARKETPLACE_FULL_ABI);
      if (!contract) return null;
      const sale = await contract.getPrimarySale(propertyId);
      return {
        propertyId: sale.propertyId.toNumber(),
        totalShares: sale.totalShares.toNumber(),
        sharesSold: sale.sharesSold.toNumber(),
        pricePerShare: sale.pricePerShare.toString(),
        status: sale.status,
      };
    } catch { return null; }
  }, []);

  // Get user's properties (loop all properties, check balanceOf)
  const getUserProperties = useCallback(async () => {
    try {
      const contract = await getContract(CONTRACTS.RWA_TOKEN, RWA_TOKEN_FULL_ABI);
      if (!contract || !address) return [];
      const totalProps = (await contract.totalProperties()).toNumber();
      const holdings: { propertyId: number; shares: number }[] = [];
      for (let i = 1; i <= totalProps; i++) {
        const bal = await contract.balanceOf(address, i);
        if (bal.gt(0)) {
          holdings.push({ propertyId: i, shares: bal.toNumber() });
        }
      }
      return holdings;
    } catch { return []; }
  }, [address]);

  // Get token balances (STAY, USDC, LP)
  const getBalances = useCallback(async () => {
    try {
      const ethers = await getEthers();
      if (!ethers || !address) return { stayBalance: '0', usdcBalance: '0', lpBalance: '0' };
      const provider = await getReadProvider();
      if (!provider) return { stayBalance: '0', usdcBalance: '0', lpBalance: '0' };

      const stay = new ethers.Contract(CONTRACTS.STAY, ERC20_ABI, provider);
      const usdc = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, provider);
      const lp = new ethers.Contract(CONTRACTS.STAY_USDC_PAIR, PAIR_ABI, provider);

      const [stayBal, usdcBal, lpBal] = await Promise.all([
        stay.balanceOf(address),
        usdc.balanceOf(address),
        lp.balanceOf(address),
      ]);

      return {
        stayBalance: ethers.utils.formatUnits(stayBal, 18),
        usdcBalance: ethers.utils.formatUnits(usdcBal, 18),
        lpBalance: ethers.utils.formatUnits(lpBal, 18),
      };
    } catch { return { stayBalance: '0', usdcBalance: '0', lpBalance: '0' }; }
  }, [address]);

  // Get STAY token estimation from BuyLP contract
  const getStayEstimation = useCallback(async (currency: string, amount: string) => {
    try {
      const ethers = await getEthers();
      if (!ethers) return '0';
      const contract = await getContract(CONTRACTS.BUY_LP, BUY_LP_FULL_ABI);
      if (!contract) return '0';
      const wei = ethers.utils.parseUnits(amount, 18);
      const estimation = await contract.getStayEstimation(currency, wei);
      return ethers.utils.formatUnits(estimation, 18);
    } catch { return '0'; }
  }, []);

  // Get USDC equivalent from router for a STAY amount
  const getUSDCFromRouter = useCallback(async (stayAmount: string) => {
    try {
      const ethers = await getEthers();
      if (!ethers) return '0';
      const contract = await getContract(CONTRACTS.ROUTER, ROUTER_ABI);
      if (!contract) return '0';
      const wei = ethers.utils.parseUnits(stayAmount, 18);
      const amounts = await contract.getAmountsOut(wei, [CONTRACTS.STAY, CONTRACTS.USDC]);
      return amounts[1].toString();
    } catch { return '0'; }
  }, []);

  // Get static values (LP price, STAY price, reserves, farm APR, boost APR)
  const getStaticValues = useCallback(async () => {
    try {
      const ethers = await getEthers();
      if (!ethers) return null;
      const provider = await getReadProvider();
      if (!provider) return null;

      const buyLp = new ethers.Contract(CONTRACTS.BUY_LP, BUY_LP_FULL_ABI, provider);
      const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, provider);
      const pair = new ethers.Contract(CONTRACTS.STAY_USDC_PAIR, PAIR_ABI, provider);
      const booster = new ethers.Contract(CONTRACTS.BOOSTER, BOOSTER_ABI, provider);

      const oneUsdc = ethers.utils.parseUnits('1', 18);
      const [lpPrice, stayPriceRaw, reserves, lpSupply] = await Promise.all([
        buyLp.getLpPrice().catch(() => ethers.BigNumber.from(0)),
        router.getAmountsOut(oneUsdc, [CONTRACTS.USDC, CONTRACTS.STAY]).catch(() => [0, 0]),
        pair.getReserves().catch(() => ({ reserve0: 0, reserve1: 0 })),
        pair.totalSupply().catch(() => ethers.BigNumber.from(0)),
      ]);

      return {
        lpPrice: ethers.utils.formatUnits(lpPrice, 18),
        stayPrice: stayPriceRaw[1] ? ethers.utils.formatUnits(stayPriceRaw[1], 18) : '0',
        usdcReserve: reserves.reserve0 ? ethers.utils.formatUnits(reserves.reserve0, 18) : '0',
        stayReserve: reserves.reserve1 ? ethers.utils.formatUnits(reserves.reserve1, 18) : '0',
        lpSupply: ethers.utils.formatUnits(lpSupply, 18),
      };
    } catch { return null; }
  }, []);

  // Get farm user details (staked amount, pending rewards)
  const getUserFarmDetails = useCallback(async () => {
    try {
      const ethers = await getEthers();
      if (!ethers || !address) return { staked: '0', pendingRewards: '0' };
      const contract = await getContract(CONTRACTS.FARM, FARM_ABI);
      if (!contract) return { staked: '0', pendingRewards: '0' };
      const [info, pending] = await Promise.all([
        contract.userInfo(address),
        contract.pendingReward(address),
      ]);
      return {
        staked: ethers.utils.formatUnits(info.amount, 18),
        pendingRewards: ethers.utils.formatUnits(pending, 18),
      };
    } catch { return { staked: '0', pendingRewards: '0' }; }
  }, [address]);

  // Check + set approval for a token (matches legacy checkForApproval)
  const checkForApproval = useCallback(
    async (tokenType: 'USDC' | 'STAY' | 'PAIR', amount: string, spender: string) => {
      try {
        const ethers = await getEthers();
        if (!ethers || !address) return false;
        let tokenAddress: string;
        if (tokenType === 'USDC') tokenAddress = CONTRACTS.USDC;
        else if (tokenType === 'STAY') tokenAddress = CONTRACTS.STAY;
        else tokenAddress = CONTRACTS.STAY_USDC_PAIR;

        const contract = await getContract(tokenAddress, ERC20_ABI, true);
        if (!contract) return false;
        const allowance = await contract.allowance(address, spender);
        const required = ethers.utils.parseUnits(amount, 18);
        if (allowance.gte(required)) return true;

        const approveAmount = ethers.utils.parseUnits(APPROVE_AMOUNT, 18);
        const tx = await contract.approve(spender, approveAmount);
        await tx.wait();
        return true;
      } catch (err) {
        console.error('[checkForApproval] Failed:', err);
        return false;
      }
    },
    [address, getSignerProvider],
  );

  // Stake LP tokens in farm
  const handleAddToFarm = useCallback(
    async (amount: string) => {
      setLoading(true);
      setError(null);
      try {
        const ethers = await getEthers();
        if (!ethers || !address) throw new Error('Wallet not connected');
        // Approve LP for farm
        await checkForApproval('PAIR', amount, CONTRACTS.FARM);
        // Deposit
        const contract = await getContract(CONTRACTS.FARM, FARM_ABI, true);
        if (!contract) throw new Error('Could not connect to farm');
        const wei = ethers.utils.parseUnits(amount, 18);
        const tx = await contract.deposit(wei);
        const receipt = await tx.wait();
        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err) {
        const msg = extractBlockchainError(err, 'Farm stake failed');
        setError(msg);
        setLoading(false);
        throw new Error(msg);
      }
    },
    [address, getSignerProvider, checkForApproval],
  );

  // Claim farm rewards
  const handleClaimFarmRewards = useCallback(
    async () => {
      setLoading(true);
      setError(null);
      try {
        const contract = await getContract(CONTRACTS.FARM, FARM_ABI, true);
        if (!contract) throw new Error('Could not connect to farm');
        const tx = await contract.claimReward();
        const receipt = await tx.wait();
        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err) {
        const msg = extractBlockchainError(err, 'Claim rewards failed');
        setError(msg);
        setLoading(false);
        throw new Error(msg);
      }
    },
    [getSignerProvider],
  );

  // Withdraw from farm
  const handleWithdrawFromFarm = useCallback(
    async (amount: string) => {
      setLoading(true);
      setError(null);
      try {
        const ethers = await getEthers();
        if (!ethers) throw new Error('Blockchain not available');
        const contract = await getContract(CONTRACTS.FARM, FARM_ABI, true);
        if (!contract) throw new Error('Could not connect to farm');
        const wei = ethers.utils.parseUnits(amount, 18);
        const tx = await contract.withdraw(wei);
        const receipt = await tx.wait();
        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err) {
        const msg = extractBlockchainError(err, 'Withdraw failed');
        setError(msg);
        setLoading(false);
        throw new Error(msg);
      }
    },
    [getSignerProvider],
  );

  // Buy LP tokens directly (not from rent — for manual LP purchase)
  const handleBuyLp = useCallback(
    async (amount: string, currency: string = 'USDC') => {
      setLoading(true);
      setError(null);
      try {
        const ethers = await getEthers();
        if (!ethers || !address) throw new Error('Wallet not connected');
        const currencyAddr = currency === 'STAY' ? CONTRACTS.STAY : CONTRACTS.USDC;
        const contract = await getContract(CONTRACTS.BUY_LP, BUY_LP_ABI, true);
        if (!contract) throw new Error('Could not connect to BuyLP');
        const wei = ethers.utils.parseUnits(amount, 18);
        const tx = await contract.buyLPToken(address, currencyAddr, wei, { value: 0 });
        const receipt = await tx.wait();
        // Get LP amount from event
        const iface = new ethers.utils.Interface(BUY_LP_FULL_ABI);
        let lpBought = '0';
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed.name === 'LPBought') {
              lpBought = ethers.utils.formatUnits(parsed.args.lpAmount, 18);
            }
          } catch { /* not our event */ }
        }
        setLoading(false);
        return { txHash: receipt.transactionHash, success: true, lpBought };
      } catch (err) {
        const msg = extractBlockchainError(err, 'Buy LP failed');
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
    walletConnected: connected || isConnected,

    // Read — existing
    getShareBalance,
    getRentDetails,
    isEligibleForRent,
    getBoostDetails,
    getRentHistory,
    getProposalDetails,
    getLpQuote,

    // Read — ported from legacy
    getPropertyDetails,
    getPrimarySale,
    getUserProperties,
    getBalances,
    getStayEstimation,
    getUSDCFromRouter,
    getStaticValues,
    getUserFarmDetails,

    // Write — existing
    buyShares,
    claimRent,
    castVote,
    boostApr,
    claimBoostRewards,
    buyStayTokens,
    buyLpTokens,

    // Write — ported from legacy
    checkForApproval,
    handleAddToFarm,
    handleClaimFarmRewards,
    handleWithdrawFromFarm,
    handleBuyLp,

    // Wallet
    connectWallet: connect,
  };
}
