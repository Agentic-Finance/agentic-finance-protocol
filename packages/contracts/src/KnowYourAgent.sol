// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  KnowYourAgent (KYA)
 * @notice Unified trust assessment combining all verification layers.
 *         Queries AgentDIDRegistry, ComplianceRegistry, ReputationRegistry,
 *         TEERegistry, and InferenceRegistry to produce a composite trust score.
 *
 *         KYA Five Checkpoints (AFP-002 §3.1):
 *           1. Provenance — Who deployed this agent?
 *           2. Identity   — Cryptographic commitment verified?
 *           3. Permissions — Spend policy active?
 *           4. Behavior   — Reputation proof verified?
 *           5. Attestation — TEE + inference verified?
 *
 *         Trust Tiers:
 *           Tier 0: Wallet only (0/5 checkpoints)
 *           Tier 1: Identity + Compliance (2/5)
 *           Tier 2: + Reputation (3/5)
 *           Tier 3: + TEE attestation (4/5)
 *           Tier 4: + Inference attestation (5/5)
 *
 * @dev    This is a read-only aggregator — stores no state itself.
 *         All data comes from the underlying registries.
 */

interface IAgentDIDRegistry {
    struct AgentIdentity {
        bytes32 didHash;
        address agentAddress;
        address controller;
        uint256 complianceCommitment;
        uint256 reputationCommitment;
        uint256 registeredAt;
        uint256 updatedAt;
        bool active;
    }
    function resolveDID(bytes32 didHash) external view returns (AgentIdentity memory);
    function resolveAddress(address agentAddress) external view returns (AgentIdentity memory);
    function isFullyVerified(bytes32 didHash) external view returns (bool);
}

interface IComplianceRegistry {
    function isCompliant(uint256 commitment) external view returns (bool);
}

interface IReputationRegistry {
    function meetsRequirements(uint256 commitment, uint256 requiredTxCount, uint256 requiredVolume) external view returns (bool);
}

interface ITEERegistry {
    function hasValidAttestation(address agent) external view returns (bool valid, bytes32 enclaveHash, uint256 attestedAt, uint8 teeType);
}

interface IInferenceRegistry {
    function hasValidAttestation(uint256 agentCommitment, bytes32 modelHash) external view returns (bool valid, bool verified, uint256 timestamp);
}

interface ISpendPolicy {
    function policies(address agent) external view returns (uint256, uint256, uint256, bool, bool, bool, address, uint256, uint256);
}

contract KnowYourAgent {

    // ── Registry Addresses ─────────────────────────────────────

    IAgentDIDRegistry public immutable didRegistry;
    IComplianceRegistry public immutable complianceRegistry;
    IReputationRegistry public immutable reputationRegistry;
    ITEERegistry public immutable teeRegistry;
    IInferenceRegistry public immutable inferenceRegistry;
    ISpendPolicy public immutable spendPolicy;

    // ── Structs ────────────────────────────────────────────────

    struct KYAReport {
        // Checkpoint 1: Provenance
        bool hasProvenance;
        address controller;
        uint256 registeredAt;

        // Checkpoint 2: Identity
        bool hasIdentity;
        bool isCompliant;
        uint256 complianceCommitment;

        // Checkpoint 3: Permissions
        bool hasSpendPolicy;

        // Checkpoint 4: Behavior
        bool hasReputation;
        uint256 reputationCommitment;

        // Checkpoint 5: Attestation
        bool hasTEE;
        bool hasInference;

        // Composite
        uint8 trustTier;             // 0-4
        uint8 checkpointsPassed;     // 0-5
    }

    // ── Constructor ────────────────────────────────────────────

    constructor(
        address _didRegistry,
        address _complianceRegistry,
        address _reputationRegistry,
        address _teeRegistry,
        address _inferenceRegistry,
        address _spendPolicy
    ) {
        didRegistry = IAgentDIDRegistry(_didRegistry);
        complianceRegistry = IComplianceRegistry(_complianceRegistry);
        reputationRegistry = IReputationRegistry(_reputationRegistry);
        teeRegistry = ITEERegistry(_teeRegistry);
        inferenceRegistry = IInferenceRegistry(_inferenceRegistry);
        spendPolicy = ISpendPolicy(_spendPolicy);
    }

    // ── Core Query ─────────────────────────────────────────────

    /**
     * @notice Get full KYA report for an agent by DID hash.
     * @param didHash The agent's DID hash
     * @param minTxCount Minimum tx count for reputation check
     * @param minVolume Minimum volume for reputation check
     * @param modelHash Optional model hash for inference check (bytes32(0) to skip)
     */
    function getKYAReport(
        bytes32 didHash,
        uint256 minTxCount,
        uint256 minVolume,
        bytes32 modelHash
    ) external view returns (KYAReport memory report) {
        // Checkpoint 1: Provenance
        try didRegistry.resolveDID(didHash) returns (IAgentDIDRegistry.AgentIdentity memory identity) {
            if (identity.registeredAt > 0 && identity.active) {
                report.hasProvenance = true;
                report.controller = identity.controller;
                report.registeredAt = identity.registeredAt;
                report.complianceCommitment = identity.complianceCommitment;
                report.reputationCommitment = identity.reputationCommitment;

                // Checkpoint 2: Identity (compliance)
                if (identity.complianceCommitment != 0) {
                    try complianceRegistry.isCompliant(identity.complianceCommitment) returns (bool compliant) {
                        report.hasIdentity = true;
                        report.isCompliant = compliant;
                    } catch {}
                }

                // Checkpoint 3: Permissions (spend policy)
                try spendPolicy.policies(identity.agentAddress) returns (
                    uint256, uint256, uint256, bool, bool, bool active, address, uint256, uint256
                ) {
                    report.hasSpendPolicy = active;
                } catch {}

                // Checkpoint 4: Behavior (reputation)
                if (identity.reputationCommitment != 0) {
                    try reputationRegistry.meetsRequirements(
                        identity.reputationCommitment, minTxCount, minVolume
                    ) returns (bool meets) {
                        report.hasReputation = meets;
                    } catch {}
                }

                // Checkpoint 5a: TEE attestation
                try teeRegistry.hasValidAttestation(identity.agentAddress) returns (
                    bool valid, bytes32, uint256, uint8
                ) {
                    report.hasTEE = valid;
                } catch {}

                // Checkpoint 5b: Inference attestation
                if (modelHash != bytes32(0) && identity.complianceCommitment != 0) {
                    try inferenceRegistry.hasValidAttestation(
                        identity.complianceCommitment, modelHash
                    ) returns (bool valid, bool, uint256) {
                        report.hasInference = valid;
                    } catch {}
                }
            }
        } catch {}

        // Calculate trust tier
        report.checkpointsPassed = 0;
        if (report.hasProvenance) report.checkpointsPassed++;
        if (report.hasIdentity && report.isCompliant) report.checkpointsPassed++;
        if (report.hasSpendPolicy) report.checkpointsPassed++;
        if (report.hasReputation) report.checkpointsPassed++;
        if (report.hasTEE || report.hasInference) report.checkpointsPassed++;

        // Map to trust tier
        if (report.hasTEE && report.hasInference) {
            report.trustTier = 4; // Full
        } else if (report.hasTEE) {
            report.trustTier = 3; // Maximum
        } else if (report.hasReputation) {
            report.trustTier = 2; // Enhanced
        } else if (report.hasIdentity && report.isCompliant) {
            report.trustTier = 1; // Standard
        } else {
            report.trustTier = 0; // Minimal
        }
    }

    /**
     * @notice Quick trust tier check for an agent address.
     * @dev    Simplified version that only returns the tier number.
     */
    function getTrustTier(address agentAddress) external view returns (uint8 tier) {
        // Check TEE first (highest signal)
        try teeRegistry.hasValidAttestation(agentAddress) returns (
            bool valid, bytes32, uint256, uint8
        ) {
            if (valid) return 3;
        } catch {}

        // Check DID + compliance
        try didRegistry.resolveAddress(agentAddress) returns (
            IAgentDIDRegistry.AgentIdentity memory identity
        ) {
            if (!identity.active) return 0;

            // Check reputation
            if (identity.reputationCommitment != 0) {
                try reputationRegistry.meetsRequirements(identity.reputationCommitment, 1, 0) returns (bool meets) {
                    if (meets) return 2;
                } catch {}
            }

            // Check compliance
            if (identity.complianceCommitment != 0) {
                try complianceRegistry.isCompliant(identity.complianceCommitment) returns (bool compliant) {
                    if (compliant) return 1;
                } catch {}
            }
        } catch {}

        return 0;
    }

    /**
     * @notice Check if an agent meets a minimum trust tier.
     * @param agentAddress The agent to check
     * @param requiredTier Minimum required tier (0-4)
     */
    function meetsTrustRequirement(address agentAddress, uint8 requiredTier) external view returns (bool) {
        if (requiredTier == 0) return true;

        uint8 actualTier = this.getTrustTier(agentAddress);
        return actualTier >= requiredTier;
    }
}
