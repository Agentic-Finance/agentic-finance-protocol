/**
 * AI Proof Utility — On-Chain Verifiable AI Commitments
 *
 * Before an agent executes, it commits keccak256(plan) on-chain.
 * After execution, keccak256(result) is verified against the commitment.
 * Mismatches create a verifiable record of AI inconsistency.
 *
 * Uses the AIProofRegistry contract on Tempo L1.
 */

import { ethers } from 'ethers';
import { getWallet, getProvider, sendTx, explorerUrl } from './chain';

// ── Contract Config ──────────────────────────────────────────

export const AI_PROOF_REGISTRY_ADDRESS = '0x8fDB8E871c9eaF2955009566F41490Bbb128a014';

export const AI_PROOF_REGISTRY_ABI = [
  'function commit(bytes32 planHash, uint256 nexusJobId) external returns (bytes32)',
  'function verify(bytes32 commitmentId, bytes32 resultHash) external',
  'function slash(bytes32 commitmentId) external',
  'function getCommitment(bytes32 commitmentId) external view returns (bytes32 planHash, address agent, uint256 nexusJobId, bytes32 resultHash, bool verified, bool matched, uint256 committedAt, uint256 verifiedAt)',
  'function getJobCommitment(uint256 nexusJobId) external view returns (bytes32)',
  'function getStats() external view returns (uint256 totalCommitments, uint256 totalVerified, uint256 totalMatched, uint256 totalMismatched, uint256 totalSlashed)',
  'function totalCommitments() view returns (uint256)',
  'function totalVerified() view returns (uint256)',
  'event CommitmentMade(bytes32 indexed commitmentId, address indexed agent, uint256 indexed nexusJobId, bytes32 planHash)',
  'event CommitmentVerified(bytes32 indexed commitmentId, bool matched, bytes32 resultHash)',
  'event AgentSlashed(bytes32 indexed commitmentId, address indexed agent, uint256 indexed nexusJobId)',
];

// ── Helper Functions ─────────────────────────────────────────

/**
 * Get AIProofRegistry contract instance
 */
export function getAIProofRegistry(): ethers.Contract {
  return new ethers.Contract(AI_PROOF_REGISTRY_ADDRESS, AI_PROOF_REGISTRY_ABI, getWallet());
}

/**
 * Generate a keccak256 hash of an agent's plan string.
 */
export function generatePlanHash(plan: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(plan));
}

/**
 * Generate a keccak256 hash of an agent's result (any JSON-serializable object).
 */
export function generateResultHash(result: unknown): string {
  const serialized = JSON.stringify(result, null, 0);
  return ethers.keccak256(ethers.toUtf8Bytes(serialized));
}

/**
 * Commit a plan hash on-chain before execution.
 * Returns the commitment ID and transaction hash.
 */
export async function commitOnChain(
  planHash: string,
  nexusJobId: number = 0,
): Promise<{ commitmentId: string; txHash: string; explorerUrl: string }> {
  const registry = getAIProofRegistry();
  const provider = getProvider();
  const wallet = getWallet();
  const nonce = await provider.getTransactionCount(wallet.address, 'pending');

  const tx = await registry.commit(planHash, nexusJobId, {
    nonce,
    gasLimit: 5_000_000,
    type: 0,
  });
  const receipt = await tx.wait(1);

  // Parse CommitmentMade event to get commitmentId
  const iface = new ethers.Interface([
    'event CommitmentMade(bytes32 indexed commitmentId, address indexed agent, uint256 indexed nexusJobId, bytes32 planHash)',
  ]);
  let commitmentId = '';
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed?.name === 'CommitmentMade') {
        commitmentId = parsed.args.commitmentId;
        break;
      }
    } catch { /* skip */ }
  }

  return {
    commitmentId,
    txHash: receipt.hash,
    explorerUrl: explorerUrl(receipt.hash),
  };
}

/**
 * Verify an execution result against its commitment on-chain.
 * Returns whether the result matched and the tx hash.
 */
export async function verifyOnChain(
  commitmentId: string,
  resultHash: string,
): Promise<{ txHash: string; matched: boolean; explorerUrl: string }> {
  const registry = getAIProofRegistry();
  const provider = getProvider();
  const wallet = getWallet();
  const nonce = await provider.getTransactionCount(wallet.address, 'pending');

  const tx = await registry.verify(commitmentId, resultHash, {
    nonce,
    gasLimit: 5_000_000,
    type: 0,
  });
  const receipt = await tx.wait(1);

  // Parse CommitmentVerified event
  const iface = new ethers.Interface([
    'event CommitmentVerified(bytes32 indexed commitmentId, bool matched, bytes32 resultHash)',
  ]);
  let matched = false;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed?.name === 'CommitmentVerified') {
        matched = parsed.args.matched;
        break;
      }
    } catch { /* skip */ }
  }

  return {
    txHash: receipt.hash,
    matched,
    explorerUrl: explorerUrl(receipt.hash),
  };
}

/**
 * Get on-chain stats from the AIProofRegistry.
 */
export async function getProofStats(): Promise<{
  totalCommitments: number;
  totalVerified: number;
  totalMatched: number;
  totalMismatched: number;
  totalSlashed: number;
}> {
  const registry = getAIProofRegistry();
  const stats = await registry.getStats();
  return {
    totalCommitments: Number(stats[0]),
    totalVerified: Number(stats[1]),
    totalMatched: Number(stats[2]),
    totalMismatched: Number(stats[3]),
    totalSlashed: Number(stats[4]),
  };
}
