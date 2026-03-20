// Minimal ABIs for NFsTay smart contract interactions
// Extracted from legacy app — only functions we actually call

export const MARKETPLACE_ABI = [
  'function sendPrimaryShares(address recipient, address agentWallet, uint256 propertyId, uint256 sharesRequested) external',
  'function getPropertyDetails(uint256 propertyId) external view returns (uint256 totalShares, uint256 sharesSold, uint256 pricePerShare, address owner)',
  'function getPrimaryPropertyRemainingShares(uint256 propertyId) external view returns (uint256)',
  'function getMarketplaceFee() external view returns (uint256)',
];

export const RWA_TOKEN_ABI = [
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
];

export const RENT_ABI = [
  'function withdrawRent(uint256 propertyId) external',
  'function isEligibleForRent(uint256 propertyId, address userAddress) external view returns (bool)',
  'function getRentDetails(uint256 propertyId) external view returns (uint256 startTime, uint256 endTime, uint256 totalRent, uint256 rentRemaining, uint256 rentPerShare)',
  'function getRentHistory(address userAddress, uint256 propertyId) external view returns (uint256)',
  'event RentWithdrawn(address indexed _by, uint256 _propertyId, uint256 _rent)',
];

export const VOTING_ABI = [
  'function addProposal(uint256 propertyId, bytes encodedDescription) external',
  'function vote(uint256 proposalId, bool inFavor) external',
  'function encodeString(string description) external pure returns (bytes)',
  'function getProposalFees() external view returns (uint256)',
  'function getProposal(uint256 proposalId) external view returns (uint256 _propertyId, address _proposer, uint256 _endTime, uint256 _votesInFavour, uint256 _votesInAgainst, bytes _description, uint8 _status)',
  'function decodeString(bytes encodedDescription) external pure returns (string)',
];

export const BOOSTER_ABI = [
  'function boost(uint256 propertyId) external',
  'function claimRewards(uint256 propertyId) external',
  'function getBoostAmount(uint256 propertyId) external view returns (uint256)',
  'function getBoostdetails(uint256 propertyId) external view returns (uint256 boostApr, uint256 totalBoosted, uint256 reboostTime)',
  'function isBoosted(address user, uint256 propertyId) external view returns (bool)',
  'function getEstimatedRewards(address user, uint256 propertyId) external view returns (uint256)',
];

export const BUY_LP_ABI = [
  'function buyLPToken(address _recipient, address _currency, uint256 _amountInUSDC) external payable',
  'function buyStay(address _recipient, address _currency, uint256 _usdcAmount) external payable',
  'function getLpEstimation(uint256 _amountInUSDC) external view returns (uint256 _lpAmount)',
];

export const FARM_ABI = [
  'function pendingReward(address _user) external view returns (uint256)',
  'function userInfo(address _user) external view returns (uint256 amount, uint256 rewardDebt)',
  'function deposit(uint256 _amount) external',
  'function withdraw(uint256 _amount) external',
  'function claimReward() external',
];

export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
];

// PancakeSwap Router (for price estimation and swaps)
export const ROUTER_ABI = [
  'function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)',
  'function getAmountsIn(uint256 amountOut, address[] calldata path) external view returns (uint256[] memory amounts)',
];

// PancakeSwap LP Pair
export const PAIR_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function approve(address spender, uint256 amount) external returns (bool)',
];

// Extended RWA token ABI (for property enumeration)
export const RWA_TOKEN_FULL_ABI = [
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
  'function totalProperties() external view returns (uint256)',
  'function getProperty(uint256 propertyId) external view returns (tuple(address[] partners, uint256[] shares, uint256 totalShares, uint256 pricePerShare, string uri, uint256 aprBips))',
  'function isApprovedForAll(address account, address operator) external view returns (bool)',
  'function setApprovalForAll(address operator, bool approved) external',
];

// Extended Marketplace ABI (for secondary market + primary sale details)
export const MARKETPLACE_FULL_ABI = [
  'function sendPrimaryShares(address recipient, address agentWallet, uint256 propertyId, uint256 sharesRequested) external',
  'function getPropertyDetails(uint256 propertyId) external view returns (uint256 totalShares, uint256 sharesSold, uint256 pricePerShare, address owner)',
  'function getPrimaryPropertyRemainingShares(uint256 propertyId) external view returns (uint256)',
  'function getMarketplaceFee() external view returns (uint256)',
  'function getPrimarySale(uint256 propertyId) external view returns (tuple(uint256 propertyId, uint256 totalShares, uint256 sharesSold, uint256 pricePerShare, uint8 status))',
  'function getPrimarySaleQuote(uint256 usdcAmount, uint256 sharePrice) external view returns (uint256 shares, uint256 totalCost, uint256 fee)',
  'function getSecondaryListing(uint256 listingId) external view returns (tuple(address seller, uint256 propertyId, uint256 shares, uint256 pricePerShare, uint8 status))',
  'function getPlaformFee() external view returns (uint256)',
  'function distributePerformanceFees(tuple(address agent, uint256 amount)[] distributions, uint256 propertyId, uint256 monthTimestamp) external',
];

// Extended BuyLP ABI (for STAY estimation)
export const BUY_LP_FULL_ABI = [
  'function buyLPToken(address _recipient, address _currency, uint256 _amountInUSDC) external payable',
  'function buyStay(address _recipient, address _currency, uint256 _usdcAmount) external payable',
  'function getLpEstimation(uint256 _amountInUSDC) external view returns (uint256 _lpAmount)',
  'function getStayEstimation(address _currency, uint256 _amountInUSDC) external view returns (uint256)',
  'function getLpPrice() external view returns (uint256)',
  'event LPBought(address indexed buyer, uint256 lpAmount, uint256 usdcSpent)',
];
