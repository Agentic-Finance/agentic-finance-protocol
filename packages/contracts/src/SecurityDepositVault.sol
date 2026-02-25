// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SecurityDepositVault
 * @notice Agent security deposit system for PayPol Protocol.
 *
 * Agents lock stablecoins to prove "skin in the game":
 *   - Tiered fee discounts (Bronze $50 → 0.5%, Silver $200 → 1.5%, Gold $1000 → 3%)
 *   - 30-day minimum lock period
 *   - Slashing for proof mismatches, consecutive failures, or lost disputes
 *   - Insurance pool from slashed funds → compensate affected users
 *
 * Alternative to token staking when there is no TGE.
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract SecurityDepositVault {
    // ── Tier Thresholds (in token's smallest unit, 6 decimals) ──
    uint256 public constant BRONZE_THRESHOLD = 50_000_000;   // $50
    uint256 public constant SILVER_THRESHOLD = 200_000_000;  // $200
    uint256 public constant GOLD_THRESHOLD   = 1_000_000_000; // $1,000

    // Fee discounts in basis points (subtracted from platform fee)
    uint256 public constant BRONZE_DISCOUNT_BPS = 50;   // 0.5%
    uint256 public constant SILVER_DISCOUNT_BPS = 150;  // 1.5%
    uint256 public constant GOLD_DISCOUNT_BPS   = 300;  // 3.0%

    // Slash percentage (10% of deposit)
    uint256 public constant SLASH_BPS = 1000; // 10%

    // Minimum lock period (30 days)
    uint256 public constant MIN_LOCK_PERIOD = 30 days;

    // ── State ────────────────────────────────────────────

    address public owner;
    address public token;    // ERC20 token (AlphaUSD)

    struct DepositInfo {
        uint256 amount;       // Current deposit balance
        uint256 depositedAt;  // Timestamp of last deposit
        uint256 slashCount;   // Number of times slashed
        uint256 totalSlashed; // Total amount slashed
    }

    mapping(address => DepositInfo) public deposits;
    address[] public depositors;
    mapping(address => bool) public hasDeposited;

    // Insurance pool (funded by slashed deposits)
    uint256 public insurancePool;

    // Global stats
    uint256 public totalDeposited;
    uint256 public totalSlashed;
    uint256 public totalInsurancePaid;
    uint256 public totalAgentsDeposited;

    // ── Events ───────────────────────────────────────────

    event DepositMade(address indexed agent, uint256 amount, uint256 total, uint8 tier);
    event DepositWithdrawn(address indexed agent, uint256 amount, uint256 remaining);
    event DepositSlashed(address indexed agent, uint256 slashAmount, string reason);
    event InsurancePayout(address indexed claimant, uint256 amount, string reason);
    event OwnershipTransferred(address indexed previous, address indexed next_);

    // ── Modifiers ────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "SecurityDepositVault: not owner");
        _;
    }

    // ── Constructor ──────────────────────────────────────

    constructor(address _token) {
        owner = msg.sender;
        token = _token;
    }

    // ── Deposit ──────────────────────────────────────────

    /**
     * @notice Deposit stablecoins as security deposit.
     * @param _amount Amount to deposit (in token's smallest unit)
     */
    function deposit(uint256 _amount) external {
        require(_amount > 0, "SecurityDepositVault: zero amount");

        IERC20(token).transferFrom(msg.sender, address(this), _amount);

        if (!hasDeposited[msg.sender]) {
            hasDeposited[msg.sender] = true;
            depositors.push(msg.sender);
            totalAgentsDeposited++;
        }

        deposits[msg.sender].amount += _amount;
        deposits[msg.sender].depositedAt = block.timestamp;
        totalDeposited += _amount;

        uint8 tier = getTier(msg.sender);
        emit DepositMade(msg.sender, _amount, deposits[msg.sender].amount, tier);
    }

    /**
     * @notice Withdraw deposit after lock period expires.
     * @param _amount Amount to withdraw
     */
    function withdraw(uint256 _amount) external {
        DepositInfo storage info = deposits[msg.sender];
        require(info.amount >= _amount, "SecurityDepositVault: insufficient balance");
        require(
            block.timestamp >= info.depositedAt + MIN_LOCK_PERIOD,
            "SecurityDepositVault: lock period not expired"
        );

        info.amount -= _amount;
        totalDeposited -= _amount;

        IERC20(token).transfer(msg.sender, _amount);

        emit DepositWithdrawn(msg.sender, _amount, info.amount);
    }

    // ── Slashing ─────────────────────────────────────────

    /**
     * @notice Slash an agent's deposit (owner/daemon only).
     * Slashed amount goes to insurance pool.
     * @param _agent Agent to slash
     * @param _reason Human-readable reason (stored in event)
     */
    function slash(address _agent, string calldata _reason) external onlyOwner {
        DepositInfo storage info = deposits[_agent];
        require(info.amount > 0, "SecurityDepositVault: no deposit to slash");

        // Slash 10% of current deposit
        uint256 slashAmount = (info.amount * SLASH_BPS) / 10000;
        if (slashAmount == 0) slashAmount = 1; // minimum 1 unit

        info.amount -= slashAmount;
        info.slashCount++;
        info.totalSlashed += slashAmount;

        insurancePool += slashAmount;
        totalSlashed += slashAmount;

        emit DepositSlashed(_agent, slashAmount, _reason);
    }

    /**
     * @notice Pay insurance claim from the pool (owner only).
     * @param _claimant Address to receive compensation
     * @param _amount Amount to pay
     * @param _reason Reason for payout
     */
    function insurancePayout(
        address _claimant,
        uint256 _amount,
        string calldata _reason
    ) external onlyOwner {
        require(_amount <= insurancePool, "SecurityDepositVault: insufficient insurance pool");

        insurancePool -= _amount;
        totalInsurancePaid += _amount;

        IERC20(token).transfer(_claimant, _amount);

        emit InsurancePayout(_claimant, _amount, _reason);
    }

    // ── View Functions ───────────────────────────────────

    /**
     * @notice Get the tier of an agent (0=None, 1=Bronze, 2=Silver, 3=Gold).
     */
    function getTier(address _agent) public view returns (uint8) {
        uint256 amt = deposits[_agent].amount;
        if (amt >= GOLD_THRESHOLD) return 3;
        if (amt >= SILVER_THRESHOLD) return 2;
        if (amt >= BRONZE_THRESHOLD) return 1;
        return 0;
    }

    /**
     * @notice Get fee discount in basis points for an agent.
     */
    function getFeeDiscount(address _agent) external view returns (uint256) {
        uint8 tier = getTier(_agent);
        if (tier == 3) return GOLD_DISCOUNT_BPS;
        if (tier == 2) return SILVER_DISCOUNT_BPS;
        if (tier == 1) return BRONZE_DISCOUNT_BPS;
        return 0;
    }

    /**
     * @notice Get full deposit info for an agent.
     */
    function getDeposit(address _agent) external view returns (
        uint256 amount,
        uint256 depositedAt,
        uint256 slashCount,
        uint256 totalSlashedAmt,
        uint8 tier,
        uint256 feeDiscount,
        bool lockExpired
    ) {
        DepositInfo storage info = deposits[_agent];
        amount = info.amount;
        depositedAt = info.depositedAt;
        slashCount = info.slashCount;
        totalSlashedAmt = info.totalSlashed;
        tier = getTier(_agent);
        feeDiscount = this.getFeeDiscount(_agent);
        lockExpired = (info.depositedAt > 0) && (block.timestamp >= info.depositedAt + MIN_LOCK_PERIOD);
    }

    /**
     * @notice Get the number of depositors.
     */
    function getDepositorCount() external view returns (uint256) {
        return depositors.length;
    }

    /**
     * @notice Get depositor address by index.
     */
    function getDepositor(uint256 _index) external view returns (address) {
        require(_index < depositors.length, "SecurityDepositVault: index out of bounds");
        return depositors[_index];
    }

    /**
     * @notice Get global vault stats.
     */
    function getStats() external view returns (
        uint256 _totalDeposited,
        uint256 _totalSlashed,
        uint256 _totalInsurancePaid,
        uint256 _insurancePool,
        uint256 _totalAgents
    ) {
        return (totalDeposited, totalSlashed, totalInsurancePaid, insurancePool, totalAgentsDeposited);
    }

    // ── Admin ────────────────────────────────────────────

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "SecurityDepositVault: zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
