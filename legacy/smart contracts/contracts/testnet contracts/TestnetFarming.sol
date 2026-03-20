// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Farming
/// @author Rabeeb Aqdas, Asmar Hasan
/// @dev Implements a simple farming contract where users can stake LP tokens and earn rewards over time.

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     *
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Mints the amount of token
     *
     */
    function mint(address to, uint256 amount) external;

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
}

/// @notice Thrown when an amount of zero is provided where a non-zero value is required.
error AmountCantBeZero();

/// @notice Thrown when the balance is insufficient for the requested operation.
error NotEnoughBalance();

/// @notice Thrown when an operation is attempted on a farming pool that has already ended.
error PoolHasEnded();

/**
 * @notice Thrown when the reward debt is higher than the reward itself.
 * @param _reward The amount of the reward.
 * @param _debt The amount of the debt.
 */
error DebtIsHigherThanReward(uint256 _reward, uint256 _debt);

/// @notice Thrown when an invalid address is provided or used in the operation.
error InvalidAddress();

/// @notice Thrown when there are no rewards available for withdrawal or distribution.
error NoRewardsAvailable();

contract TestnetFarming {
    /// @dev Represents the user's share and reward debt in the farming contract.
    struct UserShare {
        /// @dev The amount of LP tokens the user has staked.
        uint256 amount;
        /// @dev The user's reward debt, used to calculate correct reward allocation on updates.
        uint256 rewardDebt;
    }

    /// @dev Stores the Annual Percentage Rate (APR) information for a given time period.
    struct Apr {
        /// @dev The start time of the APR period.
        uint256 startTime;
        /// @dev The end time of the APR period.
        uint256 endTime;
        /// @dev The APR per second for this period.
        uint256 aprPerSecond;
        /// @dev The accumulated STAY share per second till the end of this period.
        uint256 accStayShare;
    }

    /// @dev Holds information about a user's interaction with the farming contract.
    struct UserInfo {
        /// @dev The total amount of LP tokens the user has staked.
        uint256 amount;
        /// @dev The index of the APR period in which the user last interacted with the contract.
        uint256 aprIndex;
        /// @dev The total pending rewards that the user is eligible to claim.
        uint256 pendingRewards;
        /// @dev A mapping of each share index to the user's share information.
        mapping(uint256 index => UserShare) userShare;
    }
    /// @dev A divisor used for precision adjustments, typically representing 1 in token units when dealing with percentages or proportions.
    uint256 private constant DIVISOR = 1e18;

    /// @dev The number of STAY tokens distributed per second to stakers.
    uint256 private stayPerSecond;

    /// @dev The timestamp when the pool starts and begins to accrue rewards.
    uint256 private poolStartTime;

    /// @dev The timestamp of the last reward distribution or update.
    uint256 private lastRewardTime;

    /// @dev The timestamp when the pool will end and stop accruing rewards.
    uint256 private poolEndTime;

    /// @dev The address of the contract operator or admin.
    address private operator;

    /// @dev A boolean representing whether the contract is paused or not.
    bool private pause;

    /// @dev The total amount of rewards distributed by the pool.
    uint256 private _totalRewards;

    /// @dev The STAY token contract interface, used for reward distributions.
    IERC20 private _stayHelper;

    /// @dev The LP token contract interface, representing the staked tokens in the pool.
    IERC20 private _lpHelper;

    /// @dev An array storing all APR (Annual Percentage Rate) periods for the pool.
    Apr[] private allApr;

    /// @dev A mapping from a user's address to their UserInfo, detailing their interaction with the pool.
    mapping(address user => UserInfo) public userInfo;

    /// @notice Emitted when a user deposits LP tokens to the pool.
    /// @param by The address of the user making the deposit.
    /// @param amount The amount of LP tokens deposited.
    event Deposit(address indexed by, uint256 amount);

    /// @notice Emitted when a user withdraws LP tokens from the pool.
    /// @param by The address of the user making the withdrawal.
    /// @param amount The amount of LP tokens withdrawn.
    event Withdraw(address indexed by, uint256 amount);

    /// @notice Emitted when a user claims their reward tokens.
    /// @param by The address of the user claiming the rewards.
    /// @param amount The amount of reward tokens claimed.
    event RewardsClaimed(address indexed by, uint256 amount);

    /// @notice Emitted when the contract is paused.
    /// @param by The address of the user or admin who paused the contract.
    event Paused(address indexed by);

    /// @notice Emitted when the contract is unpaused.
    /// @param by The address of the user or admin who unpaused the contract.
    event UnPaused(address indexed by);

    /// @notice Emitted when the APR per second is updated.
    /// @param by The address of the operator who updated the APR.
    /// @param newAPRPerSec The new APR per second value.
    /// @param timeStamp The timestamp when the update occurred.
    event APRUpdated(
        address indexed by,
        uint256 newAPRPerSec,
        uint256 timeStamp
    );

    /// @notice Emitted when the farming pool is ended.
    /// @param by The address of the operator who ended the pool.
    /// @param timeStamp The timestamp when the pool was ended.
    event PoolEnded(address indexed by, uint256 timeStamp);

   
    constructor(address stay, address lp) {
        uint256 _poolStartTime = block.timestamp + 10;
        require(block.timestamp < _poolStartTime, "late");
        stayPerSecond = 158548959918822932; // Set your initial reward rate per second
        poolStartTime = _poolStartTime;
        lastRewardTime = _poolStartTime;
        poolEndTime = _poolStartTime + 1825 days; // Define the pool end time
        allApr.push(Apr(_poolStartTime, poolEndTime, stayPerSecond, 0));
        operator = msg.sender;

        _stayHelper=IERC20(stay);
        _lpHelper=IERC20(lp);

    }

    /**
     * @dev Ensures that the function is called only when the contract is not paused.
     * Reverts if the contract is paused.
     */
    modifier unPaused() {
        require(!pause, "Farming: Contract is paused");
        _;
    }

    /**
     * @dev Ensures that the function is called only by the operator of the contract.
     * Reverts if the caller is not the operator.
     */
    modifier onlyOperator() {
        require(operator == msg.sender, "Farming: Caller is not the operator");
        _;
    }

    /**
     * @dev Allows a user to stake LP tokens into the farming contract.
     * @param _amount The amount of LP tokens to stake.
     * Users can stake their LP tokens to earn rewards over time. The function updates
     * the user's stake details and rewards based on the current APR before transferring
     * the LP tokens to the contract. It also emits a Deposit event.
     */
    function stakeLPs(uint256 _amount) external unPaused {
        address _sender = msg.sender;
        if (block.timestamp >= poolEndTime) revert PoolHasEnded();
        if (_amount == 0) revert AmountCantBeZero();
        if (_lpHelper.balanceOf(_sender) < _amount) revert NotEnoughBalance();
        UserInfo storage user = userInfo[_sender];
        _updatePool();
        Apr[] memory _allApr = new Apr[](allApr.length);
        _allApr = allApr;
        uint256 _prevAmount = user.amount;

        if (_prevAmount > 0) {
            uint256 totalRewards;
            for (uint256 i = user.aprIndex; i < _allApr.length; ++i) {
                //value will always be on the aprIndex
                UserShare memory _share = user.userShare[i];
                totalRewards += (((_prevAmount * _allApr[i].accStayShare) /
                    DIVISOR) - _share.rewardDebt);
            }
            if (totalRewards > 0)
                user.pendingRewards = user.pendingRewards + totalRewards;
        }
        _lpHelper.transferFrom(_sender, address(this), _amount);
        uint256 _newAmount = _prevAmount + _amount;

        user.amount = _newAmount;

        uint256 index = _allApr.length - 1;

        UserShare memory share = user.userShare[index];
        share.amount = _newAmount;

        share.rewardDebt = (_newAmount * _allApr[index].accStayShare) / DIVISOR;

        user.aprIndex = index;
        user.userShare[index] = share;

        emit Deposit(_sender, _amount);
    }

    /**
     * @dev Allows a user to unstake LP tokens from the farming contract.
     * @param _amount The amount of LP tokens to unstake.
     * Users can withdraw their staked LP tokens along with any accumulated rewards.
     * The function updates the user's stake details and rewards before transferring
     * the LP tokens back to the user. It also emits a Withdraw event.
     */
    function unstakeLPs(uint256 _amount) external {
        if (_amount == 0) revert AmountCantBeZero();
        address _sender = msg.sender;
        UserInfo storage user = userInfo[_sender];
        require(user.amount >= _amount, "Invalid Amount");

        _updatePool();

        Apr[] memory _allApr = new Apr[](allApr.length);
        _allApr = allApr;

        uint256 totalRewards;
        uint256 _prevAmount = user.amount;

        for (uint256 i = user.aprIndex; i < _allApr.length; ++i) {
            //value will always be on the aprIndex
            UserShare memory _share = user.userShare[i];
            totalRewards += (((_prevAmount * _allApr[i].accStayShare) /
                DIVISOR) - _share.rewardDebt);
        }
        if (totalRewards > 0)
            user.pendingRewards = user.pendingRewards + totalRewards;

        uint256 newAmount = _prevAmount - _amount;

        user.amount = newAmount;

        uint256 index = _allApr.length - 1;
        UserShare memory share = user.userShare[index];
        share.amount = newAmount;
        share.rewardDebt = (newAmount * _allApr[index].accStayShare) / DIVISOR;

        user.aprIndex = index;
        user.userShare[index] = share;

        _lpHelper.transfer(_sender, _amount);
        emit Withdraw(_sender, _amount);
    }

    /**
     * @dev Allows a user to claim their accumulated rewards.
     * Users can claim their pending rewards without unstaking their LP tokens.
     * The function updates the user's reward details and then mints the reward tokens
     * to the user's address. It emits a RewardsClaimed event upon successful reward
     * distribution.
     */
    function claimRewards() external unPaused {
        address _sender = msg.sender;
        UserInfo storage user = userInfo[_sender];
        uint256 totalRewards = user.pendingRewards;
        uint256 amount = user.amount;

        _updatePool();

        Apr[] memory _allApr = new Apr[](allApr.length);
        _allApr = allApr;

        for (uint256 i = user.aprIndex; i < _allApr.length; ++i) {
            //value will always be on the aprIndex
            UserShare memory _share = user.userShare[i];
            totalRewards += (((amount * _allApr[i].accStayShare) / DIVISOR) -
                _share.rewardDebt);
        }

        if (totalRewards == 0) revert NoRewardsAvailable();
        user.pendingRewards = 0;
        _stayHelper.mint(_sender, totalRewards);
        _totalRewards = _totalRewards + totalRewards;
        emit RewardsClaimed(_sender, totalRewards);

        uint256 index = _allApr.length - 1;
        UserShare memory share = user.userShare[index];
        share.amount = amount;
        share.rewardDebt = (amount * _allApr[index].accStayShare) / DIVISOR;
        user.aprIndex = index;
        user.userShare[index] = share;
    }

    /**
     * @dev Changes the APR (Annual Percentage Rate) per second for the farming pool.
     * Can only be called by the contract operator.
     * @param _newAPR The new APR value to be set.
     * The function calculates the APR per second based on the provided annual value,
     * updates the current APR structure, and initializes a new APR period.
     */
    function changeAPRperSec(uint256 _newAPR) external onlyOperator {
        uint256 _newAPRPerSecond = (_newAPR / 365) / 86400;
        stayPerSecond = _newAPRPerSecond;
        Apr memory _apr = allApr[allApr.length - 1];
        _apr.endTime = block.timestamp;
        allApr[allApr.length - 1] = _apr;
        allApr.push(Apr(block.timestamp, poolEndTime, _newAPRPerSecond, 0));
        emit APRUpdated(msg.sender, _newAPRPerSecond, block.timestamp);
    }

    /**
     * @dev Ends the farming pool by setting the pool's end time to the current timestamp.
     * Can only be called by the contract operator.
     * This function effectively stops all new rewards from being accrued.
     */
    function endFarmingPool() external onlyOperator {
        require(poolEndTime > block.timestamp, "Pool Already Ended");
        poolEndTime = block.timestamp;
        Apr memory _apr = allApr[allApr.length - 1];
        _apr.endTime = block.timestamp;
        allApr[allApr.length - 1] = _apr;
        emit PoolEnded(msg.sender, block.timestamp);
    }

    /**
     * @dev Sets a new operator for the contract.
     * Can only be called by the current operator.
     * @param _operator The address of the new operator.
     * This function allows transferring the control of the contract to a new address.
     */
    function setOperator(address _operator) external onlyOperator {
        if (_operator == address(0)) revert InvalidAddress();
        operator = _operator;
    }

    /**
     * @dev Pauses the contract, preventing any state-changing operations.
     * Can only be called by the contract operator.
     * This function is used to temporarily halt all farming activities in case of an emergency.
     */
    function pauseContract() external onlyOperator {
        require(!pause, "Contract is already paused");
        pause = true;
        emit Paused(msg.sender);
    }

    /**
     * @dev Unpauses the contract, allowing state-changing operations to resume.
     * Can only be called by the contract operator.
     * This function re-enables farming activities after they have been paused.
     */
    function unPauseContract() external onlyOperator {
        require(pause, "Contract is already unpaused");
        pause = false;
        emit UnPaused(msg.sender);
    }

    /**
     * @dev Updates the accumulated share of rewards for each APR period based on the total token supply.
     * @param _fromTime The start time from which to calculate the accumulated share.
     * @param _toTime The end time until which to calculate the accumulated share.
     * This internal function updates the `accStayShare` for each APR period within the specified time range.
     */
    function _updateAccShare(uint256 _fromTime, uint256 _toTime) private {
        uint256 tokenSupply = _lpHelper.balanceOf(address(this));
        uint256 totalReward;

        if (_toTime >= poolEndTime) {
            if (_fromTime <= poolStartTime) {
                for (uint256 i; i < allApr.length; ++i) {
                    Apr memory _apr = allApr[i];
                    uint256 totalTime = _apr.endTime - _apr.startTime;
                    totalReward = (totalTime * _apr.aprPerSecond);
                    _apr.accStayShare += ((totalReward * DIVISOR) /
                        tokenSupply);
                    allApr[i] = _apr;
                }
            } else {
                for (uint256 i; i < allApr.length; ++i) {
                    Apr memory _apr = allApr[i];
                    if (_fromTime > _apr.endTime) continue;

                    uint256 totalTime = _apr.endTime - _fromTime;
                    totalReward = (totalTime * _apr.aprPerSecond);
                    _apr.accStayShare += ((totalReward * DIVISOR) /
                        tokenSupply);
                    allApr[i] = _apr;
                    _fromTime = _apr.endTime;
                }
            }
        } else {
            if (_fromTime <= poolStartTime) {
                for (uint256 i; i < allApr.length; ++i) {
                    Apr memory _apr = allApr[i];
                    if (_apr.endTime > _toTime) {
                        uint256 totalTime = _toTime - _fromTime;
                        totalReward = (totalTime * _apr.aprPerSecond);
                        _apr.accStayShare += ((totalReward * DIVISOR) /
                            tokenSupply);
                        allApr[i] = _apr;
                        break;
                    } else {
                        uint256 totalTime = _apr.endTime - _apr.startTime;
                        totalReward = (totalTime * _apr.aprPerSecond);
                        _apr.accStayShare += ((totalReward * DIVISOR) /
                            tokenSupply);
                        allApr[i] = _apr;
                        _fromTime = _apr.endTime;
                    }
                }
            } else {
                for (uint256 i; i < allApr.length; ++i) {
                    Apr memory _apr = allApr[i];
                    if (_fromTime > _apr.endTime) continue;

                    if (_apr.endTime > _toTime) {
                        uint256 totalTime = _toTime - _fromTime;
                        totalReward = (totalTime * _apr.aprPerSecond);
                        _apr.accStayShare += ((totalReward * DIVISOR) /
                            tokenSupply);
                        allApr[i] = _apr;
                        break;
                    } else {
                        uint256 totalTime = _apr.endTime - _fromTime;
                        totalReward = (totalTime * _apr.aprPerSecond);
                        _apr.accStayShare += ((totalReward * DIVISOR) /
                            tokenSupply);
                        allApr[i] = _apr;
                        _fromTime = _apr.endTime;
                    }
                }
            }
        }
    }

    /**
     * @dev Updates the pool's reward variables to be current.
     * This internal function is called before any deposit or withdrawal to ensure that
     * the pool's information is updated to the current block timestamp.
     */
    function _updatePool() private {
        if (block.timestamp <= lastRewardTime) {
            return;
        }

        uint256 tokenSupply = _lpHelper.balanceOf(address(this));
        if (tokenSupply == 0) {
            lastRewardTime = block.timestamp;
            return;
        }
        _updateAccShare(lastRewardTime, block.timestamp);

        lastRewardTime = block.timestamp;
    }

    /**
     * @dev Calculates the total reward generated for a user between two timestamps.
     * @param _sender The address of the user to calculate rewards for.
     * @param tokenSupply The current supply of tokens in the pool.
     * @param _fromTime Start time for the reward calculation.
     * @param _toTime End time for the reward calculation.
     * @return The total generated reward for the user.
     */
    function _getGeneratedReward(
        address _sender,
        uint256 tokenSupply,
        uint256 _fromTime,
        uint256 _toTime
    ) private view returns (uint256) {
        if (_fromTime >= _toTime) return 0;
        uint256 totalReward;
        uint256 reward;
        UserInfo storage user = userInfo[_sender];

        if (_toTime >= poolEndTime) {
            if (_fromTime >= poolEndTime) return 0;
            if (_fromTime <= poolStartTime) {
                for (uint256 i; i < allApr.length; ++i) {
                    Apr memory _apr = allApr[i];
                    UserShare memory _share = user.userShare[i];
                    uint256 totalTime = _apr.endTime - _apr.startTime;
                    reward = (totalTime * _apr.aprPerSecond);
                    _apr.accStayShare += ((reward * DIVISOR) / tokenSupply);
                    totalReward += (((user.amount * _apr.accStayShare) /
                        DIVISOR) - _share.rewardDebt);
                }

                return totalReward;
            } else {
                for (uint256 i; i < allApr.length; ++i) {
                    Apr memory _apr = allApr[i];
                    UserShare memory _share = user.userShare[i];

                    if (_fromTime > _apr.endTime) continue;

                    uint256 totalTime = _apr.endTime - _fromTime;
                    reward = (totalTime * _apr.aprPerSecond);
                    _apr.accStayShare += ((reward * DIVISOR) / tokenSupply);
                    totalReward += (((user.amount * _apr.accStayShare) /
                        DIVISOR) - _share.rewardDebt);
                    _fromTime = _apr.endTime;
                }

                return totalReward;
            }
        } else {
            if (_toTime <= poolStartTime) return 0;

            if (_fromTime <= poolStartTime) {
                for (uint256 i; i < allApr.length; ++i) {
                    Apr memory _apr = allApr[i];
                    UserShare memory _share = user.userShare[i];

                    if (_apr.endTime > _toTime) {
                        uint256 totalTime = _toTime - _fromTime;
                        reward = (totalTime * _apr.aprPerSecond);
                        _apr.accStayShare += ((reward * DIVISOR) / tokenSupply);
                        totalReward += (((user.amount * _apr.accStayShare) /
                            DIVISOR) - _share.rewardDebt);
                        break;
                    } else {
                        uint256 totalTime = _apr.endTime - _apr.startTime;
                        reward = (totalTime * _apr.aprPerSecond);
                        _apr.accStayShare += ((reward * DIVISOR) / tokenSupply);
                        totalReward += (((user.amount * _apr.accStayShare) /
                            DIVISOR) - _share.rewardDebt);
                        _fromTime = _apr.endTime;
                    }
                }

                return totalReward;
            } else {
                for (uint256 i; i < allApr.length; ++i) {
                    Apr memory _apr = allApr[i];
                    UserShare memory _share = user.userShare[i];

                    if (_fromTime > _apr.endTime) continue;

                    if (_apr.endTime > _toTime) {
                        uint256 totalTime = _toTime - _fromTime;
                        reward = (totalTime * _apr.aprPerSecond);
                        _apr.accStayShare += ((reward * DIVISOR) / tokenSupply);
                        totalReward += (((user.amount * _apr.accStayShare) /
                            DIVISOR) - _share.rewardDebt);
                        break;
                    } else {
                        uint256 totalTime = _apr.endTime - _fromTime;
                        totalReward = (totalTime * _apr.aprPerSecond);
                        _apr.accStayShare += ((totalReward * DIVISOR) /
                            tokenSupply);
                        totalReward += (((user.amount * _apr.accStayShare) /
                            DIVISOR) - _share.rewardDebt);
                        _fromTime = _apr.endTime;
                    }
                }
            }

            return totalReward;
        }
    }

    /**
     * @dev Returns the amount of STAY rewards a user has earned.
     * @param _user The address of the user to check rewards for.
     * @return _stayReward The total rewards the user has earned.
     */
    function earned(address _user) external view returns (uint256 _stayReward) {
        if (_user == address(0)) revert InvalidAddress();

        uint256 tokenSupply = _lpHelper.balanceOf(address(this));

        if (block.timestamp > lastRewardTime && tokenSupply != 0) {
            _stayReward = _getGeneratedReward(
                _user,
                tokenSupply,
                lastRewardTime,
                block.timestamp
            );
        }
    }

    /**
     * @dev Returns the total rewards generated by the pool.
     * @return The total generated rewards.
     */
    function getGeneratedRewards() external view returns (uint256) {
        return _totalRewards;
    }

    /**
     * @dev Returns the rate of STAY distributed per second in the pool.
     * @return The reward rate per second.
     */
    function getStayPerSecond() external view returns (uint256) {
        return stayPerSecond;
    }

    /**
     * @dev Returns the start time of the pool.
     * @return The pool's start time.
     */
    function getPoolStartTime() external view returns (uint256) {
        return poolStartTime;
    }

    /**
     * @dev Returns the end time of the pool.
     * @return The pool's end time.
     */
    function getPoolEndTime() external view returns (uint256) {
        return poolEndTime;
    }

    /**
     * @dev Returns the last time rewards were updated in the pool.
     * @return The last reward update time.
     */
    function getLastRewardTime() external view returns (uint256) {
        return lastRewardTime;
    }

    /**
     * @dev Returns the address of the current operator of the pool.
     * @return The operator's address.
     */
    function getOperator() external view returns (address) {
        return operator;
    }

    /**
     * @dev Returns whether the pool is paused.
     * @return True if the pool is paused, false otherwise.
     */
    function isPaused() external view returns (bool) {
        return pause ? true : false;
    }
}
