import { useCallback, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
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
async function getWalletProvider() {
  const ethers = await getEthers();
  if (!ethers) return null;
  const w = (window as any).ethereum || (window as any).particle?.ethereum;
  if (!w) return null;
  return new ethers.providers.Web3Provider(w);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ensure wallet is connected before any write operation
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
    async (propertyId: number) => {
      setLoading(true);
      setError(null);
      try {
        await ensureConnected();
        const ethers = await getEthers();
        if (!ethers) throw new Error('Blockchain not available');

        // 1. Withdraw rent first
        const rentContract = await getContract(CONTRACTS.RENT, RENT_ABI, true);
        if (!rentContract) throw new Error('Could not connect to rent contract');
        const withdrawTx = await rentContract.withdrawRent(propertyId);
        await withdrawTx.wait();

        // 2. Check USDC balance and approve for BUY_LP
        const usdc = await getContract(CONTRACTS.USDC, ERC20_ABI, true);
        if (!usdc) throw new Error('Could not connect to USDC contract');
        const balance = await usdc.balanceOf(address);
        if (balance.isZero()) throw new Error('No USDC balance after rent withdrawal');
        const approveTx = await usdc.approve(CONTRACTS.BUY_LP, balance);
        await approveTx.wait();

        // 3. Buy STAY tokens
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
    async (propertyId: number) => {
      setLoading(true);
      setError(null);
      try {
        await ensureConnected();
        const ethers = await getEthers();
        if (!ethers) throw new Error('Blockchain not available');

        // 1. Withdraw rent first
        const rentContract = await getContract(CONTRACTS.RENT, RENT_ABI, true);
        if (!rentContract) throw new Error('Could not connect to rent contract');
        const withdrawTx = await rentContract.withdrawRent(propertyId);
        await withdrawTx.wait();

        // 2. Check USDC balance and approve for BUY_LP
        const usdc = await getContract(CONTRACTS.USDC, ERC20_ABI, true);
        if (!usdc) throw new Error('Could not connect to USDC contract');
        const balance = await usdc.balanceOf(address);
        if (balance.isZero()) throw new Error('No USDC balance after rent withdrawal');
        const approveTx = await usdc.approve(CONTRACTS.BUY_LP, balance);
        await approveTx.wait();

        // 3. Buy LP tokens
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
