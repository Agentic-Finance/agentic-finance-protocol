// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  AgentDIDRegistry
 * @notice On-chain DID registry for autonomous AI agents.
 *         Anchors W3C-compatible Decentralized Identifiers to Tempo L1.
 *
 *         Each agent has:
 *           - A DID hash (keccak256 of off-chain DID Document)
 *           - A controller (human/DAO that deployed the agent)
 *           - Links to ZK trust layer (compliance + reputation commitments)
 *           - Verifiable Credentials issued by trusted parties
 *
 *         Integrates with AFP-001 (ZK Trust Layer) and AFP-002 (Security Standard).
 *         Compatible with ERC-8004 Trustless Agents standard.
 *
 * @dev    Part of Agentic Finance Protocol — Phase 2: Identity & Attestation
 */
contract AgentDIDRegistry {

    // ── Structs ────────────────────────────────────────────────

    struct AgentIdentity {
        bytes32 didHash;                 // keccak256(DID Document JSON-LD)
        address agentAddress;            // Agent's wallet address
        address controller;              // Human or DAO controller
        uint256 complianceCommitment;    // Poseidon(address, secret) — links to ComplianceRegistry
        uint256 reputationCommitment;    // Poseidon(address, secret) — links to ReputationRegistry
        uint256 registeredAt;
        uint256 updatedAt;
        bool active;
    }

    struct VerifiableCredential {
        bytes32 credentialHash;          // keccak256(VC JSON-LD)
        bytes32 credentialType;          // keccak256("PaymentAgent"), keccak256("ComplianceVerified"), etc.
        address issuer;                  // Who issued this credential
        uint256 issuedAt;
        uint256 expiresAt;
        bool revoked;
    }

    // ── State ──────────────────────────────────────────────────

    /// @notice DID hash → Agent identity
    mapping(bytes32 => AgentIdentity) public identities;

    /// @notice Agent address → DID hash (reverse lookup)
    mapping(address => bytes32) public addressToDID;

    /// @notice DID hash → credential index → credential
    mapping(bytes32 => mapping(uint256 => VerifiableCredential)) public credentials;

    /// @notice DID hash → number of credentials
    mapping(bytes32 => uint256) public credentialCount;

    /// @notice Trusted credential issuers
    mapping(address => bool) public trustedIssuers;

    /// @notice Total registered agents
    uint256 public totalAgents;

    /// @notice Contract owner
    address public owner;

    // ── Events ─────────────────────────────────────────────────

    event AgentRegistered(
        bytes32 indexed didHash,
        address indexed agentAddress,
        address indexed controller,
        uint256 complianceCommitment,
        uint256 reputationCommitment
    );

    event AgentUpdated(bytes32 indexed didHash, uint256 complianceCommitment, uint256 reputationCommitment);
    event AgentDeactivated(bytes32 indexed didHash, address indexed controller);
    event AgentReactivated(bytes32 indexed didHash, address indexed controller);

    event CredentialIssued(
        bytes32 indexed didHash,
        bytes32 indexed credentialType,
        address indexed issuer,
        uint256 credentialIndex,
        uint256 expiresAt
    );

    event CredentialRevoked(bytes32 indexed didHash, uint256 credentialIndex, address revokedBy);
    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    // ── Constructor ────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        trustedIssuers[msg.sender] = true;
    }

    // ── Modifiers ──────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyController(bytes32 didHash) {
        require(identities[didHash].controller == msg.sender, "Only controller");
        _;
    }

    modifier onlyTrustedIssuer() {
        require(trustedIssuers[msg.sender], "Not a trusted issuer");
        _;
    }

    // ── Registration ───────────────────────────────────────────

    /**
     * @notice Register a new agent DID.
     * @param didHash             keccak256 of the off-chain DID Document (JSON-LD)
     * @param agentAddress        The agent's wallet address
     * @param complianceCommitment Poseidon commitment linking to ComplianceRegistry
     * @param reputationCommitment Poseidon commitment linking to ReputationRegistry
     * @return The didHash (for convenience)
     */
    function registerDID(
        bytes32 didHash,
        address agentAddress,
        uint256 complianceCommitment,
        uint256 reputationCommitment
    ) external returns (bytes32) {
        require(didHash != bytes32(0), "Invalid DID hash");
        require(agentAddress != address(0), "Invalid agent address");
        require(identities[didHash].registeredAt == 0, "DID already registered");
        require(addressToDID[agentAddress] == bytes32(0), "Agent already has DID");

        identities[didHash] = AgentIdentity({
            didHash: didHash,
            agentAddress: agentAddress,
            controller: msg.sender,
            complianceCommitment: complianceCommitment,
            reputationCommitment: reputationCommitment,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp,
            active: true
        });

        addressToDID[agentAddress] = didHash;
        totalAgents++;

        emit AgentRegistered(didHash, agentAddress, msg.sender, complianceCommitment, reputationCommitment);
        return didHash;
    }

    /**
     * @notice Update an agent's ZK trust commitments (controller only).
     */
    function updateCommitments(
        bytes32 didHash,
        uint256 newComplianceCommitment,
        uint256 newReputationCommitment
    ) external onlyController(didHash) {
        AgentIdentity storage identity = identities[didHash];
        require(identity.active, "Agent deactivated");

        identity.complianceCommitment = newComplianceCommitment;
        identity.reputationCommitment = newReputationCommitment;
        identity.updatedAt = block.timestamp;

        emit AgentUpdated(didHash, newComplianceCommitment, newReputationCommitment);
    }

    /**
     * @notice Deactivate an agent (controller only). Can be reactivated later.
     */
    function deactivateAgent(bytes32 didHash) external onlyController(didHash) {
        identities[didHash].active = false;
        identities[didHash].updatedAt = block.timestamp;
        emit AgentDeactivated(didHash, msg.sender);
    }

    /**
     * @notice Reactivate a deactivated agent (controller only).
     */
    function reactivateAgent(bytes32 didHash) external onlyController(didHash) {
        identities[didHash].active = true;
        identities[didHash].updatedAt = block.timestamp;
        emit AgentReactivated(didHash, msg.sender);
    }

    // ── Verifiable Credentials ─────────────────────────────────

    /**
     * @notice Issue a verifiable credential to an agent.
     * @dev Only trusted issuers can issue credentials.
     */
    function issueCredential(
        bytes32 didHash,
        bytes32 credentialHash,
        bytes32 credentialType,
        uint256 expiresAt
    ) external onlyTrustedIssuer returns (uint256 credentialIndex) {
        require(identities[didHash].active, "Agent not active");
        require(expiresAt > block.timestamp, "Already expired");

        credentialIndex = credentialCount[didHash];

        credentials[didHash][credentialIndex] = VerifiableCredential({
            credentialHash: credentialHash,
            credentialType: credentialType,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            revoked: false
        });

        credentialCount[didHash]++;

        emit CredentialIssued(didHash, credentialType, msg.sender, credentialIndex, expiresAt);
    }

    /**
     * @notice Revoke a credential (issuer or agent controller only).
     */
    function revokeCredential(bytes32 didHash, uint256 credentialIndex) external {
        VerifiableCredential storage vc = credentials[didHash][credentialIndex];
        require(
            msg.sender == vc.issuer || msg.sender == identities[didHash].controller,
            "Not authorized to revoke"
        );

        vc.revoked = true;
        emit CredentialRevoked(didHash, credentialIndex, msg.sender);
    }

    // ── Queries ────────────────────────────────────────────────

    /**
     * @notice Resolve a DID to its full identity.
     */
    function resolveDID(bytes32 didHash) external view returns (AgentIdentity memory) {
        return identities[didHash];
    }

    /**
     * @notice Resolve an agent address to its DID identity.
     */
    function resolveAddress(address agentAddress) external view returns (AgentIdentity memory) {
        bytes32 didHash = addressToDID[agentAddress];
        require(didHash != bytes32(0), "No DID for this address");
        return identities[didHash];
    }

    /**
     * @notice Check if an agent has a valid (non-expired, non-revoked) credential of a given type.
     */
    function hasValidCredential(bytes32 didHash, bytes32 credentialType) external view returns (bool) {
        uint256 count = credentialCount[didHash];
        for (uint256 i = 0; i < count; i++) {
            VerifiableCredential storage vc = credentials[didHash][i];
            if (
                vc.credentialType == credentialType &&
                !vc.revoked &&
                block.timestamp < vc.expiresAt
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Check if an agent is active and has both compliance + reputation commitments.
     */
    function isFullyVerified(bytes32 didHash) external view returns (bool) {
        AgentIdentity storage id = identities[didHash];
        return id.active && id.complianceCommitment != 0 && id.reputationCommitment != 0;
    }

    // ── Admin ──────────────────────────────────────────────────

    function addTrustedIssuer(address issuer) external onlyOwner {
        trustedIssuers[issuer] = true;
        emit IssuerAdded(issuer);
    }

    function removeTrustedIssuer(address issuer) external onlyOwner {
        trustedIssuers[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }
}
