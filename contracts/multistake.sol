// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title ClubhouseMultiStake
 * @dev Pool-funded platform fee logic with EnumerableSet for scalability 
 * and Net Liability accounting for insolvency protection.
 */
contract ClubhouseMultiStake is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    // --- Constants ---
    uint256 public constant BASE_APR = 400;
    uint256 public constant SECONDS_IN_YEAR = 31536000;
    uint256 public constant BPS_DIVISOR = 10000;
    uint256 public constant MIN_CLAIM_INTERVAL = 30 days;
    uint256 public constant PLATFORM_FEE_BPS = 500;

    // --- Upgrade Safety ---
    bool public stakingEnabled = true;

    // --- Data Structures ---
    struct Pool {
        address poolManager;
        bool exists;
        uint256 totalStaked;
        uint256 totalReservedRewards; // Total original promises made
        uint256 totalClaimedRewards;  // Total rewards actually paid out
        uint256 totalUniqueStakers;
    }

    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 lockDuration;
        uint256 multiplier;
        bool isActive;
    }

    struct Tier {
        uint256 duration;
        uint256 multiplier;
    }

    struct TokenInfo {
        address tokenAddress;
        string name;
        string symbol;
    }

    struct UserPosition {
        address user;
        uint256 amount;
        uint256 startTime;
        uint256 lockDuration;
        uint256 lockEndTime;
        uint256 multiplier;
    }

    // --- State Variables ---
    address public platformWallet;
    Tier[] public tiers;
    
    // Scalable tracking using EnumerableSet
    EnumerableSet.AddressSet private _registeredTokensSet;

    mapping(address => Pool) public pools;
    mapping(address => mapping(address => StakeInfo)) public userStakes;

    mapping(address => address[]) private poolStakers;
    mapping(address => mapping(address => uint256)) private stakerIndex;

    // --- Events ---
    event PoolCreated(address indexed token, address indexed manager);
    event Staked(address indexed token, address indexed user, uint256 amount, uint256 platformFeePaid);
    event Unstaked(address indexed token, address indexed user, uint256 principal, uint256 reward);
    event RewardClaimed(address indexed token, address indexed user, uint256 reward);
    event RewardsDeposited(address indexed token, uint256 amount);
    event UnallocatedWithdrawn(address indexed token, address indexed manager, uint256 amount);
    event PlatformWalletUpdated(address indexed newWallet);
    event StakingEnabledUpdated(bool enabled);

    constructor(address _platformWallet) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;

        _addTier(1 hours, 100);
        _addTier(7 days, 120);
        _addTier(30 days, 150);
        _addTier(90 days, 200);
        _addTier(365 days, 300);
        _addTier(1095 days, 450);
        _addTier(1825 days, 600);
    }

    modifier onlyPoolManager(address _token) {
        require(pools[_token].poolManager == msg.sender, "Not pool manager");
        _;
    }

    // --- Admin Functions ---

    function setPlatformWallet(address _newWallet) external {
        require(msg.sender == platformWallet, "Only platform wallet can update");
        require(_newWallet != address(0), "Invalid address");
        platformWallet = _newWallet;
        emit PlatformWalletUpdated(_newWallet);
    }

    function setStakingEnabled(bool _enabled) external {
        require(msg.sender == platformWallet, "Only platform wallet");
        stakingEnabled = _enabled;
        emit StakingEnabledUpdated(_enabled);
    }

    // --- Pool Registration & Management ---

    function createPool(address _token) external {
        require(_token != address(0), "Invalid address");
        require(!pools[_token].exists, "Pool already exists");

        pools[_token] = Pool({
            poolManager: msg.sender,
            exists: true,
            totalStaked: 0,
            totalReservedRewards: 0,
            totalClaimedRewards: 0,
            totalUniqueStakers: 0
        });

        _registeredTokensSet.add(_token);
        emit PoolCreated(_token, msg.sender);
    }

    function depositRewards(address _token, uint256 _amount) external nonReentrant {
        require(pools[_token].exists, "Pool not found");
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        emit RewardsDeposited(_token, _amount);
    }

    function withdrawUnallocated(address _token, uint256 _amount)
        external
        onlyPoolManager(_token)
        nonReentrant
    {
        uint256 available = getAvailableRewards(_token);
        require(_amount <= available, "Cannot withdraw reserved user rewards");
        IERC20(_token).safeTransfer(msg.sender, _amount);
        emit UnallocatedWithdrawn(_token, msg.sender, _amount);
    }

    // --- Core Staking Logic ---

    function stake(address _token, uint256 _amount, uint256 _tierIndex) external nonReentrant {
        require(stakingEnabled, "Staking disabled");

        Pool storage pool = pools[_token];
        require(pool.exists, "Pool inactive");
        require(!userStakes[msg.sender][_token].isActive, "Stake already active");
        require(_tierIndex < tiers.length, "Invalid tier");

        Tier memory tier = tiers[_tierIndex];
        uint256 userMaxReward = _calculateMaxReward(_amount, tier.duration, tier.multiplier);
        uint256 platformFee = (userMaxReward * PLATFORM_FEE_BPS) / BPS_DIVISOR;

        // Ensure net balance covers liabilities before allowing stake
        require(
            getAvailableRewards(_token) >= (userMaxReward + platformFee),
            "Pool lacks coverage for rewards and fees"
        );

        if (userStakes[msg.sender][_token].amount == 0) pool.totalUniqueStakers++;

        pool.totalStaked += _amount;
        // Increase the total original promise
        pool.totalReservedRewards += userMaxReward;

        userStakes[msg.sender][_token] = StakeInfo({
            amount: _amount,
            startTime: block.timestamp,
            lastClaimTime: block.timestamp,
            lockDuration: tier.duration,
            multiplier: tier.multiplier,
            isActive: true
        });

        _addStakerToPool(_token, msg.sender);

        if (platformFee > 0) {
            IERC20(_token).safeTransfer(platformWallet, platformFee);
        }

        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        emit Staked(_token, msg.sender, _amount, platformFee);
    }

    function claimRewards(address _token) external nonReentrant {
        StakeInfo storage s = userStakes[msg.sender][_token];
        require(s.isActive, "No stake");
        require(s.lockDuration >= 30 days, "Duration not eligible for intermediate claims");
        require(block.timestamp >= s.lastClaimTime + MIN_CLAIM_INTERVAL, "Claim interval: 30 days");

        uint256 userReward = _calculateAccruedReward(s);
        require(userReward > 0, "No rewards accrued");

        Pool storage pool = pools[_token];
        s.lastClaimTime = block.timestamp;
        
        // IMPORTANT: We only increase totalClaimedRewards. 
        // totalReservedRewards stays the same to maintain accounting solvency.
        pool.totalClaimedRewards += userReward;

        IERC20(_token).safeTransfer(msg.sender, userReward);
        emit RewardClaimed(_token, msg.sender, userReward);
    }

    function unstake(address _token) external nonReentrant {
        StakeInfo storage s = userStakes[msg.sender][_token];
        require(s.isActive, "No stake found");
        require(block.timestamp >= s.startTime + s.lockDuration, "Stake is still locked");

        uint256 userReward = _calculateAccruedReward(s);
        uint256 principal = s.amount;
        uint256 originalReservation = _calculateMaxReward(s.amount, s.lockDuration, s.multiplier);

        Pool storage pool = pools[_token];
        pool.totalStaked -= principal;
        
        // Increase cumulative claims by the final payout
        pool.totalClaimedRewards += userReward;
        
        // Remove the full original promise from the global liability tracker
        pool.totalReservedRewards = pool.totalReservedRewards >= originalReservation
            ? pool.totalReservedRewards - originalReservation
            : 0;

        delete userStakes[msg.sender][_token];
        _removeStakerFromPool(_token, msg.sender);

        IERC20(_token).safeTransfer(msg.sender, principal + userReward);
        emit Unstaked(_token, msg.sender, principal, userReward);
    }

    // --- View Functions ---

    /**
     * @dev Enhanced with Pagination to prevent Gas DoS
     */
    function getRegisteredTokens(uint256 offset, uint256 limit) external view returns (TokenInfo[] memory, uint256 nextOffset) {
        uint256 total = _registeredTokensSet.length();
        if (offset >= total) return (new TokenInfo[](0), total);

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 size = end - offset;

        TokenInfo[] memory info = new TokenInfo[](size);

        for (uint256 i = 0; i < size; i++) {
            address tAddr = _registeredTokensSet.at(offset + i);
            string memory name = "Unknown";
            string memory symbol = "UNK";

            try IERC20Metadata(tAddr).name() returns (string memory _name) { name = _name; } catch {}
            try IERC20Metadata(tAddr).symbol() returns (string memory _symbol) { symbol = _symbol; } catch {}

            info[i] = TokenInfo({
                tokenAddress: tAddr,
                name: name,
                symbol: symbol
            });
        }
        return (info, end);
    }

    /**
     * @dev Calculates available rewards based on Net Liability.
     * Liability = Total Staked Principal + (Total Promised Rewards - Total Already Paid)
     */
    function getAvailableRewards(address _token) public view returns (uint256) {
        Pool memory pool = pools[_token];
        uint256 balance = IERC20(_token).balanceOf(address(this));
        
        // Net reward liability is what is promised but not yet paid out
        uint256 netRewardLiability = 0;
        if (pool.totalReservedRewards > pool.totalClaimedRewards) {
            netRewardLiability = pool.totalReservedRewards - pool.totalClaimedRewards;
        }
        
        uint256 totalLiabilities = pool.totalStaked + netRewardLiability;
        return balance > totalLiabilities ? balance - totalLiabilities : 0;
    }

    function getUserStake(address _user, address _token)
        external
        view
        returns (
            uint256 principal,
            uint256 accruedRewards,
            uint256 lockEndTime,
            uint256 secondsLeft,
            bool active
        )
    {
        StakeInfo memory s = userStakes[_user][_token];
        if (!s.isActive) return (0, 0, 0, 0, false);
        uint256 endTime = s.startTime + s.lockDuration;
        uint256 remaining = block.timestamp < endTime ? endTime - block.timestamp : 0;
        return (s.amount, _calculateAccruedReward(s), endTime, remaining, s.isActive);
    }

    /**
    * @notice Fetch staker positions in chunks to avoid Gas Limit issues.
    * @param _token The address of the staked token pool.
    * @param offset Starting index in the poolStakers array.
    * @param limit Number of positions to return.
    */
    function getPoolPositionsPaginated(address _token, uint256 offset, uint256 limit) 
        external 
        view 
        returns (UserPosition[] memory info, uint256 nextOffset) 
    {
        uint256 total = poolStakers[_token].length;
        if (offset >= total) return (new UserPosition[](0), total);

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 size = end - offset;

        info = new UserPosition[](size);

        for (uint256 i = 0; i < size; i++) {
            address userAddr = poolStakers[_token][offset + i];
            StakeInfo memory s = userStakes[userAddr][_token];
            
            info[i] = UserPosition({
                user: userAddr,
                amount: s.amount,
                startTime: s.startTime,
                lockDuration: s.lockDuration,
                lockEndTime: s.startTime + s.lockDuration,
                multiplier: s.multiplier
            });
        }
        return (info, end);
    }

    /**
    * @notice Returns all staker positions for a specific pool in a single call.
    * @param _token The address of the staked token pool.
    * @return info An array of all UserPosition data for the pool.
    */
    function getPoolPositionsByToken(address _token) 
        external 
        view 
        returns (UserPosition[] memory info) 
    {
        uint256 total = poolStakers[_token].length;
        
        // Initialize the return array with the total count of stakers
        info = new UserPosition[](total);

        for (uint256 i = 0; i < total; i++) {
            address userAddr = poolStakers[_token][i];
            StakeInfo memory s = userStakes[userAddr][_token];
            
            info[i] = UserPosition({
                user: userAddr,
                amount: s.amount,
                startTime: s.startTime,
                lockDuration: s.lockDuration,
                lockEndTime: s.startTime + s.lockDuration,
                multiplier: s.multiplier
            });
        }
        
        return info;
    }


    // --- Internal Logic ---

    function _addTier(uint256 _d, uint256 _m) internal {
        tiers.push(Tier(_d, _m));
    }

    function _calculateMaxReward(uint256 _a, uint256 _d, uint256 _m)
        internal
        pure
        returns (uint256)
    {
        return (_a * BASE_APR * _m * _d) /
            (BPS_DIVISOR * 100 * SECONDS_IN_YEAR);
    }

    function _calculateAccruedReward(StakeInfo memory _s)
        internal
        view
        returns (uint256)
    {
        if (!_s.isActive) return 0;
        uint256 end = _s.startTime + _s.lockDuration;
        uint256 calcTime = block.timestamp > end ? end : block.timestamp;
        if (calcTime <= _s.lastClaimTime) return 0;
        return (_s.amount * BASE_APR * _s.multiplier * (calcTime - _s.lastClaimTime)) /
            (BPS_DIVISOR * 100 * SECONDS_IN_YEAR);
    }

    function _addStakerToPool(address _token, address _user) internal {
        stakerIndex[_token][_user] = poolStakers[_token].length;
        poolStakers[_token].push(_user);
    }

    function _removeStakerFromPool(address _token, address _user) internal {
        uint256 idx = stakerIndex[_token][_user];
        uint256 lastIdx = poolStakers[_token].length - 1;
        address lastUser = poolStakers[_token][lastIdx];
        poolStakers[_token][idx] = lastUser;
        stakerIndex[_token][lastUser] = idx;
        poolStakers[_token].pop();
        delete stakerIndex[_token][_user];
    }
}