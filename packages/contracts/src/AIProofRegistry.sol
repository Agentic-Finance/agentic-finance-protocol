// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AIProofRegistry
 * @notice On-chain commitment registry for verifiable AI agent execution.
 *
 * Before an agent executes, it commits a keccak256 hash of its planned approach.
 * After execution, the actual result hash is compared against the commitment.
 * Mismatches can trigger slashing (recorded on-chain).
 *
 * This creates a verifiable audit trail for AI reasoning on Tempo L1.
 *
 * Flow:
 *   1. Agent calls commit(planHash, nexusJobId) → returns commitmentId
 *   2. Agent executes off-chain work
 *   3. Agent calls verify(commitmentId, resultHash)
 *   4. If mismatch: owner can call slash(commitmentId)
 */
contract AIProofRegistry {

    struct Commitment {
        bytes32 planHash;       // keccak256 of the agent's planned approach
        address agent;          // Address that made the commitment
        uint256 nexusJobId;     // Linked NexusV2 escrow job ID
        bytes32 resultHash;     // keccak256 of actual result (set on verify)
        bool verified;          // Has verify() been called?
        bool matched;           // Did planHash match resultHash?
        uint256 committedAt;    // Block timestamp of commitment
        uint256 verifiedAt;     // Block timestamp of verification
    }

    // ── State ─────────────────────────────────────────────────

    mapping(bytes32 => Commitment) public commitments;
    mapping(uint256 => bytes32) public jobCommitments;  // nexusJobId → commitmentId

    uint256 public totalCommitments;
    uint256 public totalVerified;
    uint256 public totalMatched;
    uint256 public totalMismatched;
    uint256 public totalSlashed;

    address public owner;

    // ── Events ────────────────────────────────────────────────

    event CommitmentMade(
        bytes32 indexed commitmentId,
        address indexed agent,
        uint256 indexed nexusJobId,
        bytes32 planHash
    );

    event CommitmentVerified(
        bytes32 indexed commitmentId,
        bool matched,
        bytes32 resultHash
    );

    event AgentSlashed(
        bytes32 indexed commitmentId,
        address indexed agent,
        uint256 indexed nexusJobId
    );

    // ── Modifiers ─────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "AIProofRegistry: not owner");
        _;
    }

    // ── Constructor ───────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ── Core Functions ────────────────────────────────────────

    /**
     * @notice Commit a plan hash before executing an agent job.
     * @param _planHash keccak256 of the agent's planned approach
     * @param _nexusJobId The NexusV2 job ID this commitment is linked to
     * @return commitmentId Unique ID for this commitment
     */
    function commit(bytes32 _planHash, uint256 _nexusJobId) external returns (bytes32) {
        require(_planHash != bytes32(0), "AIProofRegistry: empty plan hash");

        // Generate unique commitment ID
        bytes32 commitmentId = keccak256(abi.encodePacked(
            msg.sender,
            _planHash,
            _nexusJobId,
            block.timestamp,
            totalCommitments
        ));

        require(commitments[commitmentId].committedAt == 0, "AIProofRegistry: commitment exists");

        commitments[commitmentId] = Commitment({
            planHash: _planHash,
            agent: msg.sender,
            nexusJobId: _nexusJobId,
            resultHash: bytes32(0),
            verified: false,
            matched: false,
            committedAt: block.timestamp,
            verifiedAt: 0
        });

        jobCommitments[_nexusJobId] = commitmentId;
        totalCommitments++;

        emit CommitmentMade(commitmentId, msg.sender, _nexusJobId, _planHash);

        return commitmentId;
    }

    /**
     * @notice Verify an agent's execution result against its commitment.
     * @param _commitmentId The commitment to verify
     * @param _resultHash keccak256 of the actual execution result
     */
    function verify(bytes32 _commitmentId, bytes32 _resultHash) external {
        Commitment storage c = commitments[_commitmentId];
        require(c.committedAt > 0, "AIProofRegistry: commitment not found");
        require(!c.verified, "AIProofRegistry: already verified");
        require(_resultHash != bytes32(0), "AIProofRegistry: empty result hash");

        c.resultHash = _resultHash;
        c.verified = true;
        c.verifiedAt = block.timestamp;
        c.matched = (c.planHash == _resultHash);

        totalVerified++;
        if (c.matched) {
            totalMatched++;
        } else {
            totalMismatched++;
        }

        emit CommitmentVerified(_commitmentId, c.matched, _resultHash);
    }

    /**
     * @notice Slash an agent for a mismatched commitment. Owner only.
     * @param _commitmentId The commitment with the mismatch
     */
    function slash(bytes32 _commitmentId) external onlyOwner {
        Commitment storage c = commitments[_commitmentId];
        require(c.verified, "AIProofRegistry: not yet verified");
        require(!c.matched, "AIProofRegistry: commitment matched, cannot slash");

        totalSlashed++;

        emit AgentSlashed(_commitmentId, c.agent, c.nexusJobId);
    }

    // ── View Functions ────────────────────────────────────────

    /**
     * @notice Get commitment details.
     */
    function getCommitment(bytes32 _commitmentId) external view returns (
        bytes32 planHash,
        address agent,
        uint256 nexusJobId,
        bytes32 resultHash,
        bool verified,
        bool matched,
        uint256 committedAt,
        uint256 verifiedAt
    ) {
        Commitment storage c = commitments[_commitmentId];
        return (c.planHash, c.agent, c.nexusJobId, c.resultHash, c.verified, c.matched, c.committedAt, c.verifiedAt);
    }

    /**
     * @notice Get commitment ID for a NexusV2 job.
     */
    function getJobCommitment(uint256 _nexusJobId) external view returns (bytes32) {
        return jobCommitments[_nexusJobId];
    }

    /**
     * @notice Get protocol stats.
     */
    function getStats() external view returns (
        uint256 _totalCommitments,
        uint256 _totalVerified,
        uint256 _totalMatched,
        uint256 _totalMismatched,
        uint256 _totalSlashed
    ) {
        return (totalCommitments, totalVerified, totalMatched, totalMismatched, totalSlashed);
    }
}
