// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgtFiCrossChainHub — ZK-Verified Cross-Chain Payment State
 * @notice Stores compliance certificates and reputation scores on Tempo,
 *         then relays attestations to destination chains via LayerZero
 *         with ZK-proof verification through AgtFiZKDVN.
 *
 * Use cases:
 *   1. Agent on Base needs to pay API on Polygon — proves compliance on Tempo,
 *      attestation is relayed cross-chain via ZK DVN
 *   2. Merchant on any chain queries agent reputation — verified cross-chain
 *   3. MPP session on Tempo settles privacy-preserving proof to L2s
 *
 * This contract is the "Hub" deployed on Tempo. Lightweight "Spoke"
 * contracts on destination chains receive and store the attestations.
 */
contract AgtFiCrossChainHub {

    // ═══════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════

    address public owner;

    /// @notice Message types for cross-chain relay
    uint8 public constant MSG_COMPLIANCE_ATTESTATION = 1;
    uint8 public constant MSG_REPUTATION_ATTESTATION = 2;
    uint8 public constant MSG_PAYMENT_RECEIPT = 3;

    /// @notice Attestation structure stored on-chain
    struct Attestation {
        uint8 msgType;            // Message type
        uint256 commitment;       // Compliance commitment or agent commitment
        uint256 dataHash;         // Hash of the attested data
        uint256 timestamp;        // When attestation was created
        uint32 srcEid;            // Source chain endpoint ID
        bool relayed;             // Has been sent cross-chain
    }

    /// @notice attestationId => Attestation
    mapping(uint256 => Attestation) public attestations;
    uint256 public attestationCount;

    /// @notice commitment => latest attestation ID
    mapping(uint256 => uint256) public latestAttestation;

    /// @notice Compliance Registry reference
    address public complianceRegistry;

    /// @notice Reputation Registry reference
    address public reputationRegistry;

    // ═══════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════

    event AttestationCreated(
        uint256 indexed attestationId,
        uint8 msgType,
        uint256 indexed commitment,
        uint256 dataHash
    );

    event AttestationRelayed(
        uint256 indexed attestationId,
        uint32 indexed dstEid,
        bytes32 messageHash
    );

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ═══════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════

    /// @notice Authorized attestors
    mapping(address => bool) public authorizedAttestors;

    constructor(address _complianceRegistry, address _reputationRegistry) {
        owner = msg.sender;
        complianceRegistry = _complianceRegistry;
        reputationRegistry = _reputationRegistry;
        authorizedAttestors[msg.sender] = true;
    }

    // ═══════════════════════════════════════════════
    // CORE: Create Attestations
    // ═══════════════════════════════════════════════

    /**
     * @notice Create a compliance attestation
     * @dev Called after a successful compliance proof verification
     * @param _commitment The compliance commitment
     * @param _sanctionsRoot The sanctions root used in the proof
     * @param _thresholds Encoded thresholds (amount + volume)
     */
    function attestCompliance(
        uint256 _commitment,
        uint256 _sanctionsRoot,
        bytes calldata _thresholds
    ) external {
        require(authorizedAttestors[msg.sender] || msg.sender == owner, "Hub: not authorized attestor");
        // Verify compliance is active on registry
        (bool ok, bytes memory result) = complianceRegistry.staticcall(
            abi.encodeWithSignature("isCompliant(uint256)", _commitment)
        );
        require(ok && abi.decode(result, (bool)), "Hub: not compliant");

        uint256 dataHash = uint256(keccak256(abi.encodePacked(
            _commitment, _sanctionsRoot, _thresholds, block.timestamp
        )));

        uint256 id = attestationCount++;
        attestations[id] = Attestation({
            msgType: MSG_COMPLIANCE_ATTESTATION,
            commitment: _commitment,
            dataHash: dataHash,
            timestamp: block.timestamp,
            srcEid: 42431, // Tempo Moderato
            relayed: false
        });

        latestAttestation[_commitment] = id;

        emit AttestationCreated(id, MSG_COMPLIANCE_ATTESTATION, _commitment, dataHash);
    }

    /**
     * @notice Create a reputation attestation
     * @param _agentCommitment The agent's commitment
     * @param _minTxCount Verified minimum tx count
     * @param _minVolume Verified minimum volume
     */
    function attestReputation(
        uint256 _agentCommitment,
        uint256 _minTxCount,
        uint256 _minVolume
    ) external {
        require(authorizedAttestors[msg.sender] || msg.sender == owner, "Hub: not authorized attestor");
        // Verify reputation meets requirements
        (bool ok, bytes memory result) = reputationRegistry.staticcall(
            abi.encodeWithSignature(
                "meetsRequirements(uint256,uint256,uint256)",
                _agentCommitment, _minTxCount, _minVolume
            )
        );
        require(ok && abi.decode(result, (bool)), "Hub: reputation insufficient");

        uint256 dataHash = uint256(keccak256(abi.encodePacked(
            _agentCommitment, _minTxCount, _minVolume, block.timestamp
        )));

        uint256 id = attestationCount++;
        attestations[id] = Attestation({
            msgType: MSG_REPUTATION_ATTESTATION,
            commitment: _agentCommitment,
            dataHash: dataHash,
            timestamp: block.timestamp,
            srcEid: 42431,
            relayed: false
        });

        latestAttestation[_agentCommitment] = id;

        emit AttestationCreated(id, MSG_REPUTATION_ATTESTATION, _agentCommitment, dataHash);
    }

    /**
     * @notice Encode attestation for cross-chain relay
     * @param _attestationId The attestation to encode
     * @return payload The encoded message payload for LayerZero
     */
    function encodeAttestation(uint256 _attestationId)
        external view returns (bytes memory payload)
    {
        Attestation memory att = attestations[_attestationId];
        require(att.timestamp > 0, "Hub: attestation not found");

        payload = abi.encode(
            att.msgType,
            att.commitment,
            att.dataHash,
            att.timestamp,
            att.srcEid
        );
    }

    /**
     * @notice Mark attestation as relayed (called by relay service)
     */
    function markRelayed(uint256 _attestationId, uint32 _dstEid) external {
        require(msg.sender == owner, "Hub: not owner");
        attestations[_attestationId].relayed = true;
        emit AttestationRelayed(
            _attestationId,
            _dstEid,
            bytes32(attestations[_attestationId].dataHash)
        );
    }

    // ═══════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════

    function getAttestation(uint256 _id)
        external view returns (Attestation memory)
    {
        return attestations[_id];
    }

    function isAttested(uint256 _commitment) external view returns (bool) {
        uint256 id = latestAttestation[_commitment];
        return attestations[id].timestamp > 0;
    }

    function getStats() external view returns (
        uint256 _attestationCount,
        address _complianceRegistry,
        address _reputationRegistry
    ) {
        return (attestationCount, complianceRegistry, reputationRegistry);
    }

    // ═══════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════

    function setAttestor(address _attestor, bool _authorized) external {
        require(msg.sender == owner, "Hub: not owner");
        authorizedAttestors[_attestor] = _authorized;
    }

    function setRegistries(address _compliance, address _reputation) external {
        require(msg.sender == owner, "Hub: not owner");
        complianceRegistry = _compliance;
        reputationRegistry = _reputation;
    }

    function transferOwnership(address _newOwner) external {
        require(msg.sender == owner, "Hub: not owner");
        require(_newOwner != address(0), "Hub: zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
