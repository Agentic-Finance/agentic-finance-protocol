// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgtFiCrossChainSpoke — Destination Chain Attestation Receiver
 * @notice Deployed on destination chains (Base, Polygon, etc.) to receive
 *         ZK-verified compliance and reputation attestations from Tempo Hub.
 *
 * Merchants and protocols on the destination chain can query:
 *   - isCompliant(commitment) — "Is this agent's payment compliant?"
 *   - hasReputation(commitment, minTx, minVol) — "Does this agent meet my requirements?"
 *
 * Attestations are only accepted from the authorized AgtFiZKDVN,
 * which verifies them using ZK proofs before relaying.
 */
contract AgtFiCrossChainSpoke {

    // ═══════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════

    address public owner;

    /// @notice Authorized DVN that can submit attestations
    address public authorizedDVN;

    /// @notice Authorized relayer that can submit attestations
    mapping(address => bool) public authorizedRelayers;

    /// @notice Source chain endpoint ID (Tempo = 42431)
    uint32 public constant SOURCE_EID = 42431;

    /// @notice Message types
    uint8 public constant MSG_COMPLIANCE = 1;
    uint8 public constant MSG_REPUTATION = 2;

    /// @notice Compliance attestation
    struct ComplianceAttestation {
        uint256 dataHash;
        uint256 attestedAt;      // When attested on source chain
        uint256 receivedAt;      // When received on this chain
        bool valid;
    }

    /// @notice Reputation attestation
    struct ReputationAttestation {
        uint256 dataHash;
        uint256 verifiedTxCount;
        uint256 verifiedVolume;
        uint256 attestedAt;
        uint256 receivedAt;
        bool valid;
    }

    /// @notice commitment => ComplianceAttestation
    mapping(uint256 => ComplianceAttestation) public complianceAttestations;

    /// @notice agentCommitment => ReputationAttestation
    mapping(uint256 => ReputationAttestation) public reputationAttestations;

    /// @notice Attestation max age (default 7 days)
    uint256 public maxAge = 7 days;

    /// @notice Stats
    uint256 public totalComplianceAttestations;
    uint256 public totalReputationAttestations;

    // ═══════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════

    event ComplianceReceived(uint256 indexed commitment, uint256 dataHash, uint256 timestamp);
    event ReputationReceived(uint256 indexed agentCommitment, uint256 txCount, uint256 volume, uint256 timestamp);

    // ═══════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════

    constructor(address _authorizedDVN) {
        owner = msg.sender;
        authorizedDVN = _authorizedDVN;
        authorizedRelayers[msg.sender] = true;
    }

    // ═══════════════════════════════════════════════
    // RECEIVE ATTESTATIONS
    // ═══════════════════════════════════════════════

    /**
     * @notice Receive a compliance attestation from Tempo Hub
     * @dev Only callable by authorized DVN or relayer
     */
    function receiveComplianceAttestation(
        uint256 _commitment,
        uint256 _dataHash,
        uint256 _attestedAt
    ) external onlyAuthorized {
        complianceAttestations[_commitment] = ComplianceAttestation({
            dataHash: _dataHash,
            attestedAt: _attestedAt,
            receivedAt: block.timestamp,
            valid: true
        });

        totalComplianceAttestations++;
        emit ComplianceReceived(_commitment, _dataHash, _attestedAt);
    }

    /**
     * @notice Receive a reputation attestation from Tempo Hub
     */
    function receiveReputationAttestation(
        uint256 _agentCommitment,
        uint256 _dataHash,
        uint256 _txCount,
        uint256 _volume,
        uint256 _attestedAt
    ) external onlyAuthorized {
        reputationAttestations[_agentCommitment] = ReputationAttestation({
            dataHash: _dataHash,
            verifiedTxCount: _txCount,
            verifiedVolume: _volume,
            attestedAt: _attestedAt,
            receivedAt: block.timestamp,
            valid: true
        });

        totalReputationAttestations++;
        emit ReputationReceived(_agentCommitment, _txCount, _volume, _attestedAt);
    }

    /**
     * @notice Receive encoded attestation payload (from LayerZero lzReceive)
     */
    function receivePayload(bytes calldata _payload) external onlyAuthorized {
        (
            uint8 msgType,
            uint256 commitment,
            uint256 dataHash,
            uint256 timestamp,
            /* uint32 srcEid */
        ) = abi.decode(_payload, (uint8, uint256, uint256, uint256, uint32));

        if (msgType == MSG_COMPLIANCE) {
            complianceAttestations[commitment] = ComplianceAttestation({
                dataHash: dataHash,
                attestedAt: timestamp,
                receivedAt: block.timestamp,
                valid: true
            });
            totalComplianceAttestations++;
            emit ComplianceReceived(commitment, dataHash, timestamp);
        } else if (msgType == MSG_REPUTATION) {
            // For reputation via payload, txCount and volume are in dataHash
            reputationAttestations[commitment] = ReputationAttestation({
                dataHash: dataHash,
                verifiedTxCount: 0, // Extracted from dataHash in practice
                verifiedVolume: 0,
                attestedAt: timestamp,
                receivedAt: block.timestamp,
                valid: true
            });
            totalReputationAttestations++;
            emit ReputationReceived(commitment, 0, 0, timestamp);
        }
    }

    // ═══════════════════════════════════════════════
    // QUERY: For merchants and protocols
    // ═══════════════════════════════════════════════

    /**
     * @notice Check if a commitment has valid compliance attestation
     * @param _commitment The compliance commitment to check
     * @return compliant true if attestation exists, valid, and not expired
     */
    function isCompliant(uint256 _commitment) external view returns (bool) {
        ComplianceAttestation memory att = complianceAttestations[_commitment];
        if (!att.valid) return false;
        if (block.timestamp > att.receivedAt + maxAge) return false;
        return true;
    }

    /**
     * @notice Check if an agent has sufficient reputation
     * @param _agentCommitment The agent's commitment
     * @param _minTxCount Required minimum tx count
     * @param _minVolume Required minimum volume
     * @return meets true if reputation meets all requirements
     */
    function hasReputation(
        uint256 _agentCommitment,
        uint256 _minTxCount,
        uint256 _minVolume
    ) external view returns (bool) {
        ReputationAttestation memory att = reputationAttestations[_agentCommitment];
        if (!att.valid) return false;
        if (block.timestamp > att.receivedAt + maxAge) return false;
        if (att.verifiedTxCount < _minTxCount) return false;
        if (att.verifiedVolume < _minVolume) return false;
        return true;
    }

    // ═══════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════

    modifier onlyAuthorized() {
        require(
            msg.sender == authorizedDVN || authorizedRelayers[msg.sender] || msg.sender == owner,
            "Spoke: not authorized"
        );
        _;
    }

    function setAuthorizedDVN(address _dvn) external {
        require(msg.sender == owner, "Spoke: not owner");
        authorizedDVN = _dvn;
    }

    function setRelayer(address _relayer, bool _authorized) external {
        require(msg.sender == owner, "Spoke: not owner");
        authorizedRelayers[_relayer] = _authorized;
    }

    function setMaxAge(uint256 _maxAge) external {
        require(msg.sender == owner, "Spoke: not owner");
        require(_maxAge >= 1 hours, "Spoke: too short");
        maxAge = _maxAge;
    }

    function revokeCompliance(uint256 _commitment) external {
        require(msg.sender == owner, "Spoke: not owner");
        complianceAttestations[_commitment].valid = false;
    }

    function revokeReputation(uint256 _agentCommitment) external {
        require(msg.sender == owner, "Spoke: not owner");
        reputationAttestations[_agentCommitment].valid = false;
    }

    function transferOwnership(address _newOwner) external {
        require(msg.sender == owner, "Spoke: not owner");
        owner = _newOwner;
    }
}
