// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReputationRegistry
 * @notice On-chain reputation scoring for PayPol AI agents.
 *
 * Aggregates four signal sources into a single composite score (0-10000):
 *   - 30%: On-chain NexusV2 worker ratings (1-5 stars)
 *   - 25%: Off-chain AgentReview ratings (1-5 stars)
 *   - 25%: Job completion rate (completed / total)
 *   - 20%: AI Proof reliability (matched / verified, slash penalty)
 *
 * The daemon calls updateReputation() periodically (every ~5 min) with
 * aggregated off-chain data. On-chain NexusV2 ratings are read directly
 * from the NexusV2 contract.
 *
 * Score display: 8500 = 85.00 / 100
 *
 * Tier labels:
 *   0-3000     Newcomer
 *   3001-6000  Rising
 *   6001-8000  Trusted
 *   8001-9500  Elite
 *   9501-10000 Legend
 */
contract ReputationRegistry {

    // ── Structs ──────────────────────────────────────────────

    struct ReputationSnapshot {
        // On-chain NexusV2 data (synced from NexusV2 contract)
        uint256 nexusRatingSum;
        uint256 nexusRatingCount;
        // Off-chain DB data (from AgentReview table)
        uint256 offChainRatingSum;
        uint256 offChainRatingCount;
        // Job completion stats (from AgentJob table)
        uint256 totalJobsCompleted;
        uint256 totalJobsFailed;
        // AI Proof reliability (from AIProofRegistry)
        uint256 proofCommitments;
        uint256 proofVerified;
        uint256 proofMatched;
        uint256 proofSlashed;
        // Composite score (0-10000)
        uint256 compositeScore;
        // Metadata
        uint256 updatedAt;
    }

    // ── State ────────────────────────────────────────────────

    mapping(address => ReputationSnapshot) public reputations;
    mapping(address => uint256[]) public snapshotTimestamps;
    address[] public trackedAgents;
    mapping(address => bool) public isTracked;

    uint256 public totalAgentsScored;

    address public owner;
    address public nexusV2;
    address public proofRegistry;

    // ── Events ───────────────────────────────────────────────

    event ReputationUpdated(
        address indexed agent,
        uint256 compositeScore,
        uint256 timestamp
    );

    event OwnerTransferred(address indexed oldOwner, address indexed newOwner);

    // ── Modifiers ────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "ReputationRegistry: not owner");
        _;
    }

    // ── Constructor ──────────────────────────────────────────

    constructor(address _nexusV2, address _proofRegistry) {
        owner = msg.sender;
        nexusV2 = _nexusV2;
        proofRegistry = _proofRegistry;
    }

    // ── Core Functions ───────────────────────────────────────

    /**
     * @notice Update an agent's reputation snapshot. Called by daemon.
     * @dev The daemon reads off-chain DB stats and on-chain NexusV2/AIProofRegistry
     *      data, then submits everything in a single transaction for gas efficiency.
     */
    function updateReputation(
        address _agent,
        uint256 _nexusRatingSum,
        uint256 _nexusRatingCount,
        uint256 _offChainRatingSum,
        uint256 _offChainRatingCount,
        uint256 _totalJobsCompleted,
        uint256 _totalJobsFailed,
        uint256 _proofCommitments,
        uint256 _proofVerified,
        uint256 _proofMatched,
        uint256 _proofSlashed
    ) external onlyOwner {
        require(_agent != address(0), "ReputationRegistry: zero address");

        ReputationSnapshot storage rep = reputations[_agent];

        // Track new agents
        if (!isTracked[_agent]) {
            isTracked[_agent] = true;
            trackedAgents.push(_agent);
            totalAgentsScored++;
        }

        // Update all fields
        rep.nexusRatingSum = _nexusRatingSum;
        rep.nexusRatingCount = _nexusRatingCount;
        rep.offChainRatingSum = _offChainRatingSum;
        rep.offChainRatingCount = _offChainRatingCount;
        rep.totalJobsCompleted = _totalJobsCompleted;
        rep.totalJobsFailed = _totalJobsFailed;
        rep.proofCommitments = _proofCommitments;
        rep.proofVerified = _proofVerified;
        rep.proofMatched = _proofMatched;
        rep.proofSlashed = _proofSlashed;
        rep.updatedAt = block.timestamp;

        // Compute composite score
        rep.compositeScore = _computeScore(rep);

        // Record history
        snapshotTimestamps[_agent].push(block.timestamp);

        emit ReputationUpdated(_agent, rep.compositeScore, block.timestamp);
    }

    /**
     * @notice Batch update data input struct (avoids stack-too-deep).
     */
    struct BatchInput {
        address agent;
        uint256 nexusRatingSum;
        uint256 nexusRatingCount;
        uint256 offChainRatingSum;
        uint256 offChainRatingCount;
        uint256 totalJobsCompleted;
        uint256 totalJobsFailed;
        uint256 proofCommitments;
        uint256 proofVerified;
        uint256 proofMatched;
        uint256 proofSlashed;
    }

    /**
     * @notice Batch update multiple agents in a single transaction.
     * @dev Gas-efficient for periodic updates of all active agents.
     */
    function batchUpdateReputation(BatchInput[] calldata _inputs) external onlyOwner {
        require(_inputs.length > 0, "ReputationRegistry: empty batch");

        for (uint256 i = 0; i < _inputs.length; i++) {
            BatchInput calldata inp = _inputs[i];
            if (inp.agent == address(0)) continue;

            if (!isTracked[inp.agent]) {
                isTracked[inp.agent] = true;
                trackedAgents.push(inp.agent);
                totalAgentsScored++;
            }

            ReputationSnapshot storage rep = reputations[inp.agent];
            rep.nexusRatingSum = inp.nexusRatingSum;
            rep.nexusRatingCount = inp.nexusRatingCount;
            rep.offChainRatingSum = inp.offChainRatingSum;
            rep.offChainRatingCount = inp.offChainRatingCount;
            rep.totalJobsCompleted = inp.totalJobsCompleted;
            rep.totalJobsFailed = inp.totalJobsFailed;
            rep.proofCommitments = inp.proofCommitments;
            rep.proofVerified = inp.proofVerified;
            rep.proofMatched = inp.proofMatched;
            rep.proofSlashed = inp.proofSlashed;
            rep.updatedAt = block.timestamp;
            rep.compositeScore = _computeScore(rep);

            snapshotTimestamps[inp.agent].push(block.timestamp);
            emit ReputationUpdated(inp.agent, rep.compositeScore, block.timestamp);
        }
    }

    // ── Score Computation ────────────────────────────────────

    /**
     * @dev Weighted composite score calculation.
     *
     * Components (total 10000):
     *   On-chain rating:  30% → max 3000 (rating 5 × 600)
     *   Off-chain rating: 25% → max 2500 (rating 5 × 500)
     *   Completion rate:  25% → max 2500 (100% = 2500)
     *   Proof reliability: 20% → max 2000 (100% match - slash penalty)
     *
     * New agents with no data get 0 (Newcomer tier).
     */
    function _computeScore(ReputationSnapshot storage rep) internal view returns (uint256) {
        uint256 score = 0;

        // ── On-chain rating component (0-3000) ──
        // NexusV2 rating is 1-5 stars; ratingSum/ratingCount = avg
        // avg 5.0 × 600 = 3000 max
        if (rep.nexusRatingCount > 0) {
            uint256 onChainComponent = (rep.nexusRatingSum * 600) / rep.nexusRatingCount;
            if (onChainComponent > 3000) onChainComponent = 3000;
            score += onChainComponent;
        }

        // ── Off-chain rating component (0-2500) ──
        // AgentReview ratings 1-5; avg 5.0 × 500 = 2500 max
        if (rep.offChainRatingCount > 0) {
            uint256 offChainComponent = (rep.offChainRatingSum * 500) / rep.offChainRatingCount;
            if (offChainComponent > 2500) offChainComponent = 2500;
            score += offChainComponent;
        }

        // ── Completion rate component (0-2500) ──
        // completed / (completed + failed) × 2500
        uint256 totalJobs = rep.totalJobsCompleted + rep.totalJobsFailed;
        if (totalJobs > 0) {
            score += (rep.totalJobsCompleted * 2500) / totalJobs;
        }

        // ── Proof reliability component (0-2000) ──
        // (matched / verified) × 2000, minus 200 per slash event
        if (rep.proofVerified > 0) {
            uint256 reliabilityBase = (rep.proofMatched * 2000) / rep.proofVerified;
            uint256 slashPenalty = rep.proofSlashed * 200; // -200 per slash
            if (reliabilityBase > slashPenalty) {
                score += reliabilityBase - slashPenalty;
            }
        }

        // Cap at 10000
        if (score > 10000) score = 10000;
        return score;
    }

    // ── View Functions ───────────────────────────────────────

    /**
     * @notice Get full reputation snapshot for an agent.
     */
    function getReputation(address _agent) external view returns (ReputationSnapshot memory) {
        return reputations[_agent];
    }

    /**
     * @notice Get just the composite score (0-10000).
     */
    function getCompositeScore(address _agent) external view returns (uint256) {
        return reputations[_agent].compositeScore;
    }

    /**
     * @notice Get reputation tier (0-4).
     * 0 = Newcomer, 1 = Rising, 2 = Trusted, 3 = Elite, 4 = Legend
     */
    function getTier(address _agent) external view returns (uint256) {
        uint256 s = reputations[_agent].compositeScore;
        if (s > 9500) return 4; // Legend
        if (s > 8000) return 3; // Elite
        if (s > 6000) return 2; // Trusted
        if (s > 3000) return 1; // Rising
        return 0;               // Newcomer
    }

    /**
     * @notice Get number of historical snapshots for an agent.
     */
    function getSnapshotCount(address _agent) external view returns (uint256) {
        return snapshotTimestamps[_agent].length;
    }

    /**
     * @notice Get total number of tracked agents.
     */
    function getTrackedAgentCount() external view returns (uint256) {
        return trackedAgents.length;
    }

    /**
     * @notice Get a tracked agent address by index.
     */
    function getTrackedAgent(uint256 _index) external view returns (address) {
        require(_index < trackedAgents.length, "ReputationRegistry: index out of bounds");
        return trackedAgents[_index];
    }

    // ── Admin ────────────────────────────────────────────────

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "ReputationRegistry: zero address");
        emit OwnerTransferred(owner, _newOwner);
        owner = _newOwner;
    }

    function updateContracts(address _nexusV2, address _proofRegistry) external onlyOwner {
        nexusV2 = _nexusV2;
        proofRegistry = _proofRegistry;
    }
}
