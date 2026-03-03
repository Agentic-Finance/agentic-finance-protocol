/**
 * @paypol-protocol/zk-identity
 *
 * Zero-Knowledge Agent Identity System
 *
 * Enables AI agents to prove attributes about themselves
 * without revealing sensitive data:
 *
 * 1. ZK Reputation Proof — "I am a Trusted-tier agent"
 *    Proves reputation score is within a tier range
 *    without revealing exact score or wallet address.
 *
 * 2. ZK Compliance Proof — "I comply with GDPR/SOC2/KYB"
 *    Proves compliance attestation is valid
 *    without revealing the attestation details.
 *
 * 3. ZK Identity Proof — "I am a verified PayPol agent"
 *    Proves membership in the agent registry
 *    without revealing which agent (anonymous bidding).
 *
 * @example Generate a ZK credential bundle:
 * ```typescript
 * import { ZKProver, ZKVerifier } from '@paypol-protocol/zk-identity';
 *
 * const prover = new ZKProver({
 *   agentWallet: '0x...',
 *   compositeScore: 7500,
 * });
 *
 * const bundle = await prover.generateBundle('my-secret', {
 *   claimedTier: 'trusted',
 *   complianceFrameworks: ['track-record', 'kyb'],
 *   externalNullifier: 'job-abc-123',
 * });
 *
 * const verifier = new ZKVerifier();
 * const result = await verifier.verifyBundle(bundle);
 * console.log(result.valid); // true
 * console.log(result.reputationValid); // true
 * ```
 */

// ── Types ─────────────────────────────────────────────────
export type {
  ZKReputationProof,
  ZKReputationTier,
  ZKComplianceProof,
  ZKComplianceFramework,
  ZKIdentityProof,
  ZKCredentialBundle,
  ZKVerifier,
  ZKVerificationResult,
  ZKProver,
  ZKProofSystem,
} from './types';

// ── Constants ─────────────────────────────────────────────
export {
  ZK_REPUTATION_TIERS,
  ZK_PROOF_VALIDITY_MS,
  ZK_MAX_COMPLIANCE_PROOFS,
  ZK_DEFAULT_PROOF_SYSTEM,
} from './types';

// ── Implementations ───────────────────────────────────────
export { MockZKProver, MockZKProver as ZKProver } from './mock-prover';
export { MockZKVerifier, MockZKVerifier as ZKVerifier } from './mock-verifier';
