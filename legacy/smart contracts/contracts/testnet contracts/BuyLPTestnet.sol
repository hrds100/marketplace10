// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.20;

/// @title BuyLP
/// @author Rabeeb Aqdas, Asmar Hasan
/// @dev This contract enables users to buy LP tokens and STAY tokens.
///      It supports multiple currencies (e.g., USDC, STAY, BNB) and integrates with Uniswap-based routers.
///      Admins can manage the LP wallet address and ensure secure fund handling with custom errors for validation.

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

interface IUniswapV2Pair {
    function getReserves()
        external
        view
        returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);

    function totalSupply() external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
}

/**
 * @dev Error thrown when the provided currency is not supported.
 */
error InvalidCurrency();

/**
 * @dev Error thrown when the LP or STAY tokens in the admin wallet are insufficient.
 */
error NotEnoughFunds();

/**
 * @dev Error thrown when the provided amount is invalid or insufficient.
 */
error InvalidAmount();

/**
 * @dev Error thrown when a transfer of BNB fails.
 */
error TransferFailed();

/**
 * @dev Error thrown when an invalid address is provided for wallet updates.
 */
error InvalidAddress();

contract BuyLPTestnet is Ownable {
    /**
     * @dev Constant representing token decimals (1e18 for 18 decimal places).
     */
    uint256 private constant DECIMALS = 1e18;

    /**
     * @dev Address of the LP token contract.
     */
    address private constant LP = 0x438d50AA8Bc3e2aa1B27c41AD9E436c567B9f909;
    address private USDC = 0x49c2D5e6F839E923b74CBBa69E640942149Bcf56;
    address private constant STAY = 0x8423cEcE3CE700D2101822ed4040C5E6a55E0D95;
    address private constant ROUTER =
        0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008;
    address private constant WBNB = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9;

    /**
     * @dev Address of the admin wallet that holds the LP and STAY tokens.
     */
    address private _adminWalletAddr;

    /**
     * @dev Reference to the PancakeSwap Router interface for token swaps.
     */
    IRouter private _helperRouter = IRouter(ROUTER);

    /**
     * @dev Reference to the Uniswap V2 Pair interface for LP tokens.
     */
    IUniswapV2Pair private _helperLp = IUniswapV2Pair(LP);

    /**
     * @dev Reference to the USDC token contract interface.
     */
    IERC20 private _helperUSDC = IERC20(USDC);

    /**
     * @dev Reference to the STAY token contract interface.
     */
    IERC20 private _helperSTAY = IERC20(STAY);

    /**
     * @dev Mapping to track valid currencies for transactions.
     */
    mapping(address => bool) private _validCurrencies;

    /**
     * @notice Emitted when a user successfully purchases LP tokens.
     * @param buyer Address of the user who bought the LP tokens.
     * @param lpReceived Amount of LP tokens received by the buyer.
     */
    event LPBought(address indexed buyer, uint256 lpReceived);

    /**
     * @notice Initializes the BuyLP contract with the admin wallet and supported currencies.
     * @param _adminWallet Address of the admin wallet to manage LP and STAY tokens.
     * @dev The constructor sets up valid currencies for transactions.
     */
    constructor(address _adminWallet) Ownable(_msgSender()) {
        _validCurrencies[address(0)] = true;
        _validCurrencies[STAY] = true;
        _validCurrencies[USDC] = true;
        _adminWalletAddr = _adminWallet;
    }

    /**
     * @notice Allows users to buy LP tokens using a specified currency.
     * @param _recipient Address of the recipient who will receive the LP tokens.
     * @param _currency Address of the currency used for payment.
     * @param _amountInUSDC Amount in USDC equivalent to calculate the LP tokens.
     */
    function buyLPToken(
        address _recipient,
        address _currency,
        uint256 _amountInUSDC
    ) external payable {
        address _sender = _msgSender();
        address _owner = owner();
        if (!_validCurrencies[_currency]) revert InvalidCurrency();

        uint256 _lpAmount = _calculateLps(_amountInUSDC);

        if (_lpAmount > _helperLp.balanceOf(_adminWalletAddr))
            revert NotEnoughFunds();

        if (_currency == USDC)
            _helperUSDC.transferFrom(_sender, _owner, _amountInUSDC);
        else {
            address[] memory _path = new address[](2);
            _path = _makePath(_currency);
            uint256[] memory amounts = _helperRouter.getAmountsIn(
                _amountInUSDC,
                _path
            );
            uint256 _valueToBeGiven = amounts[0];
            if (_currency == STAY)
                _helperSTAY.transferFrom(_sender, _owner, _valueToBeGiven);
            else {
                uint256 _msgValue = msg.value;
                if (_valueToBeGiven > _msgValue) revert InvalidAmount();
                _sendBNB(_owner, _valueToBeGiven);
                if (_msgValue > _valueToBeGiven)
                    _sendBNB(_recipient, (_msgValue - _valueToBeGiven));
            }
        }
        _helperLp.transferFrom(_adminWalletAddr, _recipient, _lpAmount);

        emit LPBought(_recipient, _lpAmount);
    }

    /**
     * @notice Allows users to buy STAY tokens using a specified currency.
     * @param _recipient Address of the recipient who will receive the STAY tokens.
     * @param _currency Address of the currency used for payment.
     * @param _usdcAmount Amount in USDC equivalent to calculate the STAY tokens.
     */
    function buyStay(
        address _recipient,
        address _currency,
        uint256 _usdcAmount
    ) external payable {
        address _sender = _msgSender();
        address _owner = owner();
        if (!_validCurrencies[_currency]) revert InvalidCurrency();
        uint256 _inputAmount = _currency == USDC ? _usdcAmount : msg.value;
        uint256 _outputAmount = _getStayEstimation(_currency, _inputAmount);

        if (_outputAmount > _helperSTAY.balanceOf(_adminWalletAddr))
            revert NotEnoughFunds();

        if (_currency == USDC)
            _helperUSDC.transferFrom(_sender, _owner, _inputAmount);
        else _sendBNB(_owner, _inputAmount);

        _helperSTAY.transferFrom(_adminWalletAddr, _recipient, _outputAmount);
    }

    /**
     * @notice Updates the admin wallet address responsible for LP and STAY tokens.
     * @param _newAddress The new wallet address for managing LP and STAY tokens.
     */
    function changeLpWallet(address _newAddress) external onlyOwner {
        if (_newAddress == address(0) || _adminWalletAddr == _newAddress)
            revert InvalidAddress();
        _adminWalletAddr = _newAddress;
    }

    /**
     * @notice Calculates the amount of LP tokens based on the given USDC amount.
     * @param _amountInUSDC The amount in USDC to calculate the equivalent LP tokens.
     * @return lp The calculated number of LP tokens.
     */
    function _calculateLps(
        uint256 _amountInUSDC
    ) private view returns (uint256 lp) {
        uint256 lpPrice = _getLpPrice();
        lp = (_amountInUSDC * DECIMALS) / lpPrice;
    }

    /**
     * @notice Creates a token swap path for converting a specified currency to USDC.
     * @param _currency Address of the input currency for the swap.
     * @return _path An array representing the token swap path.
     */
    function _makePath(
        address _currency
    ) private view returns (address[] memory _path) {
        _path = new address[](2);
        _path[0] = _currency == address(0) ? WBNB : _currency;
        _path[1] = USDC;
    }

    /**
     * @notice Transfers a specified amount of BNB to a recipient.
     * @param _recipient Address of the recipient.
     * @param _value Amount of BNB to transfer.
     */
    function _sendBNB(address _recipient, uint256 _value) private {
        (bool success, ) = _recipient.call{value: _value}("");
        if (!success) revert TransferFailed();
    }

    //TODO: VERIFY RESERVERS ON MAIN
    /**
     * @notice Fetches the current price of one LP token in USDC.
     * @return _lpPrice The price of one LP token in USDC.
     */
    function _getLpPrice() private view returns (uint256 _lpPrice) {
        (uint256 _usdcReserves, , ) = _helperLp.getReserves();
        uint256 totalUSDValueInPool = _usdcReserves * 2;
        _lpPrice = (totalUSDValueInPool * DECIMALS) / _helperLp.totalSupply();
    }

    /**
     * @notice Retrieves the price of one LP token in USDC.
     * @return _lpPrice The price of one LP token in USDC.
     */
    function getLpPrice() external view returns (uint256 _lpPrice) {
        _lpPrice = _getLpPrice();
    }

    /**
     * @notice Estimates the number of LP tokens for a given USDC amount.
     * @param _amountInUSDC The amount in USDC to calculate the equivalent LP tokens.
     * @return _lpAmount The estimated number of LP tokens.
     */
    function getLpEstimation(
        uint256 _amountInUSDC
    ) external view returns (uint256 _lpAmount) {
        _lpAmount = _calculateLps(_amountInUSDC);
    }

    /**
     * @notice Calculates the estimated amount of STAY tokens for a given input amount.
     * @param _currency Address of the input currency used for payment.
     * @param _inputAmount The amount of the input currency.
     * @return _outputAmount The estimated amount of STAY tokens.
     */
    function _getStayEstimation(
        address _currency,
        uint256 _inputAmount
    ) private view returns (uint256 _outputAmount) {
        if (_currency == address(0)) {
            address[] memory _path = new address[](3);
            _path[0] = WBNB;
            _path[1] = USDC;
            _path[2] = STAY;

            uint256[] memory amounts = _helperRouter.getAmountsOut(
                _inputAmount,
                _path
            );
            _outputAmount = amounts[2];
        } else if (_currency == USDC) {
            address[] memory _path = new address[](2);
            _path[0] = USDC;
            _path[1] = STAY;

            uint256[] memory amounts = _helperRouter.getAmountsOut(
                _inputAmount,
                _path
            );
            _outputAmount = amounts[1];
        }
    }

    /**
     * @notice Estimates the number of STAY tokens for a given input amount.
     * @param _currency Address of the input currency used for payment.
     * @param _inputAmount The amount of the input currency.
     * @return _outputAmount The estimated number of STAY tokens.
     */
    function getStayEstimation(
        address _currency,
        uint256 _inputAmount
    ) external view returns (uint256 _outputAmount) {
        _outputAmount = _getStayEstimation(_currency, _inputAmount);
    }

    function updateUsdcAddress(address _newUsdc) external {
        USDC = _newUsdc;
        _validCurrencies[_newUsdc] = true;
        _helperUSDC = IERC20(_newUsdc);
    }

    function getUsdcAddress() external view returns (address) {
        return USDC;
    }
}
