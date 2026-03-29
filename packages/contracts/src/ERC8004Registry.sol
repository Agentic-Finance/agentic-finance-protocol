// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  ERC8004Registry
 * @notice ERC-8004 compatible Trustless Agent Registry.
 *
 *         Implements the three-registry architecture from ERC-8004:
 *           1. Identity Registry — ERC-721 based agent identity with metadata
 *           2. Reputation Registry — On-chain feedback scores from clients/agents
 *           3. Validation Registry — Hooks for zkML verifiers, TEE attestation
 *
 *         Each agent is represented as an ERC-721 NFT with on-chain metadata
 *         including endpoints, capabilities, supported tokens, and trust level.
 *
 *         Compatible with the existing AgentDIDRegistry (Phase 2) — bridges
 *         between W3C DID and ERC-8004 identity standards.
 *
 * @dev    Simplified ERC-721 implementation (no library dependency for lighter deployment)
 */

contract ERC8004Registry {
    // ── ERC-721 Core ──────────────────────────────────────

    string public constant name = "Agentic Finance Agent";
    string public constant symbol = "AGTFI-AGENT";

    uint256 private _tokenIdCounter;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;

    // ── Agent Identity (Registry 1) ──────────────────────

    struct AgentMetadata {
        string endpoint;            // Agent's API endpoint
        bytes32 capabilityHash;     // keccak256 of capabilities list
        uint8 capabilityCount;      // Number of capabilities
        address controller;         // Human/DAO that controls the agent
        uint8 agentType;            // 0=payroll, 1=payment, 2=analytics, 3=orchestration
        uint256 registeredAt;
        bool active;
    }

    mapping(uint256 => AgentMetadata) public agents;
    /// @notice Agent supported tokens (tokenId → token list)
    mapping(uint256 => address[]) private _supportedTokens;
    mapping(address => uint256) public agentToTokenId;

    // ── Reputation (Registry 2) ──────────────────────────

    struct ReputationScore {
        uint256 totalJobs;
        uint256 successfulJobs;
        uint256 totalRating;        // Sum of all ratings (1-5 scale)
        uint256 ratingCount;
        uint256 disputeCount;
        uint256 totalVolume;        // Total payment volume handled
        uint256 lastActiveAt;
    }

    mapping(uint256 => ReputationScore) public reputation;

    struct FeedbackEntry {
        address reviewer;
        uint256 rating;             // 1-5
        string comment;
        uint256 timestamp;
    }

    mapping(uint256 => FeedbackEntry[]) private _feedback;

    // ── Validation (Registry 3) ──────────────────────────

    struct ValidationResult {
        address validator;          // Contract/EOA that performed validation
        bytes32 validationType;     // keccak256("zkml"), keccak256("tee"), keccak256("zk-compliance")
        bool passed;
        uint256 validatedAt;
        bytes32 proofHash;          // Hash of the proof/attestation
    }

    mapping(uint256 => ValidationResult[]) private _validations;
    mapping(address => bool) public approvedValidators;

    // ── Storage ───────────────────────────────────────────

    address public owner;

    // ── Events ────────────────────────────────────────────

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event AgentRegistered(uint256 indexed tokenId, address indexed agent, string endpoint);
    event AgentUpdated(uint256 indexed tokenId, string endpoint, bool active);
    event FeedbackSubmitted(uint256 indexed tokenId, address indexed reviewer, uint256 rating);
    event ValidationRecorded(uint256 indexed tokenId, bytes32 validationType, bool passed);

    // ── Constructor ───────────────────────────────────────

    constructor() {
        owner = msg.sender;
        approvedValidators[msg.sender] = true;
    }

    // ── Registry 1: Agent Identity ───────────────────────

    /**
     * @notice Register a new agent — mints ERC-721 token + stores metadata
     */
    function registerAgent(
        address agentAddress,
        string calldata endpoint,
        bytes32[] calldata capabilities,
        address[] calldata supportedTokens,
        uint8 agentType
    ) external returns (uint256 tokenId) {
        require(agentToTokenId[agentAddress] == 0, "Agent already registered");

        _tokenIdCounter++;
        tokenId = _tokenIdCounter;

        // Mint ERC-721
        _owners[tokenId] = msg.sender;
        _balances[msg.sender]++;
        agentToTokenId[agentAddress] = tokenId;

        // Store metadata
        agents[tokenId] = AgentMetadata({
            endpoint: endpoint,
            capabilityHash: keccak256(abi.encode(capabilities)),
            capabilityCount: uint8(capabilities.length),
            controller: msg.sender,
            agentType: agentType,
            registeredAt: block.timestamp,
            active: true
        });
        _supportedTokens[tokenId] = supportedTokens;

        // Initialize reputation
        reputation[tokenId] = ReputationScore({
            totalJobs: 0,
            successfulJobs: 0,
            totalRating: 0,
            ratingCount: 0,
            disputeCount: 0,
            totalVolume: 0,
            lastActiveAt: block.timestamp
        });

        emit Transfer(address(0), msg.sender, tokenId);
        emit AgentRegistered(tokenId, agentAddress, endpoint);
    }

    /**
     * @notice Update agent metadata
     */
    function updateAgent(
        uint256 tokenId,
        string calldata endpoint,
        bytes32[] calldata capabilities,
        bool active
    ) external {
        require(_owners[tokenId] == msg.sender, "Not agent owner");

        agents[tokenId].endpoint = endpoint;
        agents[tokenId].capabilityHash = keccak256(abi.encode(capabilities));
        agents[tokenId].capabilityCount = uint8(capabilities.length);
        agents[tokenId].active = active;

        emit AgentUpdated(tokenId, endpoint, active);
    }

    /**
     * @notice Get agent metadata
     */
    function getAgent(uint256 tokenId) external view returns (
        string memory endpoint,
        uint8 agentType,
        address controller,
        uint256 registeredAt,
        bool active,
        uint256 capabilityCount
    ) {
        AgentMetadata storage a = agents[tokenId];
        return (a.endpoint, a.agentType, a.controller, a.registeredAt, a.active, uint256(a.capabilityCount));
    }

    /**
     * @notice Get agent by address
     */
    function getAgentByAddress(address agentAddress) external view returns (uint256 tokenId) {
        tokenId = agentToTokenId[agentAddress];
        require(tokenId > 0, "Agent not registered");
    }

    // ── Registry 2: Reputation ───────────────────────────

    /**
     * @notice Submit feedback for an agent (rating 1-5)
     */
    function submitFeedback(
        uint256 tokenId,
        uint256 rating,
        string calldata comment,
        uint256 jobVolume
    ) external {
        require(_owners[tokenId] != address(0), "Agent doesn't exist");
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");
        require(msg.sender != _owners[tokenId], "Cannot rate own agent");

        // Update aggregate scores
        ReputationScore storage rep = reputation[tokenId];
        rep.totalJobs++;
        rep.totalRating += rating;
        rep.ratingCount++;
        rep.totalVolume += jobVolume;
        rep.lastActiveAt = block.timestamp;

        if (rating >= 3) {
            rep.successfulJobs++;
        }

        // Store individual feedback
        _feedback[tokenId].push(FeedbackEntry({
            reviewer: msg.sender,
            rating: rating,
            comment: comment,
            timestamp: block.timestamp
        }));

        emit FeedbackSubmitted(tokenId, msg.sender, rating);
    }

    /**
     * @notice Report a dispute for an agent
     */
    function reportDispute(uint256 tokenId) external {
        require(_owners[tokenId] != address(0), "Agent doesn't exist");
        reputation[tokenId].disputeCount++;
    }

    /**
     * @notice Get agent reputation summary
     */
    function getReputation(uint256 tokenId) external view returns (
        uint256 totalJobs,
        uint256 successRate,       // basis points (10000 = 100%)
        uint256 averageRating,     // scaled by 100 (350 = 3.5/5)
        uint256 disputeCount,
        uint256 totalVolume
    ) {
        ReputationScore storage rep = reputation[tokenId];
        totalJobs = rep.totalJobs;
        successRate = rep.totalJobs > 0 ? (rep.successfulJobs * 10000) / rep.totalJobs : 0;
        averageRating = rep.ratingCount > 0 ? (rep.totalRating * 100) / rep.ratingCount : 0;
        disputeCount = rep.disputeCount;
        totalVolume = rep.totalVolume;
    }

    /**
     * @notice Get feedback entries for an agent
     */
    function getFeedbackCount(uint256 tokenId) external view returns (uint256) {
        return _feedback[tokenId].length;
    }

    function getFeedback(uint256 tokenId, uint256 index) external view returns (
        address reviewer,
        uint256 rating,
        string memory comment,
        uint256 timestamp
    ) {
        FeedbackEntry storage f = _feedback[tokenId][index];
        return (f.reviewer, f.rating, f.comment, f.timestamp);
    }

    // ── Registry 3: Validation ───────────────────────────

    /**
     * @notice Record a validation result (from approved validator)
     * @param tokenId Agent to validate
     * @param validationType Type of validation (e.g., "zkml", "tee", "zk-compliance")
     * @param passed Whether the agent passed
     * @param proofHash Hash of the proof/attestation
     */
    function recordValidation(
        uint256 tokenId,
        string calldata validationType,
        bool passed,
        bytes32 proofHash
    ) external {
        require(approvedValidators[msg.sender], "Not approved validator");
        require(_owners[tokenId] != address(0), "Agent doesn't exist");

        bytes32 typeHash = keccak256(bytes(validationType));

        _validations[tokenId].push(ValidationResult({
            validator: msg.sender,
            validationType: typeHash,
            passed: passed,
            validatedAt: block.timestamp,
            proofHash: proofHash
        }));

        emit ValidationRecorded(tokenId, typeHash, passed);
    }

    /**
     * @notice Check if agent has a specific validation
     */
    function hasValidation(uint256 tokenId, string calldata validationType) external view returns (bool) {
        bytes32 typeHash = keccak256(bytes(validationType));
        ValidationResult[] storage vals = _validations[tokenId];
        for (uint256 i = vals.length; i > 0; i--) {
            if (vals[i-1].validationType == typeHash && vals[i-1].passed) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Get validation count for an agent
     */
    function getValidationCount(uint256 tokenId) external view returns (uint256) {
        return _validations[tokenId].length;
    }

    // ── Admin ─────────────────────────────────────────────

    function addValidator(address validator) external {
        require(msg.sender == owner, "Not owner");
        approvedValidators[validator] = true;
    }

    function removeValidator(address validator) external {
        require(msg.sender == owner, "Not owner");
        approvedValidators[validator] = false;
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Not owner");
        owner = newOwner;
    }

    // ── ERC-721 Required Functions ────────────────────────

    function balanceOf(address _owner) external view returns (uint256) {
        return _balances[_owner];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        require(_owners[tokenId] != address(0), "Token doesn't exist");
        return _owners[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    function approve(address to, uint256 tokenId) external {
        require(_owners[tokenId] == msg.sender, "Not owner");
        _tokenApprovals[tokenId] = to;
        emit Approval(msg.sender, to, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId) external {
        require(_owners[tokenId] == from, "Not owner");
        require(msg.sender == from || _tokenApprovals[tokenId] == msg.sender, "Not authorized");

        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;
        delete _tokenApprovals[tokenId];

        // Update controller
        agents[tokenId].controller = to;

        emit Transfer(from, to, tokenId);
    }
}
