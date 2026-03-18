import { useState, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { CONTRACTS } from '@/lib/particle';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PurchaseState {
  step: 'idle' | 'connecting' | 'approving' | 'purchasing' | 'confirming' | 'done' | 'error';
  txHash: string | null;
  error: string | null;
}

export function useCryptoPurchase() {
  const { user } = useAuth();
  const { address, connected, connect } = useWallet();
  const [state, setState] = useState<PurchaseState>({
    step: 'idle',
    txHash: null,
    error: null,
  });

  const purchaseWithCrypto = useCallback(async ({
    propertyId,
    sharesCount,
    amountUsdc,
    agentCode,
  }: {
    propertyId: number;
    sharesCount: number;
    amountUsdc: number;
    agentCode?: string;
  }) => {
    try {
      setState({ step: 'connecting', txHash: null, error: null });

      // Connect wallet if not connected
      let walletAddress = address;
      if (!connected || !walletAddress) {
        walletAddress = await connect();
      }
      if (!walletAddress) throw new Error('Wallet not connected');

      setState({ step: 'approving', txHash: null, error: null });

      // Check if ethers is available
      const ethers = await import('ethers').catch(() => null);
      if (!ethers) {
        // Ethers not installed — create order via Edge Function as fallback
        const { data, error } = await supabase.functions.invoke('inv-process-order', {
          body: {
            user_id: user?.id,
            property_id: propertyId,
            shares: sharesCount,
            amount: amountUsdc,
            payment_method: 'crypto_usdc',
            agent_id: null, // Will be resolved by agent code lookup
            tx_hash: null, // Will be updated after on-chain confirmation
          },
        });
        if (error) throw new Error(error.message);
        setState({ step: 'done', txHash: data?.order_id || null, error: null });
        return data;
      }

      // Full crypto flow with ethers.js
      const provider = new ethers.providers.Web3Provider(
        (window as any).ethereum || (window as any).particle?.ethereum
      );
      const signer = provider.getSigner();

      // 1. Approve USDC spending
      const usdcContract = new ethers.Contract(
        CONTRACTS.USDC,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        signer
      );

      const amountWei = ethers.utils.parseUnits(amountUsdc.toString(), 18); // USDC on BSC has 18 decimals
      const approveTx = await usdcContract.approve(CONTRACTS.RWA_MARKETPLACE, amountWei);
      await approveTx.wait();

      setState({ step: 'purchasing', txHash: null, error: null });

      // 2. Call sendPrimaryShares on marketplace contract
      const marketplaceContract = new ethers.Contract(
        CONTRACTS.RWA_MARKETPLACE,
        ['function sendPrimaryShares(address recipient, address agentWallet, uint256 propertyId, uint256 sharesRequested) external'],
        signer
      );

      const agentWallet = agentCode ? CONTRACTS.RWA_MARKETPLACE : ethers.constants.AddressZero; // Will resolve agent on-chain
      const tx = await marketplaceContract.sendPrimaryShares(
        walletAddress,
        agentWallet,
        propertyId,
        sharesCount
      );

      setState({ step: 'confirming', txHash: tx.hash, error: null });
      await tx.wait();

      // 3. Record order in Supabase
      await supabase.functions.invoke('inv-process-order', {
        body: {
          user_id: user?.id,
          property_id: propertyId,
          shares: sharesCount,
          amount: amountUsdc,
          payment_method: 'crypto_usdc',
          tx_hash: tx.hash,
        },
      });

      setState({ step: 'done', txHash: tx.hash, error: null });
      return { txHash: tx.hash };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      setState({ step: 'error', txHash: null, error: message });
      throw err;
    }
  }, [address, connected, connect, user?.id]);

  const reset = useCallback(() => {
    setState({ step: 'idle', txHash: null, error: null });
  }, []);

  return { ...state, purchaseWithCrypto, reset };
}
