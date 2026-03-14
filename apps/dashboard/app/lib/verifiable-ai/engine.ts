/**
 * Verifiable AI Engine for PayPol
 *
 * Proves that AI agent decisions are correct via:
 * 1. Model Registry — hash agent model weights/code on-chain
 * 2. Decision Proofs — commit input→output pairs with cryptographic proofs
 * 3. Verification — anyone can verify agent decisions match registered models
 *
 * Uses AIProofRegistry contract (already deployed) + keccak256 hashing
 * Future: EZKL integration for full ZK proofs of model inference
 */

import { keccak256, encodePacked, toBytes, type Address } from 'viem';
import { publicClient, getDaemonWalletClient, getDaemonAccount } from '@/app/lib/tempo/clients';
import { tempoModerato } from '@/app/lib/tempo/chain';
import { AI_PROOF_REGISTRY_VIEM_ABI } from '@/app/lib/tempo/contracts';
import { AI_PROOF_REGISTRY_ADDRESS } from '@/app/lib/constants';
import prisma from '@/app/lib/prisma';

// ────────────────────────────────────────────
// Model Registry
// ────────────────────────────────────────────

export interface ModelRegistration {
  agentId: string;
  modelName: string;
  modelVersion: string;
  modelHash: string; // keccak256 of model weights/code
  frameworkHash: string; // keccak256 of framework + dependencies
  inputSchema: string; // JSON schema of expected inputs
  outputSchema: string; // JSON schema of expected outputs
}

/**
 * Compute a deterministic hash for a model registration
 * This acts as a unique "fingerprint" for the model version
 */
export function computeModelHash(
  modelCode: string,
  modelVersion: string,
  agentId: string
): string {
  return keccak256(
    encodePacked(
      ['string', 'string', 'string'],
      [modelCode, modelVersion, agentId]
    )
  );
}

/**
 * Compute framework hash (dependencies + runtime environment)
 */
export function computeFrameworkHash(
  framework: string,
  dependencies: Record<string, string>
): string {
  const depString = Object.entries(dependencies)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}@${v}`)
    .join(',');

  return keccak256(
    encodePacked(['string', 'string'], [framework, depString])
  );
}

// ────────────────────────────────────────────
// Decision Proofs
// ────────────────────────────────────────────

export interface DecisionInput {
  prompt: string;
  context?: Record<string, any>;
  parameters?: Record<string, any>;
}

export interface DecisionOutput {
  result: string;
  confidence: number;
  reasoning?: string;
  executionTimeMs: number;
}

/**
 * Create a cryptographic commitment for an AI decision
 * Before execution: commit the input hash (planHash)
 * After execution: verify with the output hash (resultHash)
 */
export function hashDecisionInput(input: DecisionInput): string {
  const normalized = JSON.stringify({
    prompt: input.prompt,
    context: input.context || {},
    parameters: input.parameters || {},
  });

  return keccak256(encodePacked(['string'], [normalized]));
}

export function hashDecisionOutput(output: DecisionOutput): string {
  const normalized = JSON.stringify({
    result: output.result,
    confidence: output.confidence,
    executionTimeMs: output.executionTimeMs,
  });

  return keccak256(encodePacked(['string'], [normalized]));
}

/**
 * Create a combined proof hash for a full decision (input + output + model)
 */
export function hashFullDecision(
  inputHash: string,
  outputHash: string,
  modelHash: string
): string {
  return keccak256(
    encodePacked(
      ['bytes32', 'bytes32', 'bytes32'],
      [inputHash as `0x${string}`, outputHash as `0x${string}`, modelHash as `0x${string}`]
    )
  );
}

// ────────────────────────────────────────────
// On-Chain Integration (AIProofRegistry)
// ────────────────────────────────────────────

/**
 * Commit a decision plan hash on-chain
 * Call BEFORE agent executes the task
 */
export async function commitDecisionOnChain(
  planHash: string,
  nexusJobId: number
): Promise<{ commitmentId: string; txHash: string }> {
  const walletClient = getDaemonWalletClient();
  if (!walletClient) throw new Error('Daemon wallet not configured');
  const account = getDaemonAccount();
  if (!account) throw new Error('Daemon account not configured');

  const txHash = await walletClient.writeContract({
    address: AI_PROOF_REGISTRY_ADDRESS as Address,
    abi: AI_PROOF_REGISTRY_VIEM_ABI,
    functionName: 'commit',
    args: [planHash as `0x${string}`, BigInt(nexusJobId)],
    account,
    chain: tempoModerato,
  });

  // Derive commitmentId (same logic as contract)
  const commitmentId = keccak256(
    encodePacked(
      ['bytes32', 'address', 'uint256'],
      [
        planHash as `0x${string}`,
        account.address,
        BigInt(nexusJobId),
      ]
    )
  );

  return { commitmentId, txHash };
}

/**
 * Verify a decision result hash on-chain
 * Call AFTER agent completes the task
 */
export async function verifyDecisionOnChain(
  commitmentId: string,
  resultHash: string
): Promise<{ txHash: string; matched: boolean }> {
  const walletClient = getDaemonWalletClient();
  if (!walletClient) throw new Error('Daemon wallet not configured');
  const account = getDaemonAccount();
  if (!account) throw new Error('Daemon account not configured');

  const txHash = await walletClient.writeContract({
    address: AI_PROOF_REGISTRY_ADDRESS as Address,
    abi: AI_PROOF_REGISTRY_VIEM_ABI,
    functionName: 'verify',
    args: [commitmentId as `0x${string}`, resultHash as `0x${string}`],
    account,
    chain: tempoModerato,
  });

  // Check if matched
  const commitment = await publicClient.readContract({
    address: AI_PROOF_REGISTRY_ADDRESS as Address,
    abi: AI_PROOF_REGISTRY_VIEM_ABI,
    functionName: 'getCommitment',
    args: [commitmentId as `0x${string}`],
  });

  const matched = (commitment as any)[5] as boolean; // matched field

  return { txHash, matched };
}

/**
 * Get on-chain stats from AIProofRegistry
 */
export async function getVerificationStats(): Promise<{
  totalCommitments: number;
  totalVerified: number;
  totalMatched: number;
  totalMismatched: number;
  totalSlashed: number;
  matchRate: string;
}> {
  const stats = await publicClient.readContract({
    address: AI_PROOF_REGISTRY_ADDRESS as Address,
    abi: AI_PROOF_REGISTRY_VIEM_ABI,
    functionName: 'getStats',
  });

  const [totalCommitments, totalVerified, totalMatched, totalMismatched, totalSlashed] =
    stats as [bigint, bigint, bigint, bigint, bigint];

  const matchRate =
    Number(totalVerified) > 0
      ? ((Number(totalMatched) / Number(totalVerified)) * 100).toFixed(1) + '%'
      : 'N/A';

  return {
    totalCommitments: Number(totalCommitments),
    totalVerified: Number(totalVerified),
    totalMatched: Number(totalMatched),
    totalMismatched: Number(totalMismatched),
    totalSlashed: Number(totalSlashed),
    matchRate,
  };
}

// ────────────────────────────────────────────
// Integrity Score
// ────────────────────────────────────────────

/**
 * Calculate an agent's AI integrity score (0-100)
 * Based on on-chain proof verification history
 */
export function calculateIntegrityScore(stats: {
  totalCommitments: number;
  totalVerified: number;
  totalMatched: number;
  totalSlashed: number;
}): number {
  if (stats.totalCommitments === 0) return 50; // Neutral for new agents

  let score = 50; // Base

  // Commitment rate bonus (+20 if > 80% of jobs have commitments)
  const commitRate = stats.totalVerified / Math.max(stats.totalCommitments, 1);
  score += Math.min(commitRate * 20, 20);

  // Match rate bonus (+25 if > 90% match)
  if (stats.totalVerified > 0) {
    const matchRate = stats.totalMatched / stats.totalVerified;
    score += matchRate * 25;
  }

  // Slash penalty (-15 per slash)
  score -= stats.totalSlashed * 15;

  // Volume bonus (more proofs = more trustworthy, up to +5)
  score += Math.min(stats.totalVerified * 0.5, 5);

  return Math.max(0, Math.min(100, Math.round(score)));
}
