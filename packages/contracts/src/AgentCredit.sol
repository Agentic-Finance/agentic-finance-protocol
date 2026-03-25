// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentCredit — DeFi Lending for AI Agents
 * @notice "Credit Score for Machines" — agents borrow against their ZK reputation.
 *
 * "The Economy Runs on Trust. We Built It for Machines."
 *
 * Innovation: This is the FIRST credit system where the collateral is
 * verifiable on-chain reputation, not tokens. Agents with proven track
 * records can borrow to fund operations without upfront capital.
 *
 * How it works:
 *   1. Agent has ZK reputation (verified via ReputationRegistry)
 *   2. Based on reputation score → agent gets a credit line
 *   3. Agent borrows up to credit limit from the protocol pool
 *   4. After completing jobs → repays with earned fees
 *   5. Timely repayment → reputation improves → larger credit line
 *   6. Default → reputation slashed → blacklisted
 *
 * Credit Tiers:
 *   Starter:  10+ txs, $1K+ volume   → $50 credit line
 *   Builder:  50+ txs, $10K+ volume   → $500 credit line
 *   Pro:      200+ txs, $50K+ volume  → $2,000 credit line
 *   Elite:    1000+ txs, $250K+ volume → $10,000 credit line
 *
 * This creates a flywheel:
 *   New agent → small credit → completes jobs → earns rep → larger credit → more jobs
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IReputationRegistry {
    function meetsRequirements(uint256 agentCommitment, uint256 requiredTxCount, uint256 requiredVolume)
        external view returns (bool);
}

contract AgentCredit {

    /*//////////////////////////////////////////////////////////////
                            TYPES
    //////////////////////////////////////////////////////////////*/

    enum CreditTier { None, Starter, Builder, Pro, Elite }

    struct CreditLine {
        uint256 reputationCommitment;  // ZK reputation ID
        uint256 creditLimit;           // Max borrowable amount
        uint256 borrowed;             // Currently borrowed
        uint256 totalBorrowed;        // Lifetime total
        uint256 totalRepaid;          // Lifetime repaid
        uint256 lastBorrowAt;         // Last borrow timestamp
        uint256 lastRepayAt;          // Last repayment timestamp
        CreditTier tier;              // Current credit tier
        bool     active;              // Is credit active
        bool     defaulted;           // Has defaulted
    }

    /*//////////////////////////////////////////////////////////////
                            STATE
    //////////////////////////////////////////////////////////////*/

    address public owner;
    IERC20 public lendingToken;
    IReputationRegistry public reputationRegistry;

    /// @notice agent address => CreditLine
    mapping(address => CreditLine) public credits;

    /// @notice Credit tier configurations (tier => {minTx, minVolume, creditLimit})
    struct TierConfig {
        uint256 minTxCount;
        uint256 minVolume;
        uint256 creditLimit;
    }
    mapping(CreditTier => TierConfig) public tierConfigs;

    /// @notice Pool stats
    uint256 public totalPoolBalance;    // Available to lend
    uint256 public totalBorrowedGlobal; // Currently lent out
    uint256 public totalDefaulted;      // Lost to defaults
    uint256 public totalInterestEarned; // Interest collected
    uint256 public activeCredits;       // Active credit lines

    /// @notice Interest rate (basis points per 30 days, e.g., 200 = 2%)
    uint256 public interestRateBps;

    /// @notice Default threshold (seconds since last repayment)
    uint256 public defaultThreshold;

    /*//////////////////////////////////////////////////////////////
                            EVENTS
    //////////////////////////////////////////////////////////////*/

    event CreditLineOpened(address indexed agent, CreditTier tier, uint256 creditLimit);
    event Borrowed(address indexed agent, uint256 amount, uint256 totalBorrowed);
    event Repaid(address indexed agent, uint256 amount, uint256 remaining);
    event Defaulted(address indexed agent, uint256 amount);
    event PoolDeposited(address indexed depositor, uint256 amount);
    event TierUpgraded(address indexed agent, CreditTier oldTier, CreditTier newTier);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _lendingToken, address _reputationRegistry) {
        owner = msg.sender;
        lendingToken = IERC20(_lendingToken);
        reputationRegistry = IReputationRegistry(_reputationRegistry);

        interestRateBps = 200; // 2% per 30 days
        defaultThreshold = 30 days;

        // Configure tiers (amounts in 6 decimals)
        tierConfigs[CreditTier.Starter] = TierConfig(10, 1000 * 1e6, 50 * 1e6);
        tierConfigs[CreditTier.Builder] = TierConfig(50, 10000 * 1e6, 500 * 1e6);
        tierConfigs[CreditTier.Pro] = TierConfig(200, 50000 * 1e6, 2000 * 1e6);
        tierConfigs[CreditTier.Elite] = TierConfig(1000, 250000 * 1e6, 10000 * 1e6);
    }

    /*//////////////////////////////////////////////////////////////
                            CORE: Open credit line
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Open or upgrade a credit line based on ZK reputation
     */
    function openCreditLine(uint256 _reputationCommitment) external {
        CreditLine storage credit = credits[msg.sender];
        require(!credit.defaulted, "Credit: defaulted agents cannot borrow");

        // Determine highest eligible tier
        CreditTier bestTier = CreditTier.None;
        uint256 bestLimit = 0;

        // Check each tier from highest to lowest
        CreditTier[4] memory tiers = [CreditTier.Elite, CreditTier.Pro, CreditTier.Builder, CreditTier.Starter];
        for (uint256 i = 0; i < 4; i++) {
            TierConfig memory config = tierConfigs[tiers[i]];
            if (reputationRegistry.meetsRequirements(_reputationCommitment, config.minTxCount, config.minVolume)) {
                bestTier = tiers[i];
                bestLimit = config.creditLimit;
                break;
            }
        }

        require(bestTier != CreditTier.None, "Credit: insufficient reputation");

        CreditTier oldTier = credit.tier;

        if (!credit.active) {
            activeCredits++;
        }

        credit.reputationCommitment = _reputationCommitment;
        credit.creditLimit = bestLimit;
        credit.tier = bestTier;
        credit.active = true;

        if (bestTier != oldTier) {
            emit TierUpgraded(msg.sender, oldTier, bestTier);
        }

        emit CreditLineOpened(msg.sender, bestTier, bestLimit);
    }

    /**
     * @notice Borrow tokens against credit line
     */
    function borrow(uint256 _amount) external {
        CreditLine storage credit = credits[msg.sender];
        require(credit.active, "Credit: no active credit line");
        require(!credit.defaulted, "Credit: defaulted");
        require(credit.borrowed + _amount <= credit.creditLimit, "Credit: exceeds limit");
        require(totalPoolBalance >= _amount, "Credit: insufficient pool");

        credit.borrowed += _amount;
        credit.totalBorrowed += _amount;
        credit.lastBorrowAt = block.timestamp;
        totalBorrowedGlobal += _amount;
        totalPoolBalance -= _amount;

        require(lendingToken.transfer(msg.sender, _amount), "Credit: transfer failed");

        emit Borrowed(msg.sender, _amount, credit.borrowed);
    }

    /**
     * @notice Repay borrowed amount
     */
    function repay(uint256 _amount) external {
        CreditLine storage credit = credits[msg.sender];
        require(credit.borrowed > 0, "Credit: nothing to repay");

        // Calculate accrued interest
        uint256 timeElapsed = block.timestamp - credit.lastRepayAt;
        if (timeElapsed == 0) timeElapsed = block.timestamp - credit.lastBorrowAt;
        uint256 interest = (credit.borrowed * interestRateBps * timeElapsed) / (10000 * 365 days);
        uint256 totalOwed = credit.borrowed + interest;

        uint256 repayAmount = _amount > totalOwed ? totalOwed : _amount;

        // CEI: Update state BEFORE external call (reentrancy protection)
        if (repayAmount <= interest) {
            totalPoolBalance += repayAmount;
        } else {
            uint256 principalPaid = repayAmount - interest;
            credit.borrowed -= principalPaid;
            totalBorrowedGlobal -= principalPaid;
            totalPoolBalance += repayAmount;
        }
        credit.totalRepaid += repayAmount;
        credit.lastRepayAt = block.timestamp;

        // Interaction: External call LAST
        require(lendingToken.transferFrom(msg.sender, address(this), repayAmount), "Credit: transfer failed");

        emit Repaid(msg.sender, repayAmount, credit.borrowed);
    }

    /*//////////////////////////////////////////////////////////////
                            POOL: Deposit liquidity
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Deposit tokens into the lending pool
     */
    /// @notice depositorAddress => deposited amount
    mapping(address => uint256) public poolDeposits;

    function depositToPool(uint256 _amount) external {
        require(lendingToken.transferFrom(msg.sender, address(this), _amount), "Credit: deposit failed");
        poolDeposits[msg.sender] += _amount;
        totalPoolBalance += _amount;
        emit PoolDeposited(msg.sender, _amount);
    }

    function withdrawFromPool(uint256 _amount) external {
        require(poolDeposits[msg.sender] >= _amount, "Credit: insufficient deposit");
        require(totalPoolBalance >= _amount, "Credit: pool has insufficient liquidity");
        poolDeposits[msg.sender] -= _amount;
        totalPoolBalance -= _amount;
        require(lendingToken.transfer(msg.sender, _amount), "Credit: withdraw failed");
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN: Default management
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Mark agent as defaulted (called after default threshold)
     */
    function markDefault(address _agent) external {
        require(msg.sender == owner, "Credit: not owner");
        CreditLine storage credit = credits[_agent];
        require(credit.borrowed > 0, "Credit: no debt");
        uint256 lastActivity = credit.lastRepayAt > credit.lastBorrowAt ? credit.lastRepayAt : credit.lastBorrowAt;
        require(
            block.timestamp > lastActivity + defaultThreshold,
            "Credit: not yet defaultable"
        );

        uint256 defaultAmount = credit.borrowed;
        credit.defaulted = true;
        credit.active = false;
        totalDefaulted += defaultAmount;
        totalBorrowedGlobal -= defaultAmount;
        activeCredits--;

        emit Defaulted(_agent, defaultAmount);
    }

    /*//////////////////////////////////////////////////////////////
                            QUERY
    //////////////////////////////////////////////////////////////*/

    function getCreditLine(address _agent) external view returns (CreditLine memory) {
        return credits[_agent];
    }

    function getAvailableCredit(address _agent) external view returns (uint256) {
        CreditLine memory credit = credits[_agent];
        if (!credit.active || credit.defaulted) return 0;
        return credit.creditLimit - credit.borrowed;
    }

    function getPoolStats() external view returns (
        uint256 _poolBalance, uint256 _totalBorrowed,
        uint256 _totalDefaulted, uint256 _activeCredits
    ) {
        return (totalPoolBalance, totalBorrowedGlobal, totalDefaulted, activeCredits);
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN
    //////////////////////////////////////////////////////////////*/

    function setInterestRate(uint256 _rateBps) external {
        require(msg.sender == owner, "Credit: not owner");
        interestRateBps = _rateBps;
    }

    function setDefaultThreshold(uint256 _seconds) external {
        require(msg.sender == owner, "Credit: not owner");
        defaultThreshold = _seconds;
    }

    function transferOwnership(address _newOwner) external {
        require(msg.sender == owner, "Credit: not owner");
        require(_newOwner != address(0), "Credit: zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
