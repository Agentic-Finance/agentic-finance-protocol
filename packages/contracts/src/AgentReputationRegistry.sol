// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgtFi Agent Reputation Registry
 * @notice World's first ZK reputation system for AI agent payments
 * @dev Agents prove transaction history stats without revealing individual transactions.
 *
 * Architecture:
 *   1. Agent completes payments → daemon records claim hashes
 *   2. Claims are chained: accumulator = Poseidon(claim[i], accumulator[i-1])
 *   3. Agent generates ZK proof: "I have N txs, $X volume, 0 disputes"
 *   4. Proof verified on-chain → reputation score stored
 *   5. Merchants query: "Does this agent meet my minimum requirements?"
 *
 * Privacy: Individual transactions are never revealed on-chain.
 * Network effect: More agents = more valuable reputation data = moat.
 */

interface IReputationVerifier {
    function verifyProof(
        uint256[24] calldata _proof,
        uint256[4] calldata _pubSignals
    ) external view returns (bool);
}

contract AgentReputationRegistry {

    /*//////////////////////////////////////////////////////////////
                            STATE
    //////////////////////////////////////////////////////////////*/

    IReputationVerifier public immutable verifier;
    address public owner;

    struct ReputationScore {
        uint256 accumulatorHash;   // Hash chain of all claims
        uint256 verifiedTxCount;   // Minimum proven tx count
        uint256 verifiedVolume;    // Minimum proven volume
        uint256 lastVerifiedAt;    // Timestamp of last verification
        uint256 blockNumber;       // Block of last verification
        uint256 proofCount;        // How many times reputation was proven
        bool    active;            // Is reputation active
    }

    /// @notice agentCommitment => ReputationScore
    mapping(uint256 => ReputationScore) public scores;

    /// @notice Track registered claim accumulators per agent
    /// @dev agentCommitment => latest accumulator hash (updated by daemon)
    mapping(uint256 => uint256) public registeredAccumulators;

    /// @notice Total agents with verified reputation
    uint256 public totalAgents;

    /// @notice Total reputation proofs verified
    uint256 public totalProofs;

    /// @notice Trusted daemon that can register claim accumulators
    address public daemon;

    /*//////////////////////////////////////////////////////////////
                            EVENTS
    //////////////////////////////////////////////////////////////*/

    event ReputationVerified(
        uint256 indexed agentCommitment,
        uint256 accumulatorHash,
        uint256 minTxCount,
        uint256 minVolume,
        uint256 timestamp
    );
    event AccumulatorRegistered(
        uint256 indexed agentCommitment,
        uint256 accumulatorHash,
        uint256 timestamp
    );
    event AgentSuspended(uint256 indexed agentCommitment, string reason);
    event DaemonUpdated(address indexed newDaemon);

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOwner() {
        require(msg.sender == owner, "ReputationRegistry: not owner");
        _;
    }

    modifier onlyDaemon() {
        require(msg.sender == daemon || msg.sender == owner, "ReputationRegistry: not daemon");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _verifier, address _daemon) {
        verifier = IReputationVerifier(_verifier);
        owner = msg.sender;
        daemon = _daemon;
    }

    /*//////////////////////////////////////////////////////////////
                            DAEMON: Register claim accumulators
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Register or update an agent's claim accumulator
     * @dev Called by daemon after each successful payment
     * @param agentCommitment The agent's identity commitment
     * @param accumulatorHash The latest hash chain state
     */
    function registerAccumulator(
        uint256 agentCommitment,
        uint256 accumulatorHash
    ) external onlyDaemon {
        registeredAccumulators[agentCommitment] = accumulatorHash;
        emit AccumulatorRegistered(agentCommitment, accumulatorHash, block.timestamp);
    }

    /**
     * @notice Batch register accumulators for multiple agents
     * @param commitments Array of agent commitments
     * @param accumulators Array of accumulator hashes
     */
    function batchRegisterAccumulators(
        uint256[] calldata commitments,
        uint256[] calldata accumulators
    ) external onlyDaemon {
        require(commitments.length == accumulators.length, "ReputationRegistry: length mismatch");
        require(commitments.length <= 500, "ReputationRegistry: batch too large (max 500)");
        for (uint256 i = 0; i < commitments.length; i++) {
            registeredAccumulators[commitments[i]] = accumulators[i];
            emit AccumulatorRegistered(commitments[i], accumulators[i], block.timestamp);
        }
    }

    /*//////////////////////////////////////////////////////////////
                            CORE: Verify reputation proof
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Submit a ZK reputation proof for verification
     * @param _proof PLONK proof (24 uint256)
     * @param _pubSignals [agentCommitment, accumulatorHash, minTxCount, minVolume]
     * @return success true if proof verified and score updated
     *
     * The proof demonstrates:
     *   - Agent knows the private key behind agentCommitment
     *   - Agent has a valid hash chain of transaction claims
     *   - txCount >= minTxCount (without revealing exact count)
     *   - totalVolume >= minVolume (without revealing exact volume)
     *   - disputeCount == 0 (no disputes in entire history)
     */
    function verifyReputation(
        uint256[24] calldata _proof,
        uint256[4] calldata _pubSignals
    ) external returns (bool success) {
        uint256 agentCommitment = _pubSignals[0];
        uint256 accumulatorHash = _pubSignals[1];
        uint256 minTxCount = _pubSignals[2];
        uint256 minVolume = _pubSignals[3];

        // Verify accumulator is registered (prevents fake accumulators)
        require(
            registeredAccumulators[agentCommitment] == accumulatorHash,
            "ReputationRegistry: accumulator not registered"
        );

        // Verify the PLONK proof
        bool proofValid = verifier.verifyProof(_proof, _pubSignals);
        require(proofValid, "ReputationRegistry: invalid ZK proof");

        // Update reputation score
        ReputationScore storage score = scores[agentCommitment];

        if (!score.active) {
            totalAgents++;
        }

        // Keep the HIGHEST proven values
        if (minTxCount > score.verifiedTxCount) {
            score.verifiedTxCount = minTxCount;
        }
        if (minVolume > score.verifiedVolume) {
            score.verifiedVolume = minVolume;
        }

        score.accumulatorHash = accumulatorHash;
        score.lastVerifiedAt = block.timestamp;
        score.blockNumber = block.number;
        score.proofCount++;
        score.active = true;

        totalProofs++;

        emit ReputationVerified(
            agentCommitment,
            accumulatorHash,
            minTxCount,
            minVolume,
            block.timestamp
        );

        return true;
    }

    /*//////////////////////////////////////////////////////////////
                            QUERY: Check agent reputation
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Check if an agent meets minimum reputation requirements
     * @param agentCommitment The agent's identity commitment
     * @param requiredTxCount Minimum transaction count needed
     * @param requiredVolume Minimum volume needed
     * @return meetsRequirements true if agent's proven stats meet minimums
     */
    function meetsRequirements(
        uint256 agentCommitment,
        uint256 requiredTxCount,
        uint256 requiredVolume
    ) external view returns (bool) {
        ReputationScore memory score = scores[agentCommitment];

        if (!score.active) return false;
        if (score.verifiedTxCount < requiredTxCount) return false;
        if (score.verifiedVolume < requiredVolume) return false;

        return true;
    }

    /**
     * @notice Get full reputation details for an agent
     */
    function getReputation(uint256 agentCommitment)
        external view returns (ReputationScore memory)
    {
        return scores[agentCommitment];
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN
    //////////////////////////////////////////////////////////////*/

    function suspendAgent(uint256 agentCommitment, string calldata reason) external onlyOwner {
        scores[agentCommitment].active = false;
        emit AgentSuspended(agentCommitment, reason);
    }

    function setDaemon(address _daemon) external onlyOwner {
        daemon = _daemon;
        emit DaemonUpdated(_daemon);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ReputationRegistry: zero address");
        owner = newOwner;
    }

    function getStats() external view returns (uint256 _totalAgents, uint256 _totalProofs) {
        return (totalAgents, totalProofs);
    }
}
