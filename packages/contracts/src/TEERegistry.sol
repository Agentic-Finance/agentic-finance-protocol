// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  TEERegistry
 * @notice On-chain registry for Trusted Execution Environment attestations.
 *         Agents running in TEEs (Intel SGX, AMD SEV-SNP, ARM CCA) can register
 *         hardware-signed attestation reports proving code integrity and isolation.
 *
 *         Trust Tiers (AFP-002 §4.3):
 *           Tier 0: Wallet signature only (minimal)
 *           Tier 1: ZK Compliance proof (standard)
 *           Tier 2: ZK Compliance + ZK Reputation (enhanced)
 *           Tier 3: Tier 2 + TEE attestation (maximum)
 *           Tier 4: Tier 3 + ZK Inference attestation (full)
 *
 *         This contract handles Tier 3 verification.
 *
 * @dev    Part of Agentic Finance Protocol — Phase 2: Identity & Attestation
 */
contract TEERegistry {

    // ── Enums ──────────────────────────────────────────────────

    enum TEEType {
        SGX,        // 0 — Intel Software Guard Extensions
        TDX,        // 1 — Intel Trust Domain Extensions
        SEV_SNP,    // 2 — AMD Secure Encrypted Virtualization
        ARM_CCA     // 3 — ARM Confidential Compute Architecture
    }

    // ── Structs ────────────────────────────────────────────────

    struct TEEReport {
        bytes32 enclaveCodeHash;         // Hash of the agent's code running in enclave
        bytes32 enclaveDataHash;         // Hash of the enclave's sealed data
        TEEType teeType;                 // Hardware platform type
        uint256 attestedAt;              // When the attestation was registered
        uint256 expiresAt;               // When it expires (must be re-attested)
        address agent;                   // The agent address this attestation belongs to
        bool active;
    }

    // ── State ──────────────────────────────────────────────────

    /// @notice Agent address → TEE attestation report
    mapping(address => TEEReport) public reports;

    /// @notice Enclave code hash → Is trusted (approved by owner)
    mapping(bytes32 => bool) public trustedEnclaves;

    /// @notice TEE attestation validity period (default: 24 hours)
    uint256 public attestationValidity = 24 hours;

    /// @notice Total registered attestations
    uint256 public totalAttestations;

    /// @notice Total active attestations
    uint256 public activeAttestations;

    /// @notice Contract owner
    address public owner;

    /// @notice Trusted attestation verifiers (can register attestations on behalf of agents)
    mapping(address => bool) public trustedVerifiers;

    // ── Events ─────────────────────────────────────────────────

    event TEEAttestationRegistered(
        address indexed agent,
        bytes32 indexed enclaveCodeHash,
        TEEType teeType,
        uint256 expiresAt
    );

    event TEEAttestationRenewed(address indexed agent, uint256 newExpiresAt);
    event TEEAttestationRevoked(address indexed agent, address revokedBy);
    event EnclaveApproved(bytes32 indexed enclaveCodeHash);
    event EnclaveRevoked(bytes32 indexed enclaveCodeHash);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);

    // ── Constructor ────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        trustedVerifiers[msg.sender] = true;
    }

    // ── Modifiers ──────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyVerifier() {
        require(trustedVerifiers[msg.sender], "Not a trusted verifier");
        _;
    }

    // ── Attestation Management ─────────────────────────────────

    /**
     * @notice Register a TEE attestation for an agent.
     * @dev    In production, the attestation signature would be verified against
     *         the TEE manufacturer's root of trust. For this implementation,
     *         only trusted verifiers can register attestations.
     *
     * @param agent            The agent this attestation belongs to
     * @param enclaveCodeHash  Hash of the code running in the enclave
     * @param enclaveDataHash  Hash of the enclave's sealed data
     * @param teeType          Hardware platform type (SGX, TDX, SEV-SNP, ARM CCA)
     */
    function registerAttestation(
        address agent,
        bytes32 enclaveCodeHash,
        bytes32 enclaveDataHash,
        TEEType teeType
    ) external onlyVerifier {
        require(agent != address(0), "Invalid agent");
        require(enclaveCodeHash != bytes32(0), "Invalid enclave hash");
        require(trustedEnclaves[enclaveCodeHash], "Enclave code not approved");

        // If replacing an existing active attestation, decrement counter
        if (reports[agent].active && block.timestamp < reports[agent].expiresAt) {
            // Still active — replacing
        } else if (reports[agent].active) {
            activeAttestations--; // Was active but expired
        }

        reports[agent] = TEEReport({
            enclaveCodeHash: enclaveCodeHash,
            enclaveDataHash: enclaveDataHash,
            teeType: teeType,
            attestedAt: block.timestamp,
            expiresAt: block.timestamp + attestationValidity,
            agent: agent,
            active: true
        });

        totalAttestations++;
        activeAttestations++;

        emit TEEAttestationRegistered(agent, enclaveCodeHash, teeType, block.timestamp + attestationValidity);
    }

    /**
     * @notice Renew an existing attestation (extends expiry).
     * @dev    Only the verifier who can verify the enclave is still running.
     */
    function renewAttestation(address agent) external onlyVerifier {
        TEEReport storage report = reports[agent];
        require(report.active, "No active attestation");
        require(trustedEnclaves[report.enclaveCodeHash], "Enclave no longer approved");

        report.expiresAt = block.timestamp + attestationValidity;
        report.attestedAt = block.timestamp;

        emit TEEAttestationRenewed(agent, report.expiresAt);
    }

    /**
     * @notice Revoke an attestation (owner or verifier).
     */
    function revokeAttestation(address agent) external {
        require(
            msg.sender == owner || trustedVerifiers[msg.sender],
            "Not authorized"
        );

        TEEReport storage report = reports[agent];
        require(report.active, "No active attestation");

        report.active = false;
        activeAttestations--;

        emit TEEAttestationRevoked(agent, msg.sender);
    }

    // ── Queries ────────────────────────────────────────────────

    /**
     * @notice Check if an agent has a valid TEE attestation.
     */
    function hasValidAttestation(address agent) external view returns (
        bool valid,
        bytes32 enclaveHash,
        uint256 attestedAt,
        TEEType teeType
    ) {
        TEEReport storage report = reports[agent];

        if (!report.active || block.timestamp >= report.expiresAt) {
            return (false, bytes32(0), 0, TEEType.SGX);
        }

        return (true, report.enclaveCodeHash, report.attestedAt, report.teeType);
    }

    /**
     * @notice Get the trust tier for an agent based on available attestations.
     * @dev    Queries this registry + ComplianceRegistry + ReputationRegistry.
     *         For simplicity, this only checks TEE status. Full tier evaluation
     *         should be done off-chain combining all registries.
     *
     * @return tier 0 = no TEE, 3 = valid TEE attestation
     */
    function getTrustTier(address agent) external view returns (uint8 tier) {
        TEEReport storage report = reports[agent];

        if (!report.active || block.timestamp >= report.expiresAt) {
            return 0; // No TEE attestation
        }

        return 3; // Tier 3: TEE attested
    }

    /**
     * @notice Get protocol stats.
     */
    function getStats() external view returns (
        uint256 _totalAttestations,
        uint256 _activeAttestations
    ) {
        return (totalAttestations, activeAttestations);
    }

    // ── Enclave Management ─────────────────────────────────────

    /**
     * @notice Approve an enclave code hash (owner only).
     * @dev    Only approved enclaves can be registered.
     */
    function approveEnclave(bytes32 enclaveCodeHash) external onlyOwner {
        trustedEnclaves[enclaveCodeHash] = true;
        emit EnclaveApproved(enclaveCodeHash);
    }

    /**
     * @notice Revoke an enclave code hash (owner only).
     */
    function revokeEnclave(bytes32 enclaveCodeHash) external onlyOwner {
        trustedEnclaves[enclaveCodeHash] = false;
        emit EnclaveRevoked(enclaveCodeHash);
    }

    // ── Admin ──────────────────────────────────────────────────

    function setAttestationValidity(uint256 newValidity) external onlyOwner {
        require(newValidity >= 1 hours && newValidity <= 30 days, "Invalid validity");
        attestationValidity = newValidity;
    }

    function addVerifier(address verifier) external onlyOwner {
        trustedVerifiers[verifier] = true;
        emit VerifierAdded(verifier);
    }

    function removeVerifier(address verifier) external onlyOwner {
        trustedVerifiers[verifier] = false;
        emit VerifierRemoved(verifier);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }
}
