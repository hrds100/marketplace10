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

export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
];
