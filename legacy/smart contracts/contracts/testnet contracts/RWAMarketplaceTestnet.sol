// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/// @title RWAMarketplace
/// @author Rabeeb Aqdas, Asmar Hasan
/// @dev A marketplace contract for managing the primary and secondary sales of fractionalized real-world assets.
///      Supports listing properties, buying shares, and handling referrals with customizable platform fees.
///      Integrates with the RWA contract for property and share management, and uses ERC1155 for token transfers.

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// File: @openzeppelin/contracts/access/Ownable.sol

// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// File: @openzeppelin/contracts/utils/introspection/IERC165.sol

// OpenZeppelin Contracts (last updated v5.0.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[EIP].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// File: @openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol

// OpenZeppelin Contracts (last updated v5.0.0) (token/ERC1155/IERC1155Receiver.sol)

/**
 * @dev Interface that must be implemented by smart contracts in order to receive
 * ERC-1155 token transfers.
 */
interface IERC1155Receiver is IERC165 {
    /**
     * @dev Handles the receipt of a single ERC1155 token type. This function is
     * called at the end of a `safeTransferFrom` after the balance has been updated.
     *
     * NOTE: To accept the transfer, this must return
     * `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`
     * (i.e. 0xf23a6e61, or its own function selector).
     *
     * @param operator The address which initiated the transfer (i.e. msg.sender)
     * @param from The address which previously owned the token
     * @param id The ID of the token being transferred
     * @param value The amount of tokens being transferred
     * @param data Additional data with no specified format
     * @return `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))` if transfer is allowed
     */
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);

    /**
     * @dev Handles the receipt of a multiple ERC1155 token types. This function
     * is called at the end of a `safeBatchTransferFrom` after the balances have
     * been updated.
     *
     * NOTE: To accept the transfer(s), this must return
     * `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`
     * (i.e. 0xbc197c81, or its own function selector).
     *
     * @param operator The address which initiated the batch transfer (i.e. msg.sender)
     * @param from The address which previously owned the token
     * @param ids An array containing ids of each token being transferred (order and length must match values array)
     * @param values An array containing amounts of each token being transferred (order and length must match ids array)
     * @param data Additional data with no specified format
     * @return `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))` if transfer is allowed
     */
    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4);
}

interface IERC721 is IERC165 {
    function walletOfOwner(
        address _owner
    ) external view returns (uint256[] memory);

    /**
     * @dev Transfers `tokenId` token from `from` to `to`.
     *
     * WARNING: Usage of this method is discouraged, use {safeTransferFrom} whenever possible.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 tokenId) external;

    /**
     * @dev Returns if the `operator` is allowed to manage all of the assets of `owner`.
     *
     * See {setApprovalForAll}
     */
    function isApprovedForAll(
        address owner,
        address operator
    ) external view returns (bool);
}

// File: @openzeppelin/contracts/token/ERC721/IERC721Receiver.sol

// OpenZeppelin Contracts (last updated v5.0.0) (token/ERC721/IERC721Receiver.sol)

// File: @openzeppelin/contracts/utils/introspection/ERC165.sol

// OpenZeppelin Contracts (last updated v5.0.0) (utils/introspection/ERC165.sol)

/**
 * @dev Implementation of the {IERC165} interface.
 *
 * Contracts that want to implement ERC165 should inherit from this contract and override {supportsInterface} to check
 * for the additional interface id that will be supported. For example:
 *
 * ```solidity
 * function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
 *     return interfaceId == type(MyInterface).interfaceId || super.supportsInterface(interfaceId);
 * }
 * ```
 */
abstract contract ERC165 is IERC165 {
    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

    /**
     * @notice Burns a specific amount of tokens from the caller's address.
     * @param value The number of tokens to burn.
     * @dev Destroys `value` tokens from the caller’s balance, reducing the total supply.
     * Emits a {Transfer} event with `to` set to the zero address.
     */
    function burn(uint256 value) external;
}

interface IRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts);
}

interface IRWA {
    struct Property {
        uint256 pricePerShare;
        uint256 totalOwners;
        uint256 apr;
        uint256 totalShares; // The supply for minting the NFT.
        string uri; // URI for the property's metadata.
    }

    function getProperty(
        uint256 _propertyId
    ) external view returns (Property memory);

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) external;

    function balanceOf(
        address account,
        uint256 id
    ) external view returns (uint256);

    function isApprovedForAll(
        address account,
        address operator
    ) external view returns (bool);

    function isRegistered(address _userAddress) external view returns (bool);
}

interface AggregatorV3Interface {
    /// @notice Retrieves the latest round data from the price feed.
    /// @return roundId The round ID.
    /// @return answer The latest answer.
    /// @return startedAt Timestamp when the round started.
    /// @return updatedAt Timestamp when the round was updated.
    /// @return answeredInRound The round ID in which the answer was computed.
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/**
 * @dev Error thrown when the caller is not authorized to perform the action.
 */
error NotApproved();

/**
 * @dev Error thrown when a token transfer fails.
 */
error TransferFailed();

/**
 * @dev Error thrown when the user's balance is insufficient to complete the operation.
 */
error NotEnoughBalance();

/**
 * @dev Error thrown when the caller is not the owner of a resource or entity.
 */
error YouAreNotOwner();

/**
 * @dev Error thrown when an attempt is made to end a sale before its designated end time.
 */
error SaleNotEndedYet();

/**
 * @dev Error thrown when the user does not have enough NFTs to perform the action.
 */
error NotEnoughNFTS();

/**
 * @dev Error thrown when the action is restricted to specific roles or conditions.
 */
error ActionRestricted();

/**
 * @dev Error thrown when a primary sale for a property does not exist.
 */
error PrimarySaleDoesNotExists();

/**
 * @dev Error thrown when there are not enough shares available to complete the action.
 */
error NotEnoughSharesAvailable();

/**
 * @dev Error thrown when a primary sale has already ended.
 */
error PrimarySaleEnded();

/**
 * @dev Error thrown when a primary sale has not yet ended.
 */
error PrimarySaleNotEndedYet();

/**
 * @dev Error thrown when a user is not eligible to perform the action.
 */
error NotEligible();

/**
 * @dev Error thrown when an unsupported or invalid currency is provided.
 */
error InvalidCurrency();

/**
 * @dev Error thrown when an invalid amount is provided for a transaction or operation.
 */
error InvalidAmount();

/**
 * @dev Error thrown when a property or listing is already listed for sale.
 */
error AlreadyListed();

/**
 * @dev Error thrown when a primary sale has already started for a property.
 */
error PrimarySaleAlreadyStarted();

/**
 * @dev Error thrown when a user attempts to buy their own listing.
 */
error CantBuyYourListing();

/**
 * @dev Error thrown when an invalid price is provided for a listing or property.
 */
error InvalidPrice();

/**
 * @dev Error thrown when a property does not exist.
 */
error PropertyNotExists();

/**
 * @dev Error thrown when an invalid referral address is provided.
 */
error InvalidReferral();

/**
 * @dev Error thrown when a same or invalid wallet address is provided.
 */
error InvalidAddress();

/**
 * @dev Error thrown when a referral for the user already exists.
 */
error ReferralExists();

/**
 * @dev Error thrown when a user is already registered in the system.
 */
error UserAlreadyRegistered();

/**
 * @dev Error thrown when a sale cannot be found.
 */
error SaleNotFound();

/**
 * @dev Error thrown when the number of shares is invalid for the operation.
 */
error InvalidShares();

/**
 * @dev Error thrown when a sale has expired and can no longer be completed.
 */
error SaleExpired();

/**
 * @dev Error thrown when an invalid fee amount is provided.
 */
error InvalidFeeAmount();

/**
 * @dev Error thrown when attempting to perform an action that would have no effect because the current state already matches the requested state.
 */
error SameAction();

/**
 * @dev Error thrown when a primary sale has not yet started for a property.
 */
error PrimarySaleNotStartedYet();
/**
 * @dev Error thrown when the referral bips are zero, exceed BASE, or duplicate the current setting.
 */
error InvalidReferralBips();

/**
 * @dev Error thrown when the provided agent address is invalid.
 */
error Invalid_agent();

/**
 * @dev Error thrown when a secondary–sale function is invoked while paused.
 */
error SecondarySaleIsDisabled();

contract RWAMarketplaceTestnet is Ownable, IERC1155Receiver, ERC165 {
    ///////////////////////////////////Struct////////////////////////////////////

    /**
     * @dev Represents a primary sale listing for a property.
     * @param totalShares The total number of shares available in the primary sale.
     * @param sharesRemaining The number of shares still available for sale.
     * @param status The current state of the primary sale.
     */
    struct PrimaryListing {
        uint256 totalShares;
        uint256 sharesRemaining;
        PrimarySaleState status;
    }

    /**
     * @dev Represents a secondary sale listing for a property.
     * @param seller The address of the seller listing the shares.
     * @param propertyId The ID of the property being listed.
     * @param pricePerShare The price per share in the listing.
     * @param sharesRemaining The number of shares still available for sale.
     * @param endTime The timestamp when the listing expires (0 if it does not expire).
     */
    struct SecondaryListing {
        address seller;
        uint256 propertyId;
        uint256 pricePerShare;
        uint256 sharesRemaining;
        uint256 endTime;
    }

    /**
     * @dev Represents a purchase in the marketplace.
     * @param listingId The ID of the listing being purchased.
     * @param sharesToBuy The number of shares being purchased.
     */
    struct Purchase {
        uint256 listingId;
        uint256 sharesToBuy;
    }

    /**
     * @dev Represents payment details for a transaction.
     * @param usdcQuotation The total amount of USDC required for the purchase.
     * @param marketFees The marketplace fee deducted from the transaction.
     * @param finalAmount The final amount received by the seller after fees.
     * @param referralAmount The amount of commission allocated for the referral.
     * @param agent The address of the referral agent (if any).
     */
    struct PaymentInfo {
        uint256 usdcQuotation;
        uint256 marketFees;
        uint256 finalAmount;
        uint256 referralAmount;
        address agent;
    }

    struct Order {
        uint256 _propertyId;
        uint256 _usdcAmount;
    }

    struct FeeDistribution {
        address recipient;
        uint256 amount;
    }

    /**
     * @dev Enum representing the state of a primary sale.
     * @param None Indicates no sale is associated with the property. 0
     * @param UpComing Indicates the primary sale is upcoming. 1
     * @param OnGoing Indicates the primary sale is currently active. 2
     * @param Ended Indicates the primary sale has ended. 3
     */
    enum PrimarySaleState {
        None,
        UpComing,
        OnGoing,
        Ended
    }

    /**
     * @dev Enum representing the state of a secondary sale.
     * @param OnGoing Indicates the secondary sale is currently active. 0
     * @param Ended Indicates the secondary sale has ended. 1
     */
    enum SecondarySaleState {
        OnGoing,
        Ended
    }

    ///////////////////////////State Variables////////////////////////////////////

    /**
     * @dev Base constant used for percentage calculations (denominator for basis points).
     */
    uint256 private constant BASE = 10_000;

    /**
     * @dev Constant representing the price of ROCKS in USDC.
     */
    uint256 private constant ROCKSPRICE = 400e18;

    /**
     * @dev Address of the USDC token contract.
     */
    address private USDC = 0x49c2D5e6F839E923b74CBBa69E640942149Bcf56;

    /**
     * @dev Address of the STAY token contract.
     */
    address private constant STAY = 0x8423cEcE3CE700D2101822ed4040C5E6a55E0D95;
    /**
     * @dev Address of the WBNB token contract.
     */
    address private constant WBNB = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9;

    /**
     * @dev Address of the ROCKS NFT contract.
     */
    address private constant ROCKS = 0x6D1f3f71D22Bcc94C0872Cff17Ab14ABc393c003;

    /**
     * @dev Address of the router contract used for token swaps.
     */
    address private constant ROUTER =
        0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008;

    /**
     * @dev Address of the manager wallet.
     */
    address private _managerWallet;

    /**
     * @dev Treasury wallet that receives protocol USDC (fees/allocations).
     */
    address private _treasuryWallet;

    /**
     * @dev Indicates whether secondary–sale functionality is currently paused.
     */
    bool private _isPaused;

    /**
     * @dev Counter for the total number of secondary listings.
     */
    uint256 private _listingIds;

    /**
     * @dev Fee for primary sales in basis points, represented in basis points (e.g., 250 = 2.5%).
     */
    uint256 private _primarySaleFeeBips;

    /**
     * @dev Fee for secondary sales in basis points, represented in basis points (e.g., 125 = 1.25%).
     */
    uint256 private _secondarySaleFeeBips;

    /**
     * @dev Default referral commission fee in basis points, represented in basis points (e.g., 1000 = 10%).
     */
    uint256 private _defaultReferralBips;

    /**
     * @dev Instance of the USDC token interface.
     */
    IERC20 private _helperUSDC = IERC20(USDC);

    /**
     * @dev Instance of the USDC token interface.
     */
    IERC20 private _helperStay = IERC20(STAY);

    /**
     * @dev Instance of the router interface for token swaps.
     */
    IRouter private _helperRouter = IRouter(ROUTER);

    /**
     * @dev Instance of the ROCKS NFT interface.
     */
    IERC721 private _helperRocks = IERC721(ROCKS);

    /**
     * @dev Instance of the RWA token contract interface.
     */
    IRWA private _helperRWA;

    /**
     * @dev Chainlink AggregatorV3 interface used to fetch the USDC/BNB price.
     */
    AggregatorV3Interface private priceFeed;

    /**
     * @dev Mapping of property IDs to their primary sale listings.
     */
    mapping(uint256 => PrimaryListing) private _primaryListing;

    /**
     * @dev Mapping of users to their referral addresses.
     */
    mapping(address => address) private _referral;

    /**
     * @dev Mapping of addresses to their exclusive referral fee percentages.
     */
    mapping(address => uint256) private _exclusiveReferralBips;

    /**
     * @dev Mapping of valid currencies supported in the marketplace.
     */
    mapping(address => bool) private _validCurrencies;

    /**
     * @dev Mapping of secondary listing IDs to their respective listings.
     */
    mapping(uint256 => SecondaryListing) private _secondaryListing;

    /**
     * @dev Mapping to track the history of secondary listings for a user and property.
     * The first key is the user's address, and the second key is the property ID.
     */
    mapping(address => mapping(uint256 => bool))
        private _secondaryListingHistory;

    /// @dev Tracks which agent addresses are whitelisted for referral or special actions.
    /// @notice _whitelistedAgents[agent] returns true if the agent is whitelisted.
    mapping(address => bool) private _whitelistedAgents;

    //////////////////////////////////////Events////////////////////////////////////////

    /**
     * @notice Emitted when the status of a primary sale changes.
     * @param _propertyId The ID of the property associated with the sale.
     * @param _status The new status of the primary sale.
     */
    event PrimarySaleStatus(uint256 _propertyId, PrimarySaleState _status);

    /**
     * @notice Emitted when the status of a secondary sale changes.
     * @param _seller The address of the seller in the secondary sale.
     * @param _listingId The ID of the secondary sale listing.
     * @param _propertyId The ID of the property associated with the sale.
     * @param _status The new status of the secondary sale.
     */
    event SecondarySaleStatus(
        address indexed _seller,
        uint256 _listingId,
        uint256 _propertyId,
        SecondarySaleState _status
    );

    /**
     * @notice Emitted when shares are purchased in a primary sale.
     * @param _buyer The address of the buyer.
     * @param _propertyId The ID of the property associated with the purchase.
     * @param _sharesBought The number of shares bought.
     * @param _amount The total amount paid for the shares.
     */
    event PrimarySharesBought(
        address indexed _buyer,
        uint256 _propertyId,
        uint256 _sharesBought,
        uint256 _amount
    );

    /**
     * @notice Emitted when shares are purchased in a secondary sale.
     * @param _seller The address of the seller.
     * @param _buyer The address of the buyer.
     * @param _propertyId The ID of the property associated with the purchase.
     * @param _sharesBought The number of shares bought.
     * @param _amount The total amount paid for the shares.
     */
    event SecondarySharesBought(
        address indexed _seller,
        address indexed _buyer,
        uint256 _propertyId,
        uint256 _sharesBought,
        uint256 _amount
    );

    /**
     * @notice Emitted when the fee for primary sales is updated.
     * @param _by The address of the user who updated the fee.
     * @param _oldFee The previous primary sale fee in basis points.
     * @param _newFee The new primary sale fee in basis points.
     */
    event PrimaryFeeUpdated(
        address indexed _by,
        uint256 _oldFee,
        uint256 _newFee
    );

    /**
     * @notice Emitted when the fee for secondary sales is updated.
     * @param _by The address of the user who updated the fee.
     * @param _oldFee The previous secondary sale fee in basis points.
     * @param _newFee The new secondary sale fee in basis points.
     */
    event SecondaryFeeUpdated(
        address indexed _by,
        uint256 _oldFee,
        uint256 _newFee
    );

    /**
     * @notice Emitted when the manager wallet is updated.
     * @param _by The address of the entity that triggered the update.
     * @param _oldWallet The previous manager wallet address.
     * @param _newWallet The new manager wallet address.
     */
    event ManagerWalletUpdated(
        address indexed _by,
        address _oldWallet,
        address _newWallet
    );

    /**
     * @notice Emitted when a referral is added for a user.
     * @param _by The address of the user who added the referral.
     * @param _referee The address of the referee (referred user).
     */
    event ReferralAdded(address indexed _by, address indexed _referee);

    /**
     * @notice Emitted when a referral commission is distributed.
     * @param _referee The address of the referee (referred user).
     * @param _referral The address of the referral agent.
     * @param _propertyId The ID of the property associated with the commission.
     * @param _sharesSold The number of shares sold that triggered the commission.
     * @param _investment The total investment amount in USDC.
     * @param _commission The amount of commission distributed in USDC.
     */
    event Commission(
        address indexed _referee,
        address indexed _referral,
        uint256 _propertyId,
        uint256 _sharesSold,
        uint256 _investment,
        uint256 _commission
    );

    /**
     * @notice Emitted when the referral fee is updated.
     * @param _by The address of the user who updated the referral fee.
     * @param _oldFee The previous referral fee in basis points.
     * @param _newFee The new referral fee in basis points.
     */
    event ReferralFeeUpdated(
        address indexed _by,
        uint256 _oldFee,
        uint256 _newFee
    );

    /**
     * @notice Emitted when an agent's whitelist status is updated.
     * @param _owner The address of the contract owner who performed the action.
     * @param _agent The address of the agent whose whitelist status was changed.
     * @param _isWhitelisted The updated whitelist status (true = whitelisted, false = removed).
     */
    event AgentWhitelistUpdated(
        address indexed _owner,
        address indexed _agent,
        bool _isWhitelisted
    );

    /**
     * @notice Emitted when exclusive referral bips are set or updated for an agent.
     * @param _agent The address of the agent receiving the exclusive referral bips.
     * @param _bips The bips value assigned to the agent.
     */
    event ExclusiveReferralBipsUpdated(address indexed _agent, uint256 _bips);

    /**
     * @notice Emitted when the default referral commission is updated.
     * @param _oldReferralBips The previous default referral bips.
     * @param _newReferralBips The new default referral bips set by the owner.
     */
    event DefaultReferralBipsUpdated(
        uint256 _oldReferralBips,
        uint256 _newReferralBips
    );

    /**
     * @notice Emitted when a performance fee is distributed to a recipient.
     * @param _recipient The address receiving the performance fee.
     * @param _propertyId The ID of the property the fee relates to.
     * @param _amount The amount of the performance fee distributed.
     * @param _monthTimestamp The timestamp representing the month of distribution.
     */
    event PerformanceFeeDistributed(
        address indexed _recipient,
        uint256 _propertyId,
        uint256 _amount,
        uint256 _monthTimestamp
    );

    //////////////////////////////////////Modifiers///////////////////////////////////

    /**
     * @notice Restricts access to functions that can only be called by an authorized contract.
     * @param _sender The address of the caller to be verified.
     * @dev Reverts with `ActionRestricted` if the caller is not the authorized contract.
     */
    modifier onlyAuthorizer(address _sender) {
        if (_sender != address(_helperRWA)) revert ActionRestricted();
        _;
    }

    /**
     * @notice Prevents execution of functions when secondary sales are paused.
     * @dev Reverts with `SecondarySaleIsDisabled` if `_isPaused` is true.
     */
    modifier whenNotPaused() {
        if (_isPaused) revert SecondarySaleIsDisabled();
        _;
    }

    /**
     * @notice Restricts access to functions that can only be called by manager.
     * @param _sender The address of the caller to be verified.
     * @dev Reverts with `ActionRestricted` if the caller is not the manager.
     */
    modifier onlyManager(address _sender) {
        if (_sender != address(_managerWallet)) revert ActionRestricted();
        _;
    }

    /**
     * @notice Allows the contract to accept Ether payments.
     * @dev This function enables the contract to receive Ether without any data payload.
     */
    receive() external payable {}

    /**
     * @notice Fallback function to handle any unexpected calls to the contract.
     * @dev This function is invoked when a call to the contract does not match any function signature.
     */
    fallback() external payable {}

    /**
     * @notice Initializes the marketplace with core addresses, fees, and default settings.
     * @param _rwaAddress      Address of the RWA token contract.
     * @param _managerAddr     Address of the manager wallet (operational actions, etc.).
     * @param _treasuryAddr    Address of the treasury wallet (fee/USDC accumulation).
     * @param _primarySaleFee  Primary-sale fee in basis points (BIPs).
     * @param _seconarySaleFee Secondary-sale fee in basis points (BIPs). // NOTE: keep param name spelling or rename variable.
     * @param _referralBips    Default referral commission in basis points (BIPs).
     * @dev
     * - Stores helper interfaces/wallets and fee parameters.
     * - Marks native BNB (`address(0)`) and USDC as valid currencies.
     * - Sets `_isPaused = true` so the trading on secondary market is disabled until explicitly unpaused.
     * - Ownership is assigned to the deployer via `Ownable(_msgSender())`.
     * - Oracle feed wiring is commented out and must be updated for mainnet before enabling.
     */
    constructor(
        address _rwaAddress,
        address _managerAddr,
        address _treasuryAddr,
        uint256 _primarySaleFee,
        uint256 _seconarySaleFee,
        uint256 _referralBips
    ) Ownable(_msgSender()) {
        _helperRWA = IRWA(_rwaAddress);
        _managerWallet = _managerAddr;
        _treasuryWallet = _treasuryAddr;
        _primarySaleFeeBips = _primarySaleFee;
        _secondarySaleFeeBips = _seconarySaleFee;
        _defaultReferralBips = _referralBips;
        _validCurrencies[address(0)] = true;
        _validCurrencies[USDC] = true;
        _isPaused = true;
        // priceFeed = AggregatorV3Interface(
        //     0x45f86CA2A8BC9EBD757225B19a1A0D7051bE46Db // TODO:: change this for mainnet as 0x45f86CA2A8BC9EBD757225B19a1A0D7051bE46Db usdc => bnb
        // );
    }

    //////////////////////////////Main functions/////////////////////////////////

    /**
     * @notice Adds a new property to the marketplace with a primary sale listing.
     * @param _propertyId The ID of the property to add.
     * @param _totalShares The total number of shares available for the property.
     * @dev Sets the primary sale status to `UpComing` and initializes the total and remaining shares.
     *      Can only be called by an authorized contract.
     */
    function addProperty(
        uint256 _propertyId,
        uint256 _totalShares
    ) external onlyAuthorizer(_msgSender()) {
        PrimaryListing memory _listing = _primaryListing[_propertyId];

        _listing.status = PrimarySaleState.UpComing;
        _listing.totalShares = _totalShares;
        _listing.sharesRemaining = _totalShares;
        _primaryListing[_propertyId] = _listing;
        emit PrimarySaleStatus(_propertyId, PrimarySaleState.UpComing);
    }

    /**
     * @notice Buys primary shares in bulk across multiple properties.
     * @param _recipient The address receiving the purchased shares.
     * @param _currency The payment currency (e.g., USDC or BNB).
     * @param _referralAddress Optional address of the referrer/agent.
     * @param _order The array of order objects containing property IDs and amounts to purchase.
     * @dev Handles multiple primary share purchases in one transaction. Calculates fees,
     * distributes referral commissions, and handles USDC or BNB payments accordingly.
     * Ensures all business rules like registration, referral, and availability are enforced.
     */
    function bulkBuyPrimaryShares(
        address _recipient,
        address _currency,
        address _referralAddress,
        Order[] memory _order
    ) external payable {
        if (!_validCurrencies[_currency]) revert InvalidCurrency();
        address _sender = _msgSender();
        address _paymentReceiver = owner();

        bool _isRegistered = _helperRWA.isRegistered(_recipient);
        bool _byPass;
        if (!_isRegistered && _referralAddress != address(0)) {
            _addReferral(_recipient, _referralAddress);
            _byPass = true;
        }

        PaymentInfo memory bulkPaymentInfo;
        (bulkPaymentInfo.agent, ) = _getRefereeAndAmount(_recipient, 0, false);

        for (uint256 i = 0; i < _order.length; i++) {
            _handleOrderProcessing(
                _recipient,
                _order[i],
                bulkPaymentInfo,
                _byPass
            );
        }

        uint256 _usdcQuotationWithFee = bulkPaymentInfo.usdcQuotation +
            bulkPaymentInfo.marketFees;

        bulkPaymentInfo.finalAmount =
            _usdcQuotationWithFee -
            bulkPaymentInfo.referralAmount -
            bulkPaymentInfo.marketFees;

        if (_currency == address(0)) {
            uint256 _convertedUsdc = _convertBNB(msg.value);
            if (_usdcQuotationWithFee > _convertedUsdc) revert InvalidAmount();
            _sendUSDC(
                address(this),
                _paymentReceiver,
                bulkPaymentInfo.finalAmount
            );
            if (_convertedUsdc > _usdcQuotationWithFee) {
                _sendUSDC(
                    address(this),
                    _recipient,
                    (_convertedUsdc - _usdcQuotationWithFee)
                );
            }
        } else {
            _sendUSDC(_sender, _paymentReceiver, bulkPaymentInfo.finalAmount);
            _sendUSDC(_sender, address(this), bulkPaymentInfo.marketFees);
        }

        if (bulkPaymentInfo.referralAmount > 0) {
            _sendUSDC(
                _currency == address(0) ? address(this) : _sender,
                bulkPaymentInfo.agent,
                bulkPaymentInfo.referralAmount
            );
        }

        _sendHalfToTreasuryAndBurnStay(bulkPaymentInfo.marketFees);
    }

    /**
     * @notice Buys shares during the primary sale of a property.
     * @param _recipient The address of the recipient of the purchased shares.
     * @param _currency The currency used for the purchase (e.g., USDC, BNB).
     * @param _propertyId The ID of the property being purchased.
     * @param _usdcAmount The amount of USDC used for the purchase.
     * @param _noOfRocks The number of ROCKS NFTs used for payment (optional).
     * @param _referralAddress The address of the agent or referrer associated with this purchase (optional).
     * @dev Transfers the purchased shares to the recipient and updates the sale status if all shares are sold.
     */
    function buyPrimaryShares(
        address _recipient,
        address _currency,
        uint256 _propertyId,
        uint256 _usdcAmount,
        uint256 _noOfRocks,
        address _referralAddress
    ) external payable {
        address _sender = _msgSender();
        address _paymentReceiver = owner();

        uint256 _pricePerShare = _helperRWA
            .getProperty(_propertyId)
            .pricePerShare;
        if (_noOfRocks == 0 && _pricePerShare > _usdcAmount)
            revert InvalidAmount();

        PrimaryListing memory _property = _primaryListing[_propertyId];
        if (_property.status != PrimarySaleState.OnGoing)
            revert PrimarySaleDoesNotExists();
        bool _isRegistered = _helperRWA.isRegistered(_recipient);
        if (!_isRegistered && _referralAddress != address(0))
            _addReferral(_recipient, _referralAddress);

        uint256 _sharesToBuy;
        if (_noOfRocks > 0) {
            _sharesToBuy = _processRockPayment(
                _sender,
                _paymentReceiver,
                _noOfRocks,
                _pricePerShare,
                _property.sharesRemaining
            );
        } else {
            if (!_validCurrencies[_currency]) revert InvalidCurrency();
            _sharesToBuy = _processCurrencyPayment(
                _sender,
                _recipient,
                _currency,
                _paymentReceiver,
                _propertyId,
                _usdcAmount,
                _pricePerShare,
                _property.sharesRemaining
            );
        }

        _property.sharesRemaining -= _sharesToBuy;
        if (_property.sharesRemaining == 0) {
            _property.status = PrimarySaleState.Ended;
            emit PrimarySaleStatus(_propertyId, PrimarySaleState.Ended);
        }
        _primaryListing[_propertyId] = _property;

        _helperRWA.safeTransferFrom(
            address(this),
            _recipient,
            _propertyId,
            _sharesToBuy,
            ""
        );
        emit PrimarySharesBought(
            _recipient,
            _propertyId,
            _sharesToBuy,
            (_pricePerShare * _sharesToBuy)
        );
    }

    /**
     * @notice Sends primary shares of a property to a recipient.
     * @param _recipient The address receiving the shares.
     * @param _referralAddress The address of the agent who will get the commission.
     * @param _propertyId The ID of the property whose shares are being sent.
     * @param _sharesToSend The number of shares to send to the recipient.
     * @dev This function allows a manager to send shares of a property during its primary sale.
     */
    function sendPrimaryShares(
        address _recipient,
        address _referralAddress,
        uint256 _propertyId,
        uint256 _sharesToSend
    ) external payable onlyManager(_msgSender()) {
        uint256 _pricePerShare = _helperRWA
            .getProperty(_propertyId)
            .pricePerShare;

        uint256 _totalAmount = _pricePerShare * _sharesToSend;

        PrimaryListing memory _property = _primaryListing[_propertyId];
        if (_property.status != PrimarySaleState.OnGoing)
            revert PrimarySaleDoesNotExists();
        if (_sharesToSend > _property.sharesRemaining)
            revert NotEnoughSharesAvailable();
        if (_sharesToSend == 0) revert InvalidShares();
        if (_totalAmount == 0) revert InvalidAmount();

        bool _isRegistered = _helperRWA.isRegistered(_recipient);
        if (!_isRegistered) {
            _sendBNB(_recipient, _getNewUserBonus());
            if (_referralAddress != address(0))
                _addReferral(_recipient, _referralAddress);
        }

        (address _agent, uint256 _referralAmount) = _getRefereeAndAmount(
            _recipient,
            _totalAmount,
            false
        );

        if (_referralAmount > 0) {
            _sendUSDC(owner(), _agent, _referralAmount);
            emit Commission(
                _agent,
                _recipient,
                _propertyId,
                _sharesToSend,
                _totalAmount,
                _referralAmount
            );
        }

        _property.sharesRemaining -= _sharesToSend;
        if (_property.sharesRemaining == 0) {
            _property.status = PrimarySaleState.Ended;
            emit PrimarySaleStatus(_propertyId, PrimarySaleState.Ended);
        }
        _primaryListing[_propertyId] = _property;

        _helperRWA.safeTransferFrom(
            address(this),
            _recipient,
            _propertyId,
            _sharesToSend,
            ""
        );
        emit PrimarySharesBought(
            _recipient,
            _propertyId,
            _sharesToSend,
            _totalAmount
        );
    }

    /**
     * @notice Creates a secondary sale listing for a property.
     * @param _propertyId The ID of the property to be listed.
     * @param _noOfShares The number of shares to list for sale.
     * @param _pricePerShare The price per share in the listing.
     * @param _endTime The duration (in seconds) before the listing expires.
     * @dev Verifies the user's ownership and approval before creating the listing.
     */
    function startSecondarySale(
        uint256 _propertyId,
        uint256 _noOfShares,
        uint256 _pricePerShare,
        uint256 _endTime
    ) external whenNotPaused {
        address _sender = _msgSender();
        uint256 _userShares = _helperRWA.balanceOf(_sender, _propertyId);

        if (_primaryListing[_propertyId].status != PrimarySaleState.Ended)
            revert PrimarySaleNotEndedYet();
        if (_secondaryListingHistory[_sender][_propertyId])
            revert AlreadyListed();
        if (_noOfShares > _userShares) revert NotEnoughBalance();
        if (_pricePerShare == 0) revert InvalidPrice();
        if (!_helperRWA.isApprovedForAll(_sender, address(this)))
            revert NotApproved();
        _listingIds++;
        uint256 _nextId = _listingIds;
        SecondaryListing memory _listing = _secondaryListing[_nextId];

        _listing.seller = _sender;
        _listing.propertyId = _propertyId;
        _listing.pricePerShare = _pricePerShare;
        _listing.sharesRemaining = _noOfShares;
        if (_endTime > 0) _listing.endTime = block.timestamp + _endTime;
        _secondaryListing[_nextId] = _listing;
        _secondaryListingHistory[_sender][_propertyId] = true;
        emit SecondarySaleStatus(
            _sender,
            _nextId,
            _propertyId,
            SecondarySaleState.OnGoing
        );
    }

    /**
     * @notice Updates an existing secondary sale listing.
     * @param _listingId The ID of the listing to update.
     * @param _noOfShares The new number of shares to list for sale.
     * @param _pricePerShare The new price per share in the listing.
     * @dev Allows the seller to modify the number of shares and price per share of an active listing.
     *      Reverts if the caller is not the owner of the listing.
     */
    function updateSecondarySale(
        uint256 _listingId,
        uint256 _noOfShares,
        uint256 _pricePerShare
    ) external whenNotPaused {
        address _sender = _msgSender();
        SecondaryListing memory _listing = _secondaryListing[_listingId];
        if (_listing.seller != _sender) revert SaleNotFound();
        if (_pricePerShare > 0) _listing.pricePerShare = _pricePerShare;
        if (_noOfShares > 0) {
            uint256 _userShares = _helperRWA.balanceOf(
                _sender,
                _listing.propertyId
            );
            if (_noOfShares > _userShares) revert NotEnoughBalance();
            _listing.sharesRemaining = _noOfShares;
        }

        _secondaryListing[_listingId] = _listing;
    }

    /**
     * @notice Cancels an existing secondary sale listing.
     * @param _listingId The ID of the listing to cancel.
     * @dev Removes the listing from the marketplace. Reverts if the caller is not the owner of the listing.
     */
    function cancelSecondarySale(uint256 _listingId) external {
        address _sender = _msgSender();
        SecondaryListing memory _listing = _secondaryListing[_listingId];
        if (_listing.seller != _sender) revert SaleNotFound();
        _deleteSecondaryListing(_sender, _listingId, _listing.propertyId);
    }

    /**
     * @notice Buys shares from a secondary sale listing.
     * @param _recipient The address of the recipient of the purchased shares.
     * @param _currency The currency used for the purchase (e.g., USDC, BNB).
     * @param _listingId The ID of the secondary sale listing.
     * @param _usdcAmount The amount of USDC used for the purchase.
     * @dev Transfers the purchased shares to the recipient and distributes payment to the seller and platform.
     *      Reverts if the listing is invalid, expired, or insufficient shares are available.
     */
    function buySecondaryShares(
        address _recipient,
        address _currency,
        uint256 _listingId,
        uint256 _usdcAmount
    ) external payable whenNotPaused {
        address _sender = _msgSender();
        // address _marketplaceOwner = owner();
        if (!_validCurrencies[_currency]) revert InvalidCurrency();
        SecondaryListing memory _listing = _secondaryListing[_listingId];
        if (_listing.pricePerShare > _usdcAmount) revert InvalidAmount();
        if (_listing.seller == address(0)) revert SaleNotFound();
        if (_listing.seller == _recipient) revert CantBuyYourListing();
        if (_listing.endTime != 0 && block.timestamp > _listing.endTime)
            revert SaleExpired();

        (
            uint256 _sharesToBuy,
            uint256 _totalFee,
            uint256 _usdcRequired,
            uint256 _sellerAmount
        ) = _calculateFeesAndFinalAmount(_usdcAmount, _listing.pricePerShare);

        if (_sharesToBuy > _listing.sharesRemaining)
            revert NotEnoughSharesAvailable();

        if (_currency == address(0)) {
            uint256 _convertedUsdc = _convertBNB(msg.value);
            if (_usdcRequired > _convertedUsdc) revert InvalidAmount();
            _sendUSDC(address(this), _listing.seller, _sellerAmount);

            if (_convertedUsdc > _usdcRequired)
                _sendUSDC(
                    address(this),
                    _recipient,
                    (_convertedUsdc - _usdcRequired)
                );
        } else {
            _sendUSDC(_sender, _listing.seller, _sellerAmount);
            _sendUSDC(_sender, address(this), _totalFee);
        }

        _listing.sharesRemaining -= _sharesToBuy;

        if (_listing.sharesRemaining > 0)
            _secondaryListing[_listingId] = _listing;
        else
            _deleteSecondaryListing(
                _listing.seller,
                _listingId,
                _listing.propertyId
            );
        _helperRWA.safeTransferFrom(
            _listing.seller,
            _recipient,
            _listing.propertyId,
            _sharesToBuy,
            ""
        );
        _sendHalfToTreasuryAndBurnStay(_totalFee);
        emit SecondarySharesBought(
            _listing.seller,
            _recipient,
            _listing.propertyId,
            _sharesToBuy,
            (_sharesToBuy * _listing.pricePerShare)
        );
    }

    //////////////////////////////Only Owner functions/////////////////////////////////

    /**
     * @notice Starts the primary sale for a property.
     * @param _propertyId The ID of the property whose primary sale is to be started.
     * @dev Changes the primary sale status to `OnGoing`.
     *      Reverts if the primary sale is not in the `UpComing` state.
     */
    function startPrimarySale(uint256 _propertyId) external onlyOwner {
        PrimaryListing memory _listing = _primaryListing[_propertyId];
        if (_listing.status == PrimarySaleState.None)
            revert PropertyNotExists();
        if (_listing.status != PrimarySaleState.UpComing)
            revert PrimarySaleAlreadyStarted();
        _listing.status = PrimarySaleState.OnGoing;
        _primaryListing[_propertyId] = _listing;
        emit PrimarySaleStatus(_propertyId, PrimarySaleState.OnGoing);
    }

    /**
     * @notice Sets an exclusive referral commission for a specific agent.
     * @param _agent The address of the referral agent.
     * @param _bips The referral commission in basis points.
     * @dev Overrides the default referral fee for the specified agent.
     */
    function addExclusiveReferralBips(
        address _agent,
        uint256 _bips
    ) external onlyOwner {
        if (_agent == address(0)) revert Invalid_agent();
        if (_bips > BASE || _exclusiveReferralBips[_agent] == _bips)
            revert InvalidReferralBips();

        _exclusiveReferralBips[_agent] = _bips;

        emit ExclusiveReferralBipsUpdated(_agent, _bips);
    }

    /**
     * @notice Updates the default referral commission in basis points.
     * @param _newReferralBips The new default referral bips to be set.
     * @dev Reverts if the new value is zero, exceeds the BASE, or matches the current default.
     */
    function changeDefaultReferralBips(
        uint256 _newReferralBips
    ) external onlyOwner {
        uint256 _oldReferralBips = _defaultReferralBips;
        if (
            _newReferralBips == 0 ||
            _oldReferralBips == _newReferralBips ||
            _newReferralBips > BASE
        ) revert InvalidReferralBips();
        _defaultReferralBips = _newReferralBips;
        emit DefaultReferralBipsUpdated(_oldReferralBips, _newReferralBips);
    }

    /**
     * @notice Updates the whitelist status of a referral agent.
     * @param _agent The address of the agent to be whitelisted or removed from the whitelist.
     * @param _status The desired whitelist status (true = whitelisted, false = removed).
     * @dev Only callable by the contract owner.
     *      Reverts if the address is invalid or if the status is already set.
     */
    function updateAgentWhitelistStatus(
        address _agent,
        bool _status
    ) external onlyOwner {
        if (_agent == address(0)) revert InvalidAddress();
        if (_whitelistedAgents[_agent] == _status) revert SameAction();
        _whitelistedAgents[_agent] = _status;
        emit AgentWhitelistUpdated(owner(), _agent, _status);
    }

    /**
     * @notice Ends the primary sale for a property.
     * @param _propertyId The ID of the property whose primary sale is to be ended.
     * @dev Transfers any remaining shares back to the owner and updates the sale status to `Ended`.
     */
    function endPrimarySale(uint256 _propertyId) external onlyOwner {
        address _sender = _msgSender();
        PrimaryListing memory _property = _primaryListing[_propertyId];
        if (_property.status != PrimarySaleState.OnGoing)
            revert PrimarySaleDoesNotExists();
        uint256 _sharesToSend = _property.sharesRemaining;
        _property.status = PrimarySaleState.Ended;
        _property.sharesRemaining = 0;
        _primaryListing[_propertyId] = _property;
        _helperRWA.safeTransferFrom(
            address(this),
            _sender,
            _propertyId,
            _sharesToSend,
            ""
        );
        emit PrimarySaleStatus(_propertyId, PrimarySaleState.Ended);
    }

    /**
     * @notice Updates the platform fee manager wallet address.
     * @param _newManagerWallet The new address to be set as the manager wallet.
     * @dev This function allows the contract owner to update the `_managerWallet` to a new address.
     */
    function changeManager(address _newManagerWallet) external onlyOwner {
        address _sender = _msgSender();
        address _oldManagerWallet = _managerWallet;
        if (
            _oldManagerWallet == _newManagerWallet ||
            _newManagerWallet == address(0)
        ) revert InvalidAddress();
        _managerWallet = _newManagerWallet;
        emit ManagerWalletUpdated(
            _sender,
            _oldManagerWallet,
            _newManagerWallet
        );
    }

    /**
     * @notice Updates the platform fees for primary and secondary sales, and the referral commission.
     * @param _newPrimarySaleBips The new fee for primary sales in basis points.
     * @param _newSecondarySaleBips The new fee for secondary sales in basis points.
     * @param _newReferralBips The new referral commission fee in basis points.
     * @dev Allows the owner to adjust fees charged for marketplace transactions.
     *      Reverts if the new fee values exceed the `BASE` constant.
     */
    function changePlatformFee(
        uint256 _newPrimarySaleBips,
        uint256 _newSecondarySaleBips,
        uint256 _newReferralBips
    ) external onlyOwner {
        address _sender = _msgSender();
        if (_newPrimarySaleBips > 0) {
            if (_newPrimarySaleBips >= BASE) revert InvalidFeeAmount();
            emit PrimaryFeeUpdated(
                _sender,
                _primarySaleFeeBips,
                _newPrimarySaleBips
            );
            _primarySaleFeeBips = _newPrimarySaleBips;
        }
        if (_newSecondarySaleBips > 0) {
            if (_newSecondarySaleBips >= BASE) revert InvalidFeeAmount();
            emit SecondaryFeeUpdated(
                _sender,
                _secondarySaleFeeBips,
                _newSecondarySaleBips
            );
            _secondarySaleFeeBips = _newSecondarySaleBips;
        }
        if (_newReferralBips > 0) {
            if (_newReferralBips >= BASE) revert InvalidFeeAmount();
            emit ReferralFeeUpdated(
                _sender,
                _defaultReferralBips,
                _newReferralBips
            );
            _defaultReferralBips = _newReferralBips;
        }
    }

    /**
     * @notice Distributes performance fees to a list of recipients.
     * @param distributions An array of `FeeDistribution` structs, each containing:
     *   - `recipient`: the address to receive the fee
     *   - `amount`: the USDC amount to transfer
     * @param _propertyId The identifier of the property for which fees are being distributed.
     * @param _monthTimestamp UNIX timestamp (at month granularity) indicating the distribution period.
     * @dev Iterates through `distributions`, pulls USDC from `msg.sender`,
     *      transfers each amount to its recipient, and emits `PerformanceFeeDistributed`.
     *      Reverts if any `transferFrom` call fails.
     */
    function distributePerformanceFees(
        FeeDistribution[] calldata distributions,
        uint256 _propertyId,
        uint256 _monthTimestamp
    ) external onlyOwner {
        address _sender = _msgSender();
        for (uint256 i = 0; i < distributions.length; ++i) {
            FeeDistribution calldata fd = distributions[i];

            _helperUSDC.transferFrom(_sender, fd.recipient, fd.amount);
            emit PerformanceFeeDistributed(
                fd.recipient,
                _propertyId,
                fd.amount,
                _monthTimestamp
            );
        }
    }

    /**
     * @notice Toggles the paused state of all secondary–sale functionality.
     * @dev Flips the internal `_isPaused` flag. When paused, any function
     *      guarded by `whenNotPaused` will revert with `SecondarySaleIsDisabled()`.
     *      Only callable by the contract owner.
     */
    function toggleSecondarySalePaused() external onlyOwner {
        // flip paused flag; no events emitted
        _isPaused = !_isPaused;
    }

    /**
     * @notice Withdraws the entire balance of native BNB or an ERC20 token (e.g., USDC) to the admin (contract owner).
     * @param _token The token to withdraw. Use `address(0)` to withdraw native BNB; otherwise pass the ERC20 token address.
     * @dev
     * - Callable only by the owner (`onlyOwner`).
     * - Sends all available balance of the specified asset to `owner()`.
     * - Uses custom errors and `if` checks instead of `require`.
     * @custom:error InvalidAmount Thrown when the contract holds zero balance of the requested asset.
     * @custom:error TransferFailed Thrown when the native BNB transfer low-level call returns false.
     */
    function withdrawFunds(address _token) external onlyOwner {
        address payable admin = payable(owner());

        if (_token == address(0)) {
            // ---- Native BNB ----
            uint256 bal = address(this).balance;
            if (bal == 0) revert InvalidAmount();

            (bool ok, ) = admin.call{value: bal}("");
            if (!ok) revert TransferFailed();
        } else {
            // ---- ERC20 (USDC etc.) ----
            IERC20 _tokenHelper = IERC20(_token);
            uint256 bal = _tokenHelper.balanceOf(address(this));
            if (bal == 0) revert InvalidAmount();
            _tokenHelper.transfer(admin, bal);
        }
    }
    //////////////////////////////Private functions/////////////////////////////////

    /**
     * @notice Handles payment using ROCKS NFTs during a primary sale.
     * @param _sender The address of the buyer.
     * @param _paymentReceiver The address receiving the payment (typically the marketplace owner).
     * @param _noOfRocks The number of ROCKS NFTs used for payment.
     * @param _pricePerShare The price of a single share in USDC.
     * @param _sharesRemaining The number of shares remaining in the primary sale.
     * @return _sharesToBuy The number of shares the buyer is eligible to purchase.
     * @dev Transfers ROCKS NFTs from the buyer to the payment receiver and calculates the number of shares to purchase.
     *      Reverts if the buyer does not have enough ROCKS or the shares exceed the remaining supply.
     */
    function _processRockPayment(
        address _sender,
        address _paymentReceiver,
        uint256 _noOfRocks,
        uint256 _pricePerShare,
        uint256 _sharesRemaining
    ) private returns (uint256) {
        uint256 _rocksInUSDC = _noOfRocks * ROCKSPRICE;
        uint256 _usdcAmount = _rocksInUSDC * 2;
        (uint256 _sharesToBuy, uint256 _usdcQuotation, ) = _getQuote(
            _usdcAmount,
            _pricePerShare
        );
        if (_sharesToBuy == 0) revert InvalidShares();
        if (_sharesToBuy > _sharesRemaining) revert NotEnoughSharesAvailable();

        uint256[] memory tokenIds = _helperRocks.walletOfOwner(_sender);
        if (_noOfRocks > tokenIds.length) revert NotEnoughNFTS();
        if (!_helperRocks.isApprovedForAll(_sender, address(this)))
            revert NotApproved();

        for (uint256 i; i < _noOfRocks; ++i) {
            _helperRocks.transferFrom(_sender, _paymentReceiver, tokenIds[i]);
        }

        _sendUSDC(_sender, _paymentReceiver, (_usdcQuotation - _rocksInUSDC));

        return _sharesToBuy;
    }

    /**
     * @notice Handles payment using a currency (e.g., USDC or BNB) during a primary sale.
     * @param _sender The address of the buyer.
     * @param _recipient The address receiving the shares.
     * @param _currency The currency used for the payment.
     * @param _paymentReceiver The address receiving the payment (typically the marketplace owner).
     * @param _propertyId The ID of the property being purchased.
     * @param _usdcAmount The amount of USDC used for the payment.
     * @param _pricePerShare The price of a single share in USDC.
     * @param _sharesRemaining The number of shares remaining in the primary sale.
     * @return _sharesToBuy The number of shares the buyer is eligible to purchase.
     * @dev Calculates the required payment, deducts fees, and processes the payment. Handles referral commissions if applicable.
     */
    function _processCurrencyPayment(
        address _sender,
        address _recipient,
        address _currency,
        address _paymentReceiver,
        uint256 _propertyId,
        uint256 _usdcAmount,
        uint256 _pricePerShare,
        uint256 _sharesRemaining
    ) private returns (uint256) {
        uint256 _sharesToBuy;
        PaymentInfo memory paymentInfo;

        (
            _sharesToBuy,
            paymentInfo.usdcQuotation,
            paymentInfo.marketFees
        ) = _getQuote(_usdcAmount, _pricePerShare);

        if (_sharesToBuy == 0) revert InvalidShares();
        if (_sharesToBuy > _sharesRemaining) revert NotEnoughSharesAvailable();

        (paymentInfo.agent, paymentInfo.referralAmount) = _getRefereeAndAmount(
            _recipient,
            paymentInfo.usdcQuotation,
            false
        );
        uint256 _usdcQuotationWithFee = paymentInfo.usdcQuotation +
            paymentInfo.marketFees;

        paymentInfo.finalAmount =
            _usdcQuotationWithFee -
            paymentInfo.referralAmount -
            paymentInfo.marketFees;

        if (_currency == address(0)) {
            uint256 _convertedUsdc = _convertBNB(msg.value);
            if (_usdcQuotationWithFee > _convertedUsdc) revert InvalidAmount();
            _sendUSDC(address(this), _paymentReceiver, paymentInfo.finalAmount);
            if (_convertedUsdc > _usdcQuotationWithFee) {
                _sendUSDC(
                    address(this),
                    _recipient,
                    (_convertedUsdc - _usdcQuotationWithFee)
                );
            }
        } else {
            _sendUSDC(_sender, _paymentReceiver, paymentInfo.finalAmount);
            _sendUSDC(_sender, address(this), paymentInfo.marketFees);
        }

        if (paymentInfo.referralAmount > 0) {
            _sendUSDC(
                _currency == address(0) ? address(this) : _sender,
                paymentInfo.agent,
                paymentInfo.referralAmount
            );
            emit Commission(
                paymentInfo.agent,
                _recipient,
                _propertyId,
                _sharesToBuy,
                _usdcQuotationWithFee,
                paymentInfo.referralAmount
            );
        }

        _sendHalfToTreasuryAndBurnStay(paymentInfo.marketFees);
        return _sharesToBuy;
    }

    /**
     * @notice Deletes a secondary sale listing.
     * @param _seller The address of the seller.
     * @param _listingId The ID of the listing to delete.
     * @param _propertyId The ID of the property associated with the listing.
     * @dev Removes the listing from the marketplace and emits an event to indicate the sale has ended.
     */
    function _deleteSecondaryListing(
        address _seller,
        uint256 _listingId,
        uint256 _propertyId
    ) private {
        delete _secondaryListing[_listingId];
        delete _secondaryListingHistory[_seller][_propertyId];

        emit SecondarySaleStatus(
            _seller,
            _listingId,
            _propertyId,
            SecondarySaleState.Ended
        );
    }

    /**
     * @notice Converts BNB to USDC using the router.
     * @param _bnbAmount The amount of BNB to convert.
     * @return _convertedUsdc The amount of USDC received from the conversion.
     * @dev Uses the router to swap BNB for USDC and returns the resulting amount.
     */
    function _convertBNB(
        uint256 _bnbAmount
    ) private returns (uint256 _convertedUsdc) {
        if (_helperUSDC.allowance(address(this), ROUTER) == 0)
            _helperUSDC.approve(ROUTER, type(uint256).max);
        uint256 _contractBalanceBefore = _helperUSDC.balanceOf(address(this));

        address[] memory _path = new address[](2);
        _path[0] = WBNB;
        _path[1] = USDC;
        _helperRouter.swapExactETHForTokens{value: _bnbAmount}(
            0,
            _path,
            address(this),
            block.timestamp
        );
        uint256 _contractBalanceAfter = _helperUSDC.balanceOf(address(this));
        _convertedUsdc = _contractBalanceAfter - _contractBalanceBefore;
    }

    /**
     * @notice Calculates the new-user bonus based on the current USDC price in BNB, multiplied by 5.
     * @dev Pulls the latest price from `priceFeed`. Reverts if the feed returns a non-positive value.
     *      Assumes the oracle answer uses the same decimals you expect downstream (e.g., 18).
     * @return bonusInBnbUnits The bonus amount expressed in the feed’s base units (price * 5).
     * @custom:error InvalidPrice Thrown when `_oneUsdcPriceInBNB` is <= 0.
     */
    function _getNewUserBonus() private pure returns (uint256 bonusInBnbUnits) {
        // (, int256 _oneUsdcPriceInBNB, , , ) = priceFeed.latestRoundData(); //TODO: change logic for mainnet
        // if (_oneUsdcPriceInBNB <= 0) revert InvalidPrice();
        int256 _oneUsdcPriceInBNB = 1471273307061538; // 0.001471273307061538

        bonusInBnbUnits = uint256(_oneUsdcPriceInBNB) * 5;
    }

    /**
     * @notice Processes a single order within a bulk primary share purchase.
     * @param _recipient The address that will receive the property shares.
     * @param _ord The order object containing property ID and USDC amount.
     * @param bulkPaymentInfo The cumulative payment info for the entire batch.
     * @param _byPass _byPass Used only in bulk buy flows to bypass referral agent eligibility checks.
     * @dev Validates property availability, calculates share quantity and fees,
     * updates listings, tracks referral commissions, and emits related events.
     */
    function _handleOrderProcessing(
        address _recipient,
        Order memory _ord,
        PaymentInfo memory bulkPaymentInfo,
        bool _byPass
    ) private {
        uint256 _propertyId = _ord._propertyId;
        uint256 usdcAmount = _ord._usdcAmount;

        PrimaryListing memory property = _primaryListing[_propertyId];
        if (property.status != PrimarySaleState.OnGoing)
            revert PrimarySaleDoesNotExists();

        uint256 pricePerShare = _helperRWA
            .getProperty(_propertyId)
            .pricePerShare;
        uint256 _sharesToBuy;
        PaymentInfo memory paymentInfo;

        (
            _sharesToBuy,
            paymentInfo.usdcQuotation,
            paymentInfo.marketFees
        ) = _getQuote(usdcAmount, pricePerShare);

        bulkPaymentInfo.marketFees += paymentInfo.marketFees;
        bulkPaymentInfo.usdcQuotation += paymentInfo.usdcQuotation;

        if (_sharesToBuy == 0) revert InvalidShares();
        if (_sharesToBuy > property.sharesRemaining)
            revert NotEnoughSharesAvailable();

        if (bulkPaymentInfo.agent != address(0)) {
            (, paymentInfo.referralAmount) = _getRefereeAndAmount(
                _recipient,
                paymentInfo.usdcQuotation,
                _byPass
            );
            bulkPaymentInfo.referralAmount += paymentInfo.referralAmount;
            uint256 _investment = paymentInfo.usdcQuotation +
                paymentInfo.marketFees;
            emit Commission(
                bulkPaymentInfo.agent,
                _recipient,
                _propertyId,
                _sharesToBuy,
                _investment,
                paymentInfo.referralAmount
            );
        }

        property.sharesRemaining -= _sharesToBuy;
        if (property.sharesRemaining == 0) {
            property.status = PrimarySaleState.Ended;
            emit PrimarySaleStatus(_propertyId, PrimarySaleState.Ended);
        }

        _primaryListing[_propertyId] = property;

        _helperRWA.safeTransferFrom(
            address(this),
            _recipient,
            _propertyId,
            _sharesToBuy,
            ""
        );

        emit PrimarySharesBought(
            _recipient,
            _propertyId,
            _sharesToBuy,
            paymentInfo.usdcQuotation
        );
    }

    /**
     * @notice Sends 50% of the provided USDC to the treasury wallet and uses the remaining 50% to buy STAY and burn it.
     * @param _usdcAmount Total USDC (token units) to process.
     * @dev
     * - Approves the router once if allowance is zero.
     * - Rounds any odd unit toward the STAY leg (`otherHalf = _usdcAmount - half`).
     * - Assumes the contract already holds `_usdcAmount` USDC and that STAY exposes `burn(uint256)`.
     */
    function _sendHalfToTreasuryAndBurnStay(uint256 _usdcAmount) private {
        uint256 half = _usdcAmount / 2;
        uint256 otherHalf = _usdcAmount - half;

        // ---- Send half to treasury ----
        if (half > 0) _helperUSDC.transfer(_treasuryWallet, half);

        // ---- Swap remaining USDC for STAY and burn ----
        if (_helperUSDC.allowance(address(this), ROUTER) == 0) {
            _helperUSDC.approve(address(_helperRouter), type(uint256).max);
        }

        address[] memory _path = new address[](2);
        _path[0] = USDC;
        _path[1] = STAY;

        _helperRouter.swapExactTokensForTokens(
            otherHalf,
            0,
            _path,
            address(this),
            block.timestamp
        );

        uint256 stayBalance = _helperStay.balanceOf(address(this));
        if (stayBalance > 0) _helperStay.burn(stayBalance);
    }

    /**
     * @notice Sends USDC to a specified recipient.
     * @param _from The address sending the USDC.
     * @param _recipient The address receiving the USDC.
     * @param _usdcAmount The amount of USDC to transfer.
     * @dev Transfers USDC directly from the sender or from the contract itself if `_from` is the contract address.
     */
    function _sendUSDC(
        address _from,
        address _recipient,
        uint256 _usdcAmount
    ) private {
        if (_from == address(this))
            _helperUSDC.transfer(_recipient, _usdcAmount);
        else _helperUSDC.transferFrom(_from, _recipient, _usdcAmount);
    }

    /**
     * @notice Sends BNB to a specified recipient.
     * @param _recipient The address receiving the BNB.
     * @param _bnbAmount The amount of BNB to transfer (denominated in wei).
     * @dev Performs a low-level call: `(_recipient).call{value: _bnbAmount}("")`.
     *      Reverts if the call fails or if the contract balance is insufficient.
     */
    function _sendBNB(address _recipient, uint256 _bnbAmount) private {
        uint256 bal = address(this).balance;
        if (bal < _bnbAmount) return;
        (bool success, ) = payable(_recipient).call{value: _bnbAmount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Adds a referral for the caller.
     * @param _client The address of the client being referred.
     * @param _referee The address of the referral agent.
     * @dev Associates the caller with the given referral agent.
     *      Reverts if the referral already exists or if the user is already registered.
     */
    function _addReferral(address _client, address _referee) private {
        if (_referee == _client) revert InvalidReferral();
        _referral[_client] = _referee;
        emit ReferralAdded(_client, _referee);
    }

    ///////////////////////////////////View Functions////////////////////////////////

    /**
     * @notice Retrieves the referral agent and calculates the referral amount for a transaction.
     * @param _recipient The address of the buyer.
     * @param _usdcQuotation The total USDC amount involved in the transaction.
     * @param _byPass Set to true during bulk buy flows to bypass referral agent eligibility checks.
     * @return _agent The address of the referral agent.
     * @return _referralAmount The amount of USDC allocated as referral commission.
     * @dev Uses the referral mapping to identify the agent and calculates the commission based on the applicable referral fee.
     */
    function _getRefereeAndAmount(
        address _recipient,
        uint256 _usdcQuotation,
        bool _byPass
    ) private view returns (address _agent, uint256 _referralAmount) {
        address _agentAddr = _referral[_recipient];
        if (
            (_agentAddr != address(0) &&
                (_whitelistedAgents[_agentAddr] ||
                    !_helperRWA.isRegistered(_recipient))) || _byPass
        ) {
            uint256 _exclusiveBips = _exclusiveReferralBips[_agentAddr];
            uint256 _referralBips = _exclusiveBips > 0
                ? _exclusiveBips
                : _defaultReferralBips;
            _referralAmount = (_usdcQuotation * _referralBips) / BASE;
            _agent = _agentAddr;
        }
    }

    /**
     * @notice Calculates the number of shares a buyer can purchase based on the amount of USDC and the price per share.
     * @param _usdcAmount The amount of USDC being spent.
     * @param _pricePerShare The price of a single share in USDC.
     * @return _sharesToBuy The number of shares the buyer can purchase.
     * @return _usdcQuotation The total USDC required for the purchase.
     * @return _marketFees The marketplace fees for the transaction.
     */
    function _getQuote(
        uint256 _usdcAmount,
        uint256 _pricePerShare
    )
        private
        view
        returns (
            uint256 _sharesToBuy,
            uint256 _usdcQuotation,
            uint256 _marketFees
        )
    {
        _sharesToBuy = _usdcAmount / _pricePerShare;
        _usdcQuotation = _sharesToBuy * _pricePerShare;

        _marketFees = ((_usdcQuotation * _primarySaleFeeBips) / BASE);
    }

    /**
     * @notice Calculates the fees and final amount for a secondary sale transaction.
     * @param _usdcAmount The amount of USDC being spent.
     * @param _pricePerShare The price of a single share in USDC.
     * @return _sharesToBuy The number of shares the buyer can purchase.
     * @return _totalFee The total marketplace fee for the transaction.
     * @return _usdcRequired The total USDC required for the purchase.
     * @return _sellerAmount The amount of USDC that will be sent to the seller.
     */
    function _calculateFeesAndFinalAmount(
        uint256 _usdcAmount,
        uint256 _pricePerShare
    )
        private
        view
        returns (
            uint256 _sharesToBuy,
            uint256 _totalFee,
            uint256 _usdcRequired,
            uint256 _sellerAmount
        )
    {
        _sharesToBuy = _usdcAmount / _pricePerShare;
        uint256 _usdcQuotation = _sharesToBuy * _pricePerShare;
        uint256 _platFormFee = (_usdcQuotation * _secondarySaleFeeBips) / BASE;
        _usdcRequired = _usdcQuotation + _platFormFee;
        _totalFee = _platFormFee * 2;
        _sellerAmount = _usdcRequired - _totalFee;
    }

    /**
     * @notice Returns the exclusive referral bips set for a specific agent.
     * @param _agent The address of the referral agent.
     * @return The referral commission in basis points for the given agent.
     */
    function getExclusiveReferralBips(
        address _agent
    ) external view returns (uint256) {
        return _exclusiveReferralBips[_agent];
    }

    /**
     * @notice Retrieves details of a primary sale for a given property.
     * @param _propertyId The ID of the property whose primary sale details are requested.
     * @return PrimaryListing The details of the primary sale listing.
     */
    function getPrimarySale(
        uint256 _propertyId
    ) external view returns (PrimaryListing memory) {
        return _primaryListing[_propertyId];
    }

    /**
     * @notice Retrieves the current platform fees for primary and secondary sales.
     * @return The primary sale fee and secondary sale fee, both in basis points.
     */
    function getPlaformFee() external view returns (uint256, uint256) {
        return (_primarySaleFeeBips, _secondarySaleFeeBips);
    }

    /**
     * @notice Retrieves details of a secondary sale listing.
     * @param _listingId The ID of the secondary sale listing.
     * @return SecondaryListing The details of the secondary sale listing.
     */
    function getSecondaryListing(
        uint256 _listingId
    ) external view returns (SecondaryListing memory) {
        return _secondaryListing[_listingId];
    }

    /**
     * @notice Retrieves a quote for buying shares during a primary sale.
     * @param _usdcAmount The amount of USDC being spent.
     * @param _pricePerShare The price per share in the primary sale.
     * @return _sharesToBuy The number of shares that can be purchased.
     * @return _usdcQuotation The total USDC required for the purchase.
     * @return _marketFees The marketplace fees for the transaction.
     */
    function getPrimarySaleQuote(
        uint256 _usdcAmount,
        uint256 _pricePerShare
    )
        external
        view
        returns (
            uint256 _sharesToBuy,
            uint256 _usdcQuotation,
            uint256 _marketFees
        )
    {
        (_sharesToBuy, _usdcQuotation, _marketFees) = _getQuote(
            _usdcAmount,
            _pricePerShare
        );
    }

    /**
     * @notice Retrieves a quote for buying shares during a secondary sale.
     * @param _usdcAmount The amount of USDC being spent.
     * @param _pricePerShare The price per share in the secondary sale.
     * @return _sharesToBuy The number of shares that can be purchased.
     * @return _totalFee The total marketplace fee for the transaction.
     * @return _usdcRequired The total USDC required for the purchase.
     * @return _sellerAmount The amount that will be received by the seller.
     */
    function getSecondarySaleQuote(
        uint256 _usdcAmount,
        uint256 _pricePerShare
    )
        external
        view
        returns (
            uint256 _sharesToBuy,
            uint256 _totalFee,
            uint256 _usdcRequired,
            uint256 _sellerAmount
        )
    {
        (
            _sharesToBuy,
            _totalFee,
            _usdcRequired,
            _sellerAmount
        ) = _calculateFeesAndFinalAmount(_usdcAmount, _pricePerShare);
    }

    /**
     * @notice Retrieves the total number of listings created in the marketplace.
     * @return The total number of listings.
     */
    function getTotalListings() external view returns (uint256) {
        return _listingIds;
    }

    /**
     * @notice Returns the current default referral commission in basis points.
     * @return The default referral bips.
     */
    function getDefaultReferralBips() external view returns (uint256) {
        return _defaultReferralBips;
    }

    /**
     * @notice Checks whether a given agent is whitelisted.
     * @param _agent The address of the agent to check.
     * @return True if the agent is whitelisted, false otherwise.
     */
    function isAgentWhitelisted(address _agent) external view returns (bool) {
        return _whitelistedAgents[_agent];
    }

    /**
     * @notice Returns whether secondary–sale functionality is currently paused.
     * @return paused `true` if secondary sales are disabled, `false` otherwise.
     */
    function isSecondarySalePaused() external view returns (bool) {
        return _isPaused;
    }

    /**
    @notice Retrieves the manager wallet address
    @return Manager wallet address
     */

    function getManagerAddress() external view returns (address) {
        return _managerWallet;
    }

    /**
     * @notice Returns the new-user bonus amount (USDC price in BNB * 5).
     * @return bonusInBnbUnits The bonus value in the same base units as `_oneUsdcPriceInBNB`.
     * @dev Thin wrapper around `_getNewUserBonus()`. Currently `view` because the price is hard-coded.
     *      Switch to `view` (or remove `view`) once you start reading from an oracle.
     */
    function getNewUserBonus() external pure returns (uint256 bonusInBnbUnits) {
        bonusInBnbUnits = _getNewUserBonus();
    }

 
    function updateUsdcAddress(address _newUsdc) external {
        USDC = _newUsdc;
        _validCurrencies[_newUsdc] = true;
        _helperUSDC = IERC20(_newUsdc);     
    }

    function getUsdcAddress() external view returns(address) {
        return USDC;
    }

    /**
     * Implementing the ERC165 interface
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC1155Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * Handle single ERC1155 token type transfer
     */
    function onERC1155Received(
        address /*operator*/,
        address /*from*/,
        uint256 /*id*/,
        uint256 /*value*/,
        bytes calldata /*data*/
    ) external pure override returns (bytes4) {
        // Logic to handle the token reception
        // For now, simply return the function selector
        return this.onERC1155Received.selector;
    }

    /**
     * Handle batch ERC1155 token types transfer
     */
    function onERC1155BatchReceived(
        address /*operator*/,
        address /*from*/,
        uint256[] calldata /*ids*/,
        uint256[] calldata /*values*/,
        bytes calldata /*data*/
    ) external pure override returns (bytes4) {
        // Logic to handle the tokens reception
        // For now, simply return the function selector
        return this.onERC1155BatchReceived.selector;
    }
}
