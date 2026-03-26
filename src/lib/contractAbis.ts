// Minimal ABIs for nfstay smart contract interactions
// Extracted from legacy app — only functions we actually call

export const MARKETPLACE_ABI = [
  // Legacy uses buyPrimaryShares for crypto purchases (payment.js line 216-233)
  'function buyPrimaryShares(address recipient, address currency, uint256 propertyId, uint256 usdcAmount, uint256 minShares, address agent) external payable',
  // sendPrimaryShares is used by SamCart webhook (backend, not frontend)
  'function sendPrimaryShares(address recipient, address agentWallet, uint256 propertyId, uint256 sharesRequested) external',
  'function getPropertyDetails(uint256 propertyId) external view returns (uint256 totalShares, uint256 sharesSold, uint256 pricePerShare, address owner)',
  'function getPrimaryPropertyRemainingShares(uint256 propertyId) external view returns (uint256)',
  'function getMarketplaceFee() external view returns (uint256)',
  'function getPrimarySaleQuote(uint256 usdcAmount, uint256 sharePrice) external view returns (uint256 _sharesToBuy, uint256 _usdcQuotation, uint256 _marketFees)',
];

export const RWA_TOKEN_ABI = [
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
];

export const RENT_ABI = [
  'function withdrawRent(uint256 propertyId) external',
  'function isEligibleForRent(uint256 propertyId, address userAddress) external view returns (bool)',
  'function getRentDetails(uint256 propertyId) external view returns (uint256 startTime, uint256 endTime, uint256 totalRent, uint256 rentRemaining, uint256 rentPerShare)',
  'function getRentHistory(address userAddress, uint256 propertyId) external view returns (uint256)',
  'function addRent(uint256 propertyId, uint256 totalMonthRent) external',
  'function resetPropertyDetails(uint256 propertyId) external',
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

// Booster ABI — exact match of legacy abis.js boosterABI
export const BOOSTER_ABI = [
  'function boost(address recipient, uint256 propertyId, address currency) external payable',
  'function claimRewards(uint256 propertyId) external',
  'function getBoostAmount(address _userAddress, uint256 _propertyId) external view returns (uint256 _estimatedAmount)',
  'function getBoostApr() external view returns (uint256)',
  'function getBoostDetails(address _userAddress, uint256 _propertyId) external view returns (uint256 sharesBoosted, uint256 startTime, uint256 endTime, uint256 rewardStartTime, uint256 reboostTimeLimit, uint256 pendingRewards)',
  'function getEstimatedRewards(address _userAddress, uint256 _propertyId) external view returns (uint256 _totalRewards)',
  'function isBoosted(address _userAddress, uint256 _propertyId) external view returns (bool _status)',
  'function getBoostFeeBips() external view returns (uint256)',
  'function boostOnBehalfOf(address recipient, uint256 propertyId) external payable',
];

export const BUY_LP_ABI = [
  'function buyLPToken(address _recipient, address _currency, uint256 _amountInUSDC) external payable',
  'function buyStay(address _recipient, address _currency, uint256 _usdcAmount) external payable',
  'function getLpEstimation(uint256 _amountInUSDC) external view returns (uint256 _lpAmount)',
  'event LPBought(address indexed buyer, uint256 lpAmount, uint256 usdcSpent)',
];

export const FARM_ABI = [
  'function pendingReward(address _user) external view returns (uint256)',
  'function userInfo(address _user) external view returns (uint256 amount, uint256 rewardDebt)',
  'function deposit(uint256 _amount) external',
  'function withdraw(uint256 _amount) external',
  'function claimReward() external',
  'function stakeLPs(uint256 _amount) external',
  'function claimRewards() external',
  'function getStayPerSecond() external view returns (uint256)',
  'event RewardsClaimed(address indexed user, uint256 amount)',
];

export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
];
