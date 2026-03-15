/**
 * Mock ZK Prover
 *
 * A mock implementation of the ZKProver interface for testing and development.
 * Generates simulated proofs that follow the correct format but don't use
 * real ZK-SNARK circuits. Use this for integration testing before deploying
 * the real Circom circuits.
 *
 * For production, replace with RealZKProver which uses:
 * - Circom V2 circuits for reputation/compliance/identity proofs
 * - snarkjs for PLONK proof generation
 * - On-chain verifier contracts
 */

import type {
  ZKProver,
  ZKReputationProof,
  ZKComplianceProof,
  ZKIdentityProof,
  ZKCredentialBundle,
  ZKReputationTier,
  ZKComplianceFramework,
} from './types';
import { ZK_REPUTATION_TIERS, ZK_PROOF_VALIDITY_MS } from './types';
import { createHash, randomBytes } from 'crypto';

export class MockZKProver implements ZKProver {
  readonly name = 'MockZKProver';

  private agentWallet: string;
  private compositeScore: number;
  private chainId: number;

  constructor(config: {
    agentWallet: string;
    compositeScore: number;
    chainId?: number;
  }) {
    this.agentWallet = config.agentWallet;
    this.compositeScore = config.compositeScore;
    this.chainId = config.chainId ?? 42431;
  }

  // ── Reputation Proof ───────────────────────────────

  async generateReputationProof(
    claimedTier: ZKReputationTier,
    agentSecret: string,
  ): Promise<ZKReputationProof> {
    const tierRange = ZK_REPUTATION_TIERS[claimedTier];

    // Verify the agent actually qualifies for this tier
    if (this.compositeScore < tierRange.min || this.compositeScore > tierRange.max) {
      throw new Error(
        `Agent score ${this.compositeScore} does not qualify for tier "${claimedTier}" (${tierRange.min}-${tierRange.max})`,
      );
    }

    const nullifierHash = this.hash(`reputation:${agentSecret}:${claimedTier}`);
    const merkleRoot = this.hash(`merkle:reputation:${Date.now()}`);
    const proof = this.generateMockProof('reputation', agentSecret);

    const now = new Date();
    return {
      type: 'zk-reputation',
      claimedTier,
      proof,
      publicSignals: {
        tierMin: tierRange.min,
        tierMax: tierRange.max,
        merkleRoot,
        nullifierHash,
      },
      generatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ZK_PROOF_VALIDITY_MS).toISOString(),
    };
  }

  // ── Compliance Proof ───────────────────────────────

  async generateComplianceProof(
    framework: ZKComplianceFramework,
    attestationData: Record<string, unknown>,
    agentSecret: string,
  ): Promise<ZKComplianceProof> {
    const frameworkHash = this.hash(`framework:${framework}`);
    const attestationRoot = this.hash(`attestation:${JSON.stringify(attestationData)}`);
    const nullifierHash = this.hash(`compliance:${agentSecret}:${framework}`);
    const proof = this.generateMockProof('compliance', agentSecret);

    // Simulate compliance check
    const isCompliant = this.checkCompliance(framework, attestationData);

    const now = new Date();
    return {
      type: 'zk-compliance',
      framework,
      proof,
      publicSignals: {
        frameworkHash,
        attestationRoot,
        nullifierHash,
        isCompliant,
      },
      issuer: 'Agentic Finance Compliance Authority',
      generatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ZK_PROOF_VALIDITY_MS).toISOString(),
    };
  }

  // ── Identity Proof ─────────────────────────────────

  async generateIdentityProof(
    externalNullifier: string,
    agentSecret: string,
  ): Promise<ZKIdentityProof> {
    const identityCommitment = this.hash(`identity:${this.agentWallet}:${agentSecret}`);
    const registryRoot = this.hash(`registry:${Date.now()}`);
    const nullifierHash = this.hash(`identity:${agentSecret}:${externalNullifier}`);
    const proof = this.generateMockProof('identity', agentSecret);

    const now = new Date();
    return {
      type: 'zk-identity',
      proof,
      publicSignals: {
        identityCommitment,
        registryRoot,
        nullifierHash,
        externalNullifier,
      },
      generatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ZK_PROOF_VALIDITY_MS).toISOString(),
    };
  }

  // ── Bundle ─────────────────────────────────────────

  async generateBundle(
    agentSecret: string,
    options: {
      claimedTier?: ZKReputationTier;
      complianceFrameworks?: ZKComplianceFramework[];
      externalNullifier: string;
    },
  ): Promise<ZKCredentialBundle> {
    // Always generate identity proof
    const identity = await this.generateIdentityProof(options.externalNullifier, agentSecret);

    // Optional reputation proof
    let reputation: ZKReputationProof | undefined;
    if (options.claimedTier) {
      reputation = await this.generateReputationProof(options.claimedTier, agentSecret);
    }

    // Optional compliance proofs
    let compliance: ZKComplianceProof[] | undefined;
    if (options.complianceFrameworks?.length) {
      compliance = await Promise.all(
        options.complianceFrameworks.map(fw =>
          this.generateComplianceProof(fw, { agent: this.agentWallet }, agentSecret),
        ),
      );
    }

    return {
      identity,
      reputation,
      compliance,
      metadata: {
        apsVersion: '2.1',
        chainId: this.chainId,
        verifierAddress: '0x0000000000000000000000000000000000000000', // Mock
        createdAt: new Date().toISOString(),
      },
    };
  }

  // ── Helpers ────────────────────────────────────────

  private hash(input: string): string {
    return '0x' + createHash('sha256').update(input).digest('hex');
  }

  private generateMockProof(type: string, secret: string): string {
    // Generate a deterministic but realistic-looking proof string
    const seed = `${type}:${secret}:${this.agentWallet}:${Date.now()}`;
    const bytes = createHash('sha256').update(seed).digest();
    // Real PLONK proofs are 24 uint256 values = 768 bytes
    const proofBytes = Buffer.alloc(768);
    for (let i = 0; i < 768; i += 32) {
      const chunk = createHash('sha256').update(Buffer.concat([bytes, Buffer.from([i])])).digest();
      chunk.copy(proofBytes, i);
    }
    return '0x' + proofBytes.toString('hex');
  }

  private checkCompliance(framework: ZKComplianceFramework, data: Record<string, unknown>): boolean {
    switch (framework) {
      case 'track-record':
        // Must have completed 10+ jobs without disputes
        return this.compositeScore >= 3000;
      case 'kyb':
        // Simulated KYB check
        return !!data.agent;
      default:
        // Other frameworks default to compliant for mock
        return true;
    }
  }
}
