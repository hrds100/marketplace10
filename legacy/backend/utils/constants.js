//TESTNETSEPOLIA
// const RPC =
//   "https://eth-sepolia.g.alchemy.com/v2/-VVP2mqehOvdG-zqsAs8xCZwWrIP63ho";
// const graphUrlMarketplace =
//   "https://api.studio.thegraph.com/query/107415/marketnfstay/v5";
// const marketplaceAddress = "0xaA13796bF55017A4C5BD0fB69383953646E366EA";
// const stayAddress = "0x8423cece3ce700d2101822ed4040c5e6a55e0d95";
// const routerAddress = "0xc532a74256d3db42d0bf7a0400fefdbad7694008";
// const usdcAddress = "0x49c2d5e6f839e923b74cbba69e640942149bcf56";

//MAINNETBNB

const RPC =
  "https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T";
const graphUrlMarketplace =
  "https://api.studio.thegraph.com/query/62641/nfstay-rwa-marketplace/v3";
const marketplaceAddress = "0xDD22fDC50062F49a460E5a6bADF96Cbec85ac128";
const stayAddress = "0x7F14ce2A5df31Ad0D2BF658d3840b1F7559d3EE0";
const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const usdcAddress = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d";

const ONE_YEAR = 31536000;
const ONE_MONTH = 2592000;

const marketplaceABI = [
  {
    inputs: [
      { internalType: "address", name: "_rwaAddress", type: "address" },
      { internalType: "address", name: "_managerAddr", type: "address" },
      { internalType: "address", name: "_treasuryAddr", type: "address" },
      { internalType: "uint256", name: "_primarySaleFee", type: "uint256" },
      { internalType: "uint256", name: "_seconarySaleFee", type: "uint256" },
      { internalType: "uint256", name: "_referralBips", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  { inputs: [], name: "ActionRestricted", type: "error" },
  { inputs: [], name: "AlreadyListed", type: "error" },
  { inputs: [], name: "CantBuyYourListing", type: "error" },
  { inputs: [], name: "InvalidAddress", type: "error" },
  { inputs: [], name: "InvalidAmount", type: "error" },
  { inputs: [], name: "InvalidCurrency", type: "error" },
  { inputs: [], name: "InvalidFeeAmount", type: "error" },
  { inputs: [], name: "InvalidPrice", type: "error" },
  { inputs: [], name: "InvalidReferral", type: "error" },
  { inputs: [], name: "InvalidReferralBips", type: "error" },
  { inputs: [], name: "InvalidShares", type: "error" },
  { inputs: [], name: "Invalid_agent", type: "error" },
  { inputs: [], name: "NotApproved", type: "error" },
  { inputs: [], name: "NotEnoughBalance", type: "error" },
  { inputs: [], name: "NotEnoughNFTS", type: "error" },
  { inputs: [], name: "NotEnoughSharesAvailable", type: "error" },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  { inputs: [], name: "PrimarySaleAlreadyStarted", type: "error" },
  { inputs: [], name: "PrimarySaleDoesNotExists", type: "error" },
  { inputs: [], name: "PrimarySaleNotEndedYet", type: "error" },
  { inputs: [], name: "PropertyNotExists", type: "error" },
  { inputs: [], name: "SaleExpired", type: "error" },
  { inputs: [], name: "SaleNotFound", type: "error" },
  { inputs: [], name: "SameAction", type: "error" },
  { inputs: [], name: "SecondarySaleIsDisabled", type: "error" },
  { inputs: [], name: "TransferFailed", type: "error" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "_agent",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "_isWhitelisted",
        type: "bool",
      },
    ],
    name: "AgentWhitelistUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_referee",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "_referral",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_propertyId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_sharesSold",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_investment",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_commission",
        type: "uint256",
      },
    ],
    name: "Commission",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_oldReferralBips",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_newReferralBips",
        type: "uint256",
      },
    ],
    name: "DefaultReferralBipsUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_agent",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_bips",
        type: "uint256",
      },
    ],
    name: "ExclusiveReferralBipsUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "_by", type: "address" },
      {
        indexed: false,
        internalType: "address",
        name: "_oldWallet",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "_newWallet",
        type: "address",
      },
    ],
    name: "ManagerWalletUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_propertyId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_monthTimestamp",
        type: "uint256",
      },
    ],
    name: "PerformanceFeeDistributed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "_by", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "_oldFee",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_newFee",
        type: "uint256",
      },
    ],
    name: "PrimaryFeeUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_propertyId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "enum RWAMarketplace.PrimarySaleState",
        name: "_status",
        type: "uint8",
      },
    ],
    name: "PrimarySaleStatus",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_buyer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_propertyId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_sharesBought",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "PrimarySharesBought",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "_by", type: "address" },
      {
        indexed: true,
        internalType: "address",
        name: "_referee",
        type: "address",
      },
    ],
    name: "ReferralAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "_by", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "_oldFee",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_newFee",
        type: "uint256",
      },
    ],
    name: "ReferralFeeUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "_by", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "_oldFee",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_newFee",
        type: "uint256",
      },
    ],
    name: "SecondaryFeeUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_seller",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_listingId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_propertyId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "enum RWAMarketplace.SecondarySaleState",
        name: "_status",
        type: "uint8",
      },
    ],
    name: "SecondarySaleStatus",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_seller",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "_buyer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_propertyId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_sharesBought",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "SecondarySharesBought",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "_by", type: "address" },
      {
        indexed: false,
        internalType: "address",
        name: "_oldWallet",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "_newWallet",
        type: "address",
      },
    ],
    name: "TreasuryWalletUpdated",
    type: "event",
  },
  { stateMutability: "payable", type: "fallback" },
  {
    inputs: [
      { internalType: "address", name: "_agent", type: "address" },
      { internalType: "uint256", name: "_bips", type: "uint256" },
    ],
    name: "addExclusiveReferralBips",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_propertyId", type: "uint256" },
      { internalType: "uint256", name: "_totalShares", type: "uint256" },
    ],
    name: "addProperty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_recipient", type: "address" },
      { internalType: "address", name: "_currency", type: "address" },
      { internalType: "address", name: "_referralAddress", type: "address" },
      {
        components: [
          { internalType: "uint256", name: "_propertyId", type: "uint256" },
          { internalType: "uint256", name: "_usdcAmount", type: "uint256" },
        ],
        internalType: "struct RWAMarketplace.Order[]",
        name: "_order",
        type: "tuple[]",
      },
    ],
    name: "bulkBuyPrimaryShares",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_recipient", type: "address" },
      { internalType: "address", name: "_currency", type: "address" },
      { internalType: "uint256", name: "_propertyId", type: "uint256" },
      { internalType: "uint256", name: "_usdcAmount", type: "uint256" },
      { internalType: "uint256", name: "_noOfRocks", type: "uint256" },
      { internalType: "address", name: "_referralAddress", type: "address" },
    ],
    name: "buyPrimaryShares",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_recipient", type: "address" },
      { internalType: "address", name: "_currency", type: "address" },
      { internalType: "uint256", name: "_listingId", type: "uint256" },
      { internalType: "uint256", name: "_usdcAmount", type: "uint256" },
    ],
    name: "buySecondaryShares",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_listingId", type: "uint256" }],
    name: "cancelSecondarySale",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_newReferralBips", type: "uint256" },
    ],
    name: "changeDefaultReferralBips",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_newManagerWallet", type: "address" },
    ],
    name: "changeManager",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_newPrimarySaleBips", type: "uint256" },
      {
        internalType: "uint256",
        name: "_newSecondarySaleBips",
        type: "uint256",
      },
      { internalType: "uint256", name: "_newReferralBips", type: "uint256" },
    ],
    name: "changePlatformFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_newTreasuryWallet", type: "address" },
    ],
    name: "changeTreasury",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        internalType: "struct RWAMarketplace.FeeDistribution[]",
        name: "distributions",
        type: "tuple[]",
      },
      { internalType: "uint256", name: "_propertyId", type: "uint256" },
      { internalType: "uint256", name: "_monthTimestamp", type: "uint256" },
    ],
    name: "distributePerformanceFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_propertyId", type: "uint256" }],
    name: "endPrimarySale",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getDefaultReferralBips",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_agent", type: "address" }],
    name: "getExclusiveReferralBips",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getManagerAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNewUserBonus",
    outputs: [
      { internalType: "uint256", name: "bonusInBnbUnits", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPlaformFee",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_propertyId", type: "uint256" }],
    name: "getPrimarySale",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "totalShares", type: "uint256" },
          { internalType: "uint256", name: "sharesRemaining", type: "uint256" },
          {
            internalType: "enum RWAMarketplace.PrimarySaleState",
            name: "status",
            type: "uint8",
          },
        ],
        internalType: "struct RWAMarketplace.PrimaryListing",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_usdcAmount", type: "uint256" },
      { internalType: "uint256", name: "_pricePerShare", type: "uint256" },
    ],
    name: "getPrimarySaleQuote",
    outputs: [
      { internalType: "uint256", name: "_sharesToBuy", type: "uint256" },
      { internalType: "uint256", name: "_usdcQuotation", type: "uint256" },
      { internalType: "uint256", name: "_marketFees", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_listingId", type: "uint256" }],
    name: "getSecondaryListing",
    outputs: [
      {
        components: [
          { internalType: "address", name: "seller", type: "address" },
          { internalType: "uint256", name: "propertyId", type: "uint256" },
          { internalType: "uint256", name: "pricePerShare", type: "uint256" },
          { internalType: "uint256", name: "sharesRemaining", type: "uint256" },
          { internalType: "uint256", name: "endTime", type: "uint256" },
        ],
        internalType: "struct RWAMarketplace.SecondaryListing",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_usdcAmount", type: "uint256" },
      { internalType: "uint256", name: "_pricePerShare", type: "uint256" },
    ],
    name: "getSecondarySaleQuote",
    outputs: [
      { internalType: "uint256", name: "_sharesToBuy", type: "uint256" },
      { internalType: "uint256", name: "_totalFee", type: "uint256" },
      { internalType: "uint256", name: "_usdcRequired", type: "uint256" },
      { internalType: "uint256", name: "_sellerAmount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTotalListings",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTreasuryAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_agent", type: "address" }],
    name: "isAgentWhitelisted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isSecondarySalePaused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256[]", name: "", type: "uint256[]" },
      { internalType: "uint256[]", name: "", type: "uint256[]" },
      { internalType: "bytes", name: "", type: "bytes" },
    ],
    name: "onERC1155BatchReceived",
    outputs: [{ internalType: "bytes4", name: "", type: "bytes4" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "bytes", name: "", type: "bytes" },
    ],
    name: "onERC1155Received",
    outputs: [{ internalType: "bytes4", name: "", type: "bytes4" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_recipient", type: "address" },
      { internalType: "address", name: "_referralAddress", type: "address" },
      { internalType: "uint256", name: "_propertyId", type: "uint256" },
      { internalType: "uint256", name: "_sharesToSend", type: "uint256" },
    ],
    name: "sendPrimaryShares",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_propertyId", type: "uint256" }],
    name: "startPrimarySale",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_propertyId", type: "uint256" },
      { internalType: "uint256", name: "_noOfShares", type: "uint256" },
      { internalType: "uint256", name: "_pricePerShare", type: "uint256" },
      { internalType: "uint256", name: "_endTime", type: "uint256" },
    ],
    name: "startSecondarySale",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "toggleSecondarySalePaused",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_agent", type: "address" },
      { internalType: "bool", name: "_status", type: "bool" },
    ],
    name: "updateAgentWhitelistStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_listingId", type: "uint256" },
      { internalType: "uint256", name: "_noOfShares", type: "uint256" },
      { internalType: "uint256", name: "_pricePerShare", type: "uint256" },
    ],
    name: "updateSecondarySale",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_token", type: "address" }],
    name: "withdrawFunds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
];

const erc20ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "initialOwner",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "allowance",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "needed",
        type: "uint256",
      },
    ],
    name: "ERC20InsufficientAllowance",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "needed",
        type: "uint256",
      },
    ],
    name: "ERC20InsufficientBalance",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "approver",
        type: "address",
      },
    ],
    name: "ERC20InvalidApprover",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
    ],
    name: "ERC20InvalidReceiver",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "ERC20InvalidSender",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "ERC20InvalidSpender",
    type: "error",
  },
  {
    inputs: [],
    name: "NotAuthorizer",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    inputs: [],
    name: "SameAction",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_by",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "_user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "_action",
        type: "bool",
      },
    ],
    name: "AuthorizerUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "burnFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_user",
        type: "address",
      },
      {
        internalType: "bool",
        name: "_action",
        type: "bool",
      },
    ],
    name: "updateAuthorizer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const routerABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_factory",
        type: "address",
      },
      {
        internalType: "address",
        name: "_WETH",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "WETH",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenA",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenB",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amountADesired",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountBDesired",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountAMin",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountBMin",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "addLiquidity",
    outputs: [
      {
        internalType: "uint256",
        name: "amountA",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountB",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "liquidity",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amountTokenDesired",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountTokenMin",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountETHMin",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "addLiquidityETH",
    outputs: [
      {
        internalType: "uint256",
        name: "amountToken",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountETH",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "liquidity",
        type: "uint256",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "factory",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountOut",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "reserveIn",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "reserveOut",
        type: "uint256",
      },
    ],
    name: "getAmountIn",
    outputs: [
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "reserveIn",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "reserveOut",
        type: "uint256",
      },
    ],
    name: "getAmountOut",
    outputs: [
      {
        internalType: "uint256",
        name: "amountOut",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountOut",
        type: "uint256",
      },
      {
        internalType: "address[]",
        name: "path",
        type: "address[]",
      },
    ],
    name: "getAmountsIn",
    outputs: [
      {
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        internalType: "address[]",
        name: "path",
        type: "address[]",
      },
    ],
    name: "getAmountsOut",
    outputs: [
      {
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountA",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "reserveA",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "reserveB",
        type: "uint256",
      },
    ],
    name: "quote",
    outputs: [
      {
        internalType: "uint256",
        name: "amountB",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenA",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenB",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "liquidity",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountAMin",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountBMin",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "removeLiquidity",
    outputs: [
      {
        internalType: "uint256",
        name: "amountA",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountB",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "liquidity",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountTokenMin",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountETHMin",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "removeLiquidityETH",
    outputs: [
      {
        internalType: "uint256",
        name: "amountToken",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountETH",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "liquidity",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountTokenMin",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountETHMin",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "removeLiquidityETHSupportingFeeOnTransferTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "amountETH",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "liquidity",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountTokenMin",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountETHMin",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "approveMax",
        type: "bool",
      },
      {
        internalType: "uint8",
        name: "v",
        type: "uint8",
      },
      {
        internalType: "bytes32",
        name: "r",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32",
      },
    ],
    name: "removeLiquidityETHWithPermit",
    outputs: [
      {
        internalType: "uint256",
        name: "amountToken",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountETH",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "liquidity",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountTokenMin",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountETHMin",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "approveMax",
        type: "bool",
      },
      {
        internalType: "uint8",
        name: "v",
        type: "uint8",
      },
      {
        internalType: "bytes32",
        name: "r",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32",
      },
    ],
    name: "removeLiquidityETHWithPermitSupportingFeeOnTransferTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "amountETH",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenA",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenB",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "liquidity",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountAMin",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountBMin",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "approveMax",
        type: "bool",
      },
      {
        internalType: "uint8",
        name: "v",
        type: "uint8",
      },
      {
        internalType: "bytes32",
        name: "r",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32",
      },
    ],
    name: "removeLiquidityWithPermit",
    outputs: [
      {
        internalType: "uint256",
        name: "amountA",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountB",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountOut",
        type: "uint256",
      },
      {
        internalType: "address[]",
        name: "path",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "swapETHForExactTokens",
    outputs: [
      {
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountOutMin",
        type: "uint256",
      },
      {
        internalType: "address[]",
        name: "path",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "swapExactETHForTokens",
    outputs: [
      {
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountOutMin",
        type: "uint256",
      },
      {
        internalType: "address[]",
        name: "path",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "swapExactETHForTokensSupportingFeeOnTransferTokens",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountOutMin",
        type: "uint256",
      },
      {
        internalType: "address[]",
        name: "path",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "swapExactTokensForETH",
    outputs: [
      {
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountOutMin",
        type: "uint256",
      },
      {
        internalType: "address[]",
        name: "path",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "swapExactTokensForETHSupportingFeeOnTransferTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountOutMin",
        type: "uint256",
      },
      {
        internalType: "address[]",
        name: "path",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "swapExactTokensForTokens",
    outputs: [
      {
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountOutMin",
        type: "uint256",
      },
      {
        internalType: "address[]",
        name: "path",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountOut",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountInMax",
        type: "uint256",
      },
      {
        internalType: "address[]",
        name: "path",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "swapTokensForExactETH",
    outputs: [
      {
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountOut",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountInMax",
        type: "uint256",
      },
      {
        internalType: "address[]",
        name: "path",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "swapTokensForExactTokens",
    outputs: [
      {
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    stateMutability: "payable",
    type: "receive",
  },
];

module.exports = {
  RPC,
  ONE_YEAR,
  ONE_MONTH,
  graphUrlMarketplace,
  marketplaceAddress,
  stayAddress,
  routerAddress,
  usdcAddress,
  marketplaceABI,
  erc20ABI,
  routerABI,
};
