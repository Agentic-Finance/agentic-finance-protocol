/**
 * Mock ZK Verifier
 *
 * A mock implementation of the ZKVerifier interface for testing.
 * Performs basic structural validation of proofs without actual
 * ZK-SNARK circuit verification.
 *
 * For production, replace with OnChainZKVerifier which:
 * - Calls Solidity verifier contracts on-chain
 * - Validates Merkle proofs against live state
 * - Checks nullifier uniqueness
 */

import type {
  ZKVerifier,
  ZKReputationProof,
  ZKComplianceProof,
  ZKIdentityProof,
  ZKCredentialBundle,
  ZKVerificationResult,
} from './types';
import { ZK_REPUTATION_TIERS } from './types';

export class MockZKVerifier implements ZKVerifier {
  readonly name = 'MockZKVerifier';

  /** Track used nullifiers to prevent double-use */
  private usedNullifiers = new Set<string>();

  // ── Reputation Proof Verification ──────────────────

  async verifyReputationProof(proof: ZKReputationProof): Promise<boolean> {
    // 1. Check proof structure
    if (!proof.proof || !proof.publicSignals) return false;
    if (proof.type !== 'zk-reputation') return false;

    // 2. Check claimed tier is valid
    const tierRange = ZK_REPUTATION_TIERS[proof.claimedTier];
    if (!tierRange) return false;

    // 3. Check public signals match claimed tier
    if (proof.publicSignals.tierMin !== tierRange.min) return false;
    if (proof.publicSignals.tierMax !== tierRange.max) return false;

    // 4. Check expiry
    if (new Date(proof.expiresAt) < new Date()) return false;

    // 5. Check nullifier hasn't been used
    if (this.usedNullifiers.has(proof.publicSignals.nullifierHash)) return false;

    // 6. Mark nullifier as used
    this.usedNullifiers.add(proof.publicSignals.nullifierHash);

    // In production: verify PLONK proof on-chain
    return true;
  }

  // ── Compliance Proof Verification ──────────────────

  async verifyComplianceProof(proof: ZKComplianceProof): Promise<boolean> {
    if (!proof.proof || !proof.publicSignals) return false;
    if (proof.type !== 'zk-compliance') return false;

    // Check expiry
    if (new Date(proof.expiresAt) < new Date()) return false;

    // Check compliance result
    if (!proof.publicSignals.isCompliant) return false;

    // Check nullifier
    if (this.usedNullifiers.has(proof.publicSignals.nullifierHash)) return false;
    this.usedNullifiers.add(proof.publicSignals.nullifierHash);

    return true;
  }

  // ── Identity Proof Verification ────────────────────

  async verifyIdentityProof(proof: ZKIdentityProof): Promise<boolean> {
    if (!proof.proof || !proof.publicSignals) return false;
    if (proof.type !== 'zk-identity') return false;

    // Check expiry
    if (new Date(proof.expiresAt) < new Date()) return false;

    // Check nullifier (per external nullifier context)
    const contextKey = `${proof.publicSignals.nullifierHash}:${proof.publicSignals.externalNullifier}`;
    if (this.usedNullifiers.has(contextKey)) return false;
    this.usedNullifiers.add(contextKey);

    // Check identity commitment is present
    if (!proof.publicSignals.identityCommitment) return false;

    return true;
  }

  // ── Bundle Verification ────────────────────────────

  async verifyBundle(bundle: ZKCredentialBundle): Promise<ZKVerificationResult> {
    // Verify identity (required)
    const identityValid = await this.verifyIdentityProof(bundle.identity);

    // Verify reputation (optional)
    let reputationValid: boolean | null = null;
    if (bundle.reputation) {
      reputationValid = await this.verifyReputationProof(bundle.reputation);
    }

    // Verify compliance proofs
    const complianceResults: Array<{ framework: string; valid: boolean }> = [];
    if (bundle.compliance) {
      for (const proof of bundle.compliance) {
        const valid = await this.verifyComplianceProof(proof);
        complianceResults.push({ framework: proof.framework, valid });
      }
    }

    // Overall validity
    const allComplianceValid = complianceResults.every(r => r.valid);
    const valid = identityValid &&
      (reputationValid === null || reputationValid) &&
      allComplianceValid;

    return {
      valid,
      identityValid,
      reputationValid,
      complianceResults: complianceResults as any,
      verifiedAt: new Date().toISOString(),
    };
  }

  /** Reset used nullifiers (for testing) */
  reset(): void {
    this.usedNullifiers.clear();
  }
}
