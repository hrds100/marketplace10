import { useCallback, useState, useEffect, useRef } from 'react';
import { useEthereum } from '@particle-network/authkit';
import { useAccount, useConnect, useConnectors } from '@particle-network/connectkit';
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

// Signer and contract creation now happen INSIDE useBlockchain() because
// they need the particleProvider from useEthereum() hook (React context).

export function useBlockchain() {
  const { address, connected, connect } = useWallet();
  const { user } = useAuth();
  // ConnectKit hooks — exact same as legacy nfstayContext.jsx lines 64-66
  const { isConnected: ckConnected, connector } = useAccount();
  const { provider: particleProvider } = useEthereum();
  const connectors = useConnectors();
  const { connectAsync } = useConnect();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoConnectAttempted = useRef(false);

  // Auto-reconnect: if user is logged in (has address in DB) but ConnectKit
  // is disconnected (page refresh), reconnect via the auth connector.
  // This is what legacy does implicitly via ConnectKit's built-in persistence.
  useEffect(() => {
    if (ckConnected || autoConnectAttempted.current || !address) return;
    autoConnectAttempted.current = true;
    const authConnector = connectors.find((c: any) => c.id === 'particleAuth' || c.type === 'particleAuth');
    if (authConnector) {
      console.log('[useBlockchain] Auto-reconnecting via ConnectKit...');
      connectAsync({ connector: authConnector, chainId: 56 }).catch((e) => {
        console.log('[useBlockchain] Auto-reconnect failed (user may need to sign in again):', e);
      });
    }
  }, [ckConnected, address, connectors, connectAsync]);

  // Get signer — exact legacy pattern (nfstayContext.jsx lines 128-141):
  //   if connector is particleAuth + social → use particleProvider
  //   else → use window.ethereum
  const getSignerProvider = useCallback(async () => {
    const ethers = await getEthers();
    if (!ethers) return null;

    if (!particleProvider) {
      console.error('[getSignerProvider] No particleProvider from useEthereum()');
      return null;
    }

    try {
      // Ensure BSC chain
      const pp = particleProvider as any;
      if (pp.request) {
        try {
          const chainId = await pp.request({ method: 'eth_chainId' });
          if (chainId !== '0x38') {
            await pp.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] });
          }
        } catch { /* chain switch optional */ }
      }
      return new ethers.providers.Web3Provider(pp);
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

  const ensureConnected = useCallback(async () => {
    if (!connected || !address) {
      await connect();
    }
  }, [connected, address, connect]);

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
        // getBoostDetails returns: (sharesBoosted, startTime, endTime, rewardStartTime, reboostTimeLimit, pendingRewards)
        const details = await contract.getBoostDetails(address, propertyId);
        const boosted = await contract.isBoosted(address, propertyId);
        const rewards = await contract.getEstimatedRewards(address, propertyId);
        // Get global boost APR
        let boostAprVal = '0';
        try {
          const apr = await contract.getBoostApr();
          boostAprVal = apr.toString();
        } catch { /* optional */ }
        return {
          boostApr: boostAprVal,
          sharesBoosted: details.sharesBoosted.toString(),
          pendingRewards: details.pendingRewards.toString(),
          isBoosted: boosted,
          estimatedRewards: rewards.toString(),
        };
      } catch {
        return null;
      }
    },
    [address],
  );

  // ── WRITE FUNCTIONS ──

  // Buy shares — exact clone of legacy payment.js lines 188-244
  // Uses buyPrimaryShares(recipient, currency, propertyId, usdcAmount, minShares, agent)
  // NOT sendPrimaryShares (that's for SamCart webhook backend only)
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

        // 1. Get platform fee from contract (legacy: marketFees variable)
        // Use READ provider for fee query — no wallet popup needed
        const marketplaceRead = await getContract(CONTRACTS.RWA_MARKETPLACE, MARKETPLACE_ABI);
        let feePercent = 2.5; // default
        try {
          if (marketplaceRead) {
            const feeRaw = await marketplaceRead.getMarketplaceFee();
            feePercent = Number(feeRaw) / 10;
          }
        } catch { /* use default */ }
        console.log('[buyShares] Step 1 — fee:', feePercent, '%');

        // 2. Calculate fee-adjusted amount (legacy payment.js line 130-131)
        const costWithoutFee = amountUsdc;
        const amountWithFee = costWithoutFee + (costWithoutFee * feePercent / 100);
        const amountWithFeeWei = ethers.utils.parseUnits(amountWithFee.toFixed(6), 18);
        const costWithoutFeeWei = ethers.utils.parseUnits(costWithoutFee.toFixed(6), 18);
        console.log('[buyShares] Step 2 — cost:', costWithoutFee, '+ fee =', amountWithFee);

        // 3. Check USDC balance (legacy balanceChecker)
        const usdcRead = await getContract(CONTRACTS.USDC, ERC20_ABI);
        if (usdcRead) {
          const balance = await usdcRead.balanceOf(address);
          console.log('[buyShares] Step 3 — USDC balance:', ethers.utils.formatUnits(balance, 18));
          if (balance.lt(amountWithFeeWei)) {
            throw new Error(`Insufficient USDC. Need ${amountWithFee.toFixed(2)} (includes ${feePercent}% fee). You have ${parseFloat(ethers.utils.formatUnits(balance, 18)).toFixed(2)}.`);
          }
        }

        // 4. Approve USDC with fee-adjusted amount (legacy checkForApproval)
        console.log('[buyShares] Step 4 — approving USDC...');
        const usdc = await getContract(CONTRACTS.USDC, ERC20_ABI, true);
        if (!usdc) throw new Error('Could not connect to USDC contract');
        const currentAllowance = await usdc.allowance(address, CONTRACTS.RWA_MARKETPLACE);
        if (currentAllowance.lt(amountWithFeeWei)) {
          await usdc.callStatic.approve(CONTRACTS.RWA_MARKETPLACE, amountWithFeeWei);
          const approveTx = await usdc.approve(CONTRACTS.RWA_MARKETPLACE, amountWithFeeWei);
          await approveTx.wait();
          console.log('[buyShares] Step 4 — USDC approved');
        } else {
          console.log('[buyShares] Step 4 — allowance sufficient, skipping approval');
        }

        // 5. Get agent wallet (legacy: localStorage referral)
        const storedReferral = typeof window !== 'undefined'
          ? localStorage.getItem('referral') || agentWallet || ethers.constants.AddressZero
          : agentWallet || ethers.constants.AddressZero;

        // 6. callStatic dry-run (legacy payment.js line 216-224)
        console.log('[buyShares] Step 6 — dry-run buyPrimaryShares...');
        const marketplace = await getContract(CONTRACTS.RWA_MARKETPLACE, MARKETPLACE_ABI, true);
        if (!marketplace) throw new Error('Could not connect to marketplace');
        await marketplace.callStatic.buyPrimaryShares(
          address,              // recipient
          CONTRACTS.USDC,       // currency
          propertyId,           // propertyId
          costWithoutFeeWei,    // usdcAmount (base, no fee — contract adds fee)
          0,                    // minShares (no slippage protection)
          storedReferral,       // agent
          { value: "0" },       // legacy uses string "0", not number 0
        );

        // 7. Real transaction (legacy payment.js line 225-233)
        const tx = await marketplace.buyPrimaryShares(
          address,
          CONTRACTS.USDC,
          propertyId,
          costWithoutFeeWei,
          0,
          storedReferral,
          { value: 0 },
        );
        const receipt = await tx.wait();

        // F9: Write confirmed order to Supabase + attribute affiliate commission
        let agentUserId: string | null = null;
        try {
          // Look up referrer from buyer's profile
          const { data: buyerProfile } = await (supabase.from('profiles') as any)
            .select('referred_by').eq('id', (await supabase.auth.getUser()).data.user?.id).single();
          if (buyerProfile?.referred_by) {
            const { data: agentProfile } = await (supabase.from('aff_profiles') as any)
              .select('user_id').eq('referral_code', buyerProfile.referred_by.toUpperCase()).maybeSingle();
            agentUserId = agentProfile?.user_id || null;
          }
          const { data: orderRow } = await (supabase.from('inv_orders') as any).insert({
            property_id: propertyId,
            shares_requested: shares,
            amount_paid: amountUsdc,
            payment_method: 'crypto_usdc',
            status: 'completed',
            tx_hash: receipt.transactionHash,
            agent_id: agentUserId,
          }).select('id').single();

          // Create affiliate commission if referred
          if (agentUserId && orderRow?.id) {
            const { data: affRow } = await (supabase.from('aff_profiles') as any)
              .select('id').eq('user_id', agentUserId).maybeSingle();
            if (affRow?.id) {
              const { data: rateSetting } = await (supabase.from('aff_commission_settings') as any)
                .select('rate').eq('commission_type', 'investment_first').is('user_id', null).maybeSingle();
              const rate = rateSetting?.rate || 0.05;
              await (supabase.from('aff_commissions') as any).insert({
                affiliate_id: affRow.id,
                source: 'investment_first',
                source_id: orderRow.id,
                referred_user_id: (await supabase.auth.getUser()).data.user?.id,
                property_id: propertyId,
                gross_amount: amountUsdc,
                commission_rate: rate,
                commission_amount: amountUsdc * rate,
                claimable_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              }).then(() => {}).catch(() => {});
            }
          }
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
                agent_user_id: agentUserId,
              }),
            });
          }
        } catch (notifyErr) {
          console.error('[N4] n8n notify failed (purchase already confirmed):', notifyErr);
        }

        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err: any) {
        console.error('[buyShares] FAILED:', err);
        console.error('[buyShares] Error details:', err?.reason, err?.error?.message, err?.data);
        const msg = err instanceof Error ? err.message : 'Purchase failed';
        setError(msg);
        setLoading(false);
        throw err;
      }
    },
    [address, ensureConnected, getSignerProvider],
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
        // Dry-run first (same as legacy vote.js line 56)
        await contract.callStatic.vote(proposalId, inFavor);
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

  // Boost APR — exact clone of legacy boostedCheckout.js handleBoost()
  // Legacy: checkForApproval → balanceChecker → callStatic.boost → boost
  // Params: boost(connectedAddress, propertyId, currency, { value })
  const boostApr = useCallback(
    async (propertyId: number) => {
      setLoading(true);
      setError(null);
      try {
        await ensureConnected();
        const ethers = await getEthers();
        if (!ethers || !address) throw new Error('Wallet not connected');

        // 1. Get fresh boost cost (legacy line 53)
        const boosterRead = await getContract(CONTRACTS.BOOSTER, BOOSTER_ABI);
        if (!boosterRead) throw new Error('Could not read booster contract');
        const boostAmountRaw = await boosterRead.getBoostAmount(address, propertyId);
        const boostAmount = parseFloat(ethers.utils.formatUnits(boostAmountRaw, 18));
        console.log('[boostApr] Boost cost:', boostAmount, 'USDC');

        // 2. Approve USDC for Booster (legacy line 60-64)
        const usdc = await getContract(CONTRACTS.USDC, ERC20_ABI, true);
        if (!usdc) throw new Error('Could not connect to USDC');
        const boostAmountWei = ethers.utils.parseUnits(boostAmount.toString(), 18);
        const allowance = await usdc.allowance(address, CONTRACTS.BOOSTER);
        if (allowance.lt(boostAmountWei)) {
          await usdc.callStatic.approve(CONTRACTS.BOOSTER, boostAmountWei);
          const approveTx = await usdc.approve(CONTRACTS.BOOSTER, boostAmountWei);
          await approveTx.wait();
        }

        // 3. Balance check (legacy line 66)
        const usdcRead = await getContract(CONTRACTS.USDC, ERC20_ABI);
        if (usdcRead) {
          const balance = await usdcRead.balanceOf(address);
          if (balance.lt(boostAmountWei)) {
            throw new Error(`Insufficient USDC. Need ${boostAmount.toFixed(3)}, you have ${parseFloat(ethers.utils.formatUnits(balance, 18)).toFixed(3)}.`);
          }
        }

        // 4. callStatic dry-run (legacy line 77-82)
        const booster = await getContract(CONTRACTS.BOOSTER, BOOSTER_ABI, true);
        if (!booster) throw new Error('Could not connect to booster');
        await booster.callStatic.boost(
          address, propertyId, CONTRACTS.USDC, { value: "0" }
        );

        // 5. Real transaction (legacy line 83-88)
        const tx = await booster.boost(
          address, propertyId, CONTRACTS.USDC, { value: "0" }
        );
        const receipt = await tx.wait();

        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err: any) {
        console.error('[boostApr] Failed:', err);
        const msg = err instanceof Error ? err.message : 'Boost failed';
        setError(msg);
        setLoading(false);
        throw err;
      }
    },
    [address, ensureConnected, getSignerProvider],
  );

  // Claim boost rewards — legacy claimRewards with callStatic
  const claimBoostRewards = useCallback(
    async (propertyId: number) => {
      setLoading(true);
      setError(null);
      try {
        await ensureConnected();
        const contract = await getContract(CONTRACTS.BOOSTER, BOOSTER_ABI, true);
        if (!contract) throw new Error('Could not connect to booster contract');
        // callStatic dry-run
        await contract.callStatic.claimRewards(propertyId);
        const tx = await contract.claimRewards(propertyId);
        const receipt = await tx.wait();
        setLoading(false);
        return { txHash: receipt.transactionHash, success: true };
      } catch (err: any) {
        console.error('[claimBoostRewards] Failed:', err);
        const msg = err instanceof Error ? err.message : 'Claim failed';
        setError(msg);
        setLoading(false);
        throw err;
      }
    },
    [ensureConnected],
  );

  // STAY claim — exact clone of legacy claim.jsx (payout source, steps.length === 4)
  // Step 0: withdrawRent(propertyId) → get claimedUsdc amount from RentWithdrawn event
  // Step 1: checkForApproval("USDC", claimedUsdc, buyLp)
  // Step 2: callStatic.buyStay() dry-run → buyStay() → wait
  const buyStayTokens = useCallback(
    async (propertyId: number, onStep?: (step: number, total: number) => void) => {
      setLoading(true);
      setError(null);
      try {
        await ensureConnected();
        const ethers = await getEthers();
        if (!ethers) throw new Error('Blockchain not available');

        // Step 0: Withdraw rent — legacy nfstayContext.jsx line 967-984
        onStep?.(0, 3);
        const rentContract = await getContract(CONTRACTS.RENT, RENT_ABI, true);
        if (!rentContract) throw new Error('Could not connect to rent contract');
        await rentContract.callStatic.withdrawRent(propertyId);
        const _rent = await rentContract.withdrawRent(propertyId);
        const rentTx = await _rent.wait();
        // Get claimed USDC amount from RentWithdrawn event (legacy line 984)
        const rentEvents = await rentContract.queryFilter('RentWithdrawn', rentTx.blockNumber);
        const claimedUsdc = rentEvents[0]?.args?.[2]
          ? parseFloat(ethers.utils.formatUnits(rentEvents[0].args[2], 18))
          : 0;
        console.log('[buyStayTokens] Step 0 done — rent withdrawn:', claimedUsdc, 'USDC');
        if (claimedUsdc <= 0) throw new Error('No rent claimed');

        // Step 1: Approve USDC for BuyLP — legacy claim.jsx line 78-83
        onStep?.(1, 3);
        const usdcContract = await getContract(CONTRACTS.USDC, ERC20_ABI, true);
        if (!usdcContract) throw new Error('Could not connect to USDC contract');
        const allowance = await usdcContract.allowance(address, CONTRACTS.BUY_LP);
        const requiredWei = ethers.utils.parseUnits(claimedUsdc.toString(), 18);
        if (allowance.lt(requiredWei)) {
          await usdcContract.callStatic.approve(CONTRACTS.BUY_LP, requiredWei);
          const approveTx = await usdcContract.approve(CONTRACTS.BUY_LP, requiredWei);
          await approveTx.wait();
        }
        console.log('[buyStayTokens] Step 1 done — USDC approved');

        // Step 2: Buy STAY — legacy claim.jsx line 92-114
        onStep?.(2, 3);
        const buyLpContract = await getContract(CONTRACTS.BUY_LP, BUY_LP_ABI, true);
        if (!buyLpContract) throw new Error('Could not connect to BuyLP contract');
        // callStatic dry-run first (legacy line 94-101)
        await buyLpContract.callStatic.buyStay(
          address, CONTRACTS.USDC, requiredWei, { value: 0 }
        );
        // Actual transaction (legacy line 103-111)
        const _swap = await buyLpContract.buyStay(
          address, CONTRACTS.USDC, requiredWei, { value: 0 }
        );
        await _swap.wait();
        console.log('[buyStayTokens] Step 2 done — STAY purchased');

        setLoading(false);
        return { txHash: _swap.hash, success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'STAY claim failed';
        console.error('[buyStayTokens] Failed:', err);
        setError(msg);
        setLoading(false);
        throw err;
      }
    },
    [address, ensureConnected],
  );

  // LP claim — exact clone of legacy claim.jsx (payout source, steps.length === 5)
  // Step 0: withdrawRent(propertyId) → get claimedUsdc from event
  // Step 1: checkForApproval("USDC", claimedUsdc, buyLp)
  // Step 2: handleBuyLp(address, claimedUsdc) → get lpBought from LPBought event
  // Step 3: checkForApproval("PAIR", lpBought, farm)
  // Step 4: handleAddToFarm(address, lpBought)
  const buyLpTokens = useCallback(
    async (propertyId: number, onStep?: (step: number, total: number) => void) => {
      setLoading(true);
      setError(null);
      try {
        await ensureConnected();
        const ethers = await getEthers();
        if (!ethers) throw new Error('Blockchain not available');

        // Step 0: Withdraw rent — legacy line 967-984
        onStep?.(0, 5);
        const rentContract = await getContract(CONTRACTS.RENT, RENT_ABI, true);
        if (!rentContract) throw new Error('Could not connect to rent contract');
        await rentContract.callStatic.withdrawRent(propertyId);
        const _rent = await rentContract.withdrawRent(propertyId);
        const rentTx = await _rent.wait();
        const rentEvents = await rentContract.queryFilter('RentWithdrawn', rentTx.blockNumber);
        const claimedUsdc = rentEvents[0]?.args?.[2]
          ? parseFloat(ethers.utils.formatUnits(rentEvents[0].args[2], 18))
          : 0;
        if (claimedUsdc <= 0) throw new Error('No rent claimed');

        // Step 1: Approve USDC for BuyLP — legacy claim.jsx line 78-83
        onStep?.(1, 5);
        const usdcContract = await getContract(CONTRACTS.USDC, ERC20_ABI, true);
        if (!usdcContract) throw new Error('Could not connect to USDC');
        const allowance = await usdcContract.allowance(address, CONTRACTS.BUY_LP);
        const requiredWei = ethers.utils.parseUnits(claimedUsdc.toString(), 18);
        if (allowance.lt(requiredWei)) {
          await usdcContract.callStatic.approve(CONTRACTS.BUY_LP, requiredWei);
          const approveTx = await usdcContract.approve(CONTRACTS.BUY_LP, requiredWei);
          await approveTx.wait();
        }

        // Step 2: Buy LP — legacy nfstayContext.jsx line 898-934
        onStep?.(2, 5);
        const buyLpContract = await getContract(CONTRACTS.BUY_LP, BUY_LP_ABI, true);
        if (!buyLpContract) throw new Error('Could not connect to BuyLP');
        await buyLpContract.callStatic.buyLPToken(address, CONTRACTS.USDC, requiredWei, { value: 0 });
        const _buy = await buyLpContract.buyLPToken(address, CONTRACTS.USDC, requiredWei, { value: 0 });
        const buyTx = await _buy.wait();
        const lpEvents = await buyLpContract.queryFilter('LPBought', buyTx.blockNumber);
        const lpBought = lpEvents[0]?.args?.[1]
          ? parseFloat(ethers.utils.formatUnits(lpEvents[0].args[1], 18))
          : 0;
        if (lpBought <= 0) throw new Error('LP creation failed');

        // Step 3: Approve LP for Farm — legacy claim.jsx line 116
        onStep?.(3, 5);
        const pairContract = await getContract(CONTRACTS.STAY_USDC_PAIR, ERC20_ABI, true);
        if (!pairContract) throw new Error('Could not connect to LP pair');
        const farmAllowance = await pairContract.allowance(address, CONTRACTS.FARM);
        const lpWei = ethers.utils.parseUnits(lpBought.toString(), 18);
        if (farmAllowance.lt(lpWei)) {
          await pairContract.callStatic.approve(CONTRACTS.FARM, lpWei);
          const approveLpTx = await pairContract.approve(CONTRACTS.FARM, lpWei);
          await approveLpTx.wait();
        }

        // Step 4: Stake in Farm — legacy nfstayContext.jsx line 884-886
        onStep?.(4, 5);
        const farmContract = await getContract(CONTRACTS.FARM, FARM_ABI, true);
        if (!farmContract) throw new Error('Could not connect to farm');
        await farmContract.callStatic.stakeLPs(lpWei);
        const _stake = await farmContract.stakeLPs(lpWei);
        await _stake.wait();

        setLoading(false);
        return { txHash: _stake.hash, success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'LP claim failed';
        console.error('[buyLpTokens] Failed:', err);
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
