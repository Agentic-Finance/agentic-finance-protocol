// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAgtFiZKDVN — ZK-Proof DVN Interface for LayerZero V2
 * @notice Defines the interface for Agentic Finance's ZK-proof-based
 *         Decentralized Verifier Network (DVN) for cross-chain messaging.
 *
 * Unlike standard DVNs that rely on multisigs or oracles, this DVN
 * verifies cross-chain messages using ZK-SNARK proofs of source chain
 * state transitions. This provides cryptographic (math-based) security
 * instead of trust-based security.
 */
interface IAgtFiZKDVN {

    /// @notice Job assignment from LayerZero SendLib
    struct AssignJobParam {
        uint32 dstEid;           // Destination endpoint ID
        bytes  packetHeader;     // 81-byte packet header
        bytes32 payloadHash;     // Hash of the message payload
        uint64 confirmations;    // Required source chain confirmations
        address sender;          // OApp sender address
    }

    /// @notice Emitted when a verification job is assigned
    event JobAssigned(
        uint32 indexed dstEid,
        bytes32 indexed payloadHash,
        address sender,
        uint64 confirmations,
        uint256 fee
    );

    /// @notice Emitted when a ZK-verified message is confirmed
    event ZKVerified(
        uint32 indexed srcEid,
        uint32 indexed dstEid,
        bytes32 payloadHash,
        bytes32 proofHash
    );

    /// @notice Called by SendLib to assign a verification job
    function assignJob(
        AssignJobParam calldata _param,
        bytes calldata _options
    ) external payable returns (uint256 fee);

    /// @notice Get fee quote for verification
    function getFee(
        uint32 _dstEid,
        uint64 _confirmations,
        address _sender,
        bytes calldata _options
    ) external view returns (uint256 fee);
}
