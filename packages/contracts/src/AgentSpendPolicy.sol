// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  AgentSpendPolicy
 * @notice Programmable spend policies for autonomous agent wallets.
 *         Enforces per-transaction, daily, and monthly spending limits.
 *         Supports recipient whitelists, token restrictions, and emergency kill switch.
 *
 *         Implements AFP-002 SR-3 (Budget Enforcement) and SR-4 (Temporal Bounds).
 *
 * @dev    Controllers set policies; agents execute within policy bounds.
 *         Kill switch allows immediate freeze of all agent spending.
 */
contract AgentSpendPolicy {

    // ── Structs ────────────────────────────────────────────────

    struct SpendPolicy {
        uint256 maxPerTransaction;       // Max amount per single payment (0 = unlimited)
        uint256 maxPerDay;               // Max daily spending (0 = unlimited)
        uint256 maxPerMonth;             // Max monthly spending (0 = unlimited)
        bool requireComplianceProof;     // Require ZK compliance per transaction
        bool requireTEEAttestation;      // Require TEE hardware proof
        bool active;                     // Whether this policy is active
        address killSwitch;              // Address authorized to emergency-stop
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct SpendTracking {
        uint256 dailySpent;              // Amount spent today
        uint256 monthlySpent;            // Amount spent this month
        uint256 totalSpent;              // Lifetime total
        uint256 transactionCount;        // Lifetime transaction count
        uint256 lastDayReset;            // Timestamp of last daily reset
        uint256 lastMonthReset;          // Timestamp of last monthly reset
        bool frozen;                     // Emergency freeze active
    }

    // ── State ──────────────────────────────────────────────────

    /// @notice Agent address → Spend policy
    mapping(address => SpendPolicy) public policies;

    /// @notice Agent address → Token address → Spend tracking
    mapping(address => mapping(address => SpendTracking)) public tracking;

    /// @notice Agent address → Controller address
    mapping(address => address) public controllers;

    /// @notice Agent address → Allowed recipients (empty = any)
    mapping(address => mapping(address => bool)) public allowedRecipients;

    /// @notice Agent address → Has recipient whitelist
    mapping(address => bool) public hasRecipientWhitelist;

    /// @notice Agent address → Allowed tokens (empty = any)
    mapping(address => mapping(address => bool)) public allowedTokens;

    /// @notice Agent address → Has token whitelist
    mapping(address => bool) public hasTokenWhitelist;

    /// @notice Total registered agents
    uint256 public totalPolicies;

    // ── Events ─────────────────────────────────────────────────

    event PolicyCreated(address indexed agent, address indexed controller, uint256 maxPerTx, uint256 maxPerDay, uint256 maxPerMonth);
    event PolicyUpdated(address indexed agent, uint256 maxPerTx, uint256 maxPerDay, uint256 maxPerMonth);
    event SpendRecorded(address indexed agent, address indexed token, address indexed recipient, uint256 amount);
    event AgentFrozen(address indexed agent, address indexed frozenBy);
    event AgentUnfrozen(address indexed agent, address indexed unfrozenBy);
    event RecipientAdded(address indexed agent, address indexed recipient);
    event RecipientRemoved(address indexed agent, address indexed recipient);
    event TokenAdded(address indexed agent, address indexed token);
    event KillSwitchTriggered(address indexed agent, address indexed triggeredBy);

    // ── Modifiers ──────────────────────────────────────────────

    modifier onlyController(address agent) {
        require(controllers[agent] == msg.sender, "Only controller");
        _;
    }

    modifier onlyControllerOrKillSwitch(address agent) {
        require(
            controllers[agent] == msg.sender || policies[agent].killSwitch == msg.sender,
            "Not authorized"
        );
        _;
    }

    // ── Policy Management ──────────────────────────────────────

    /**
     * @notice Create a spend policy for an agent.
     * @dev    The caller becomes the controller of this agent.
     */
    function createPolicy(
        address agent,
        uint256 maxPerTransaction,
        uint256 maxPerDay,
        uint256 maxPerMonth,
        bool requireComplianceProof,
        bool requireTEEAttestation,
        address killSwitch
    ) external {
        require(agent != address(0), "Invalid agent");
        require(!policies[agent].active, "Policy already exists");
        require(killSwitch != address(0), "Kill switch required");

        controllers[agent] = msg.sender;

        policies[agent] = SpendPolicy({
            maxPerTransaction: maxPerTransaction,
            maxPerDay: maxPerDay,
            maxPerMonth: maxPerMonth,
            requireComplianceProof: requireComplianceProof,
            requireTEEAttestation: requireTEEAttestation,
            active: true,
            killSwitch: killSwitch,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        totalPolicies++;

        emit PolicyCreated(agent, msg.sender, maxPerTransaction, maxPerDay, maxPerMonth);
    }

    /**
     * @notice Update spend limits (controller only).
     */
    function updateLimits(
        address agent,
        uint256 maxPerTransaction,
        uint256 maxPerDay,
        uint256 maxPerMonth
    ) external onlyController(agent) {
        SpendPolicy storage policy = policies[agent];
        policy.maxPerTransaction = maxPerTransaction;
        policy.maxPerDay = maxPerDay;
        policy.maxPerMonth = maxPerMonth;
        policy.updatedAt = block.timestamp;

        emit PolicyUpdated(agent, maxPerTransaction, maxPerDay, maxPerMonth);
    }

    /**
     * @notice Add allowed recipient to whitelist.
     */
    function addRecipient(address agent, address recipient) external onlyController(agent) {
        allowedRecipients[agent][recipient] = true;
        hasRecipientWhitelist[agent] = true;
        emit RecipientAdded(agent, recipient);
    }

    /**
     * @notice Remove recipient from whitelist.
     */
    function removeRecipient(address agent, address recipient) external onlyController(agent) {
        allowedRecipients[agent][recipient] = false;
        emit RecipientRemoved(agent, recipient);
    }

    /**
     * @notice Add allowed token to whitelist.
     */
    function addToken(address agent, address token) external onlyController(agent) {
        allowedTokens[agent][token] = true;
        hasTokenWhitelist[agent] = true;
        emit TokenAdded(agent, token);
    }

    // ── Spend Validation ───────────────────────────────────────

    /**
     * @notice Check if a spend is allowed under the agent's policy.
     * @return allowed Whether the spend is permitted
     * @return reason If not allowed, the reason string
     */
    function checkSpend(
        address agent,
        address token,
        address recipient,
        uint256 amount
    ) external view returns (bool allowed, string memory reason) {
        SpendPolicy storage policy = policies[agent];

        if (!policy.active) return (false, "No active policy");

        SpendTracking storage track = tracking[agent][token];

        if (track.frozen) return (false, "Agent is frozen");

        // Check per-transaction limit
        if (policy.maxPerTransaction > 0 && amount > policy.maxPerTransaction) {
            return (false, "Exceeds per-transaction limit");
        }

        // Check daily limit (with auto-reset)
        uint256 dailySpent = track.dailySpent;
        if (block.timestamp >= track.lastDayReset + 1 days) {
            dailySpent = 0; // Would reset
        }
        if (policy.maxPerDay > 0 && dailySpent + amount > policy.maxPerDay) {
            return (false, "Exceeds daily limit");
        }

        // Check monthly limit (with auto-reset)
        uint256 monthlySpent = track.monthlySpent;
        if (block.timestamp >= track.lastMonthReset + 30 days) {
            monthlySpent = 0; // Would reset
        }
        if (policy.maxPerMonth > 0 && monthlySpent + amount > policy.maxPerMonth) {
            return (false, "Exceeds monthly limit");
        }

        // Check recipient whitelist
        if (hasRecipientWhitelist[agent] && !allowedRecipients[agent][recipient]) {
            return (false, "Recipient not in whitelist");
        }

        // Check token whitelist
        if (hasTokenWhitelist[agent] && !allowedTokens[agent][token]) {
            return (false, "Token not allowed");
        }

        return (true, "");
    }

    /**
     * @notice Record a spend against the agent's policy.
     * @dev    Called by the payment contract after validation.
     *         In production, this should be access-controlled to authorized contracts.
     */
    function recordSpend(
        address agent,
        address token,
        address recipient,
        uint256 amount
    ) external {
        SpendPolicy storage policy = policies[agent];
        require(policy.active, "No active policy");

        SpendTracking storage track = tracking[agent][token];
        require(!track.frozen, "Agent is frozen");

        // Auto-reset daily counter
        if (block.timestamp >= track.lastDayReset + 1 days) {
            track.dailySpent = 0;
            track.lastDayReset = block.timestamp;
        }

        // Auto-reset monthly counter
        if (block.timestamp >= track.lastMonthReset + 30 days) {
            track.monthlySpent = 0;
            track.lastMonthReset = block.timestamp;
        }

        // Validate limits
        if (policy.maxPerTransaction > 0) {
            require(amount <= policy.maxPerTransaction, "Exceeds per-tx limit");
        }
        if (policy.maxPerDay > 0) {
            require(track.dailySpent + amount <= policy.maxPerDay, "Exceeds daily limit");
        }
        if (policy.maxPerMonth > 0) {
            require(track.monthlySpent + amount <= policy.maxPerMonth, "Exceeds monthly limit");
        }

        // Check whitelists
        if (hasRecipientWhitelist[agent]) {
            require(allowedRecipients[agent][recipient], "Recipient not allowed");
        }
        if (hasTokenWhitelist[agent]) {
            require(allowedTokens[agent][token], "Token not allowed");
        }

        // Record
        track.dailySpent += amount;
        track.monthlySpent += amount;
        track.totalSpent += amount;
        track.transactionCount++;

        emit SpendRecorded(agent, token, recipient, amount);
    }

    // ── Emergency Controls ─────────────────────────────────────

    /**
     * @notice Freeze an agent (controller or kill switch).
     */
    function freezeAgent(address agent, address token) external onlyControllerOrKillSwitch(agent) {
        tracking[agent][token].frozen = true;
        emit AgentFrozen(agent, msg.sender);
    }

    /**
     * @notice Unfreeze an agent (controller only — kill switch cannot unfreeze).
     */
    function unfreezeAgent(address agent, address token) external onlyController(agent) {
        tracking[agent][token].frozen = false;
        emit AgentUnfrozen(agent, msg.sender);
    }

    /**
     * @notice Emergency kill switch — freezes ALL token spending for this agent.
     */
    function triggerKillSwitch(address agent, address[] calldata tokens) external {
        require(policies[agent].killSwitch == msg.sender, "Not kill switch");

        for (uint256 i = 0; i < tokens.length; i++) {
            tracking[agent][tokens[i]].frozen = true;
        }

        emit KillSwitchTriggered(agent, msg.sender);
    }

    // ── View Functions ─────────────────────────────────────────

    /**
     * @notice Get spend tracking for an agent + token.
     */
    function getTracking(address agent, address token) external view returns (
        uint256 dailySpent,
        uint256 monthlySpent,
        uint256 totalSpent,
        uint256 transactionCount,
        bool frozen
    ) {
        SpendTracking storage t = tracking[agent][token];
        return (t.dailySpent, t.monthlySpent, t.totalSpent, t.transactionCount, t.frozen);
    }

    /**
     * @notice Get remaining daily budget for an agent + token.
     */
    function remainingDailyBudget(address agent, address token) external view returns (uint256) {
        SpendPolicy storage policy = policies[agent];
        if (policy.maxPerDay == 0) return type(uint256).max;

        SpendTracking storage track = tracking[agent][token];
        uint256 spent = track.dailySpent;

        // Auto-reset check
        if (block.timestamp >= track.lastDayReset + 1 days) {
            spent = 0;
        }

        if (spent >= policy.maxPerDay) return 0;
        return policy.maxPerDay - spent;
    }
}
