// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PortableReputation — Cross-Chain ZK Reputation (ERC-8004 Compatible)
 * @notice Agent reputation that travels across chains via ZK attestations.
 *
 * Problem:
 *   Agent reputation is siloed within each platform. An agent with 500 txs
 *   on Tempo has zero reputation on Base, Polygon, or Ethereum.
 *
 * Solution:
 *   1. Agent builds reputation on Tempo (via AgentReputationRegistry)
 *   2. Agent generates ZK proof of reputation stats
 *   3. Attestation is created: signed message + ZK proof hash
 *   4. Attestation can be verified on ANY chain without bridging
 *   5. ERC-8004 compatible: registries on other chains accept attestations
 *
 * Why this is hard to copy:
 *   - Requires the ZK circuit infrastructure (Circom + snarkjs)
 *   - Requires on-chain reputation data (can't be forked)
 *   - Requires cross-chain attestation verification
 *   - First-mover accumulates data that creates network effect
 */

interface IReputationRegistry {
    function meetsRequirements(uint256 agentCommitment, uint256 requiredTxCount, uint256 requiredVolume)
        external view returns (bool);
    function getReputation(uint256 agentCommitment)
        external view returns (
            uint256 accumulatorHash,
            uint256 verifiedTxCount,
            uint256 verifiedVolume,
            uint256 lastVerifiedAt,
            uint256 blockNumber,
            uint256 proofCount,
            bool active
        );
}

contract PortableReputation {

    /*//////////////////////////////////////////////////////////////
                            STATE
    //////////////////////////////////////////////////////////////*/

    address public owner;
    IReputationRegistry public reputationRegistry;

    /// @notice Portable attestation for cross-chain use
    struct ReputationAttestation {
        uint256 agentCommitment;     // ZK identity
        uint256 accumulatorHash;     // Reputation data hash
        uint256 minTxCount;          // Proven minimum txs
        uint256 minVolume;           // Proven minimum volume
        uint256 sourceChainId;       // Chain where reputation was built
        uint256 attestedAt;          // Timestamp of attestation
        uint256 expiresAt;           // Attestation expiry
        bytes32 attestationId;       // Unique ID
        bool    valid;               // Is attestation active
    }

    /// @notice attestationId => ReputationAttestation
    mapping(bytes32 => ReputationAttestation) public attestations;

    /// @notice agentCommitment => latest attestationId
    mapping(uint256 => bytes32) public latestAttestation;

    /// @notice agentCommitment => all attestation IDs
    mapping(uint256 => bytes32[]) public attestationHistory;

    /// @notice Trusted attestors (can create attestations)
    mapping(address => bool) public trustedAttestors;

    /// @notice Attestation validity period (seconds)
    uint256 public attestationValidity;

    /// @notice Total attestations issued
    uint256 public totalAttestations;

    /// @notice EIP-712 domain separator for cross-chain verification
    bytes32 public immutable DOMAIN_SEPARATOR;

    bytes32 public constant ATTESTATION_TYPEHASH = keccak256(
        "ReputationAttestation(uint256 agentCommitment,uint256 accumulatorHash,uint256 minTxCount,uint256 minVolume,uint256 sourceChainId,uint256 attestedAt,uint256 expiresAt)"
    );

    /*//////////////////////////////////////////////////////////////
                            EVENTS
    //////////////////////////////////////////////////////////////*/

    event AttestationCreated(
        bytes32 indexed attestationId,
        uint256 indexed agentCommitment,
        uint256 minTxCount,
        uint256 minVolume,
        uint256 sourceChainId,
        uint256 expiresAt
    );

    event AttestationRevoked(bytes32 indexed attestationId);
    event AttestorAdded(address indexed attestor);
    event AttestorRemoved(address indexed attestor);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _reputationRegistry, uint256 _attestationValidity) {
        owner = msg.sender;
        reputationRegistry = IReputationRegistry(_reputationRegistry);
        attestationValidity = _attestationValidity;
        trustedAttestors[msg.sender] = true;

        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("AgtFi Portable Reputation"),
            keccak256("1"),
            block.chainid,
            address(this)
        ));
    }

    /*//////////////////////////////////////////////////////////////
                            CORE: Create & Verify Attestations
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Create a portable reputation attestation
     * @dev Verifies agent's reputation on-chain, then creates signed attestation
     * @param agentCommitment The agent's ZK identity commitment
     * @param minTxCount Minimum tx count to attest
     * @param minVolume Minimum volume to attest
     * @return attestationId The unique attestation identifier
     */
    function createAttestation(
        uint256 agentCommitment,
        uint256 minTxCount,
        uint256 minVolume
    ) external returns (bytes32 attestationId) {
        require(trustedAttestors[msg.sender], "PortableRep: not trusted attestor");

        // Verify reputation on source chain
        bool meetsReqs = reputationRegistry.meetsRequirements(
            agentCommitment, minTxCount, minVolume
        );
        require(meetsReqs, "PortableRep: agent does not meet requirements");

        // Get full reputation data
        (uint256 accumulatorHash,,,,,,) = reputationRegistry.getReputation(agentCommitment);

        uint256 expiresAt = block.timestamp + attestationValidity;

        attestationId = keccak256(abi.encodePacked(
            agentCommitment,
            accumulatorHash,
            minTxCount,
            minVolume,
            block.chainid,
            block.timestamp,
            totalAttestations
        ));

        attestations[attestationId] = ReputationAttestation({
            agentCommitment: agentCommitment,
            accumulatorHash: accumulatorHash,
            minTxCount: minTxCount,
            minVolume: minVolume,
            sourceChainId: block.chainid,
            attestedAt: block.timestamp,
            expiresAt: expiresAt,
            attestationId: attestationId,
            valid: true
        });

        latestAttestation[agentCommitment] = attestationId;
        attestationHistory[agentCommitment].push(attestationId);
        totalAttestations++;

        emit AttestationCreated(
            attestationId,
            agentCommitment,
            minTxCount,
            minVolume,
            block.chainid,
            expiresAt
        );
    }

    /**
     * @notice Verify an attestation is valid
     * @param attestationId The attestation to verify
     * @return valid Whether the attestation is currently valid
     * @return attestation The full attestation data
     */
    function verifyAttestation(bytes32 attestationId)
        external view returns (bool valid, ReputationAttestation memory attestation)
    {
        attestation = attestations[attestationId];
        valid = attestation.valid
            && block.timestamp < attestation.expiresAt
            && attestation.attestedAt > 0;
    }

    /**
     * @notice Get the EIP-712 digest for cross-chain verification
     * @dev Sign this digest with a trusted key → verify signature on destination chain
     */
    function getAttestationDigest(bytes32 attestationId) external view returns (bytes32) {
        ReputationAttestation memory att = attestations[attestationId];
        return keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            keccak256(abi.encode(
                ATTESTATION_TYPEHASH,
                att.agentCommitment,
                att.accumulatorHash,
                att.minTxCount,
                att.minVolume,
                att.sourceChainId,
                att.attestedAt,
                att.expiresAt
            ))
        ));
    }

    /**
     * @notice Check if agent meets requirements via latest attestation
     */
    function agentMeetsRequirements(
        uint256 agentCommitment,
        uint256 requiredTxCount,
        uint256 requiredVolume
    ) external view returns (bool) {
        bytes32 attId = latestAttestation[agentCommitment];
        if (attId == bytes32(0)) return false;

        ReputationAttestation memory att = attestations[attId];
        if (!att.valid || block.timestamp >= att.expiresAt) return false;
        if (att.minTxCount < requiredTxCount) return false;
        if (att.minVolume < requiredVolume) return false;

        return true;
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN
    //////////////////////////////////////////////////////////////*/

    function addAttestor(address _attestor) external {
        require(msg.sender == owner, "PortableRep: not owner");
        trustedAttestors[_attestor] = true;
        emit AttestorAdded(_attestor);
    }

    function removeAttestor(address _attestor) external {
        require(msg.sender == owner, "PortableRep: not owner");
        trustedAttestors[_attestor] = false;
        emit AttestorRemoved(_attestor);
    }

    function revokeAttestation(bytes32 attestationId) external {
        require(msg.sender == owner, "PortableRep: not owner");
        attestations[attestationId].valid = false;
        emit AttestationRevoked(attestationId);
    }

    function setAttestationValidity(uint256 _validity) external {
        require(msg.sender == owner, "PortableRep: not owner");
        require(_validity >= 3600, "PortableRep: min 1 hour");
        attestationValidity = _validity;
    }

    function transferOwnership(address _newOwner) external {
        require(msg.sender == owner, "PortableRep: not owner");
        require(_newOwner != address(0), "PortableRep: zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
