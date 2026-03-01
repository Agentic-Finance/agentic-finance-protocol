/**
 * ZK Agent Identity Types
 *
 * Type definitions for the Zero-Knowledge Agent Identity system.
 * Enables agents to prove attributes about themselves (reputation tier,
 * compliance status, job history) without revealing the underlying data.
 *
 * Three proof types:
 * 1. ZK Reputation Proof — "I am a Trusted-tier agent" (without revealing exact score)
 * 2. ZK Compliance Proof — "I comply with regulation X" (without revealing details)
 * 3. ZK Identity Proof — "I am a verified agent" (without revealing wallet address)
 */

// ── ZK Reputation Proof ──────────────────────────────────

/**
 * Proves an agent's reputation is within a certain tier range
 * without revealing the exact composite score.
 *
 * Public signals:
 * - tierMin: minimum score for claimed tier
 * - tierMax: maximum score for claimed tier
 * - merkleRoot: root of the reputation Merkle tree
 *
 * Private inputs:
 * - compositeScore: actual score (0-10000)
 * - walletAddress: agent's wallet
 * - secret: agent's identity secret
 * - merklePath: proof of inclusion in reputation tree
 */
export interface ZKReputationProof {
  /** Proof type identifier */
  type: 'zk-reputation';
  /** Claimed reputation tier */
  claimedTier: ZKReputationTier;
  /** Proof data (PLONK/Groth16) */
  proof: string;
  /** Public signals */
  publicSignals: {
    /** Minimum score for claimed tier */
    tierMin: number;
    /** Maximum score for claimed tier */
    tierMax: number;
    /** Merkle root of reputation state */
    merkleRoot: string;
    /** Nullifier hash (prevents double-use) */
    nullifierHash: string;
  };
  /** Timestamp of proof generation */
  generatedAt: string;
  /** Expiry (proofs are valid for 24h) */
  expiresAt: string;
}

export type ZKReputationTier = 'newcomer' | 'rising' | 'trusted' | 'elite' | 'legend';

/** Tier ranges matching APS-1 reputation tiers */
export const ZK_REPUTATION_TIERS: Record<ZKReputationTier, { min: number; max: number }> = {
  newcomer: { min: 0, max: 3000 },
  rising:   { min: 3001, max: 6000 },
  trusted:  { min: 6001, max: 8000 },
  elite:    { min: 8001, max: 9500 },
  legend:   { min: 9501, max: 10000 },
};

// ── ZK Compliance Proof ──────────────────────────────────

/**
 * Proves an agent complies with a set of regulatory requirements
 * without revealing which specific checks it passed.
 *
 * Use cases:
 * - "I am KYB-verified" (business verification)
 * - "I comply with GDPR" (data handling)
 * - "I am SOC2 audited" (security compliance)
 * - "I have completed N+ jobs without disputes" (track record)
 */
export interface ZKComplianceProof {
  /** Proof type identifier */
  type: 'zk-compliance';
  /** Which compliance framework */
  framework: ZKComplianceFramework;
  /** Proof data */
  proof: string;
  /** Public signals */
  publicSignals: {
    /** Compliance framework identifier hash */
    frameworkHash: string;
    /** Merkle root of compliance attestations */
    attestationRoot: string;
    /** Nullifier hash */
    nullifierHash: string;
    /** Whether all requirements are met */
    isCompliant: boolean;
  };
  /** Issuer of the compliance attestation */
  issuer: string;
  generatedAt: string;
  expiresAt: string;
}

export type ZKComplianceFramework =
  | 'kyb'          // Know Your Business
  | 'gdpr'         // General Data Protection Regulation
  | 'soc2'         // SOC 2 Type II
  | 'iso27001'     // Information Security
  | 'aml'          // Anti-Money Laundering
  | 'track-record' // Minimum job history without disputes
  | 'custom';

// ── ZK Identity Proof ────────────────────────────────────

/**
 * Proves an agent is a verified member of the PayPol network
 * without revealing its wallet address or identity.
 *
 * Allows:
 * - Anonymous bidding on jobs
 * - Privacy-preserving reputation advertising
 * - Sybil resistance (each identity is unique)
 */
export interface ZKIdentityProof {
  /** Proof type identifier */
  type: 'zk-identity';
  /** Proof data */
  proof: string;
  /** Public signals */
  publicSignals: {
    /** Identity commitment (Poseidon hash of wallet + secret) */
    identityCommitment: string;
    /** Merkle root of the agent registry tree */
    registryRoot: string;
    /** Nullifier hash (one per context to prevent double-use) */
    nullifierHash: string;
    /** External nullifier (context ID — e.g., job ID, auction ID) */
    externalNullifier: string;
  };
  generatedAt: string;
  expiresAt: string;
}

// ── ZK Credential Bundle ─────────────────────────────────

/**
 * A bundle of ZK proofs that an agent presents to clients.
 * Contains all necessary proofs for a job application.
 */
export interface ZKCredentialBundle {
  /** Agent's identity proof */
  identity: ZKIdentityProof;
  /** Reputation proof (optional) */
  reputation?: ZKReputationProof;
  /** Compliance proofs (optional, can have multiple) */
  compliance?: ZKComplianceProof[];
  /** Bundle metadata */
  metadata: {
    /** APS-1 protocol version */
    apsVersion: string;
    /** Chain ID where proofs are verifiable */
    chainId: number;
    /** Verifier contract address */
    verifierAddress: string;
    /** Bundle creation timestamp */
    createdAt: string;
  };
}

// ── Verifier Interface ───────────────────────────────────

/**
 * Interface for ZK proof verification.
 * Can be implemented on-chain (Solidity) or off-chain (TypeScript/Rust).
 */
export interface ZKVerifier {
  /** Verifier name */
  readonly name: string;

  /**
   * Verify a ZK reputation proof.
   * @returns true if the agent's score is within the claimed tier
   */
  verifyReputationProof(proof: ZKReputationProof): Promise<boolean>;

  /**
   * Verify a ZK compliance proof.
   * @returns true if the agent's compliance attestation is valid
   */
  verifyComplianceProof(proof: ZKComplianceProof): Promise<boolean>;

  /**
   * Verify a ZK identity proof.
   * @returns true if the agent is a verified member
   */
  verifyIdentityProof(proof: ZKIdentityProof): Promise<boolean>;

  /**
   * Verify a complete credential bundle.
   * @returns object with per-proof verification results
   */
  verifyBundle(bundle: ZKCredentialBundle): Promise<ZKVerificationResult>;
}

export interface ZKVerificationResult {
  /** Overall validity */
  valid: boolean;
  /** Identity proof valid */
  identityValid: boolean;
  /** Reputation proof valid (null if not provided) */
  reputationValid: boolean | null;
  /** Compliance proofs validity */
  complianceResults: Array<{
    framework: ZKComplianceFramework;
    valid: boolean;
  }>;
  /** Verification timestamp */
  verifiedAt: string;
}

// ── Prover Interface ─────────────────────────────────────

/**
 * Interface for ZK proof generation.
 * Implemented by agents to generate proofs about themselves.
 */
export interface ZKProver {
  /** Prover name */
  readonly name: string;

  /**
   * Generate a ZK reputation proof for the agent.
   * @param claimedTier - The tier to prove membership in
   * @param agentSecret - Agent's private identity secret
   */
  generateReputationProof(
    claimedTier: ZKReputationTier,
    agentSecret: string,
  ): Promise<ZKReputationProof>;

  /**
   * Generate a ZK compliance proof.
   * @param framework - Compliance framework to prove
   * @param attestationData - Private attestation data
   * @param agentSecret - Agent's private identity secret
   */
  generateComplianceProof(
    framework: ZKComplianceFramework,
    attestationData: Record<string, unknown>,
    agentSecret: string,
  ): Promise<ZKComplianceProof>;

  /**
   * Generate a ZK identity proof.
   * @param externalNullifier - Context ID (e.g., job ID)
   * @param agentSecret - Agent's private identity secret
   */
  generateIdentityProof(
    externalNullifier: string,
    agentSecret: string,
  ): Promise<ZKIdentityProof>;

  /**
   * Generate a complete credential bundle.
   */
  generateBundle(
    agentSecret: string,
    options: {
      claimedTier?: ZKReputationTier;
      complianceFrameworks?: ZKComplianceFramework[];
      externalNullifier: string;
    },
  ): Promise<ZKCredentialBundle>;
}

// ── Constants ────────────────────────────────────────────

/** ZK proof validity duration (24 hours) */
export const ZK_PROOF_VALIDITY_MS = 24 * 60 * 60 * 1000;

/** Maximum number of compliance proofs in a bundle */
export const ZK_MAX_COMPLIANCE_PROOFS = 10;

/** Supported ZK proof systems */
export type ZKProofSystem = 'plonk' | 'groth16' | 'fflonk';

/** Default proof system */
export const ZK_DEFAULT_PROOF_SYSTEM: ZKProofSystem = 'plonk';
