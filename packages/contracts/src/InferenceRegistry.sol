// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  InferenceRegistry
 * @notice On-chain registry for ZK inference attestations.
 *         Agents prove they executed a specific AI model (by hash) on specific
 *         inputs without revealing model weights or full input data.
 *
 *         Flow:
 *           1. Model developer registers model (hash + metadata URI)
 *           2. Agent executes inference off-chain
 *           3. Agent generates zkML proof (EZKL/Giza/custom)
 *           4. Agent submits attestation + proof to this registry
 *           5. Merchants query attestation validity before accepting service
 *
 *         Implements AFP-001 §3 (ZK Inference Attestation) and AFP-002 SR-12.
 *
 * @dev    Part of Agentic Finance Protocol — Phase 2: Identity & Attestation
 */
contract InferenceRegistry {

    // ── Structs ────────────────────────────────────────────────

    struct RegisteredModel {
        bytes32 modelHash;               // keccak256(model_weights)
        string modelURI;                 // IPFS/Arweave URI for model metadata
        address registrar;               // Who registered this model
        uint256 registeredAt;
        uint256 attestationCount;        // How many attestations reference this model
        bool active;
    }

    struct Attestation {
        bytes32 modelHash;               // Which model was executed
        uint256 inputCommitment;         // Poseidon(input_data) — privacy-preserving
        uint256 outputCommitment;        // Poseidon(output_data) — privacy-preserving
        uint256 agentCommitment;         // Links to reputation system
        address attester;                // Who submitted this attestation
        uint256 timestamp;
        uint256 expiresAt;
        bool verified;                   // Whether a ZK proof was verified
    }

    // ── State ──────────────────────────────────────────────────

    /// @notice Model hash → Registered model info
    mapping(bytes32 => RegisteredModel) public models;

    /// @notice Attestation ID → Attestation data
    mapping(uint256 => Attestation) public attestations;

    /// @notice Agent commitment → Model hash → Latest attestation ID
    mapping(uint256 => mapping(bytes32 => uint256)) public latestAttestation;

    /// @notice Total registered models
    uint256 public totalModels;

    /// @notice Total attestations
    uint256 public totalAttestations;

    /// @notice Attestation validity period (default: 1 hour)
    uint256 public attestationValidity = 1 hours;

    /// @notice Trusted model registrars
    mapping(address => bool) public trustedRegistrars;

    /// @notice Contract owner
    address public owner;

    // ── Events ─────────────────────────────────────────────────

    event ModelRegistered(bytes32 indexed modelHash, address indexed registrar, string modelURI);
    event ModelDeactivated(bytes32 indexed modelHash);

    event InferenceAttested(
        uint256 indexed attestationId,
        bytes32 indexed modelHash,
        uint256 indexed agentCommitment,
        uint256 inputCommitment,
        uint256 outputCommitment
    );

    event AttestationVerified(uint256 indexed attestationId, bytes32 indexed modelHash);

    // ── Constructor ────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        trustedRegistrars[msg.sender] = true;
    }

    // ── Modifiers ──────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // ── Model Registration ─────────────────────────────────────

    /**
     * @notice Register a new AI model for inference attestation.
     * @param modelHash   keccak256(model_weights) — uniquely identifies the model
     * @param modelURI    IPFS/Arweave URI pointing to model metadata (architecture, version, etc.)
     */
    function registerModel(
        bytes32 modelHash,
        string calldata modelURI
    ) external {
        require(trustedRegistrars[msg.sender], "Not a trusted registrar");
        require(modelHash != bytes32(0), "Invalid model hash");
        require(models[modelHash].registeredAt == 0, "Model already registered");

        models[modelHash] = RegisteredModel({
            modelHash: modelHash,
            modelURI: modelURI,
            registrar: msg.sender,
            registeredAt: block.timestamp,
            attestationCount: 0,
            active: true
        });

        totalModels++;

        emit ModelRegistered(modelHash, msg.sender, modelURI);
    }

    /**
     * @notice Deactivate a model (registrar or owner only).
     */
    function deactivateModel(bytes32 modelHash) external {
        RegisteredModel storage model = models[modelHash];
        require(
            msg.sender == model.registrar || msg.sender == owner,
            "Not authorized"
        );
        model.active = false;
        emit ModelDeactivated(modelHash);
    }

    // ── Attestation ────────────────────────────────────────────

    /**
     * @notice Submit an inference attestation.
     * @dev    The attestation records that the agent claims to have executed the
     *         specified model on the given inputs. If a ZK proof is provided,
     *         the attestation is marked as "verified".
     *
     * @param modelHash         Which model was executed
     * @param inputCommitment   Poseidon(input_data) — hides actual inputs
     * @param outputCommitment  Poseidon(output_data) — hides actual outputs
     * @param agentCommitment   Links to the reputation system
     * @return attestationId    The unique ID for this attestation
     */
    function attestInference(
        bytes32 modelHash,
        uint256 inputCommitment,
        uint256 outputCommitment,
        uint256 agentCommitment
    ) external returns (uint256 attestationId) {
        require(models[modelHash].active, "Model not registered or inactive");
        require(inputCommitment != 0 && outputCommitment != 0, "Invalid commitments");

        attestationId = totalAttestations++;

        attestations[attestationId] = Attestation({
            modelHash: modelHash,
            inputCommitment: inputCommitment,
            outputCommitment: outputCommitment,
            agentCommitment: agentCommitment,
            attester: msg.sender,
            timestamp: block.timestamp,
            expiresAt: block.timestamp + attestationValidity,
            verified: false
        });

        latestAttestation[agentCommitment][modelHash] = attestationId;
        models[modelHash].attestationCount++;

        emit InferenceAttested(attestationId, modelHash, agentCommitment, inputCommitment, outputCommitment);
    }

    /**
     * @notice Submit an inference attestation with a ZK proof (verified).
     * @dev    In a full implementation, the proof would be verified against a
     *         model-specific verifier contract. For now, we accept the proof
     *         and mark the attestation as verified.
     *
     *         Future: Each registered model has an associated verifier contract
     *         that validates the zkML proof (EZKL/Giza format).
     */
    function attestInferenceWithProof(
        bytes32 modelHash,
        uint256 inputCommitment,
        uint256 outputCommitment,
        uint256 agentCommitment,
        bytes calldata proof              // zkML proof (format depends on model verifier)
    ) external returns (uint256 attestationId) {
        require(models[modelHash].active, "Model not registered or inactive");
        require(inputCommitment != 0 && outputCommitment != 0, "Invalid commitments");
        require(proof.length > 0, "Empty proof");

        attestationId = totalAttestations++;

        attestations[attestationId] = Attestation({
            modelHash: modelHash,
            inputCommitment: inputCommitment,
            outputCommitment: outputCommitment,
            agentCommitment: agentCommitment,
            attester: msg.sender,
            timestamp: block.timestamp,
            expiresAt: block.timestamp + attestationValidity,
            verified: true                 // Proof provided
        });

        latestAttestation[agentCommitment][modelHash] = attestationId;
        models[modelHash].attestationCount++;

        emit InferenceAttested(attestationId, modelHash, agentCommitment, inputCommitment, outputCommitment);
        emit AttestationVerified(attestationId, modelHash);
    }

    // ── Queries ────────────────────────────────────────────────

    /**
     * @notice Check if an agent has a valid attestation for a model.
     */
    function hasValidAttestation(
        uint256 agentCommitment,
        bytes32 modelHash
    ) external view returns (bool valid, bool verified, uint256 timestamp) {
        uint256 attId = latestAttestation[agentCommitment][modelHash];
        Attestation storage att = attestations[attId];

        if (att.timestamp == 0) return (false, false, 0);
        if (block.timestamp >= att.expiresAt) return (false, att.verified, att.timestamp);

        return (true, att.verified, att.timestamp);
    }

    /**
     * @notice Get model info.
     */
    function getModel(bytes32 modelHash) external view returns (
        string memory modelURI,
        address registrar,
        uint256 registeredAt,
        uint256 attestationCount,
        bool active
    ) {
        RegisteredModel storage m = models[modelHash];
        return (m.modelURI, m.registrar, m.registeredAt, m.attestationCount, m.active);
    }

    /**
     * @notice Get protocol stats.
     */
    function getStats() external view returns (uint256 _totalModels, uint256 _totalAttestations) {
        return (totalModels, totalAttestations);
    }

    // ── Admin ──────────────────────────────────────────────────

    function setAttestationValidity(uint256 newValidity) external onlyOwner {
        require(newValidity >= 5 minutes && newValidity <= 30 days, "Invalid validity period");
        attestationValidity = newValidity;
    }

    function addTrustedRegistrar(address registrar) external onlyOwner {
        trustedRegistrars[registrar] = true;
    }

    function removeTrustedRegistrar(address registrar) external onlyOwner {
        trustedRegistrars[registrar] = false;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }
}
