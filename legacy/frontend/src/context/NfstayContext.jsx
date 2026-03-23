"use client";
import {
  useAccount,
  useModal,
  useSwitchChain,
} from "@particle-network/connectkit";
import { useEthereum } from "@particle-network/authkit";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  Suspense,
} from "react";
import { isValidChain, supportedChains } from "./ParticleConnectkit";
import {
  ADMIN_WALLET,
  BACKEND_BASEURL,
  CONTRACT_CONFIG,
  firebaseConfig,
} from "@/config";
import {
  getLatestAuthType,
  isSocialAuthType,
} from "@particle-network/auth-core";
import { ethers } from "ethers";
import {
  boosterABI,
  buylpABI,
  erc20ABI,
  farmABI,
  pairABI,
  rentABI,
  rockABI,
  routerABI,
  rwaABI,
  rwaMarketplaceABI,
  votingABI,
} from "@/utils/abis";
import axios from "axios";
import {
  getErrorMessage,
  getEthFrom,
  getWeiFrom,
  NotifyError,
  NotifySuccess,
  prepareFeeDistributions,
} from "./helper";
import HandleReferral from "./HandleReferral";
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import {
  fetchPrimarySharesBoughtEvents,
  fetchSecondarySharesBoughtEvents,
} from "./subgraphHelper";

// Create the context
const nfstayContext = createContext(undefined);

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

export const nfstayContextProvider = ({ children }) => {
  const { address, status, chainId, isConnected, connector } = useAccount();
  const { setOpen } = useModal();
  const { provider: particleProvider } = useEthereum();
  const { switchChainAsync } = useSwitchChain();
  const [connectedAddress, setConnectedAddress] = useState(undefined);
  const [isAdminWallet, setIsAdminWallet] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [activityData, setActivityData] = useState([]);
  const [isBuyLpApprovalLoading, setIsBuyLpApprovalLoading] = useState(false);
  const [isFarmApprovalLoading, setIsFarmApprovalLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [globalLoader, setGlobalLoader] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [isIOS, setIsIOS] = useState(false);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [isBalanceLoading, setBalanceLoading] = useState(false);
  const [loginModelOpen, setLoginModelOpen] = useState(false);
  const [userDetails, setUserDetails] = useState({
    staked: 0,
    pendingRewards: 0,
  });
  const [percentChange, setPercentChange] = useState({
    price_change_24h: 0,
    price_change_percentage_24h: 0,
    lineColor: "#A0A3AA",
  });
  const [assetPrices, setAssetPrices] = useState({
    usdcReserve: 0,
    stayReserve: 0,
    lpPrice: 0,
    stayPrice: 0,
    lpSupply: 0,
    farmApr: 0,
    stayBalance: 0,
    boostApr: 0,
  });

  const [assetBalance, setAssetBalance] = useState({
    stayBalance: 0,
    usdcBalance: 0,
    lpBalance: 0,
  });

  const [userProfileDetails, setUserProfileDetails] = useState({
    username: "",
    email: "",
    walletAddress: "",
    twitter: "",
    profilePhoto: "",
  });

  const handleNetwork = async () => {
    try {
      if (isWrongNetwork) {
        await switchChainAsync({ chainId: supportedChains[0].id });
      }
    } catch (err) {
      throw new Error("Please switch to supported network");
    }
  };

  const getMarketplaceContract = (signer = false) => {
    const provider = new ethers.providers.JsonRpcProvider(CONTRACT_CONFIG.rpc);
    let contract;
    if (signer) {
      let ethersProvider;
      if (
        connector &&
        connector.walletConnectorType === "particleAuth" &&
        isSocialAuthType(getLatestAuthType())
      ) {
        ethersProvider = new ethers.providers.Web3Provider(particleProvider);
      } else {
        ethersProvider = new ethers.providers.Web3Provider(
          typeof window !== "undefined" ? window.ethereum : undefined
        );
      }
      const signer = ethersProvider.getSigner();
      contract = new ethers.Contract(
        CONTRACT_CONFIG.rwaMarketplace,
        rwaMarketplaceABI,
        signer
      );
      return contract;
    }
    contract = new ethers.Contract(
      CONTRACT_CONFIG.rwaMarketplace,
      rwaMarketplaceABI,
      provider
    );
    return contract;
  };

  const getRwaContract = (signer = false) => {
    const provider = new ethers.providers.JsonRpcProvider(CONTRACT_CONFIG.rpc);
    let contract;
    if (signer) {
      let ethersProvider;
      if (
        connector &&
        connector.walletConnectorType === "particleAuth" &&
        isSocialAuthType(getLatestAuthType())
      ) {
        ethersProvider = new ethers.providers.Web3Provider(particleProvider);
      } else {
        ethersProvider = new ethers.providers.Web3Provider(
          typeof window !== "undefined" ? window.ethereum : undefined
        );
      }
      const signer = ethersProvider.getSigner();
      contract = new ethers.Contract(CONTRACT_CONFIG.rwa, rwaABI, signer);
      return contract;
    }
    contract = new ethers.Contract(CONTRACT_CONFIG.rwa, rwaABI, provider);
    return contract;
  };

  const getBoosterContract = (signer = false) => {
    const provider = new ethers.providers.JsonRpcProvider(CONTRACT_CONFIG.rpc);
    let contract;
    if (signer) {
      let ethersProvider;
      if (
        connector &&
        connector.walletConnectorType === "particleAuth" &&
        isSocialAuthType(getLatestAuthType())
      ) {
        ethersProvider = new ethers.providers.Web3Provider(particleProvider);
      } else {
        ethersProvider = new ethers.providers.Web3Provider(
          typeof window !== "undefined" ? window.ethereum : undefined
        );
      }
      const signer = ethersProvider.getSigner();
      contract = new ethers.Contract(
        CONTRACT_CONFIG.booster,
        boosterABI,
        signer
      );
      return contract;
    }
    contract = new ethers.Contract(
      CONTRACT_CONFIG.booster,
      boosterABI,
      provider
    );
    return contract;
  };

  const getRentContract = (signer = false) => {
    const provider = new ethers.providers.JsonRpcProvider(CONTRACT_CONFIG.rpc);
    let contract;
    if (signer) {
      let ethersProvider;
      if (
        connector &&
        connector.walletConnectorType === "particleAuth" &&
        isSocialAuthType(getLatestAuthType())
      ) {
        ethersProvider = new ethers.providers.Web3Provider(particleProvider);
      } else {
        ethersProvider = new ethers.providers.Web3Provider(
          typeof window !== "undefined" ? window.ethereum : undefined
        );
      }

      const signer = ethersProvider.getSigner();
      contract = new ethers.Contract(CONTRACT_CONFIG.rent, rentABI, signer);
      return contract;
    }
    contract = new ethers.Contract(CONTRACT_CONFIG.rent, rentABI, provider);
    return contract;
  };

  const getERC20Contract = (currenyAddress, signer = false) => {
    const provider = new ethers.providers.JsonRpcProvider(CONTRACT_CONFIG.rpc);
    let contract;
    if (signer) {
      let ethersProvider;
      if (
        connector &&
        connector.walletConnectorType === "particleAuth" &&
        isSocialAuthType(getLatestAuthType())
      ) {
        ethersProvider = new ethers.providers.Web3Provider(particleProvider);
      } else {
        ethersProvider = new ethers.providers.Web3Provider(
          typeof window !== "undefined" ? window.ethereum : undefined
        );
      }
      const signer = ethersProvider.getSigner();
      contract = new ethers.Contract(currenyAddress, erc20ABI, signer);
      return contract;
    }
    contract = new ethers.Contract(currenyAddress, erc20ABI, provider);
    return contract;
  };

  const getbuyLpContract = (signer = false) => {
    const provider = new ethers.providers.JsonRpcProvider(CONTRACT_CONFIG.rpc);
    let contract;
    if (signer) {
      let ethersProvider;
      if (
        connector &&
        connector.walletConnectorType === "particleAuth" &&
        isSocialAuthType(getLatestAuthType())
      ) {
        ethersProvider = new ethers.providers.Web3Provider(particleProvider);
      } else {
        ethersProvider = new ethers.providers.Web3Provider(
          typeof window !== "undefined" ? window.ethereum : undefined
        );
      }
      const signer = ethersProvider.getSigner();
      contract = new ethers.Contract(CONTRACT_CONFIG.buyLp, buylpABI, signer);
      return contract;
    }
    contract = new ethers.Contract(CONTRACT_CONFIG.buyLp, buylpABI, provider);
    return contract;
  };

  const getVotingContract = (signer = false) => {
    const provider = new ethers.providers.JsonRpcProvider(CONTRACT_CONFIG.rpc);
    let contract;
    if (signer) {
      let ethersProvider;
      if (
        connector &&
        connector.walletConnectorType === "particleAuth" &&
        isSocialAuthType(getLatestAuthType())
      ) {
        ethersProvider = new ethers.providers.Web3Provider(particleProvider);
      } else {
        ethersProvider = new ethers.providers.Web3Provider(
          typeof window !== "undefined" ? window.ethereum : undefined
        );
      }
      const signer = ethersProvider.getSigner();
      contract = new ethers.Contract(CONTRACT_CONFIG.voting, votingABI, signer);
      return contract;
    }
    contract = new ethers.Contract(CONTRACT_CONFIG.voting, votingABI, provider);
    return contract;
  };

  const getPairContract = (pairAddress, signer = false) => {
    const provider = new ethers.providers.JsonRpcProvider(CONTRACT_CONFIG.rpc);
    let contract;
    if (signer) {
      let ethersProvider;
      if (
        connector &&
        connector.walletConnectorType === "particleAuth" &&
        isSocialAuthType(getLatestAuthType())
      ) {
        ethersProvider = new ethers.providers.Web3Provider(particleProvider);
      } else {
        ethersProvider = new ethers.providers.Web3Provider(
          typeof window !== "undefined" ? window.ethereum : undefined
        );
      }
      const signer = ethersProvider.getSigner();
      contract = new ethers.Contract(pairAddress, pairABI, signer);
      return contract;
    }
    contract = new ethers.Contract(pairAddress, pairABI, provider);
    return contract;
  };

  const getRocksContract = (signer = false) => {
    const provider = new ethers.providers.JsonRpcProvider(CONTRACT_CONFIG.rpc);
    let contract;
    if (signer) {
      let ethersProvider;
      if (
        connector &&
        connector.walletConnectorType === "particleAuth" &&
        isSocialAuthType(getLatestAuthType())
      ) {
        ethersProvider = new ethers.providers.Web3Provider(particleProvider);
      } else {
        ethersProvider = new ethers.providers.Web3Provider(
          typeof window !== "undefined" ? window.ethereum : undefined
        );
      }
      const signer = ethersProvider.getSigner();
      contract = new ethers.Contract(CONTRACT_CONFIG.ROCK, rockABI, signer);
      return contract;
    }
    contract = new ethers.Contract(CONTRACT_CONFIG.ROCK, rockABI, provider);
    return contract;
  };

  const getRouterContract = (signer = false) => {
    const provider = new ethers.providers.JsonRpcProvider(CONTRACT_CONFIG.rpc);
    let contract;
    if (signer) {
      let ethersProvider;
      if (
        connector &&
        connector.walletConnectorType === "particleAuth" &&
        isSocialAuthType(getLatestAuthType())
      ) {
        ethersProvider = new ethers.providers.Web3Provider(particleProvider);
      } else {
        ethersProvider = new ethers.providers.Web3Provider(
          typeof window !== "undefined" ? window.ethereum : undefined
        );
      }
      const signer = ethersProvider.getSigner();
      contract = new ethers.Contract(CONTRACT_CONFIG.ROUTER, routerABI, signer);
      return contract;
    }
    contract = new ethers.Contract(CONTRACT_CONFIG.ROUTER, routerABI, provider);
    return contract;
  };

  const getFarmContract = (signer = false) => {
    const provider = new ethers.providers.JsonRpcProvider(CONTRACT_CONFIG.rpc);
    let contract;
    if (signer) {
      let ethersProvider;
      if (
        connector &&
        connector.walletConnectorType === "particleAuth" &&
        isSocialAuthType(getLatestAuthType())
      ) {
        ethersProvider = new ethers.providers.Web3Provider(particleProvider);
      } else {
        ethersProvider = new ethers.providers.Web3Provider(
          typeof window !== "undefined" ? window.ethereum : undefined
        );
      }
      const signer = ethersProvider.getSigner();
      contract = new ethers.Contract(CONTRACT_CONFIG.farm, farmABI, signer);
      return contract;
    }
    contract = new ethers.Contract(CONTRACT_CONFIG.farm, farmABI, provider);
    return contract;
  };

  const getPropertyDetails = async (propertyId) => {
    const contract = getRwaContract();

    try {
      // Fetch property details from the contract
      const details = await contract.getProperty(propertyId);
      const updatedPropertyDetails = {
        id: propertyId,
        pricePerShare: getEthFrom(details?.pricePerShare?.toString()), // Convert BigNumber to string
        totalOwners: details?.totalOwners?.toNumber(), // Convert BigNumber to number
        apr: ((details?.aprBips?.toNumber() / 10000) * 100).toFixed(2), // Convert BigNumber to number
        totalShares: details?.totalShares?.toNumber(), // Convert BigNumber to number
        metadata: {
          description: "",
          image: "",
          images: [],
          name: "",
          attributes: [],
          amount: "",
          category: "",
        },
        transactionBreakdown: [], // Separate transaction breakdown array
        rentalBreakdown: [], // Separate rental breakdown array
        propertyLocation: {
          longitude: null,
          latitude: null,
          location: "",
        },
        beds: null, // Initialize beds with a default value of null
        sqft: null,
        propertyType: "none", // Initialize propertyType with default value
      };

      // Fetch metadata if URI is available
      if (details.uri) {
        const response = await axios.get(details.uri);
        const {
          description,
          image,
          images,
          name,
          attributes,
          category = "Buy 2 Let",
          transaction_breakdown: transactionBreakdown,
          rental_breakdown: rentalBreakdown,
        } = response.data;

        // Function to replace the image URL if it doesn't start with ipfs.io
        const replaceWithIpfs = (url) => {
          if (!url.startsWith("https://ipfs.io/")) {
            return `https://ipfs.io/ipfs/${url.split("ipfs/")[1]}`;
          }
          return url;
        };

        updatedPropertyDetails.metadata = {
          description,
          image: replaceWithIpfs(image),
          images: images.map(replaceWithIpfs),
          name,
          attributes,
          category,
          amount: transactionBreakdown[0].amount,
        };

        // Assign transaction and rental breakdown as separate arrays
        updatedPropertyDetails.transactionBreakdown =
          transactionBreakdown || [];
        updatedPropertyDetails.rentalBreakdown = rentalBreakdown || [];

        // Extract property location and other attributes
        const _propertyLocation = {
          longitude:
            attributes.find((attr) => attr.trait_type === "longitude")?.value ||
            null,
          latitude:
            attributes.find((attr) => attr.trait_type === "latitude")?.value ||
            null,
          location: `${
            attributes.find((attr) => attr.trait_type === "City")?.value ||
            "Unknown City"
          }, ${
            attributes.find((attr) => attr.trait_type === "Country")?.value ||
            "Unknown Country"
          }`,
        };

        attributes.forEach((attribute) => {
          if (attribute.trait_type === "Beds") {
            updatedPropertyDetails.beds = attribute.value;
          }
          if (attribute.trait_type === "sqf") {
            updatedPropertyDetails.sqft = attribute.value;
          }
          // Add check for "propertyType" trait and set it
          if (attribute.trait_type === "PropertyType") {
            updatedPropertyDetails.propertyType = attribute.value;
          }
        });

        updatedPropertyDetails.propertyLocation = _propertyLocation;
      }
      return updatedPropertyDetails;
    } catch (error) {
      throw new Error(error.message || error.reason || "Something went wrong");
    }
  };

  const getSecondaryListingDetails = async (listingId) => {
    const contract = getMarketplaceContract();

    try {
      // Fetch secondary property details from the contract
      const details = await contract.getSecondaryListing(listingId);

      // Populate the updated property details object
      const propertyDetails = {
        propertyId: details.propertyId,
        seller: details.seller,
        pricePerShare: getEthFrom(details.pricePerShare.toString()), // Convert BigNumber to ETH
        sharesRemaining: details.sharesRemaining.toNumber(), // Convert BigNumber to number
        endTime: details.endTime.toNumber(), // Convert timestamp to ISO date
      };

      return propertyDetails;
    } catch (error) {
      throw new Error(error.message || error.reason || "Something went wrong");
    }
  };

  const getPrimaryPropertyRemainingShares = async (_propertyId) => {
    try {
      // Fetch PrimarySale details for the given propertyId
      const contract = getMarketplaceContract();

      const primarySale = await contract.getPrimarySale(_propertyId);

      // Parse the returned data (PrimaryListing struct)
      const { sharesRemaining, totalShares } = primarySale;

      return {
        remainingShares: Number(sharesRemaining),
        totalSharesInMarket: Number(totalShares),
      };
    } catch (error) {
      console.error("Error fetching primary sale details:", error);
      return null;
    }
  };

  const getMarketplaceFee = async () => {
    try {
      const contract = getMarketplaceContract();
      let fee = await contract.getPlaformFee();

      return fee;
    } catch (error) {
      console.error("Error Marketplace fee:", error);
      return null;
    }
  };

  const getValueFromRouter = async (curreny, amount) => {
    try {
      const contract = getRouterContract();

      const path = [curreny, CONTRACT_CONFIG.USDC];

      const val = await contract.getAmountsIn(
        getWeiFrom(amount.toString()),
        path
      );
      return val[0];
    } catch (error) {
      console.error("Error Value from Router:", error);
      return null;
    }
  };

  const getBoostAmount = async (address, propertyId) => {
    const contract = getBoosterContract();

    const _boostAmount = await contract.getBoostAmount(address, propertyId);

    return getEthFrom(_boostAmount);
  };

  const getUSDCFromRouter = async (amount) => {
    try {
      const contract = getRouterContract();

      const path = [CONTRACT_CONFIG.STAY, CONTRACT_CONFIG.USDC];

      const val = await contract.getAmountsOut(
        getWeiFrom(amount.toString()),
        path
      );

      return val[0];
    } catch (error) {
      console.error("Error Value from Router:", error);
      return null;
    }
  };

  const checkForApproval = async (
    currency = "ROCK",
    amount = 0,
    spender = ""
  ) => {
    try {
      let contract;
      let res = false;
      if (currency === "ROCK" || currency === "RWA") {
        let contract =
          currency == "ROCK" ? getRocksContract(true) : getRwaContract(true);

        const _nftAllowance = await contract.isApprovedForAll(
          connectedAddress,
          CONTRACT_CONFIG.rwaMarketplace
        );

        if (!_nftAllowance) {
          await contract.callStatic.setApprovalForAll(
            CONTRACT_CONFIG.rwaMarketplace,
            true
          );
          const tx = await contract.setApprovalForAll(
            CONTRACT_CONFIG.rwaMarketplace,
            true
          );
          await tx.wait();
        }
        res = true;
      } else {
        const _currency =
          currency === "USDC"
            ? CONTRACT_CONFIG.USDC
            : currency === "PAIR"
            ? CONTRACT_CONFIG.stayUsdcPair
            : CONTRACT_CONFIG.STAY;

        contract =
          _currency == CONTRACT_CONFIG.stayUsdcPair
            ? getPairContract(_currency)
            : getERC20Contract(_currency);

        const _allowance = await contract.allowance(connectedAddress, spender);
        if (Number(getEthFrom(_allowance)) < amount) {
          contract = getERC20Contract(_currency, true);

          await contract.callStatic.approve(
            spender,
            getWeiFrom(amount.toString())
          );

          const _approval = await contract.approve(
            spender,
            getWeiFrom(amount.toString())
          );
          await _approval.wait();
        }
        res = true;
      }
      return res;
    } catch (err) {
      throw new Error(err);
    }
  };

  const getPrimaryQuote = async (usdc, sharePrice) => {
    const contract = getMarketplaceContract();
    const _quote = await contract.getPrimarySaleQuote(
      getWeiFrom(usdc.toString()),
      getWeiFrom(sharePrice.toString())
    );

    return {
      sharesToBuy: Number(_quote._sharesToBuy),
      usdcQuotation: getEthFrom(_quote._usdcQuotation),
      marketFee: getEthFrom(_quote._marketFees),
    };
  };

  const getUserProperties = async (address) => {
    try {
      const properties = [];
      const contract = getRwaContract();
      const totalProperties = await contract.totalProperties();
      for (let i = 1; i <= totalProperties; i++) {
        const userBalance = await contract.balanceOf(address, i);
        if (Number(userBalance) > 0) {
          const propertyDetails = await getPropertyDetails(i);
          properties.push({
            ...propertyDetails,
            userBalance: Number(userBalance), // Add userBalance to the object
          });
        }
      }
      return properties;
    } catch (err) {
      console.log(err);
      return [];
    }
  };

  const getLeaderBoardInfo = async (address) => {
    try {
      let propertyCount = 0;
      let sharesOwned = 0;
      const contract = getRwaContract();
      const totalProperties = await contract.totalProperties();
      for (let i = 1; i <= totalProperties; i++) {
        const userBalance = await contract.balanceOf(address, i);
        if (Number(userBalance) > 0) {
          propertyCount += 1;
          sharesOwned += Number(userBalance);
        }
      }
      return { propertyCount, sharesOwned };
    } catch (err) {
      console.log(err);
      return [];
    }
  };

  async function signMessage() {
    // Fetch the UTC time (in seconds) from the server
    const { data } = await axios.get(`${BACKEND_BASEURL}/admin/utc-time`);
    const utcTime = data.utcTime; // Server-provided UTC time in seconds

    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("Ethereum provider not available");
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    // Include the UTC timestamp in the message
    const message = `I am the admin|Timestamp: ${utcTime}`;
    const signature = await signer.signMessage(message);

    return { message, signature };
  }

  const getStayEstimation = async (_currency, _inputAmount) => {
    const contract = getbuyLpContract();
    let currency =
      _currency === "USDC" ? CONTRACT_CONFIG.USDC : CONTRACT_CONFIG.zeroAddress;

    const _estimation = await contract.getStayEstimation(
      currency,
      getWeiFrom(_inputAmount)
    );

    return parseFloat(getEthFrom(_estimation)).toFixed(2);
  };

  const getLpEstimation = async (_inputAmount) => {
    const contract = getbuyLpContract();

    const _estimation = await contract.getLpEstimation(
      getWeiFrom(_inputAmount)
    );

    return parseFloat(getEthFrom(_estimation)).toFixed(2);
  };

  const getUserDetails = async () => {
    try {
      const contract = getFarmContract();
      const share = await contract.earned(connectedAddress);
      const userInfo = await contract.userInfo(connectedAddress);

      const pendingRewards =
        Number(getEthFrom(userInfo.pendingRewards)) + Number(getEthFrom(share));
      setUserDetails({
        staked: getEthFrom(userInfo.amount),
        pendingRewards: pendingRewards,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const getStaticValues = async () => {
    try {
      setGlobalLoader(true);

      let contract = getbuyLpContract();
      let _lpPrice = await contract.getLpPrice();
      _lpPrice = getEthFrom(_lpPrice);

      let _stayPrice = await getRouterContract().getAmountsOut(
        getWeiFrom("1"),
        [CONTRACT_CONFIG.STAY, CONTRACT_CONFIG.USDC]
      );

      contract = getPairContract(CONTRACT_CONFIG.stayUsdcPair);
      let _lpSupply = await contract.totalSupply();
      let _reserves = await contract.getReserves();
      let _stayReserves = getEthFrom(_reserves[0]); // MAINNETBNB  
      let _usdcReserves = getEthFrom(_reserves[1]); // MAINNETBNB  
      // let _stayReserves = getEthFrom(_reserves[1]); // TESTNETSEPOLIA
      // let _usdcReserves = getEthFrom(_reserves[0]); // TESTNETSEPOLIA 

      contract = getFarmContract();
      let _perSec = await contract.getStayPerSecond();

      contract = getBoosterContract();
      let _boostApr = await contract.getBoostApr();

      contract = getERC20Contract(CONTRACT_CONFIG.STAY);

      let _staySupply = await contract.totalSupply();

      _staySupply = getEthFrom(_staySupply);

      _perSec = getEthFrom(_perSec);
      _stayPrice = getEthFrom(_stayPrice[1]);
      _lpSupply = getEthFrom(_lpSupply);
      _boostApr = Number(_boostApr) / 10;

      let _apr =
        ((_perSec * 31536000 * _stayPrice) / (_lpPrice * _lpSupply)) * 100;
      setAssetPrices({
        usdcReserve: _usdcReserves,
        stayReserve: _stayReserves,
        lpPrice: _lpPrice,
        stayPrice: _stayPrice,
        staySupply: _staySupply,
        lpSupply: _lpSupply,
        farmApr: _apr,
        boostApr: _boostApr,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalLoader(false);
    }
  };

  const getBalances = async (address) => {
    try {
      setBalanceLoading(true);
      let contract = getPairContract(CONTRACT_CONFIG.stayUsdcPair);
      let _lpBalance = await contract.balanceOf(address);
      _lpBalance = getEthFrom(_lpBalance);

      contract = getERC20Contract(CONTRACT_CONFIG.STAY);
      let _stayBalance = await contract.balanceOf(address);
      _stayBalance = getEthFrom(_stayBalance);

      contract = getERC20Contract(CONTRACT_CONFIG.USDC);
      let _usdcBalance = await contract.balanceOf(address);
      _usdcBalance = getEthFrom(_usdcBalance);

      setAssetBalance({
        stayBalance: _stayBalance,
        usdcBalance: _usdcBalance,
        lpBalance: _lpBalance,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleAddToFarm = async (address, _balance) => {
    try {
      if (!connectedAddress) return NotifyError("Please connect your wallet");
      setIsFarmApprovalLoading(true);
      await handleNetwork();
      await checkForApproval("PAIR", _balance, CONTRACT_CONFIG.farm);
      setIsFarmApprovalLoading(false);

      const contract = getFarmContract(true);
      await contract.callStatic.stakeLPs(getWeiFrom(_balance));
      const _stake = await contract.stakeLPs(getWeiFrom(_balance));
      await _stake.wait();
      NotifySuccess("LP Staked Successfully");

      await getBalances(address);
      await getUserDetails();
    } catch (err) {
      throw new Error(err);
    } finally {
      setIsFarmApprovalLoading(false);
    }
  };
  const handleBuyLp = async (address, amount, currency = "USDC") => {
    try {
      setIsBuyLpApprovalLoading(true);
      const contract = getbuyLpContract(true);

      const _currency =
        currency === "USDC" ? CONTRACT_CONFIG.USDC : CONTRACT_CONFIG.STAY;

      await checkForApproval(currency, amount, CONTRACT_CONFIG.buyLp);
      setIsBuyLpApprovalLoading(false);

      await balanceChecker(address, amount, _currency);

      await contract.callStatic.buyLPToken(
        connectedAddress,
        _currency,
        getWeiFrom(amount),
        {
          value: 0,
        }
      );
      let _buy = await contract.buyLPToken(
        connectedAddress,
        _currency,
        getWeiFrom(amount),
        {
          value: 0,
        }
      );

      const tx = await _buy.wait();
      await getBalances(address);
      await getUserDetails();

      NotifySuccess("LP Bought Successfully");
      const events = await contract.queryFilter("LPBought", tx.blockNumber);
      return getEthFrom(events[0].args[1]._hex);
    } catch (err) {
      throw new Error(err);
    } finally {
      setIsBuyLpApprovalLoading(false);
    }
  };

  const handleClaimRewards = async (address) => {
    try {
      if (!connectedAddress) return NotifyError("Please connect your wallet");
      await handleNetwork();
      const contract = getFarmContract(true);

      await contract.callStatic.claimRewards();
      const _rewards = await contract.claimRewards();
      const tx = await _rewards.wait();

      await getUserDetails();
      await getBalances(address);
      const events = await contract.queryFilter(
        "RewardsClaimed",
        tx.blockNumber
      );

      NotifySuccess("STAY Claimed Successfully");

      return getEthFrom(events[0].args[1]._hex);
    } catch (err) {
      throw new Error(err);
    }
  };

  const withdrawRent = async (propertyId) => {
    try {
      if (!connectedAddress) return NotifyError("Please connect your wallet");
      await handleNetwork();
      const contract = getRentContract(true);

      await contract.callStatic.withdrawRent(propertyId);
      const _rent = await contract.withdrawRent(propertyId);
      const tx = await _rent.wait();

      await getUserDetails();
      const events = await contract.queryFilter(
        "RentWithdrawn",
        tx.blockNumber
      );
      NotifySuccess("Rent Claimed Successfully");

      return getEthFrom(events[0].args[2]._hex);
    } catch (err) {
      throw new Error(err);
    }
  };

  const getEstimatedRewards = async (address, propertyId) => {
    const contract = getBoosterContract();

    const _rewards = await contract.getEstimatedRewards(address, propertyId);
    const _boostDetails = await getBoostdetails(address, propertyId);

    return (
      Number(getEthFrom(_rewards)) +
      Number(getEthFrom(_boostDetails.pendingRewards))
    );
  };

  const getBoostdetails = async (address, propertyId) => {
    const contract = getBoosterContract();

    const boostDetails = await contract.getBoostDetails(address, propertyId);
    return boostDetails;
  };

  const fetchUserProfileDetails = async (address) => {
    setProfileLoading(true);

    try {
      const response = await axios.get(`${BACKEND_BASEURL}/user/userDetails`, {
        params: { walletAddress: address },
      });

      if (response.data) {
        setUserProfileDetails({
          username: response.data.username,
          email: response.data.email,
          walletAddress: response.data.walletAddress,
          twitter: response.data.twitter,
          profilePhoto: response.data.profilePhoto,
        });
      }
    } catch (err) {
      console.log(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const formatDateAsDaysAgo = (timestamp) => {
    const now = new Date();
    const eventDate = new Date(timestamp * 1000); // Convert UNIX timestamp to milliseconds
    const diffInMilliseconds = now - eventDate;

    const seconds = Math.floor(diffInMilliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else {
      return `${seconds} second${seconds > 1 ? "s" : ""} ago`;
    }
  };

  const fetchActivityData = async (source, propertyId) => {
    try {
      let events = [];
      if (source === "marketplace") {
        events = await fetchPrimarySharesBoughtEvents(propertyId);
      } else if (source === "secondary") {
        events = await fetchSecondarySharesBoughtEvents(propertyId);
      }
      // Format the fetched data to match the expected structure
      const formattedData = events.map((event) => ({
        event: source === "marketplace" ? "Primary Sale" : "Secondary Sale",
        price: `$ ${event._amount}`,
        from: source === "marketplace" ? "Market" : event._from,
        to: event._to,
        date: formatDateAsDaysAgo(event.blockTimestamp), // Format the date
      }));
      setActivityData(formattedData);
    } catch (error) {
      console.error("Error fetching events:", error);
      setActivityData([]);
    }
  };

  const getPercentChange = async () => {
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": CONTRACT_CONFIG.coinGeckoApiKey,
      },
    };

    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/coins/nfstay?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false",
        options
      );
      const data = await response.json();
      setPercentChange({
        price_change_24h: data?.market_data.price_change_24h,
        price_change_percentage_24h:
          data?.market_data.price_change_percentage_24h.toFixed(2),
        lineColor:
          data?.market_data.price_change_24h < 0 ? "#ff0000" : "#20E19F",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const balanceChecker = async (address, spendingAmount, currency) => {
    try {
      let error = "Insufficient balance";
      let _balance = 0;
      if (currency == CONTRACT_CONFIG.zeroAddress) {
        const provider = new ethers.providers.JsonRpcProvider(
          CONTRACT_CONFIG.rpc
        );

        _balance = await provider.getBalance(address);
        _balance = Number(getEthFrom(_balance._hex));
      } else {
        const contract = getERC20Contract(currency);
        _balance = await contract.balanceOf(address);
        _balance = Number(getEthFrom(_balance._hex));
      }
      if (_balance < spendingAmount) {
        throw new Error(error);
      }
    } catch (err) {
      console.log(err);
      throw new Error(err);
    }
  };

  const getStayChart = async (duration = "24H") => {
    if (duration == "24H") {
      duration = 1;
    } else if (duration == "7D") {
      duration = 7;
    } else if (duration == "30D") {
      duration = 30;
    } else if (duration == "1Y") {
      duration = 365;
    } else {
      duration = 365;
    }

    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": CONTRACT_CONFIG.coinGeckoApiKey,
      },
    };

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/nfstay/market_chart?vs_currency=usd&days=${duration}&precision=4`,
        options
      );
      const data = await response.json();
      const formattedData = data.prices.map(([timestamp, value]) => ({
        x: new Date(timestamp),
        y: value,
      }));

      setChartData(formattedData);
    } catch (error) {
      console.error(error);
    }
  };

  const addFCMToken = async (address) => {
    try {
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        const messaging = getMessaging(firebaseApp);
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const token = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
          });

          const payload = {
            walletAddress: address,
            fcmToken: token,
          };
          // Send the data to your backend via Axios
          const response = await axios.post(
            `${BACKEND_BASEURL}/user/addFcmToken`,
            payload
          );

          if (response.data.success) {
          } else {
            throw new Error("Failed to add fcm Token");
          }
        } else {
          console.log("Notification Permission Rejected");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  async function distributeFeesToAgents({
    summarizedAgents,
    totalAmountReadable,
    propertyId,
    year,
    month,
    senderAddress,
  }) {
    try {
      const rwaContract = getRwaContract(true);
      const rwaMarketPlaceContract = getMarketplaceContract(true);
      const usdcContract = getERC20Contract(CONTRACT_CONFIG.USDC, true);

      // 1. Get total property shares
      const details = await rwaContract.getProperty(propertyId);
      const totalPropertyShares = details?.totalShares?.toNumber();
      // 2. Prepare distributions
      const { distributions, totalAmountToSend, monthTimestamp } =
        prepareFeeDistributions(
          summarizedAgents,
          totalAmountReadable,
          totalPropertyShares,
          year,
          month
        );
    
      // 3. Check USDC allowance
      const currentAllowance = await usdcContract.allowance(
        senderAddress,
        CONTRACT_CONFIG.rwaMarketplace
      );
      const readableAllowance = parseFloat(
        ethers.utils.formatEther(currentAllowance)
      );

      if (readableAllowance < totalAmountToSend) {
        const approveTx = await usdcContract.approve(
          CONTRACT_CONFIG.rwaMarketplace,
          ethers.utils.parseEther(totalAmountToSend.toString())
        );
        await approveTx.wait();
        
      }
      // 4. Send funds
  
      const tx = await rwaMarketPlaceContract.distributePerformanceFees(
        distributions,
        propertyId,
        monthTimestamp
      );
      await tx.wait();

    
    } catch (error) {
      console.error("❌ Error distributing performance fees:", error);
      throw new Error("Performance fee distribution failed.");
    }
  }

  // // ###################################FIREBASE#########################################

  useEffect(() => {
    if (connectedAddress) {
      (async () => {
        const permission = Notification.permission;
        if (permission === "default") {
          const userAgent =
            (typeof navigator !== "undefined"
              ? navigator.userAgent || navigator.vendor
              : "") || (typeof window !== "undefined" ? window.opera : "");
          if (
            /iPad|iPhone|iPod/.test(userAgent) &&
            !(typeof window !== "undefined" && window.MSStream)
          ) {
            setIsIOS(true);
          } else {
            await addFCMToken(connectedAddress);
          }
        }
      })();
    }
  }, [connectedAddress]);

  useEffect(() => {
    // Only register the service worker once
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then(function (registration) {
          console.log("Registration successful, scope is:", registration.scope);
        })
        .catch(function (err) {
          console.log("Service worker registration failed, error:", err);
        });
    }

    // Handle foreground push notifications
    const setupForegroundMessaging = () => {
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        const messaging = getMessaging(firebaseApp);

        const unsubscribe = onMessage(messaging, (payload) => {
          const notificationTitle = payload.data.title;
          const notificationOptions = {
            body: payload.data.body,
            icon: "/nfstay-logo.png", // Custom icon
          };

          // Display the notification only if permission is granted
          if (Notification.permission === "granted") {
            const notification = new Notification(notificationTitle, {
              ...notificationOptions,
              data: { link: payload.data.redirectUrl },
            });
            // Redirect the user when they click the notification
            notification.onclick = (event) => {
              event.preventDefault();
              const url = notification.data.link;
              if (url && typeof window !== "undefined") {
                window.open(url, "_blank");
              }
            };
          }
        });

        // Cleanup on component unmount
        return () => unsubscribe();
      }
    };

    // Call setupForegroundMessaging once
    const unsubscribeForeground = setupForegroundMessaging();

    // Cleanup the foreground messaging on component unmount
    return () => {
      if (unsubscribeForeground) unsubscribeForeground();
    };
  }, []); // Empty dependency array to ensure this effect runs only once

  useEffect(() => {
    (async () => {
      await getStaticValues();
    })();
  }, []);

  useEffect(() => {
    if (status === "connected" || status === "disconnected") {
      setConnectedAddress(address);
      setIsAdminWallet(address === ADMIN_WALLET);
    }
    const handler = setTimeout(() => {
      setIsWalletLoading(status == "connecting" || status === "reconnecting");
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [status, address]);

  // useEffect(() => {
  //   if (isConnected && !isValidChain(chain?.id)) setOpen(true);
  // }, [chain, isConnected]);
  useEffect(() => {
    if (chainId) {
      const valid = isValidChain(chainId, supportedChains);
      if (!valid && isConnected) setOpen(true);
      setIsWrongNetwork(!valid);
    } else {
      setIsWrongNetwork(false);
    }
  }, [chainId, supportedChains, isConnected]);

  useEffect(() => {
    if (connectedAddress) {
      (async () => {
        await fetchUserProfileDetails(connectedAddress);
        await getBalances(connectedAddress);
      })();
    } else {
      setUserProfileDetails({
        username: "",
        email: "",
        walletAddress: "",
        twitter: "",
        profilePhoto: "",
      });
    }
  }, [connectedAddress]); // Run when connectAddress changes

  const contextValues = {
    isIOS,
    setIsIOS,
    loginModelOpen,
    setLoginModelOpen,
    connectedAddress,
    assetBalance,
    getBalances,
    isBalanceLoading,
    withdrawRent,
    getUSDCFromRouter,
    globalLoader,
    setGlobalLoader,
    getStaticValues,
    handleAddToFarm,
    isFarmApprovalLoading,
    assetPrices,
    handleBuyLp,
    userDetails,
    getUserDetails,
    handleClaimRewards,
    isAdminWallet,
    getEstimatedRewards,
    getMarketplaceContract,
    getLpEstimation,
    getSecondaryListingDetails,
    getRwaContract,
    getBoosterContract,
    getPrimaryQuote,
    getERC20Contract,
    getRentContract,
    getbuyLpContract,
    getVotingContract,
    getPairContract,
    getPropertyDetails,
    getUserProperties,
    getPrimaryPropertyRemainingShares,
    getMarketplaceFee,
    getRocksContract,
    getBoostAmount,
    checkForApproval,
    getValueFromRouter,
    getStayEstimation,
    getFarmContract,
    getRouterContract,
    userProfileDetails,
    profileLoading,
    getLeaderBoardInfo,
    addFCMToken,
    getStayChart,
    chartData,
    getPercentChange,
    percentChange,
    fetchUserProfileDetails,
    isWrongNetwork,
    handleNetwork,
    fetchActivityData,
    activityData,
    balanceChecker,
    isBuyLpApprovalLoading,
    signMessage,
    getBoostdetails,
    isWalletLoading,
    distributeFeesToAgents,
  };

  return (
    <nfstayContext.Provider value={contextValues}>
      <Suspense>
        <HandleReferral />
      </Suspense>
      {children}
    </nfstayContext.Provider>
  );
};

// Custom hook to use the nfstayContext
export const usenfstayContext = () => {
  const context = useContext(nfstayContext);
  if (!context) {
    throw new Error(
      "usenfstayContext must be used within a nfstayContextProvider"
    );
  }
  return context;
};
