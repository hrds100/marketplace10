// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.19;

/// @title Booster
/// @author Rabeeb Aqdas, Asmar Hasan
/// @dev The Booster contract allows users to boost their property shares to earn rewards over a defined period.
///      Users can pay using supported currencies (e.g., USDC, WBNB) to boost shares for properties, which generates rewards in STAY tokens.
///      The contract manages boost periods, reward calculations, and APR updates, while ensuring secure fund handling and compliance.
///      Admins can update the boost fee and APR values dynamically.

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
}

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

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

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
}

interface IRouter {
    function getAmountsOut(
        uint256 amountIn,
        address[] memory path
    ) external view returns (uint256[] memory amounts);

    function getAmountsIn(
        uint256 amountOut,
        address[] memory path
    ) external view returns (uint256[] memory amounts);
}

interface IRWA {
    struct Property {
        uint256 pricePerShare;
        uint256 totalOwners;
        uint256 apr;
        uint256 totalShares; // The supply for minting the NFT.
        string uri; // URI for the property's metadata.
    }

    function balanceOf(
        address account,
        uint256 id
    ) external view returns (uint256);

    function getProperty(
        uint256 _propertyId
    ) external view returns (Property memory);
}

/**
 * @dev Error thrown when the provided currency is invalid.
 */
error InvalidCurrency();

/**
 * @dev Error thrown when the user does not have shares to boost.
 */
error DontHaveShares();

/**
 * @dev Error thrown when a user attempts to reboost before the allowed time.
 */
error AlreadyBoosted();

/**
 * @dev Error thrown when a BNB transfer fails.
 */
error TransferFailed();

/**
 * @dev Error thrown when the boost amount is invalid.
 */
error InvalidAmount();

/**
 * @dev Error thrown when there are no rewards available for claiming.
 */
error NoRewardsAvailable();

/**
 * @dev Error thrown when an invalid address is provided.
 */
error InvalidAddress();

/**
 * @dev Error thrown when an invalid fee value is provided.
 */
error InvalidFee();

/**
 * @dev Error thrown when an invalid APR value is provided.
 */
error InvalidApr();

contract Booster is Ownable {
    /**
     * @dev Struct to store boost details for a specific user and property.
     * @param sharesBoosted Amount of shares boosted by the user.
     * @param startTime Timestamp when the boost started.
     * @param endTime Timestamp when the boost ends.
     * @param rewardStartTime Timestamp when reward calculation starts.
     * @param reboostTimeLimit Time limit before the user can reboost.
     * @param pendingRewards Rewards accrued but not yet claimed.
     */
    struct Details {
        uint256 sharesBoosted;
        uint256 startTime;
        uint256 endTime;
        uint256 rewardStartTime;
        uint256 reboostTimeLimit;
        uint256 pendingRewards;
    }

    /**
     * @dev Address of the USDC token contract.
     */
    address private constant USDC = 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d;

    /**
     * @dev Address of the STAY token contract.
     */
    address private constant STAY = 0x7F14ce2A5df31Ad0D2BF658d3840b1F7559d3EE0;

    /**
     * @dev Address of the PancakeSwap Router contract.
     */
    address private constant ROUTER =
        0x10ED43C718714eb63d5aA57B78B54704E256024E;

    /**
     * @dev Address of the Wrapped BNB token contract.
     */
    address private constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

    /**
     * @dev Address of the wallet from where STAY tokens will be sent during rewards distribution.
     */
    address private _stayWallet;

    /**
     * @dev Base value used for percentage calculations (e.g., fees and APR in basis points).
     */
    uint256 private constant BASE = 1000;

    /**
     * @dev Constant value representing one year in seconds.
     */
    uint256 private constant ONEYEAR = 365 days;

    /**
     * @dev Constant value representing one month in seconds.
     */
    uint256 private constant ONEMONTH = 30 days;
    /**
     * @dev Fee percentage for boosting shares, represented in basis points (e.g., 100 = 10%).
     */
    uint256 private _boostFeeBips;

    /**
     * @dev Annual Percentage Rate (APR) in basis points used for calculating rewards.
     */
    uint256 private _boostAprBips;

    /**
     * @dev Reference to the PancakeSwap Router for token swapping operations.
     */
    IRouter private _helperRouter = IRouter(ROUTER);

    /**
     * @dev Interface for the USDC token contract.
     */
    IERC20 private _helperUSDC = IERC20(USDC);

    /**
     * @dev Interface for the STAY token contract.
     */
    IERC20 private _helperSTAY = IERC20(STAY);

    /**
     * @dev Interface for the Real-World Assets (RWA) contract.
     */
    IRWA private _helperRWA;

    /**
     * @dev Mapping to store valid currencies for boosting operations.
     *      - `true` indicates that the currency is valid.
     */
    mapping(address => bool) private _validCurrencies;

    /**
     * @dev Nested mapping to store boost details for each user and property.
     *      - First key: User address.
     *      - Second key: Property ID.
     */
    mapping(address => mapping(uint256 => Details)) private _boostDetails;

    /**
     * @notice Emitted when a user successfully boosts their property.
     * @param _by Address of the user who performed the boost.
     * @param _propertyId ID of the property that was boosted.
     */
    event Boosted(address indexed _by, uint256 _propertyId);

    /**
     * @notice Emitted when a user claims rewards.
     * @param _by Address of the user who claimed rewards.
     * @param _propertyId ID of the property for which rewards were claimed.
     * @param _rewardInStay Amount of rewards claimed in STAY tokens.
     */
    event RewardClaimed(
        address indexed _by,
        uint256 _propertyId,
        uint256 _rewardInStay
    );

    /**
     * @notice Emitted when the APR value is updated.
     * @param _by Address of the admin who updated the APR.
     * @param _oldApr Previous APR value.
     * @param _newApr Updated APR value.
     */
    event APRChanged(address indexed _by, uint256 _oldApr, uint256 _newApr);

    /**
     * @notice Emitted when the boost fee is updated.
     * @param _by Address of the admin who updated the fee.
     * @param _oldFees Previous fee value.
     * @param _newFees Updated fee value.
     */
    event FeeChanged(address indexed _by, uint256 _oldFees, uint256 _newFees);

    /**
     * @notice Initializes the Booster contract with specified parameters.
     * @param _rwaAddress Address of the RWA contract.
     * @param _stayWalletAddr Address of the wallet to receive STAY tokens.
     * @param _aprBips Initial APR value in basis points.
     * @param _fees Initial boost fee percentage.
     */
    constructor(
        address _rwaAddress,
        address _stayWalletAddr,
        uint256 _aprBips,
        uint256 _fees
    ) Ownable(_msgSender()) {
        _validCurrencies[address(0)] = true;
        _validCurrencies[USDC] = true;
        _helperRWA = IRWA(_rwaAddress);
        _boostFeeBips = _fees;
        _boostAprBips = _aprBips;
        _stayWallet = _stayWalletAddr;
    }

    /**
     * @notice Boosts a user's shares for a specific property and calculates rewards.
     * @param _recipient Address of the user boosting their shares.
     * @param _propertyId ID of the property being boosted.
     * @param _currency Address of the currency used for boosting.
     * @dev Requirements:
     *  - The provided currency must be valid.
     *  - The user must have sufficient funds for the boost.
     */
    function boost(
        address _recipient,
        uint256 _propertyId,
        address _currency
    ) external payable {
        if (!_validCurrencies[_currency]) revert InvalidCurrency();
        address _sender = _msgSender();
        address _paymentReceiver = owner();
        uint256 _currentTime = block.timestamp;
        uint256 _pendingRewards = _getEstimatedRewards(_recipient, _propertyId);
        uint256 _userShares = _helperRWA.balanceOf(_recipient, _propertyId);
        if (_userShares == 0) revert DontHaveShares();
        uint256 _boostAmount = _getBoostAmount(
            _recipient,
            _propertyId,
            _userShares
        );
        if (_boostAmount == 0) revert AlreadyBoosted();
        Details memory _details = _boostDetails[_recipient][_propertyId];

        if (_currency == USDC)
            _helperUSDC.transferFrom(_sender, _paymentReceiver, _boostAmount);
        else {
            address[] memory _path = new address[](2);
            _path[0] = WBNB;
            _path[1] = USDC;

            uint256[] memory amounts = _helperRouter.getAmountsIn(
                _boostAmount,
                _path
            );
            uint256 _bnbValue = amounts[0];

            uint256 _msgValue = msg.value;
            if (_bnbValue > _msgValue) revert InvalidAmount();
            _sendBNB(_paymentReceiver, _bnbValue);
            if (_msgValue > _bnbValue)
                _sendBNB(_recipient, (_msgValue - _bnbValue));
        }
        _details.pendingRewards += _pendingRewards;
        _details.startTime = _currentTime;
        _details.sharesBoosted = _userShares;
        _details.rewardStartTime = _currentTime;
        if (_currentTime > _details.reboostTimeLimit)
            _details.reboostTimeLimit = _currentTime + ONEMONTH;
        _details.endTime = _currentTime + ONEYEAR;

        _boostDetails[_recipient][_propertyId] = _details;
        emit Boosted(_recipient, _propertyId);
    }

    /**
     * @notice Boosts a user's shares for a specific property and calculates rewards.
     * @param _recipient Address of the user boosting their shares.
     * @param _propertyId ID of the property being boosted.
     * @dev Requirements:
     *  - The user must have existing shares in the specified property.
     *  - The user must not have already boosted their shares for this property.
     *  - The contract owner must execute this function.
     */
    function boostOnBehalfOf(
        address _recipient,
        uint256 _propertyId
    ) external payable onlyOwner {
        uint256 _currentTime = block.timestamp;
        uint256 _pendingRewards = _getEstimatedRewards(_recipient, _propertyId);
        uint256 _userShares = _helperRWA.balanceOf(_recipient, _propertyId);
        if (_userShares == 0) revert DontHaveShares();
        uint256 _boostAmount = _getBoostAmount(
            _recipient,
            _propertyId,
            _userShares
        );
        if (_boostAmount == 0) revert AlreadyBoosted();
        Details memory _details = _boostDetails[_recipient][_propertyId];

        _details.pendingRewards += _pendingRewards;
        _details.startTime = _currentTime;
        _details.sharesBoosted = _userShares;
        _details.rewardStartTime = _currentTime;
        if (_currentTime > _details.reboostTimeLimit)
            _details.reboostTimeLimit = _currentTime + ONEMONTH;
        _details.endTime = _currentTime + ONEYEAR;

        _boostDetails[_recipient][_propertyId] = _details;
        emit Boosted(_recipient, _propertyId);
    }

    /**
     * @notice Claims rewards for the specified property.
     * @param _propertyId ID of the property for which rewards are claimed.
     * @dev Requirements:
     *  - There must be rewards available for the user.
     *  - The user must have previously boosted shares for this property.
     */
    function claimRewards(uint256 _propertyId) external {
        address _sender = _msgSender();
        uint256 _currentTime = block.timestamp;
        Details memory _details = _boostDetails[_sender][_propertyId];
        uint256 _totalRewardsInStay = _getEstimatedRewards(
            _sender,
            _propertyId
        ) + _details.pendingRewards;
        if (_totalRewardsInStay == 0) revert NoRewardsAvailable();
        _details.pendingRewards = 0;
        _details.rewardStartTime = _currentTime > _details.endTime
            ? _details.endTime
            : _currentTime;

        _boostDetails[_sender][_propertyId] = _details;

        _helperSTAY.transferFrom(_stayWallet, _sender, _totalRewardsInStay);

        emit RewardClaimed(_sender, _propertyId, _totalRewardsInStay);
    }

    /**
     * @notice Updates the wallet address to receive STAY tokens.
     * @param _newAddress New wallet address.
     * @dev Requirements:
     *  - The new address must not be the zero address or current one.
     */
    function changeStayWallet(address _newAddress) external onlyOwner {
        if (_newAddress == address(0) || _stayWallet == _newAddress)
            revert InvalidAddress();
        _stayWallet = _newAddress;
    }

    /**
     * @notice Updates the boost fee percentage.
     * @param _newFee New fee value in basis points.
     * @dev Requirements:
     *  - Only callable by the contract owner.
     */
    function changeBoostFeeBips(uint256 _newFee) external onlyOwner {
        address _sender = _msgSender();
        uint256 _oldFee = _boostFeeBips;
        if (_newFee == 0 || _oldFee == _newFee) revert InvalidFee();
        _boostFeeBips = _newFee;
        emit FeeChanged(_sender, _oldFee, _newFee);
    }

    /**
     * @notice Updates the APR value for rewards calculation.
     * @param _newAprBips New APR value in basis points.
     * @dev Requirements:
     *  - Only callable by the contract owner.
     */
    function changeBoostAPR(uint256 _newAprBips) external onlyOwner {
        address _sender = _msgSender();
        uint256 _oldAprBips = _boostFeeBips;
        if (_newAprBips == 0 || _oldAprBips == _newAprBips) revert InvalidApr();
        _boostAprBips = _newAprBips;
        emit APRChanged(_sender, _oldAprBips, _newAprBips);
    }

    /**
     * @notice Sends BNB to a specified recipient.
     * @param _recipient Address of the recipient to send BNB.
     * @param _value Amount of BNB to send.
     * @dev Reverts if the transfer fails.
     */
    function _sendBNB(address _recipient, uint256 _value) private {
        (bool success, ) = _recipient.call{value: _value}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Calculates the boost amount for a user and property.
     * @param _userAddress Address of the user.
     * @param _propertyId ID of the property.
     * @param _userShares The shares owned by the user in that property.
     * @return _estimatedAmount The calculated boost amount in USDC.
     * @dev Reverts if the user does not have shares or is already boosted.
     */
    function _getBoostAmount(
        address _userAddress,
        uint256 _propertyId,
        uint256 _userShares
    ) private view returns (uint256 _estimatedAmount) {
         uint256 _currentTime = block.timestamp;
        Details memory _details = _boostDetails[_userAddress][_propertyId];

        if (
            _currentTime > _details.reboostTimeLimit &&
            _currentTime < _details.endTime
        ) return _estimatedAmount;

        uint256 _remainingBalance;

        if (_details.reboostTimeLimit > _currentTime) {
            if (_details.sharesBoosted >= _userShares) return _estimatedAmount;
            _remainingBalance = _userShares - _details.sharesBoosted;
        }
        _remainingBalance = _remainingBalance > 0
            ? _remainingBalance
            : _userShares;
        uint256 _pricePerShare = _helperRWA
            .getProperty(_propertyId)
            .pricePerShare;
        _estimatedAmount =
            ((_remainingBalance * _pricePerShare) * _boostFeeBips) /
            BASE;
    }

    /**
     * @notice Calculates the estimated rewards for a user and property.
     * @param _userAddress Address of the user.
     * @param _propertyId ID of the property.
     * @return _totalRewardsInStay The total estimated rewards in STAY tokens.
     * @dev Rewards are calculated based on the boosted shares and elapsed time.
     */
    function _getEstimatedRewards(
        address _userAddress,
        uint256 _propertyId
    ) private view returns (uint256 _totalRewardsInStay) {
         uint256 _currentTime = block.timestamp;
        uint256 _userBalance = _helperRWA.balanceOf(_userAddress, _propertyId);
        uint256 _pricePerShare = _helperRWA
            .getProperty(_propertyId)
            .pricePerShare;
        if (_userBalance > 0) {
            Details memory _details = _boostDetails[_userAddress][_propertyId];
            if (_details.endTime > _details.rewardStartTime) {
                uint256 _rewardTime = _currentTime > _details.endTime
                    ? _details.endTime - _details.rewardStartTime
                    : _currentTime - _details.rewardStartTime;
                uint256 _sharesForRewards = _details.sharesBoosted >
                    _userBalance
                    ? _userBalance
                    : _details.sharesBoosted;
                uint256 _rewardPerSecond = (((_sharesForRewards *
                    _pricePerShare) * _boostAprBips) / BASE) / ONEYEAR;
                uint256 _totalRewardsInUsdc = _rewardPerSecond * _rewardTime;
                address[] memory _path = new address[](2);
                _path[0] = USDC;
                _path[1] = STAY;

                uint256[] memory amounts = _helperRouter.getAmountsOut(
                    _totalRewardsInUsdc,
                    _path
                );
                _totalRewardsInStay = amounts[1];
            }
        }
    }

    /**
     * @notice Retrieves the estimated rewards for a user and property.
     * @param _userAddress Address of the user.
     * @param _propertyId ID of the property.
     * @return _totalRewards Total estimated rewards in STAY tokens.
     */
    function getEstimatedRewards(
        address _userAddress,
        uint256 _propertyId
    ) external view returns (uint256 _totalRewards) {
        _totalRewards = _getEstimatedRewards(_userAddress, _propertyId);
    }

    /**
     * @notice Retrieves the calculated boost amount for a user and property.
     * @param _userAddress Address of the user.
     * @param _propertyId ID of the property.
     * @return _estimatedAmount The calculated boost amount in USDC.
     */
    function getBoostAmount(
        address _userAddress,
        uint256 _propertyId
    ) external view returns (uint256 _estimatedAmount) {
        uint256 _userShares = _helperRWA.balanceOf(_userAddress, _propertyId);
        if (_userShares > 0) {
            _estimatedAmount = _getBoostAmount(
                _userAddress,
                _propertyId,
                _userShares
            );
        }
    }

    /**
     * @notice Checks if a user is currently boosted for a property.
     * @param _userAddress Address of the user.
     * @param _propertyId ID of the property.
     * @return _status True if the user is boosted, otherwise false.
     */
    function isBoosted(
        address _userAddress,
        uint256 _propertyId
    ) external view returns (bool _status) {
        Details memory _details = _boostDetails[_userAddress][_propertyId];
        _status = block.timestamp > _details.endTime ? false : true;
    }

    /**
     * @notice Retrieves the current boost fee percentage.
     * @return The boost fee in basis points.
     */
    function getBoostFeeBips() external view returns (uint256) {
        return _boostFeeBips;
    }

    /**
     * @notice Retrieves the current APR value for rewards calculation.
     * @return The APR value in basis points.
     */
    function getBoostApr() external view returns (uint256) {
        return _boostAprBips;
    }

    /**
     * @notice Checks if a given currency is valid for boosting operations.
     * @param _currency Address of the currency to check.
     * @return True if the currency is valid, otherwise false.
     */
    function isValidCurrency(address _currency) external view returns (bool) {
        return _validCurrencies[_currency];
    }

    /**
     * @notice Retrieves the boost details for a user and property.
     * @param _userAddress Address of the user.
     * @param _propertyId ID of the property.
     * @return sharesBoosted The number of shares boosted.
     * @return startTime The timestamp when the boost started.
     * @return endTime The timestamp when the boost ends.
     * @return rewardStartTime The timestamp when reward calculation starts.
     * @return reboostTimeLimit The time limit for reboosting.
     * @return pendingRewards The pending rewards not yet claimed.
     */
    function getBoostDetails(
        address _userAddress,
        uint256 _propertyId
    )
        external
        view
        returns (
            uint256 sharesBoosted,
            uint256 startTime,
            uint256 endTime,
            uint256 rewardStartTime,
            uint256 reboostTimeLimit,
            uint256 pendingRewards
        )
    {
        Details memory details = _boostDetails[_userAddress][_propertyId];
        return (
            details.sharesBoosted,
            details.startTime,
            details.endTime,
            details.rewardStartTime,
            details.reboostTimeLimit,
            details.pendingRewards
        );
    }
}
