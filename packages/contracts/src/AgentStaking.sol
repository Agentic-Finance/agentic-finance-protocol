// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentStaking — Insurance Layer for Agent-to-Agent Commerce
 * @notice Agents stake tokens as guarantee. Failed task = auto-compensate client.
 *
 * "The Economy Runs on Trust. We Built It for Machines."
 *
 * How it works:
 *   1. Agent stakes X tokens to activate on marketplace
 *   2. When hired, 10% of job value is held as insurance
 *   3. If job completes successfully: stake returned + agent earns fee
 *   4. If job fails/disputed: stake slashed → client compensated
 *   5. Higher stake = higher trust tier = more jobs = more revenue
 *
 * Tiers:
 *   Bronze:  0-99 AlphaUSD staked   → Basic listing
 *   Silver:  100-499 AlphaUSD       → Priority listing + 5% lower platform fee
 *   Gold:    500-999 AlphaUSD       → Featured + 10% lower fee + insurance badge
 *   Diamond: 1000+ AlphaUSD         → Premium + 15% lower fee + guaranteed insurance
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract AgentStaking {

    // ═══════════════════════════════════════════════
    // TYPES
    // ═══════════════════════════════════════════════

    enum Tier { None, Bronze, Silver, Gold, Diamond }

    struct StakeInfo {
        uint256 totalStaked;        // Total tokens staked
        uint256 lockedInJobs;       // Currently locked as insurance
        uint256 slashCount;         // Times slashed
        uint256 totalEarned;        // Total fees earned
        uint256 stakedAt;           // First stake timestamp
        Tier    tier;               // Current tier
        bool    active;             // Is staking active
    }

    // ═══════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════

    address public owner;
    IERC20 public stakingToken;

    /// @notice agent address => StakeInfo
    mapping(address => StakeInfo) public stakes;

    /// @notice jobId => insurance amount locked
    mapping(uint256 => uint256) public jobInsurance;

    /// @notice jobId => agent address
    mapping(uint256 => address) public jobAgent;

    /// @notice Insurance rate (basis points, e.g., 1000 = 10%)
    uint256 public insuranceRateBps;

    /// @notice Tier thresholds
    uint256 public silverThreshold;
    uint256 public goldThreshold;
    uint256 public diamondThreshold;

    /// @notice Stats
    uint256 public totalStakedGlobal;
    uint256 public totalSlashed;
    uint256 public totalInsurancePaid;
    uint256 public totalAgentsStaking;

    // ═══════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════

    event Staked(address indexed agent, uint256 amount, Tier tier);
    event Unstaked(address indexed agent, uint256 amount);
    event InsuranceLocked(uint256 indexed jobId, address indexed agent, uint256 amount);
    event InsuranceReleased(uint256 indexed jobId, address indexed agent, uint256 amount);
    event Slashed(uint256 indexed jobId, address indexed agent, address indexed client, uint256 amount);
    event TierUpgraded(address indexed agent, Tier oldTier, Tier newTier);

    // ═══════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════

    constructor(address _stakingToken) {
        owner = msg.sender;
        stakingToken = IERC20(_stakingToken);
        insuranceRateBps = 1000; // 10%
        silverThreshold = 100 * 1e6;   // $100
        goldThreshold = 500 * 1e6;     // $500
        diamondThreshold = 1000 * 1e6; // $1,000
    }

    // ═══════════════════════════════════════════════
    // CORE: Stake / Unstake
    // ═══════════════════════════════════════════════

    /**
     * @notice Stake tokens to activate on marketplace
     */
    function stake(uint256 _amount) external {
        require(_amount > 0, "Staking: zero amount");
        require(stakingToken.transferFrom(msg.sender, address(this), _amount), "Staking: transfer failed");

        StakeInfo storage info = stakes[msg.sender];

        if (!info.active) {
            info.active = true;
            info.stakedAt = block.timestamp;
            totalAgentsStaking++;
        }

        info.totalStaked += _amount;
        totalStakedGlobal += _amount;

        // Update tier
        Tier oldTier = info.tier;
        info.tier = _calculateTier(info.totalStaked);

        if (info.tier != oldTier) {
            emit TierUpgraded(msg.sender, oldTier, info.tier);
        }

        emit Staked(msg.sender, _amount, info.tier);
    }

    /**
     * @notice Unstake tokens (only unlocked portion)
     */
    function unstake(uint256 _amount) external {
        StakeInfo storage info = stakes[msg.sender];
        require(info.active, "Staking: not staking");
        uint256 available = info.totalStaked - info.lockedInJobs;
        require(_amount <= available, "Staking: insufficient unlocked balance");

        info.totalStaked -= _amount;
        totalStakedGlobal -= _amount;

        if (info.totalStaked == 0) {
            info.active = false;
            totalAgentsStaking--;
        }

        // Update tier
        Tier oldTier = info.tier;
        info.tier = _calculateTier(info.totalStaked);
        if (info.tier != oldTier) {
            emit TierUpgraded(msg.sender, oldTier, info.tier);
        }

        require(stakingToken.transfer(msg.sender, _amount), "Staking: transfer failed");
        emit Unstaked(msg.sender, _amount);
    }

    // ═══════════════════════════════════════════════
    // INSURANCE: Lock / Release / Slash
    // ═══════════════════════════════════════════════

    /**
     * @notice Lock insurance for a job (called when agent is hired)
     */
    function lockInsurance(uint256 _jobId, address _agent, uint256 _jobValue) external {
        require(msg.sender == owner, "Staking: not authorized");

        StakeInfo storage info = stakes[_agent];
        uint256 insuranceAmount = (_jobValue * insuranceRateBps) / 10000;

        // Cap insurance at available stake
        uint256 available = info.totalStaked - info.lockedInJobs;
        if (insuranceAmount > available) insuranceAmount = available;

        info.lockedInJobs += insuranceAmount;
        jobInsurance[_jobId] = insuranceAmount;
        jobAgent[_jobId] = _agent;

        emit InsuranceLocked(_jobId, _agent, insuranceAmount);
    }

    /**
     * @notice Release insurance after successful job completion
     */
    function releaseInsurance(uint256 _jobId) external {
        require(msg.sender == owner, "Staking: not authorized");

        address agent = jobAgent[_jobId];
        uint256 amount = jobInsurance[_jobId];
        require(amount > 0, "Staking: no insurance locked");

        stakes[agent].lockedInJobs -= amount;
        jobInsurance[_jobId] = 0;

        emit InsuranceReleased(_jobId, agent, amount);
    }

    /**
     * @notice Slash agent stake and compensate client
     */
    function slash(uint256 _jobId, address _client) external {
        require(msg.sender == owner, "Staking: not authorized");

        address agent = jobAgent[_jobId];
        uint256 amount = jobInsurance[_jobId];
        require(amount > 0, "Staking: no insurance to slash");

        StakeInfo storage info = stakes[agent];
        info.lockedInJobs -= amount;
        info.totalStaked -= amount;
        info.slashCount++;
        totalStakedGlobal -= amount;
        totalSlashed += amount;
        totalInsurancePaid += amount;

        jobInsurance[_jobId] = 0;

        // Update tier
        info.tier = _calculateTier(info.totalStaked);

        // Compensate client
        require(stakingToken.transfer(_client, amount), "Staking: compensation failed");

        emit Slashed(_jobId, agent, _client, amount);
    }

    // ═══════════════════════════════════════════════
    // QUERY
    // ═══════════════════════════════════════════════

    function getStake(address _agent) external view returns (StakeInfo memory) {
        return stakes[_agent];
    }

    function getAvailableStake(address _agent) external view returns (uint256) {
        StakeInfo memory info = stakes[_agent];
        return info.totalStaked - info.lockedInJobs;
    }

    function getTier(address _agent) external view returns (Tier) {
        return stakes[_agent].tier;
    }

    function getStats() external view returns (
        uint256 _totalStaked, uint256 _totalSlashed,
        uint256 _totalInsurance, uint256 _totalAgents
    ) {
        return (totalStakedGlobal, totalSlashed, totalInsurancePaid, totalAgentsStaking);
    }

    // ═══════════════════════════════════════════════
    // INTERNAL
    // ═══════════════════════════════════════════════

    function _calculateTier(uint256 _staked) internal view returns (Tier) {
        if (_staked >= diamondThreshold) return Tier.Diamond;
        if (_staked >= goldThreshold) return Tier.Gold;
        if (_staked >= silverThreshold) return Tier.Silver;
        if (_staked > 0) return Tier.Bronze;
        return Tier.None;
    }

    // ═══════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════

    function setInsuranceRate(uint256 _rateBps) external {
        require(msg.sender == owner, "Staking: not owner");
        require(_rateBps <= 5000, "Staking: max 50%");
        insuranceRateBps = _rateBps;
    }

    function setThresholds(uint256 _silver, uint256 _gold, uint256 _diamond) external {
        require(msg.sender == owner, "Staking: not owner");
        silverThreshold = _silver;
        goldThreshold = _gold;
        diamondThreshold = _diamond;
    }

    function transferOwnership(address _newOwner) external {
        require(msg.sender == owner, "Staking: not owner");
        owner = _newOwner;
    }
}
