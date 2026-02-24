// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @dev Minimal ERC20 interface for token interactions
interface IERC20Stream {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title  PayPolStreamV1
 * @notice Progressive milestone-based escrow for PayPol Agent Marketplace.
 *
 *         Unlike PayPolNexusV2 (all-or-nothing), StreamV1 splits jobs into
 *         milestones. Client approves each deliverable → payment releases
 *         progressively. Client can stop anytime — only pays for approved work.
 *
 *         Flow: Client locks budget → Agent submits milestones → Client approves →
 *               Payment releases per milestone → Stream completes when all approved
 *
 *         Signature feature of PayPol — only viable on Tempo L1 (near-zero gas
 *         makes 10+ micro-transactions per job economically feasible).
 */
contract PayPolStreamV1 is Ownable, ReentrancyGuard {

    // ── Enums ────────────────────────────────────────────────

    enum StreamStatus {
        Active,     // 0 — Stream is live, milestones can be submitted/approved
        Completed,  // 1 — All milestones approved, fully paid out
        Cancelled   // 2 — Client cancelled or timeout, remaining funds refunded
    }

    enum MilestoneStatus {
        Pending,    // 0 — Not yet submitted by agent
        Submitted,  // 1 — Agent submitted, awaiting client review
        Approved,   // 2 — Client approved, payment released
        Rejected    // 3 — Client rejected, agent can re-submit
    }

    // ── Structs ──────────────────────────────────────────────

    struct Stream {
        address client;             // Who funded the escrow
        address agent;              // Agent receiving progressive payments
        address token;              // ERC20 token address (AlphaUSD)
        uint256 totalBudget;        // Total locked amount
        uint256 releasedAmount;     // Cumulative released to agent
        uint256 platformFeeAccrued; // Cumulative fees collected
        uint256 milestoneCount;     // Total number of milestones
        uint256 approvedCount;      // Number of approved milestones
        uint256 deadline;           // Timeout: client can reclaim after this
        StreamStatus status;        // Current stream state
    }

    struct Milestone {
        uint256 amount;             // Payment for this milestone
        bytes32 proofHash;          // AI Proof hash (keccak256 of deliverable)
        MilestoneStatus status;     // Current milestone state
    }

    // ── Storage ──────────────────────────────────────────────

    mapping(uint256 => Stream) public streams;
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;

    uint256 public streamCount;

    /// @notice Platform fee in basis points (800 = 8%). Applied per milestone approval.
    uint256 public platformFeeBps = 800;

    /// @notice Accumulated platform fees per token, withdrawable by owner.
    mapping(address => uint256) public accumulatedFees;

    /// @notice Maximum milestones per stream (prevents gas exhaustion).
    uint256 public constant MAX_MILESTONES = 10;

    // ── Events ───────────────────────────────────────────────

    event StreamCreated(
        uint256 indexed streamId,
        address indexed client,
        address indexed agent,
        uint256 totalBudget,
        uint256 milestoneCount,
        uint256 deadline
    );

    event MilestoneSubmitted(
        uint256 indexed streamId,
        uint256 indexed milestoneIndex,
        bytes32 proofHash
    );

    event MilestoneApproved(
        uint256 indexed streamId,
        uint256 indexed milestoneIndex,
        uint256 agentPayout,
        uint256 fee
    );

    event MilestoneRejected(
        uint256 indexed streamId,
        uint256 indexed milestoneIndex
    );

    event StreamCompleted(
        uint256 indexed streamId,
        uint256 totalReleased,
        uint256 totalFees
    );

    event StreamCancelled(
        uint256 indexed streamId,
        uint256 refundedAmount
    );

    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeesWithdrawn(address indexed token, uint256 amount);

    // ── Constructor ──────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ── Stream Creation (Client) ─────────────────────────────

    /**
     * @notice Create a stream with milestone-based payments.
     *         Client must have approved this contract to spend the total budget.
     *
     * @param _agent              Agent's wallet address
     * @param _token              ERC20 token address (e.g. AlphaUSD)
     * @param _milestoneAmounts   Array of payment amounts per milestone
     * @param _deadlineDuration   Seconds until timeout (e.g. 604800 = 7 days)
     * @return streamId           The created stream's ID
     */
    function createStream(
        address _agent,
        address _token,
        uint256[] calldata _milestoneAmounts,
        uint256 _deadlineDuration
    ) external nonReentrant returns (uint256 streamId) {
        require(_agent != address(0), "Agent cannot be zero address");
        require(_token != address(0), "Token cannot be zero address");
        require(_milestoneAmounts.length > 0, "Must have at least 1 milestone");
        require(_milestoneAmounts.length <= MAX_MILESTONES, "Max 10 milestones");
        require(_deadlineDuration > 0, "Deadline duration must be > 0");

        // Calculate total budget
        uint256 total = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Milestone amount must be > 0");
            total += _milestoneAmounts[i];
        }

        // Transfer total budget from client to this contract
        bool success = IERC20Stream(_token).transferFrom(msg.sender, address(this), total);
        require(success, "Token transfer failed");

        // Create stream
        streamId = streamCount;
        streams[streamId] = Stream({
            client: msg.sender,
            agent: _agent,
            token: _token,
            totalBudget: total,
            releasedAmount: 0,
            platformFeeAccrued: 0,
            milestoneCount: _milestoneAmounts.length,
            approvedCount: 0,
            deadline: block.timestamp + _deadlineDuration,
            status: StreamStatus.Active
        });

        // Create milestone slots
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            milestones[streamId][i] = Milestone({
                amount: _milestoneAmounts[i],
                proofHash: bytes32(0),
                status: MilestoneStatus.Pending
            });
        }

        emit StreamCreated(streamId, msg.sender, _agent, total, _milestoneAmounts.length, block.timestamp + _deadlineDuration);
        streamCount++;
    }

    // ── Milestone Submission (Agent) ─────────────────────────

    /**
     * @notice Agent submits a milestone deliverable with an AI proof hash.
     *         Only the agent (or owner) can submit. Milestone must be Pending or Rejected.
     *
     * @param _streamId        Stream ID
     * @param _milestoneIndex  Which milestone (0-based)
     * @param _proofHash       keccak256 of the deliverable/result
     */
    function submitMilestone(
        uint256 _streamId,
        uint256 _milestoneIndex,
        bytes32 _proofHash
    ) external {
        Stream storage s = streams[_streamId];
        require(s.status == StreamStatus.Active, "Stream not active");
        require(msg.sender == s.agent || msg.sender == owner(), "Not agent");
        require(_milestoneIndex < s.milestoneCount, "Invalid milestone index");

        Milestone storage m = milestones[_streamId][_milestoneIndex];
        require(
            m.status == MilestoneStatus.Pending || m.status == MilestoneStatus.Rejected,
            "Milestone cannot be submitted in current state"
        );

        m.proofHash = _proofHash;
        m.status = MilestoneStatus.Submitted;

        emit MilestoneSubmitted(_streamId, _milestoneIndex, _proofHash);
    }

    // ── Milestone Approval (Client) ──────────────────────────

    /**
     * @notice Client approves a submitted milestone. Releases payment immediately.
     *         Deducts platform fee (8%) and transfers 92% to agent.
     *         Auto-completes stream if all milestones are approved.
     *
     * @param _streamId        Stream ID
     * @param _milestoneIndex  Which milestone (0-based)
     */
    function approveMilestone(
        uint256 _streamId,
        uint256 _milestoneIndex
    ) external nonReentrant {
        Stream storage s = streams[_streamId];
        require(s.status == StreamStatus.Active, "Stream not active");
        require(msg.sender == s.client || msg.sender == owner(), "Not client");
        require(_milestoneIndex < s.milestoneCount, "Invalid milestone index");

        Milestone storage m = milestones[_streamId][_milestoneIndex];
        require(m.status == MilestoneStatus.Submitted, "Milestone not submitted");

        m.status = MilestoneStatus.Approved;
        s.approvedCount++;

        // Calculate payment with platform fee
        uint256 fee = (m.amount * platformFeeBps) / 10_000;
        uint256 agentPayout = m.amount - fee;

        s.releasedAmount += m.amount;
        s.platformFeeAccrued += fee;
        accumulatedFees[s.token] += fee;

        // Transfer to agent immediately
        bool success = IERC20Stream(s.token).transfer(s.agent, agentPayout);
        require(success, "Agent payment failed");

        emit MilestoneApproved(_streamId, _milestoneIndex, agentPayout, fee);

        // Auto-complete stream if all milestones approved
        if (s.approvedCount == s.milestoneCount) {
            s.status = StreamStatus.Completed;
            emit StreamCompleted(_streamId, s.releasedAmount, s.platformFeeAccrued);
        }
    }

    // ── Milestone Rejection (Client) ─────────────────────────

    /**
     * @notice Client rejects a submitted milestone. Agent can re-submit.
     *
     * @param _streamId        Stream ID
     * @param _milestoneIndex  Which milestone (0-based)
     */
    function rejectMilestone(
        uint256 _streamId,
        uint256 _milestoneIndex
    ) external {
        Stream storage s = streams[_streamId];
        require(s.status == StreamStatus.Active, "Stream not active");
        require(msg.sender == s.client || msg.sender == owner(), "Not client");
        require(_milestoneIndex < s.milestoneCount, "Invalid milestone index");

        Milestone storage m = milestones[_streamId][_milestoneIndex];
        require(m.status == MilestoneStatus.Submitted, "Milestone not submitted");

        m.status = MilestoneStatus.Rejected;

        emit MilestoneRejected(_streamId, _milestoneIndex);
    }

    // ── Cancel Stream (Client) ───────────────────────────────

    /**
     * @notice Client cancels the stream. All unreleased funds are refunded.
     *         Can only cancel an active stream.
     */
    function cancelStream(uint256 _streamId) external nonReentrant {
        Stream storage s = streams[_streamId];
        require(s.status == StreamStatus.Active, "Stream not active");
        require(msg.sender == s.client || msg.sender == owner(), "Not client");

        s.status = StreamStatus.Cancelled;
        uint256 remaining = s.totalBudget - s.releasedAmount;

        if (remaining > 0) {
            bool success = IERC20Stream(s.token).transfer(s.client, remaining);
            require(success, "Refund transfer failed");
        }

        emit StreamCancelled(_streamId, remaining);
    }

    // ── Timeout Claim (Client) ───────────────────────────────

    /**
     * @notice Client reclaims all unreleased funds after the deadline passes.
     *         Prevents agent from locking funds indefinitely by never submitting.
     */
    function claimTimeout(uint256 _streamId) external nonReentrant {
        Stream storage s = streams[_streamId];
        require(s.status == StreamStatus.Active, "Stream not active");
        require(block.timestamp > s.deadline, "Deadline has not passed yet");
        require(msg.sender == s.client, "Only client can claim timeout");

        s.status = StreamStatus.Cancelled;
        uint256 remaining = s.totalBudget - s.releasedAmount;

        if (remaining > 0) {
            bool success = IERC20Stream(s.token).transfer(s.client, remaining);
            require(success, "Timeout refund failed");
        }

        emit StreamCancelled(_streamId, remaining);
    }

    // ── Platform Admin ───────────────────────────────────────

    /**
     * @notice Update the platform fee. Max 30% (3000 bps).
     */
    function setPlatformFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 3000, "Fee cannot exceed 30%");
        uint256 oldFee = platformFeeBps;
        platformFeeBps = _feeBps;
        emit PlatformFeeUpdated(oldFee, _feeBps);
    }

    /**
     * @notice Withdraw accumulated platform fees for a specific token.
     */
    function withdrawFees(address _token) external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees[_token];
        require(amount > 0, "No fees to withdraw");

        accumulatedFees[_token] = 0;

        bool success = IERC20Stream(_token).transfer(owner(), amount);
        require(success, "Fee withdrawal failed");

        emit FeesWithdrawn(_token, amount);
    }

    // ── View Helpers ─────────────────────────────────────────

    /**
     * @notice Get full stream details.
     */
    function getStream(uint256 _streamId) external view returns (
        address client,
        address agent,
        address token,
        uint256 totalBudget,
        uint256 releasedAmount,
        uint256 milestoneCount,
        uint256 approvedCount,
        uint256 deadline,
        StreamStatus status
    ) {
        Stream storage s = streams[_streamId];
        return (s.client, s.agent, s.token, s.totalBudget, s.releasedAmount,
                s.milestoneCount, s.approvedCount, s.deadline, s.status);
    }

    /**
     * @notice Get milestone details.
     */
    function getMilestone(uint256 _streamId, uint256 _milestoneIndex) external view returns (
        uint256 amount,
        bytes32 proofHash,
        MilestoneStatus status
    ) {
        Milestone storage m = milestones[_streamId][_milestoneIndex];
        return (m.amount, m.proofHash, m.status);
    }

    /**
     * @notice Check if a stream's deadline has passed.
     */
    function isTimedOut(uint256 _streamId) external view returns (bool) {
        Stream storage s = streams[_streamId];
        return block.timestamp > s.deadline && s.status == StreamStatus.Active;
    }

    /**
     * @notice Get remaining unreleased balance for a stream.
     */
    function getRemainingBalance(uint256 _streamId) external view returns (uint256) {
        Stream storage s = streams[_streamId];
        return s.totalBudget - s.releasedAmount;
    }
}
